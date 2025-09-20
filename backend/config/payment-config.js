/**
 * Payment System Configuration for ProFitAgent
 * Centralizes all payment-related configuration settings
 */

require('dotenv').config({ path: '.env.payments' });

const paymentConfig = {
  // Blockchain Configuration
  blockchain: {
    bsc: {
      rpcUrl: process.env.BSC_RPC_URL || 'https://bsc-dataseed1.binance.org/',
      testnetRpcUrl: process.env.BSC_TESTNET_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545/',
      chainId: parseInt(process.env.BSC_CHAIN_ID) || 56,
      testnetChainId: parseInt(process.env.BSC_TESTNET_CHAIN_ID) || 97,
      explorerUrl: 'https://bscscan.com',
      testnetExplorerUrl: 'https://testnet.bscscan.com'
    }
  },

  // USDT Contract Configuration
  usdt: {
    mainnet: {
      address: process.env.USDT_CONTRACT_ADDRESS || '0x55d398326f99059fF775485246999027B3197955',
      decimals: 18
    },
    testnet: {
      address: process.env.USDT_TESTNET_CONTRACT_ADDRESS || '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd',
      decimals: 18
    }
  },

  // Wallet Configuration
  wallets: {
    payment: {
      privateKey: process.env.PAYMENT_WALLET_PRIVATE_KEY,
      address: process.env.PAYMENT_WALLET_ADDRESS
    },
    gas: {
      privateKey: process.env.GAS_WALLET_PRIVATE_KEY,
      address: process.env.GAS_WALLET_ADDRESS
    },
    backup: {
      addresses: process.env.BACKUP_WALLET_ADDRESSES ? process.env.BACKUP_WALLET_ADDRESSES.split(',') : []
    }
  },

  // Payment Processing Settings
  payment: {
    confirmationBlocks: parseInt(process.env.PAYMENT_CONFIRMATION_BLOCKS) || 12,
    timeoutMinutes: parseInt(process.env.PAYMENT_TIMEOUT_MINUTES) || 30,
    minAmount: parseFloat(process.env.MIN_PAYMENT_AMOUNT) || 10,
    maxAmount: parseFloat(process.env.MAX_PAYMENT_AMOUNT) || 50000,
    checkInterval: parseInt(process.env.PAYMENT_CHECK_INTERVAL) || 60000,
    retryAttempts: parseInt(process.env.FAILED_PAYMENT_RETRY_ATTEMPTS) || 3,
    retryDelay: parseInt(process.env.FAILED_PAYMENT_RETRY_DELAY) || 300000
  },

  // Gas Configuration
  gas: {
    limit: parseInt(process.env.GAS_LIMIT) || 21000,
    priceGwei: parseInt(process.env.GAS_PRICE_GWEI) || 5,
    maxPriceGwei: parseInt(process.env.MAX_GAS_PRICE_GWEI) || 20
  },

  // Security Configuration
  security: {
    webhookSecret: process.env.WEBHOOK_SECRET || 'default-webhook-secret',
    encryptionKey: process.env.ENCRYPTION_KEY || 'default-encryption-key',
    hmacSecret: process.env.HMAC_SECRET || 'default-hmac-secret',
    twoFactorRequired: process.env.TWO_FACTOR_AUTH_REQUIRED === 'true',
    ipWhitelistEnabled: process.env.IP_WHITELIST_ENABLED === 'true',
    fraudDetectionEnabled: process.env.FRAUD_DETECTION_ENABLED === 'true'
  },

  // Rate Limiting
  rateLimit: {
    requests: parseInt(process.env.PAYMENT_RATE_LIMIT_REQUESTS) || 10,
    windowMs: parseInt(process.env.PAYMENT_RATE_LIMIT_WINDOW_MS) || 900000
  },

  // API Keys
  apiKeys: {
    bscscan: process.env.BSCSCAN_API_KEY,
    mortalis: process.env.MORTALIS_API_KEY
  },

  // Telegram Integration - ProFitAgent Bots
  telegram: {
    // ProFitAgent Alerts Bot
    alertsBot: {
      token: process.env.TELEGRAM_ALERTS_BOT_TOKEN || '8400787745:AAFWpOHrusGj7nwcRIvnKs3gm1axrETTUm4',
      chatId: process.env.TELEGRAM_ALERTS_CHAT_ID // Admin chat ID needed
    },
    // ProFitAgent OTP Bot
    otpBot: {
      token: process.env.TELEGRAM_OTP_BOT_TOKEN || '8386625703:AAEj6M0hvAe65RZDfWWa4wXak9Rk1jtR-Zk',
      chatId: process.env.TELEGRAM_OTP_CHAT_ID // Admin chat ID needed
    },
    // Legacy support (deprecated)
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    paymentNotifications: process.env.TELEGRAM_PAYMENT_NOTIFICATIONS === 'true',
    adminChatId: process.env.TELEGRAM_ADMIN_CHAT_ID
  },

  // Database Configuration
  database: {
    poolSize: parseInt(process.env.PAYMENT_DB_POOL_SIZE) || 10,
    timeout: parseInt(process.env.PAYMENT_DB_TIMEOUT) || 30000
  },

  // Logging Configuration
  logging: {
    level: process.env.PAYMENT_LOG_LEVEL || 'info',
    file: process.env.PAYMENT_LOG_FILE || 'logs/payments.log',
    errorFile: process.env.PAYMENT_ERROR_LOG_FILE || 'logs/payment-errors.log'
  },

  // Environment Settings
  environment: {
    nodeEnv: process.env.NODE_ENV || 'development',
    paymentEnv: process.env.PAYMENT_ENVIRONMENT || 'testnet',
    testMode: process.env.TEST_MODE === 'true',
    maintenanceMode: process.env.MAINTENANCE_MODE === 'true'
  },

  // License Product Configuration
  licenses: {
    basic: process.env.BASIC_LICENSE_PRODUCT_ID,
    standard: process.env.STANDARD_LICENSE_PRODUCT_ID,
    premium: process.env.PREMIUM_LICENSE_PRODUCT_ID,
    elite: process.env.ELITE_LICENSE_PRODUCT_ID,
    enterprise: process.env.ENTERPRISE_LICENSE_PRODUCT_ID
  },

  // Agent Assignment
  agents: {
    autoAssign: process.env.AUTO_ASSIGN_AGENTS === 'true',
    maxPerLicense: parseInt(process.env.MAX_AGENTS_PER_LICENSE) || 5,
    assignmentDelay: parseInt(process.env.AGENT_ASSIGNMENT_DELAY_MS) || 5000
  },

  // Monitoring and Alerts
  monitoring: {
    enabled: process.env.PERFORMANCE_MONITORING === 'true',
    metricsInterval: parseInt(process.env.METRICS_COLLECTION_INTERVAL) || 300000,
    alertThresholds: {
      failedPayments: parseInt(process.env.ALERT_THRESHOLD_FAILED_PAYMENTS) || 5,
      lowBalance: parseFloat(process.env.ALERT_THRESHOLD_LOW_BALANCE) || 100
    },
    healthCheckEndpoint: process.env.HEALTH_CHECK_ENDPOINT || '/health',
    metricsEndpoint: process.env.METRICS_ENDPOINT || '/metrics'
  },

  // External APIs
  externalApis: {
    priceApi: process.env.PRICE_API_URL || 'https://api.coingecko.com/api/v3/simple/price',
    blockchainExplorer: process.env.BLOCKCHAIN_EXPLORER_API || 'https://api.bscscan.com/api'
  },

  // Smart Contract Interaction
  contracts: {
    interactionTimeout: parseInt(process.env.CONTRACT_INTERACTION_TIMEOUT) || 30000,
    maxRetries: parseInt(process.env.MAX_CONTRACT_RETRIES) || 3,
    retryDelay: parseInt(process.env.CONTRACT_RETRY_DELAY) || 5000
  },

  // Cache Configuration
  cache: {
    redisUrl: process.env.REDIS_URL || 'redis://redis-15570.c93.us-east-1-3.ec2.redis-cloud.com:15570',
    ttlSeconds: parseInt(process.env.CACHE_TTL_SECONDS) || 3600,
    paymentStatus: process.env.CACHE_PAYMENT_STATUS === 'true'
  },

  // Queue Configuration
  queue: {
    redisUrl: process.env.QUEUE_REDIS_URL || 'redis://redis-15570.c93.us-east-1-3.ec2.redis-cloud.com:15570',
    paymentQueueName: process.env.PAYMENT_QUEUE_NAME || 'payment_processing',
    workerConcurrency: parseInt(process.env.PAYMENT_WORKER_CONCURRENCY) || 5
  },

  // Feature Flags
  features: {
    automaticRefunds: process.env.ENABLE_AUTOMATIC_REFUNDS === 'true',
    partialPayments: process.env.ENABLE_PARTIAL_PAYMENTS === 'true',
    paymentSplitting: process.env.ENABLE_PAYMENT_SPLITTING === 'true',
    loyaltyRewards: process.env.ENABLE_LOYALTY_REWARDS === 'true',
    customValidation: process.env.CUSTOM_VALIDATION_ENABLED === 'true',
    businessRulesEngine: process.env.BUSINESS_RULES_ENGINE === 'enabled',
    dynamicPricing: process.env.DYNAMIC_PRICING_ENABLED === 'true'
  },

  // Compliance and Audit
  compliance: {
    reporting: process.env.COMPLIANCE_REPORTING === 'true',
    auditLogEnabled: process.env.AUDIT_LOG_ENABLED === 'true',
    auditLogFile: process.env.AUDIT_LOG_FILE || 'logs/audit.log',
    gdprCompliance: process.env.GDPR_COMPLIANCE === 'true',
    ccpaCompliance: process.env.CCPA_COMPLIANCE === 'true'
  },

  // Notification Settings
  notifications: {
    email: process.env.EMAIL_NOTIFICATIONS === 'true',
    sms: process.env.SMS_NOTIFICATIONS === 'true',
    push: process.env.PUSH_NOTIFICATIONS === 'true',
    alertEmail: process.env.ALERT_EMAIL,
    alertWebhook: process.env.ALERT_WEBHOOK_URL
  },

  // Testing Configuration
  testing: {
    testWalletAddress: process.env.TEST_WALLET_ADDRESS,
    testPrivateKey: process.env.TEST_PRIVATE_KEY,
    skipBlockchainVerification: process.env.SKIP_BLOCKCHAIN_VERIFICATION === 'true'
  },

  // Emergency Contacts
  emergency: {
    email: process.env.EMERGENCY_CONTACT_EMAIL,
    telegram: process.env.EMERGENCY_CONTACT_TELEGRAM
  },

  // Localization
  localization: {
    defaultLanguage: process.env.DEFAULT_LANGUAGE || 'en',
    supportedLanguages: process.env.SUPPORTED_LANGUAGES ? process.env.SUPPORTED_LANGUAGES.split(',') : ['en', 'es'],
    currencyFormat: process.env.CURRENCY_DISPLAY_FORMAT || 'USD'
  },

  // Multi-signature Wallet (if applicable)
  multisig: {
    walletAddress: process.env.MULTISIG_WALLET_ADDRESS,
    requiredConfirmations: parseInt(process.env.MULTISIG_REQUIRED_CONFIRMATIONS) || 2,
    owners: process.env.MULTISIG_OWNERS ? process.env.MULTISIG_OWNERS.split(',') : []
  }
};

// Validation function
const validateConfig = () => {
  const errors = [];

  // Check required environment variables
  if (!paymentConfig.wallets.payment.privateKey) {
    errors.push('PAYMENT_WALLET_PRIVATE_KEY is required');
  }

  if (!paymentConfig.wallets.payment.address) {
    errors.push('PAYMENT_WALLET_ADDRESS is required');
  }

  if (!paymentConfig.security.webhookSecret || paymentConfig.security.webhookSecret === 'default-webhook-secret') {
    errors.push('WEBHOOK_SECRET should be set to a secure value');
  }

  if (!paymentConfig.security.encryptionKey || paymentConfig.security.encryptionKey === 'default-encryption-key') {
    errors.push('ENCRYPTION_KEY should be set to a secure value');
  }

  // Validate wallet addresses format
  const addressRegex = /^0x[a-fA-F0-9]{40}$/;
  if (paymentConfig.wallets.payment.address && !addressRegex.test(paymentConfig.wallets.payment.address)) {
    errors.push('PAYMENT_WALLET_ADDRESS has invalid format');
  }

  if (paymentConfig.wallets.gas.address && !addressRegex.test(paymentConfig.wallets.gas.address)) {
    errors.push('GAS_WALLET_ADDRESS has invalid format');
  }

  // Validate payment amounts
  if (paymentConfig.payment.minAmount >= paymentConfig.payment.maxAmount) {
    errors.push('MIN_PAYMENT_AMOUNT must be less than MAX_PAYMENT_AMOUNT');
  }

  if (errors.length > 0) {
    throw new Error(`Payment configuration validation failed:\n${errors.join('\n')}`);
  }
};

// Helper functions
const isTestnet = () => {
  return paymentConfig.environment.paymentEnv === 'testnet' || paymentConfig.environment.testMode;
};

const getCurrentUsdtConfig = () => {
  return isTestnet() ? paymentConfig.usdt.testnet : paymentConfig.usdt.mainnet;
};

const getCurrentChainId = () => {
  return isTestnet() ? paymentConfig.blockchain.bsc.testnetChainId : paymentConfig.blockchain.bsc.chainId;
};

const getCurrentRpcUrl = () => {
  return isTestnet() ? paymentConfig.blockchain.bsc.testnetRpcUrl : paymentConfig.blockchain.bsc.rpcUrl;
};

const getCurrentExplorerUrl = () => {
  return isTestnet() ? paymentConfig.blockchain.bsc.testnetExplorerUrl : paymentConfig.blockchain.bsc.explorerUrl;
};

// Export configuration and helper functions
module.exports = {
  paymentConfig,
  validateConfig,
  isTestnet,
  getCurrentUsdtConfig,
  getCurrentChainId,
  getCurrentRpcUrl,
  getCurrentExplorerUrl
};