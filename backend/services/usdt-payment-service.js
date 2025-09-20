/**
 * USDT BEP20 Payment Service for ProFitAgent
 * Handles USDT payments on Binance Smart Chain
 */

const { ethers } = require('ethers');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// USDT BEP20 Contract ABI (minimal for transfer operations)
const USDT_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)'
];

class USDTPaymentService {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL);
    this.wallet = new ethers.Wallet(process.env.PAYMENT_PRIVATE_KEY, this.provider);
    this.usdtContract = new ethers.Contract(
      process.env.USDT_CONTRACT_ADDRESS,
      USDT_ABI,
      this.wallet
    );
    this.decimals = 18; // USDT BEP20 has 18 decimals
  }

  /**
   * Generate a unique payment address for a user order
   * @param {string} userId - User ID
   * @param {string} orderId - Order ID
   * @returns {Object} Payment details
   */
  async generatePaymentAddress(userId, orderId) {
    try {
      // Get available admin wallet
      const adminWallet = await prisma.adminWallet.findFirst({
        where: {
          status: 'active'
        },
        orderBy: {
          last_assigned_at: 'asc'
        }
      });

      if (!adminWallet) {
        throw new Error('No admin wallets available');
      }

      // Update wallet assignment
      await prisma.adminWallet.update({
        where: { id: adminWallet.id },
        data: {
          last_assigned_at: new Date(),
          assigned_count: { increment: 1 }
        }
      });

      // Update order with assigned wallet
      await prisma.orderDeposit.update({
        where: { id: orderId },
        data: {
          reserved_wallet_id: adminWallet.id,
          wallet_address: adminWallet.address
        }
      });

      return {
        address: adminWallet.address,
        network: 'BSC (BEP20)',
        token: 'USDT',
        contractAddress: process.env.USDT_CONTRACT_ADDRESS,
        orderId: orderId,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
      };

    } catch (error) {
      console.error('Error generating payment address:', error);
      throw error;
    }
  }

  /**
   * Check payment status for an order
   * @param {string} orderId - Order ID
   * @returns {Object} Payment status
   */
  async checkPaymentStatus(orderId) {
    try {
      const order = await prisma.orderDeposit.findUnique({
        where: { id: orderId },
        include: {
          reserved_wallet: true,
          user: true,
          product: true
        }
      });

      if (!order) {
        throw new Error('Order not found');
      }

      if (order.status === 'confirmed') {
        return {
          status: 'confirmed',
          txHash: order.tx_hash,
          amount: order.amount_usdt,
          confirmedAt: order.confirmed_at
        };
      }

      // Check for recent transactions to the wallet
      const transactions = await this.getRecentTransactions(
        order.wallet_address,
        order.amount_usdt
      );

      if (transactions.length > 0) {
        const validTx = transactions.find(tx => 
          parseFloat(tx.value) >= parseFloat(order.amount_usdt) &&
          new Date(tx.timestamp) > new Date(order.created_at)
        );

        if (validTx) {
          // Update order status
          await prisma.orderDeposit.update({
            where: { id: orderId },
            data: {
              status: 'paid',
              tx_hash: validTx.hash,
              paid_at: new Date(validTx.timestamp),
              raw_chain_payload: validTx
            }
          });

          // Process the payment
          await this.processPayment(orderId, validTx);

          return {
            status: 'paid',
            txHash: validTx.hash,
            amount: validTx.value,
            paidAt: validTx.timestamp
          };
        }
      }

      // Check if order expired
      if (new Date() > new Date(order.expires_at)) {
        await prisma.orderDeposit.update({
          where: { id: orderId },
          data: { status: 'expired' }
        });

        return {
          status: 'expired',
          expiresAt: order.expires_at
        };
      }

      return {
        status: 'pending',
        expiresAt: order.expires_at,
        timeRemaining: new Date(order.expires_at) - new Date()
      };

    } catch (error) {
      console.error('Error checking payment status:', error);
      throw error;
    }
  }

  /**
   * Get recent USDT transactions to an address
   * @param {string} address - Wallet address
   * @param {number} minAmount - Minimum amount to filter
   * @returns {Array} Recent transactions
   */
  async getRecentTransactions(address, minAmount) {
    try {
      // Get transfer events from USDT contract
      const filter = this.usdtContract.filters.Transfer(null, address);
      const currentBlock = await this.provider.getBlockNumber();
      const fromBlock = currentBlock - 1000; // Last ~1000 blocks (~50 minutes)

      const events = await this.usdtContract.queryFilter(filter, fromBlock, currentBlock);
      
      const transactions = [];
      
      for (const event of events) {
        const block = await this.provider.getBlock(event.blockNumber);
        const value = ethers.formatUnits(event.args.value, this.decimals);
        
        if (parseFloat(value) >= parseFloat(minAmount)) {
          transactions.push({
            hash: event.transactionHash,
            from: event.args.from,
            to: event.args.to,
            value: value,
            blockNumber: event.blockNumber,
            timestamp: new Date(block.timestamp * 1000).toISOString(),
            gasUsed: event.gasUsed?.toString(),
            gasPrice: event.gasPrice?.toString()
          });
        }
      }

      return transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    } catch (error) {
      console.error('Error getting recent transactions:', error);
      return [];
    }
  }

  /**
   * Process confirmed payment
   * @param {string} orderId - Order ID
   * @param {Object} transaction - Transaction details
   */
  async processPayment(orderId, transaction) {
    try {
      const order = await prisma.orderDeposit.findUnique({
        where: { id: orderId },
        include: {
          user: true,
          product: true
        }
      });

      if (!order) {
        throw new Error('Order not found');
      }

      // Create user license
      const license = await prisma.userLicense.create({
        data: {
          user_id: order.user_id,
          product_id: order.product_id,
          order_id: orderId,
          principal_usdt: order.amount_usdt,
          status: 'active',
          started_at: new Date(),
          ends_at: new Date(Date.now() + order.product.duration_days * 24 * 60 * 60 * 1000)
        }
      });

      // Update order status
      await prisma.orderDeposit.update({
        where: { id: orderId },
        data: {
          status: 'confirmed',
          confirmed_at: new Date()
        }
      });

      // Create ledger entry
      await prisma.ledgerEntry.create({
        data: {
          user_id: order.user_id,
          direction: 'credit',
          amount_usdt: order.amount_usdt,
          ref_type: 'order',
          ref_id: orderId,
          description: `License purchase: ${order.product.name}`,
          tx_hash: transaction.hash
        }
      });

      // Assign agents based on license level
      await this.assignAgentsToLicense(license.id, order.product.code);

      // Add user to Telegram channels
      await this.addUserToTelegramChannels(order.user_id, order.product.code);

      // Send notification
      await prisma.notification.create({
        data: {
          user_id: order.user_id,
          type: 'order',
          severity: 'success',
          title: 'Payment Confirmed',
          message: `Your payment for ${order.product.name} has been confirmed. License activated!`,
          data: {
            orderId: orderId,
            licenseId: license.id,
            txHash: transaction.hash
          }
        }
      });

      // Send ProFitAgent Telegram notification
      await this.sendProFitAgentNotification(order, license, transaction);

      console.log(`Payment processed successfully for order ${orderId}`);
      return license;

    } catch (error) {
      console.error('Error processing payment:', error);
      throw error;
    }
  }

  /**
   * Assign agents to a new license based on access level
   * @param {string} licenseId - License ID
   * @param {string} productCode - Product code
   */
  async assignAgentsToLicense(licenseId, productCode) {
    try {
      // Map product codes to access levels
      const accessLevelMap = {
        'BASIC': 'basic',
        'STANDARD': 'standard',
        'PREMIUM': 'premium',
        'ELITE': 'elite',
        'ENTERPRISE': 'enterprise'
      };

      const accessLevel = accessLevelMap[productCode.toUpperCase()] || 'basic';

      // Get available agents for this access level
      const agents = await prisma.externalAgent.findMany({
        where: {
          access_level: accessLevel,
          status: 'active'
        }
      });

      const license = await prisma.userLicense.findUnique({
        where: { id: licenseId }
      });

      // Assign agents with capital allocation
      for (const agent of agents) {
        const allocatedCapital = Math.min(
          parseFloat(license.principal_usdt) * 0.2, // 20% per agent max
          parseFloat(agent.max_capital)
        );

        if (allocatedCapital >= parseFloat(agent.min_capital)) {
          await prisma.agentAssignment.create({
            data: {
              user_id: license.user_id,
              agent_id: agent.id,
              license_id: licenseId,
              allocated_capital: allocatedCapital,
              status: 'active',
              expires_at: license.ends_at
            }
          });
        }
      }

    } catch (error) {
      console.error('Error assigning agents:', error);
    }
  }

  /**
   * Send ProFitAgent Telegram notification
   * @param {Object} order - Order details
   * @param {Object} license - License details
   * @param {Object} transaction - Transaction details
   */
  async sendProFitAgentNotification(order, license, transaction) {
    try {
      const botToken = process.env.TELEGRAM_ALERTS_BOT_TOKEN;
      if (!botToken) {
        console.log('ProFitAgent Telegram alerts bot token not configured');
        return;
      }
      
      const chatId = process.env.TELEGRAM_ALERTS_CHAT_ID;
      if (!chatId) {
        console.log('ProFitAgent Telegram alerts chat ID not configured');
        return;
      }
      
      const message = `🤖 *ProFitAgent Payment System*\n\n` +
                     `💰 *Payment Confirmed!*\n\n` +
                     `User: ${order.user.email}\n` +
                     `Product: ${order.product.name}\n` +
                     `Amount: ${order.amount_usdt} USDT\n` +
                     `License ID: ${license.id}\n` +
                     `TX Hash: \`${transaction.hash}\`\n\n` +
                     `License activated successfully! 🎉`;
      
      const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
      
      await fetch(telegramUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown'
        })
      });
      
      console.log('✅ ProFitAgent Telegram notification sent successfully');
    } catch (error) {
      console.error('❌ Failed to send ProFitAgent Telegram notification:', error);
    }
  }

  /**
   * Add user to appropriate Telegram channels
   * @param {string} userId - User ID
   * @param {string} productCode - Product code
   */
  async addUserToTelegramChannels(userId, productCode) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user.telegram_user_id) {
        console.log('User has no Telegram ID, skipping channel assignment');
        return;
      }

      // Map product codes to channel types
      const channelTypeMap = {
        'BASIC': 'license_basic',
        'STANDARD': 'license_standard',
        'PREMIUM': 'license_premium',
        'ELITE': 'license_elite',
        'ENTERPRISE': 'license_enterprise'
      };

      const channelType = channelTypeMap[productCode.toUpperCase()];
      
      if (channelType) {
        const channel = await prisma.telegramChannel.findFirst({
          where: {
            channel_type: channelType,
            status: 'active'
          }
        });

        if (channel) {
          await prisma.telegramMembership.create({
            data: {
              user_id: userId,
              channel_id: channel.id,
              telegram_user_id: user.telegram_user_id,
              status: 'active'
            }
          });
        }
      }

      // Also add to general announcements channel
      const announcementChannel = await prisma.telegramChannel.findFirst({
        where: {
          channel_type: 'general_announcements',
          status: 'active'
        }
      });

      if (announcementChannel) {
        await prisma.telegramMembership.upsert({
          where: {
            user_id_channel_id: {
              user_id: userId,
              channel_id: announcementChannel.id
            }
          },
          create: {
            user_id: userId,
            channel_id: announcementChannel.id,
            telegram_user_id: user.telegram_user_id,
            status: 'active'
          },
          update: {
            status: 'active'
          }
        });
      }

    } catch (error) {
      console.error('Error adding user to Telegram channels:', error);
    }
  }

  /**
   * Get wallet balance
   * @param {string} address - Wallet address
   * @returns {string} Balance in USDT
   */
  async getWalletBalance(address) {
    try {
      const balance = await this.usdtContract.balanceOf(address);
      return ethers.formatUnits(balance, this.decimals);
    } catch (error) {
      console.error('Error getting wallet balance:', error);
      return '0';
    }
  }

  /**
   * Send USDT from admin wallet
   * @param {string} toAddress - Recipient address
   * @param {string} amount - Amount in USDT
   * @returns {Object} Transaction result
   */
  async sendUSDT(toAddress, amount) {
    try {
      const amountWei = ethers.parseUnits(amount.toString(), this.decimals);
      
      const tx = await this.usdtContract.transfer(toAddress, amountWei);
      const receipt = await tx.wait();
      
      return {
        success: true,
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      console.error('Error sending USDT:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = USDTPaymentService;