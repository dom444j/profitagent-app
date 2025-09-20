/**
 * Monitoring Middleware for ProFitAgent
 * Captures request metrics, performance data, and system health
 */

const monitoringService = require('../services/monitoring-service');

/**
 * Request metrics middleware
 * Tracks response times, status codes, and request patterns
 */
const requestMetrics = (req, res, next) => {
  const startTime = Date.now();
  const originalSend = res.send;
  
  // Override res.send to capture response data
  res.send = function(data) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // Capture request metrics
    const metrics = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      timestamp: new Date().toISOString(),
      userId: req.user?.id,
      userEmail: req.user?.email
    };
    
    // Send metrics to monitoring service
    try {
      monitoringService.recordRequestMetric(metrics);
    } catch (error) {
      console.error('Failed to record request metric:', error);
    }
    
    // Call original send
    originalSend.call(this, data);
  };
  
  next();
};

/**
 * Error tracking middleware
 * Captures and reports application errors
 */
const errorTracking = (err, req, res, next) => {
  const errorData = {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    userId: req.user?.id,
    userEmail: req.user?.email,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
    severity: err.statusCode >= 500 ? 'error' : 'warning'
  };
  
  try {
    monitoringService.recordError(errorData);
  } catch (monitoringError) {
    console.error('Failed to record error:', monitoringError);
  }
  
  next(err);
};

/**
 * Performance monitoring middleware
 * Tracks memory usage and system performance
 */
const performanceMonitoring = (req, res, next) => {
  // Record memory usage periodically
  if (Math.random() < 0.1) { // 10% sampling rate
    try {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      monitoringService.recordPerformanceMetric({
        memoryUsage,
        cpuUsage,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to record performance metric:', error);
    }
  }
  
  next();
};

/**
 * Payment monitoring middleware
 * Tracks payment-related requests and transactions
 */
const paymentMonitoring = (req, res, next) => {
  // Only monitor payment-related routes
  if (!req.originalUrl.includes('/payments')) {
    return next();
  }
  
  const startTime = Date.now();
  const originalSend = res.send;
  
  res.send = function(data) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    try {
      let parsedData;
      try {
        parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      } catch (parseError) {
        parsedData = { raw: data };
      }
      
      const paymentMetric = {
        endpoint: req.originalUrl,
        method: req.method,
        statusCode: res.statusCode,
        responseTime,
        success: res.statusCode < 400,
        userId: req.user?.id,
        orderId: req.body?.orderId || req.params?.orderId,
        amount: req.body?.amount,
        currency: req.body?.currency || 'USDT',
        timestamp: new Date().toISOString()
      };
      
      monitoringService.recordPaymentMetric(paymentMetric);
      
      // Check for payment alerts
      if (res.statusCode >= 400) {
        monitoringService.checkPaymentAlerts({
          type: 'payment_error',
          data: paymentMetric,
          error: parsedData.error
        });
      }
    } catch (error) {
      console.error('Failed to record payment metric:', error);
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

/**
 * Security monitoring middleware
 * Tracks suspicious activities and security events
 */
const securityMonitoring = (req, res, next) => {
  const suspiciousPatterns = [
    /\.\.\//, // Path traversal
    /<script/i, // XSS attempts
    /union.*select/i, // SQL injection
    /javascript:/i, // JavaScript injection
    /eval\(/i, // Code injection
    /exec\(/i // Command injection
  ];
  
  const checkSuspicious = (value) => {
    if (typeof value !== 'string') return false;
    return suspiciousPatterns.some(pattern => pattern.test(value));
  };
  
  // Check URL, query params, and body for suspicious content
  const suspicious = [
    req.originalUrl,
    JSON.stringify(req.query),
    JSON.stringify(req.body)
  ].some(checkSuspicious);
  
  if (suspicious) {
    const securityEvent = {
      type: 'suspicious_request',
      url: req.originalUrl,
      method: req.method,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
      query: req.query,
      body: req.body,
      timestamp: new Date().toISOString(),
      severity: 'warning'
    };
    
    try {
      monitoringService.recordSecurityEvent(securityEvent);
    } catch (error) {
      console.error('Failed to record security event:', error);
    }
  }
  
  next();
};

/**
 * Rate limiting monitoring middleware
 * Tracks rate limit violations and patterns
 */
const rateLimitMonitoring = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Check if this is a rate limit response
    if (res.statusCode === 429) {
      const rateLimitEvent = {
        type: 'rate_limit_exceeded',
        url: req.originalUrl,
        method: req.method,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id,
        timestamp: new Date().toISOString(),
        severity: 'warning'
      };
      
      try {
        monitoringService.recordSecurityEvent(rateLimitEvent);
      } catch (error) {
        console.error('Failed to record rate limit event:', error);
      }
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

/**
 * Database monitoring middleware
 * Tracks database query performance and errors
 */
const databaseMonitoring = () => {
  // This would typically be implemented as a Prisma middleware
  // For now, we'll provide a placeholder that can be extended
  return {
    query: async (params, next) => {
      const startTime = Date.now();
      
      try {
        const result = await next(params);
        const endTime = Date.now();
        const queryTime = endTime - startTime;
        
        // Record successful query
        monitoringService.recordDatabaseMetric({
          model: params.model,
          action: params.action,
          queryTime,
          success: true,
          timestamp: new Date().toISOString()
        });
        
        return result;
      } catch (error) {
        const endTime = Date.now();
        const queryTime = endTime - startTime;
        
        // Record failed query
        monitoringService.recordDatabaseMetric({
          model: params.model,
          action: params.action,
          queryTime,
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        
        throw error;
      }
    }
  };
};

/**
 * Health check middleware
 * Provides basic health status for load balancers
 */
const healthCheck = (req, res, next) => {
  if (req.path === '/health' || req.path === '/api/health') {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version
    };
    
    return res.json(health);
  }
  
  next();
};

/**
 * Comprehensive monitoring middleware setup
 * Combines all monitoring middlewares
 */
const setupMonitoring = (app) => {
  // Health check (should be first)
  app.use(healthCheck);
  
  // Performance monitoring
  app.use(performanceMonitoring);
  
  // Security monitoring
  app.use(securityMonitoring);
  
  // Request metrics
  app.use(requestMetrics);
  
  // Payment monitoring
  app.use(paymentMonitoring);
  
  // Rate limit monitoring
  app.use(rateLimitMonitoring);
  
  // Error tracking (should be last)
  app.use(errorTracking);
};

module.exports = {
  requestMetrics,
  errorTracking,
  performanceMonitoring,
  paymentMonitoring,
  securityMonitoring,
  rateLimitMonitoring,
  databaseMonitoring,
  healthCheck,
  setupMonitoring
};