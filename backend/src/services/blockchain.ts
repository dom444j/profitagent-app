import axios from 'axios';
import { logger } from '../utils/logger';

// BSC Mainnet configuration
const BSC_MAINNET_CONFIG = {
  chainId: 56,
  rpcUrl: 'https://bsc-dataseed1.binance.org/',
  explorerUrl: 'https://api.bscscan.com/api',
  usdtContract: '0x55d398326f99059fF775485246999027B3197955' // USDT BEP20
};

// BSC Testnet configuration (for development)
const BSC_TESTNET_CONFIG = {
  chainId: 97,
  rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
  explorerUrl: 'https://api-testnet.bscscan.com/api',
  usdtContract: '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd' // USDT testnet
};

interface TransactionDetails {
  hash: string;
  from: string;
  to: string;
  value: string;
  tokenSymbol?: string;
  tokenDecimal?: string;
  contractAddress?: string;
  blockNumber: string;
  timeStamp: string;
  confirmations: string;
  isError: string;
}

interface ValidationResult {
  isValid: boolean;
  transaction?: TransactionDetails;
  error?: string;
  amountUSDT?: number;
}

class BlockchainService {
  private config: typeof BSC_MAINNET_CONFIG;
  private apiKey: string;

  constructor() {
    // Use testnet for development, mainnet for production
    this.config = process.env.NODE_ENV === 'production' ? BSC_MAINNET_CONFIG : BSC_TESTNET_CONFIG;
    this.apiKey = process.env.BSCSCAN_API_KEY || 'YourApiKeyToken';
    
    if (!process.env.BSCSCAN_API_KEY) {
      logger.warn('BSCSCAN_API_KEY not set, using default key (limited rate)');
    }
  }

  /**
   * Validate a transaction hash for USDT payment
   * @param txHash Transaction hash to validate
   * @param expectedToAddress Expected recipient address
   * @param expectedAmountUSDT Expected amount in USDT
   * @param tolerancePercent Tolerance percentage for amount validation (default 1%)
   */
  async validateUSDTTransaction(
    txHash: string,
    expectedToAddress: string,
    expectedAmountUSDT: number,
    tolerancePercent: number = 1
  ): Promise<ValidationResult> {
    try {
      logger.info(`Validating transaction: ${txHash}`);
      
      // First, get transaction details
      const txDetails = await this.getTransactionDetails(txHash);
      if (!txDetails.isValid || !txDetails.transaction) {
        return { isValid: false, error: txDetails.error || 'Transaction validation failed' };
      }

      const tx = txDetails.transaction;

      // Check if transaction was successful
      if (tx.isError !== '0') {
        return { isValid: false, error: 'Transaction failed on blockchain' };
      }

      // For USDT transfers, we need to check token transfers
      const tokenTransfer = await this.getTokenTransfer(txHash, this.config.usdtContract);
      if (!tokenTransfer.isValid) {
        return { isValid: false, error: 'No USDT transfer found in transaction' };
      }

      // Validate recipient address
      if (tokenTransfer.transaction!.to.toLowerCase() !== expectedToAddress.toLowerCase()) {
        return {
          isValid: false,
          error: `Recipient mismatch. Expected: ${expectedToAddress}, Got: ${tokenTransfer.transaction!.to}`
        };
      }

      // Validate amount (with tolerance)
      const actualAmount = this.parseUSDTAmount(tokenTransfer.transaction!.value);
      const tolerance = expectedAmountUSDT * (tolerancePercent / 100);
      const minAmount = expectedAmountUSDT - tolerance;
      const maxAmount = expectedAmountUSDT + tolerance;

      if (actualAmount < minAmount || actualAmount > maxAmount) {
        return {
          isValid: false,
          error: `Amount mismatch. Expected: ${expectedAmountUSDT} USDT (±${tolerancePercent}%), Got: ${actualAmount} USDT`
        };
      }

      // Check minimum confirmations (at least 3 for BSC)
      const confirmations = parseInt(tx.confirmations);
      if (confirmations < 3) {
        return {
          isValid: false,
          error: `Insufficient confirmations. Required: 3, Got: ${confirmations}`
        };
      }

      logger.info(`Transaction validated successfully: ${txHash}`);
      return {
        isValid: true,
        transaction: tx,
        amountUSDT: actualAmount
      };

    } catch (error) {
      logger.error('Blockchain validation error:', error);
      return {
        isValid: false,
        error: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get transaction details from BSCScan API
   */
  private async getTransactionDetails(txHash: string): Promise<ValidationResult> {
    try {
      const response = await axios.get(this.config.explorerUrl, {
        params: {
          module: 'proxy',
          action: 'eth_getTransactionByHash',
          txhash: txHash,
          apikey: this.apiKey
        },
        timeout: 10000
      });

      if (response.data.error) {
        return { isValid: false, error: response.data.error.message };
      }

      if (!response.data.result) {
        return { isValid: false, error: 'Transaction not found' };
      }

      const tx = response.data.result;
      
      // Get transaction receipt for confirmation status
      const receiptResponse = await axios.get(this.config.explorerUrl, {
        params: {
          module: 'proxy',
          action: 'eth_getTransactionReceipt',
          txhash: txHash,
          apikey: this.apiKey
        },
        timeout: 10000
      });

      const receipt = receiptResponse.data.result;
      if (!receipt) {
        return { isValid: false, error: 'Transaction receipt not found' };
      }

      // Get current block number to calculate confirmations
      const blockResponse = await axios.get(this.config.explorerUrl, {
        params: {
          module: 'proxy',
          action: 'eth_blockNumber',
          apikey: this.apiKey
        },
        timeout: 10000
      });

      const currentBlock = parseInt(blockResponse.data.result, 16);
      const txBlock = parseInt(receipt.blockNumber, 16);
      const confirmations = currentBlock - txBlock + 1;

      const transaction: TransactionDetails = {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: tx.value,
        blockNumber: receipt.blockNumber,
        timeStamp: Date.now().toString(), // BSCScan doesn't provide timestamp in this endpoint
        confirmations: confirmations.toString(),
        isError: receipt.status === '0x1' ? '0' : '1'
      };

      return { isValid: true, transaction };

    } catch (error) {
      logger.error('Error fetching transaction details:', error);
      return {
        isValid: false,
        error: `Failed to fetch transaction: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get token transfer details for a specific contract
   */
  private async getTokenTransfer(txHash: string, contractAddress: string): Promise<ValidationResult> {
    try {
      const response = await axios.get(this.config.explorerUrl, {
        params: {
          module: 'account',
          action: 'tokentx',
          contractaddress: contractAddress,
          page: 1,
          offset: 100,
          sort: 'desc',
          apikey: this.apiKey
        },
        timeout: 10000
      });

      if (response.data.status !== '1') {
        return { isValid: false, error: 'Failed to fetch token transfers' };
      }

      const transfers = response.data.result;
      const transfer = transfers.find((t: any) => t.hash.toLowerCase() === txHash.toLowerCase());

      if (!transfer) {
        return { isValid: false, error: 'Token transfer not found for this transaction' };
      }

      const transaction: TransactionDetails = {
        hash: transfer.hash,
        from: transfer.from,
        to: transfer.to,
        value: transfer.value,
        tokenSymbol: transfer.tokenSymbol,
        tokenDecimal: transfer.tokenDecimal,
        contractAddress: transfer.contractAddress,
        blockNumber: transfer.blockNumber,
        timeStamp: transfer.timeStamp,
        confirmations: transfer.confirmations,
        isError: '0' // Token transfers in result are usually successful
      };

      return { isValid: true, transaction };

    } catch (error) {
      logger.error('Error fetching token transfer:', error);
      return {
        isValid: false,
        error: `Failed to fetch token transfer: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Parse USDT amount from wei format
   */
  private parseUSDTAmount(valueWei: string): number {
    // USDT has 18 decimals on BSC
    const decimals = 18;
    const value = BigInt(valueWei);
    const divisor = BigInt(10 ** decimals);
    const wholePart = value / divisor;
    const fractionalPart = value % divisor;
    
    return parseFloat(`${wholePart}.${fractionalPart.toString().padStart(decimals, '0')}`);
  }

  /**
   * Check if an address is a valid BSC address
   */
  isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Get current BSC network configuration
   */
  getNetworkConfig() {
    return {
      ...this.config,
      network: process.env.NODE_ENV === 'production' ? 'mainnet' : 'testnet'
    };
  }
}

export const blockchainService = new BlockchainService();
export { ValidationResult, TransactionDetails };