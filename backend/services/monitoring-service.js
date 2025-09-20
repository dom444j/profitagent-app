/**
 * Monitoring and Alerting Service for ProFitAgent
 * Handles system monitoring, performance tracking, and alert notifications
 */

const { PrismaClient } = require('@prisma/client');
const { ethers } = require('ethers');
const { paymentConfig } = require('../config/payment-config');
const { formatCurrency, getCurrentGasPrice } = require('../utils/payment-utils');
const prisma = new PrismaClient();

class MonitoringService {
  constructor() {
    this.alerts = [];
    this.metrics = {
      payments: {
        total: 0,
        successful: 0,
        failed: 0,
        pending: 0
      },
      agents: {
        active: 0,
        inactive: 0,
        totalAssignments: 0
      },
      system: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      }
    };
    this.isMonitoring = false;
    this.monitoringInterval = null;
  }

  /**
   * Start monitoring service
   */
  async startMonitoring() {
    if (this.isMonitoring) {
      console.log('Monitoring service is already running');
      return;
    }

    console.log('Starting ProFitAgent monitoring service...');
    this.isMonitoring = true;

    // Start periodic monitoring
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectMetrics();
        await this.checkAlerts();
        await this.performHealthChecks();
      } catch (error) {
        console.error('Monitoring error:', error);
        await this.sendAlert('system_error', {
          message: 'Monitoring service error',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }, paymentConfig.monitoring.metricsInterval);

    // Initial metrics collection
    await this.collectMetrics();
    console.log('Monitoring service started successfully');
  }

  /**
   * Stop monitoring service
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('Monitoring service stopped');
  }

  /**
   * Collect system metrics
   */
  async collectMetrics() {
    try {
      // Payment metrics
      const paymentStats = await this.getPaymentMetrics();
      this.metrics.payments = paymentStats;

      // Agent metrics
      const agentStats = await this.getAgentMetrics();
      this.metrics.agents = agentStats;

      // System metrics
      this.metrics.system = {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        timestamp: new Date().toISOString()
      };

      // Blockchain metrics
      const blockchainStats = await this.getBlockchainMetrics();
      this.metrics.blockchain = blockchainStats;

      // Database metrics
      const dbStats = await this.getDatabaseMetrics();
      this.metrics.database = dbStats;

      console.log('Metrics collected:', {
        payments: this.metrics.payments.total,
        agents: this.metrics.agents.active,
        uptime: Math.floor(this.metrics.system.uptime / 60) + ' minutes'
      });
    } catch (error) {
      console.error('Error collecting metrics:', error);
    }
  }

  /**
   * Get payment-related metrics
   */
  async getPaymentMetrics() {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [total, successful, failed, pending] = await Promise.all([
      prisma.orderDeposit.count(),
      prisma.orderDeposit.count({ where: { status: 'confirmed' } }),
      prisma.orderDeposit.count({ where: { status: 'failed' } }),
      prisma.orderDeposit.count({ where: { status: 'pending' } })
    ]);

    const recentPayments = await prisma.orderDeposit.count({
      where: {
        created_at: { gte: last24Hours }
      }
    });

    const totalVolume = await prisma.orderDeposit.aggregate({
      where: { status: 'confirmed' },
      _sum: { amount: true }
    });

    return {
      total,
      successful,
      failed,
      pending,
      recent24h: recentPayments,
      totalVolume: totalVolume._sum.amount || 0,
      successRate: total > 0 ? ((successful / total) * 100).toFixed(2) : 0
    };
  }

  /**
   * Get agent-related metrics
   */
  async getAgentMetrics() {
    const [activeAgents, totalAssignments, performanceData] = await Promise.all([
      prisma.externalAgent.count({ where: { status: 'active' } }),
      prisma.agentAssignment.count({ where: { status: 'active' } }),
      prisma.agentPerformance.aggregate({
        _avg: { daily_return: true, total_return: true },
        _sum: { trades_count: true }
      })
    ]);

    const inactiveAgents = await prisma.externalAgent.count({
      where: { status: { not: 'active' } }
    });

    return {
      active: activeAgents,
      inactive: inactiveAgents,
      totalAssignments,
      avgDailyReturn: performanceData._avg.daily_return || 0,
      avgTotalReturn: performanceData._avg.total_return || 0,
      totalTrades: performanceData._sum.trades_count || 0
    };
  }

  /**
   * Get blockchain-related metrics
   */
  async getBlockchainMetrics() {
    try {
      const { getCurrentRpcUrl } = require('../config/payment-config');
      const provider = new ethers.providers.JsonRpcProvider(getCurrentRpcUrl());

      const [blockNumber, gasPrice, networkId] = await Promise.all([
        provider.getBlockNumber(),
        getCurrentGasPrice(provider),
        provider.getNetwork().then(n => n.chainId)
      ]);

      // Check wallet balances
      const walletBalances = await this.checkWalletBalances(provider);

      return {
        blockNumber,
        gasPrice,
        networkId,
        walletBalances,
        isConnected: true
      };
    } catch (error) {
      console.error('Blockchain metrics error:', error);
      return {
        blockNumber: 0,
        gasPrice: 0,
        networkId: 0,
        walletBalances: {},
        isConnected: false,
        error: error.message
      };
    }
  }

  /**
   * Check wallet balances
   */
  async checkWalletBalances(provider) {
    const balances = {};

    try {
      // Payment wallet balance
      if (paymentConfig.wallets.payment.address) {
        const balance = await provider.getBalance(paymentConfig.wallets.payment.address);
        balances.payment = {
          address: paymentConfig.wallets.payment.address,
          balance: parseFloat(ethers.utils.formatEther(balance)),
          currency: 'BNB'
        };
      }

      // Gas wallet balance
      if (paymentConfig.wallets.gas.address) {
        const balance = await provider.getBalance(paymentConfig.wallets.gas.address);
        balances.gas = {
          address: paymentConfig.wallets.gas.address,
          balance: parseFloat(ethers.utils.formatEther(balance)),
          currency: 'BNB'
        };
      }

      // Check USDT balances
      const { getCurrentUsdtConfig } = require('../config/payment-config');
      const usdtConfig = getCurrentUsdtConfig();
      
      if (usdtConfig.address) {
        const usdtContract = new ethers.Contract(
          usdtConfig.address,
          ['function balanceOf(address) view returns (uint256)'],
          provider
        );

        if (paymentConfig.wallets.payment.address) {
          const usdtBalance = await usdtContract.balanceOf(paymentConfig.wallets.payment.address);
          balances.paymentUsdt = {
            address: paymentConfig.wallets.payment.address,
            balance: parseFloat(ethers.utils.formatUnits(usdtBalance, 18)),
            currency: 'USDT'
          };
        }
      }
    } catch (error) {
      console.error('Error checking wallet balances:', error);
      balances.error = error.message;
    }

    return balances;
  }

  /**
   * Get database metrics
   */
  async getDatabaseMetrics() {
    try {
      const [userCount, licenseCount, transactionCount] = await Promise.all([
        prisma.user.count(),
        prisma.userLicense.count({ where: { status: 'active' } }),
        prisma.contractTransaction.count()
      ]);

      return {
        users: userCount,
        activeLicenses: licenseCount,
        transactions: transactionCount,
        isConnected: true
      };
    } catch (error) {
      console.error('Database metrics error:', error);
      return {
        users: 0,
        activeLicenses: 0,
        transactions: 0,
        isConnected: false,
        error: error.message
      };
    }
  }

  /**
   * Check for alert conditions
   */
  async checkAlerts() {
    const alerts = [];

    // Check failed payments threshold
    if (this.metrics.payments.failed >= paymentConfig.monitoring.alertThresholds.failedPayments) {
      alerts.push({
        type: 'high_failed_payments',
        severity: 'warning',
        message: `High number of failed payments: ${this.metrics.payments.failed}`,
        data: { failedCount: this.metrics.payments.failed }
      });
    }

    // Check wallet balances
    if (this.metrics.blockchain && this.metrics.blockchain.walletBalances) {
      const { walletBalances } = this.metrics.blockchain;
      
      if (walletBalances.payment && walletBalances.payment.balance < paymentConfig.monitoring.alertThresholds.lowBalance) {
        alerts.push({
          type: 'low_wallet_balance',
          severity: 'critical',
          message: `Low payment wallet balance: ${walletBalances.payment.balance} BNB`,
          data: { balance: walletBalances.payment.balance, wallet: 'payment' }
        });
      }

      if (walletBalances.gas && walletBalances.gas.balance < 0.01) {
        alerts.push({
          type: 'low_gas_balance',
          severity: 'warning',
          message: `Low gas wallet balance: ${walletBalances.gas.balance} BNB`,
          data: { balance: walletBalances.gas.balance, wallet: 'gas' }
        });
      }
    }

    // Check system resources
    const memoryUsage = this.metrics.system.memoryUsage;
    const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    
    if (memoryUsagePercent > 90) {
      alerts.push({
        type: 'high_memory_usage',
        severity: 'warning',
        message: `High memory usage: ${memoryUsagePercent.toFixed(2)}%`,
        data: { memoryUsage: memoryUsagePercent }
      });
    }

    // Check blockchain connectivity
    if (this.metrics.blockchain && !this.metrics.blockchain.isConnected) {
      alerts.push({
        type: 'blockchain_disconnected',
        severity: 'critical',
        message: 'Blockchain connection lost',
        data: { error: this.metrics.blockchain.error }
      });
    }

    // Check database connectivity
    if (this.metrics.database && !this.metrics.database.isConnected) {
      alerts.push({
        type: 'database_disconnected',
        severity: 'critical',
        message: 'Database connection lost',
        data: { error: this.metrics.database.error }
      });
    }

    // Send alerts
    for (const alert of alerts) {
      await this.sendAlert(alert.type, alert);
    }
  }

  /**
   * Perform health checks
   */
  async performHealthChecks() {
    const healthStatus = {
      status: 'healthy',
      checks: {},
      timestamp: new Date().toISOString()
    };

    // Database health check
    try {
      await prisma.$queryRaw`SELECT 1`;
      healthStatus.checks.database = { status: 'healthy', responseTime: Date.now() };
    } catch (error) {
      healthStatus.checks.database = { status: 'unhealthy', error: error.message };
      healthStatus.status = 'unhealthy';
    }

    // Blockchain health check
    try {
      const { getCurrentRpcUrl } = require('../config/payment-config');
      const provider = new ethers.providers.JsonRpcProvider(getCurrentRpcUrl());
      const startTime = Date.now();
      await provider.getBlockNumber();
      const responseTime = Date.now() - startTime;
      healthStatus.checks.blockchain = { status: 'healthy', responseTime };
    } catch (error) {
      healthStatus.checks.blockchain = { status: 'unhealthy', error: error.message };
      healthStatus.status = 'degraded';
    }

    // Memory health check
    const memoryUsage = process.memoryUsage();
    const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    healthStatus.checks.memory = {
      status: memoryUsagePercent < 90 ? 'healthy' : 'warning',
      usage: memoryUsagePercent,
      details: memoryUsage
    };

    this.healthStatus = healthStatus;
    return healthStatus;
  }

  /**
   * Send alert notification
   */
  async sendAlert(type, alertData) {
    try {
      const alert = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        severity: alertData.severity || 'info',
        message: alertData.message,
        data: alertData.data || {},
        timestamp: new Date().toISOString()
      };

      // Add to alerts array
      this.alerts.unshift(alert);
      
      // Keep only last 100 alerts
      if (this.alerts.length > 100) {
        this.alerts = this.alerts.slice(0, 100);
      }

      // Send Telegram notification if configured (ProFitAgent alerts bot)
      if ((process.env.TELEGRAM_ALERTS_BOT_TOKEN && process.env.TELEGRAM_ALERTS_CHAT_ID) || 
          (paymentConfig.telegram.botToken && paymentConfig.telegram.adminChatId)) {
        await this.sendTelegramAlert(alert);
      }

      // Send email notification if configured
      if (paymentConfig.notifications.email && paymentConfig.notifications.alertEmail) {
        await this.sendEmailAlert(alert);
      }

      // Send webhook notification if configured
      if (paymentConfig.notifications.alertWebhook) {
        await this.sendWebhookAlert(alert);
      }

      console.log(`Alert sent: ${type} - ${alertData.message}`);
    } catch (error) {
      console.error('Error sending alert:', error);
    }
  }

  /**
   * Send Telegram alert
   */
  async sendTelegramAlert(alert) {
    try {
      const axios = require('axios');
      const message = `🚨 *ProFitAgent Alert*\n\n` +
                     `*Type:* ${alert.type}\n` +
                     `*Severity:* ${alert.severity}\n` +
                     `*Message:* ${alert.message}\n` +
                     `*Time:* ${alert.timestamp}`;

      // Use ProFitAgent alerts bot token and chat ID
      const botToken = process.env.TELEGRAM_ALERTS_BOT_TOKEN || paymentConfig.telegram.botToken;
      const chatId = process.env.TELEGRAM_ALERTS_CHAT_ID || paymentConfig.telegram.adminChatId;

      await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown'
      });
      
      console.log('✅ ProFitAgent Telegram alert sent successfully');
    } catch (error) {
      console.error('❌ Failed to send ProFitAgent Telegram alert:', error);
    }
  }

  /**
   * Send email alert
   */
  async sendEmailAlert(alert) {
    // Implement email sending logic here
    console.log('Email alert would be sent:', alert);
  }

  /**
   * Send webhook alert
   */
  async sendWebhookAlert(alert) {
    try {
      const axios = require('axios');
      await axios.post(paymentConfig.notifications.alertWebhook, alert, {
        headers: {
          'Content-Type': 'application/json',
          'X-Alert-Source': 'ProFitAgent'
        },
        timeout: 5000
      });
    } catch (error) {
      console.error('Error sending webhook alert:', error);
    }
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return this.metrics;
  }

  /**
   * Get recent alerts
   */
  getAlerts(limit = 50) {
    return this.alerts.slice(0, limit);
  }

  /**
   * Get health status
   */
  getHealthStatus() {
    return this.healthStatus || { status: 'unknown', message: 'Health check not performed yet' };
  }

  /**
   * Generate monitoring report
   */
  generateReport() {
    return {
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      alerts: this.getAlerts(10),
      health: this.getHealthStatus(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0'
    };
  }
}

// Create singleton instance
const monitoringService = new MonitoringService();

module.exports = monitoringService;