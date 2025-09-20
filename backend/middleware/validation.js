/**
 * Validation Middleware for ProFitAgent
 * Handles request validation for various endpoints
 */

const { body, param, query, validationResult } = require('express-validator');

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

/**
 * Validate payment request
 */
const validatePaymentRequest = [
  body('productId')
    .notEmpty()
    .withMessage('Product ID is required')
    .isString()
    .withMessage('Product ID must be a string'),
  handleValidationErrors
];

/**
 * Validate order ID parameter
 */
const validateOrderId = [
  param('orderId')
    .notEmpty()
    .withMessage('Order ID is required')
    .isString()
    .withMessage('Order ID must be a string'),
  handleValidationErrors
];

/**
 * Validate wallet address parameter
 */
const validateWalletAddress = [
  param('address')
    .notEmpty()
    .withMessage('Wallet address is required')
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Invalid wallet address format'),
  handleValidationErrors
];

/**
 * Validate manual payment verification
 */
const validateManualVerification = [
  body('orderId')
    .notEmpty()
    .withMessage('Order ID is required')
    .isString()
    .withMessage('Order ID must be a string'),
  body('txHash')
    .notEmpty()
    .withMessage('Transaction hash is required')
    .matches(/^0x[a-fA-F0-9]{64}$/)
    .withMessage('Invalid transaction hash format'),
  handleValidationErrors
];

/**
 * Validate pagination parameters
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

/**
 * Validate user registration
 */
const validateUserRegistration = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  body('first_name')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('last_name')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Valid phone number is required'),
  body('sponsorRefCode')
    .optional()
    .isString()
    .withMessage('Sponsor reference code must be a string'),
  handleValidationErrors
];

/**
 * Validate user login
 */
const validateUserLogin = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

/**
 * Validate agent creation
 */
const validateAgentCreation = [
  body('code')
    .notEmpty()
    .withMessage('Agent code is required')
    .isLength({ min: 3, max: 20 })
    .withMessage('Agent code must be between 3 and 20 characters')
    .matches(/^[A-Z0-9_]+$/)
    .withMessage('Agent code must contain only uppercase letters, numbers, and underscores'),
  body('name')
    .notEmpty()
    .withMessage('Agent name is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Agent name must be between 3 and 100 characters'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  body('agent_type')
    .isIn(['arbitrage', 'grid_trading', 'dca', 'scalping', 'swing_trading', 'market_making', 'momentum', 'mean_reversion'])
    .withMessage('Invalid agent type'),
  body('access_level')
    .isIn(['basic', 'standard', 'premium', 'elite', 'enterprise'])
    .withMessage('Invalid access level'),
  body('supported_exchanges')
    .isArray({ min: 1 })
    .withMessage('At least one supported exchange is required'),
  body('supported_pairs')
    .isArray({ min: 1 })
    .withMessage('At least one supported trading pair is required'),
  body('min_capital')
    .isFloat({ min: 0 })
    .withMessage('Minimum capital must be a positive number'),
  body('max_capital')
    .isFloat({ min: 0 })
    .withMessage('Maximum capital must be a positive number')
    .custom((value, { req }) => {
      if (parseFloat(value) <= parseFloat(req.body.min_capital)) {
        throw new Error('Maximum capital must be greater than minimum capital');
      }
      return true;
    }),
  body('expected_apy')
    .isFloat({ min: 0, max: 1000 })
    .withMessage('Expected APY must be between 0 and 1000'),
  body('risk_level')
    .isIn(['low', 'medium', 'high', 'very_high'])
    .withMessage('Invalid risk level'),
  handleValidationErrors
];

/**
 * Validate agent assignment
 */
const validateAgentAssignment = [
  body('userId')
    .notEmpty()
    .withMessage('User ID is required'),
  body('agentId')
    .notEmpty()
    .withMessage('Agent ID is required'),
  body('licenseId')
    .notEmpty()
    .withMessage('License ID is required'),
  body('allocatedCapital')
    .isFloat({ min: 0 })
    .withMessage('Allocated capital must be a positive number'),
  handleValidationErrors
];

/**
 * Validate Telegram channel creation
 */
const validateTelegramChannel = [
  body('channel_id')
    .notEmpty()
    .withMessage('Channel ID is required')
    .matches(/^-?\d+$/)
    .withMessage('Invalid Telegram channel ID format'),
  body('channel_name')
    .notEmpty()
    .withMessage('Channel name is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Channel name must be between 1 and 100 characters'),
  body('channel_type')
    .isIn(['license_basic', 'license_standard', 'license_premium', 'license_elite', 'license_enterprise', 'general_announcements', 'technical_analysis', 'market_updates', 'support', 'vip'])
    .withMessage('Invalid channel type'),
  body('license_level')
    .optional()
    .isString()
    .withMessage('License level must be a string'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  body('invite_link')
    .optional()
    .isURL()
    .withMessage('Invalid invite link format'),
  handleValidationErrors
];

/**
 * Validate smart contract deployment
 */
const validateSmartContract = [
  body('name')
    .notEmpty()
    .withMessage('Contract name is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Contract name must be between 1 and 100 characters'),
  body('contract_type')
    .isIn(['license_management', 'agent_manager', 'payment_processor', 'governance'])
    .withMessage('Invalid contract type'),
  body('network')
    .isIn(['bsc_mainnet', 'bsc_testnet', 'ethereum_mainnet', 'ethereum_goerli', 'polygon_mainnet', 'polygon_mumbai'])
    .withMessage('Invalid blockchain network'),
  body('address')
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Invalid contract address format'),
  body('abi_json')
    .isObject()
    .withMessage('ABI must be a valid JSON object'),
  body('deployer_address')
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Invalid deployer address format'),
  body('deployment_tx')
    .optional()
    .matches(/^0x[a-fA-F0-9]{64}$/)
    .withMessage('Invalid deployment transaction hash format'),
  body('version')
    .optional()
    .matches(/^\d+\.\d+\.\d+$/)
    .withMessage('Version must be in semantic versioning format (x.y.z)'),
  handleValidationErrors
];

/**
 * Validate withdrawal request
 */
const validateWithdrawalRequest = [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be at least 0.01 USDT'),
  body('wallet_address')
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Invalid wallet address format'),
  body('network')
    .optional()
    .isIn(['BSC', 'ETH', 'POLYGON'])
    .withMessage('Invalid network'),
  handleValidationErrors
];

/**
 * Validate notification creation
 */
const validateNotification = [
  body('user_id')
    .notEmpty()
    .withMessage('User ID is required'),
  body('type')
    .isIn(['withdrawal', 'order', 'earning', 'system', 'security', 'bonus', 'referral'])
    .withMessage('Invalid notification type'),
  body('severity')
    .isIn(['info', 'success', 'warning', 'error'])
    .withMessage('Invalid notification severity'),
  body('title')
    .notEmpty()
    .withMessage('Notification title is required')
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('message')
    .notEmpty()
    .withMessage('Notification message is required')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be between 1 and 1000 characters'),
  body('data')
    .optional()
    .isObject()
    .withMessage('Data must be a valid JSON object'),
  handleValidationErrors
];

module.exports = {
  validatePaymentRequest,
  validateOrderId,
  validateWalletAddress,
  validateManualVerification,
  validatePagination,
  validateUserRegistration,
  validateUserLogin,
  validateAgentCreation,
  validateAgentAssignment,
  validateTelegramChannel,
  validateSmartContract,
  validateWithdrawalRequest,
  validateNotification,
  handleValidationErrors
};