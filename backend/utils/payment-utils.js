/**
 * Payment Utilities for ProFitAgent
 * Helper functions for payment processing, validation, and formatting
 */

const crypto = require('crypto');
const { ethers } = require('ethers');
const { paymentConfig } = require('../config/payment-config');

/**
 * Generate a unique order ID
 */
const generateOrderId = () => {
  const timestamp = Date.now().toString(36);
  const randomStr = crypto.randomBytes(6).toString('hex');
  return `PA_${timestamp}_${randomStr}`.toUpperCase();
};

/**
 * Generate a unique payment address for an order
 */
const generatePaymentAddress = () => {
  const wallet = ethers.Wallet.createRandom();
  return {
    address: wallet.address,
    privateKey: wallet.privateKey
  };
};

/**
 * Validate Ethereum/BSC address format
 */
const isValidAddress = (address) => {
  try {
    return ethers.utils.isAddress(address);
  } catch (error) {
    return false;
  }
};

/**
 * Validate transaction hash format
 */
const isValidTxHash = (txHash) => {
  const txHashRegex = /^0x[a-fA-F0-9]{64}$/;
  return txHashRegex.test(txHash);
};

/**
 * Format USDT amount (convert from wei to readable format)
 */
const formatUsdtAmount = (amountWei) => {
  try {
    return parseFloat(ethers.utils.formatUnits(amountWei, 18));
  } catch (error) {
    return 0;
  }
};

/**
 * Parse USDT amount (convert from readable format to wei)
 */
const parseUsdtAmount = (amount) => {
  try {
    return ethers.utils.parseUnits(amount.toString(), 18);
  } catch (error) {
    throw new Error('Invalid amount format');
  }
};

/**
 * Calculate payment timeout timestamp
 */
const calculatePaymentTimeout = (timeoutMinutes = null) => {
  const timeout = timeoutMinutes || paymentConfig.payment.timeoutMinutes;
  return new Date(Date.now() + timeout * 60 * 1000);
};

/**
 * Check if payment has expired
 */
const isPaymentExpired = (expiresAt) => {
  return new Date() > new Date(expiresAt);
};

/**
 * Generate webhook signature
 */
const generateWebhookSignature = (payload, secret = null) => {
  const webhookSecret = secret || paymentConfig.security.webhookSecret;
  return crypto
    .createHmac('sha256', webhookSecret)
    .update(JSON.stringify(payload))
    .digest('hex');
};

/**
 * Verify webhook signature
 */
const verifyWebhookSignature = (payload, signature, secret = null) => {
  const expectedSignature = generateWebhookSignature(payload, secret);
  return signature === `sha256=${expectedSignature}`;
};

/**
 * Encrypt sensitive data
 */
const encryptData = (data) => {
  try {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(paymentConfig.security.encryptionKey, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);
    
    cipher.setAAD(Buffer.from('ProFitAgent', 'utf8'));
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  } catch (error) {
    throw new Error('Encryption failed');
  }
};

/**
 * Decrypt sensitive data
 */
const decryptData = (encryptedData) => {
  try {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(paymentConfig.security.encryptionKey, 'salt', 32);
    const decipher = crypto.createDecipher(algorithm, key);
    
    decipher.setAAD(Buffer.from('ProFitAgent', 'utf8'));
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  } catch (error) {
    throw new Error('Decryption failed');
  }
};

/**
 * Generate secure random string
 */
const generateSecureRandom = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Hash password or sensitive data
 */
const hashData = (data, salt = null) => {
  const saltToUse = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(data, saltToUse, 10000, 64, 'sha512').toString('hex');
  return {
    hash,
    salt: saltToUse
  };
};

/**
 * Verify hashed data
 */
const verifyHash = (data, hash, salt) => {
  const verifyHash = crypto.pbkdf2Sync(data, salt, 10000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
};

/**
 * Format currency amount for display
 */
const formatCurrency = (amount, currency = 'USDT', decimals = 2) => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
  
  return `${formatter.format(amount)} ${currency}`;
};

/**
 * Calculate transaction fee
 */
const calculateTransactionFee = (gasPrice, gasLimit) => {
  try {
    const gasPriceWei = ethers.utils.parseUnits(gasPrice.toString(), 'gwei');
    const feeWei = gasPriceWei.mul(gasLimit);
    return parseFloat(ethers.utils.formatEther(feeWei));
  } catch (error) {
    return 0;
  }
};

/**
 * Get current gas price from network
 */
const getCurrentGasPrice = async (provider) => {
  try {
    const gasPrice = await provider.getGasPrice();
    const gasPriceGwei = parseFloat(ethers.utils.formatUnits(gasPrice, 'gwei'));
    
    // Apply limits from configuration
    const minGasPrice = paymentConfig.gas.priceGwei;
    const maxGasPrice = paymentConfig.gas.maxPriceGwei;
    
    return Math.min(Math.max(gasPriceGwei, minGasPrice), maxGasPrice);
  } catch (error) {
    return paymentConfig.gas.priceGwei;
  }
};

/**
 * Validate payment amount
 */
const validatePaymentAmount = (amount) => {
  const numAmount = parseFloat(amount);
  
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new Error('Invalid payment amount');
  }
  
  if (numAmount < paymentConfig.payment.minAmount) {
    throw new Error(`Minimum payment amount is ${paymentConfig.payment.minAmount} USDT`);
  }
  
  if (numAmount > paymentConfig.payment.maxAmount) {
    throw new Error(`Maximum payment amount is ${paymentConfig.payment.maxAmount} USDT`);
  }
  
  return numAmount;
};

/**
 * Generate QR code data for payment
 */
const generatePaymentQRData = (address, amount, memo = '') => {
  const qrData = {
    address,
    amount: amount.toString(),
    memo,
    network: 'BSC',
    token: 'USDT'
  };
  
  return `ethereum:${address}?value=${parseUsdtAmount(amount)}&token=USDT&memo=${encodeURIComponent(memo)}`;
};

/**
 * Calculate payment confirmation progress
 */
const calculateConfirmationProgress = (currentConfirmations, requiredConfirmations = null) => {
  const required = requiredConfirmations || paymentConfig.payment.confirmationBlocks;
  const progress = Math.min((currentConfirmations / required) * 100, 100);
  return {
    current: currentConfirmations,
    required,
    progress: Math.round(progress),
    isConfirmed: currentConfirmations >= required
  };
};

/**
 * Generate payment reference number
 */
const generatePaymentReference = (orderId, userId) => {
  const timestamp = Date.now().toString(36);
  const hash = crypto.createHash('md5').update(`${orderId}-${userId}-${timestamp}`).digest('hex').substring(0, 8);
  return `REF-${hash.toUpperCase()}`;
};

/**
 * Validate license level for payment
 */
const validateLicenseLevel = (licenseLevel) => {
  const validLevels = ['basic', 'standard', 'premium', 'elite', 'enterprise'];
  return validLevels.includes(licenseLevel.toLowerCase());
};

/**
 * Get license price by level
 */
const getLicensePrice = (licenseLevel) => {
  const prices = {
    basic: 50,
    standard: 150,
    premium: 350,
    elite: 750,
    enterprise: 1500
  };
  
  return prices[licenseLevel.toLowerCase()] || 0;
};

/**
 * Format blockchain explorer URL
 */
const getExplorerUrl = (txHash, type = 'tx') => {
  const { getCurrentExplorerUrl } = require('../config/payment-config');
  const baseUrl = getCurrentExplorerUrl();
  
  switch (type) {
    case 'tx':
      return `${baseUrl}/tx/${txHash}`;
    case 'address':
      return `${baseUrl}/address/${txHash}`;
    case 'token':
      return `${baseUrl}/token/${txHash}`;
    default:
      return `${baseUrl}/tx/${txHash}`;
  }
};

/**
 * Sleep utility for delays
 */
const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Retry function with exponential backoff
 */
const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      const delay = baseDelay * Math.pow(2, i);
      await sleep(delay);
    }
  }
};

/**
 * Sanitize user input
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[<>"'&]/g, '')
    .substring(0, 1000); // Limit length
};

/**
 * Generate audit log entry
 */
const generateAuditLog = (action, userId, details = {}) => {
  return {
    timestamp: new Date().toISOString(),
    action,
    userId,
    details,
    ip: details.ip || 'unknown',
    userAgent: details.userAgent || 'unknown',
    sessionId: details.sessionId || 'unknown'
  };
};

/**
 * Check if address is in whitelist
 */
const isAddressWhitelisted = (address, whitelist = []) => {
  return whitelist.includes(address.toLowerCase());
};

/**
 * Generate payment notification message
 */
const generateNotificationMessage = (type, data) => {
  const messages = {
    payment_received: `Payment of ${formatCurrency(data.amount)} received for order ${data.orderId}`,
    payment_confirmed: `Payment of ${formatCurrency(data.amount)} confirmed for order ${data.orderId}`,
    payment_failed: `Payment failed for order ${data.orderId}: ${data.reason}`,
    payment_expired: `Payment expired for order ${data.orderId}`,
    refund_processed: `Refund of ${formatCurrency(data.amount)} processed for order ${data.orderId}`
  };
  
  return messages[type] || `Payment notification: ${type}`;
};

module.exports = {
  generateOrderId,
  generatePaymentAddress,
  isValidAddress,
  isValidTxHash,
  formatUsdtAmount,
  parseUsdtAmount,
  calculatePaymentTimeout,
  isPaymentExpired,
  generateWebhookSignature,
  verifyWebhookSignature,
  encryptData,
  decryptData,
  generateSecureRandom,
  hashData,
  verifyHash,
  formatCurrency,
  calculateTransactionFee,
  getCurrentGasPrice,
  validatePaymentAmount,
  generatePaymentQRData,
  calculateConfirmationProgress,
  generatePaymentReference,
  validateLicenseLevel,
  getLicensePrice,
  getExplorerUrl,
  sleep,
  retryWithBackoff,
  sanitizeInput,
  generateAuditLog,
  isAddressWhitelisted,
  generateNotificationMessage
};