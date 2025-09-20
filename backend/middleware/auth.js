/**
 * Authentication and Authorization Middleware for ProFitAgent
 * Handles JWT token validation and role-based access control
 */

const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Verify JWT token and extract user information
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        user_licenses: {
          where: {
            status: 'active'
          },
          include: {
            license_product: true
          }
        }
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        error: 'Account is deactivated'
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }
    
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

/**
 * Check if user has admin privileges
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  if (!req.user.is_admin) {
    return res.status(403).json({
      success: false,
      error: 'Admin privileges required'
    });
  }

  next();
};

/**
 * Check if user has specific license level
 */
const requireLicense = (requiredLevel) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const hasRequiredLicense = req.user.user_licenses.some(license => {
      const licenseLevel = license.license_product.level;
      return checkLicenseLevel(licenseLevel, requiredLevel);
    });

    if (!hasRequiredLicense) {
      return res.status(403).json({
        success: false,
        error: `${requiredLevel} license or higher required`
      });
    }

    next();
  };
};

/**
 * Check if license level meets requirement
 */
const checkLicenseLevel = (userLevel, requiredLevel) => {
  const levels = {
    'basic': 1,
    'standard': 2,
    'premium': 3,
    'elite': 4,
    'enterprise': 5
  };

  return levels[userLevel] >= levels[requiredLevel];
};

/**
 * Check if user owns the resource or is admin
 */
const requireOwnership = (resourceUserIdField = 'user_id') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Admin can access any resource
    if (req.user.is_admin) {
      return next();
    }

    // Check if user owns the resource
    const resourceUserId = req.body[resourceUserIdField] || req.params[resourceUserIdField] || req.query[resourceUserIdField];
    
    if (resourceUserId && resourceUserId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: insufficient permissions'
      });
    }

    next();
  };
};

/**
 * Rate limiting middleware
 */
const rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();

  return (req, res, next) => {
    const identifier = req.ip + (req.user ? req.user.id : '');
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old requests
    if (requests.has(identifier)) {
      const userRequests = requests.get(identifier).filter(time => time > windowStart);
      requests.set(identifier, userRequests);
    }

    const currentRequests = requests.get(identifier) || [];

    if (currentRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests, please try again later',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    currentRequests.push(now);
    requests.set(identifier, currentRequests);
    next();
  };
};

/**
 * Validate API key for external services
 */
const validateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API key required'
      });
    }

    // Check if API key is valid (you might want to store these in database)
    const validApiKeys = process.env.VALID_API_KEYS ? process.env.VALID_API_KEYS.split(',') : [];
    
    if (!validApiKeys.includes(apiKey)) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key'
      });
    }

    next();
  } catch (error) {
    console.error('API key validation error:', error);
    return res.status(500).json({
      success: false,
      error: 'API key validation failed'
    });
  }
};

/**
 * Check if user has active license
 */
const requireActiveLicense = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  const hasActiveLicense = req.user.user_licenses && req.user.user_licenses.length > 0;

  if (!hasActiveLicense) {
    return res.status(403).json({
      success: false,
      error: 'Active license required'
    });
  }

  next();
};

/**
 * Validate webhook signature (for payment notifications)
 */
const validateWebhookSignature = (req, res, next) => {
  try {
    const signature = req.headers['x-webhook-signature'];
    const payload = JSON.stringify(req.body);
    const expectedSignature = require('crypto')
      .createHmac('sha256', process.env.WEBHOOK_SECRET || 'default-secret')
      .update(payload)
      .digest('hex');

    if (!signature || signature !== `sha256=${expectedSignature}`) {
      return res.status(401).json({
        success: false,
        error: 'Invalid webhook signature'
      });
    }

    next();
  } catch (error) {
    console.error('Webhook signature validation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Webhook validation failed'
    });
  }
};

/**
 * Log user activity
 */
const logActivity = (action) => {
  return (req, res, next) => {
    if (req.user) {
      // You can implement activity logging here
      console.log(`User ${req.user.id} performed action: ${action}`);
    }
    next();
  };
};

/**
 * Check maintenance mode
 */
const checkMaintenanceMode = (req, res, next) => {
  const isMaintenanceMode = process.env.MAINTENANCE_MODE === 'true';
  
  if (isMaintenanceMode && (!req.user || !req.user.is_admin)) {
    return res.status(503).json({
      success: false,
      error: 'System is under maintenance. Please try again later.',
      maintenanceMode: true
    });
  }

  next();
};

/**
 * Validate request origin
 */
const validateOrigin = (req, res, next) => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'];
  const origin = req.headers.origin;

  if (origin && !allowedOrigins.includes(origin)) {
    return res.status(403).json({
      success: false,
      error: 'Origin not allowed'
    });
  }

  next();
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireLicense,
  requireOwnership,
  requireActiveLicense,
  rateLimit,
  validateApiKey,
  validateWebhookSignature,
  logActivity,
  checkMaintenanceMode,
  validateOrigin,
  checkLicenseLevel
};