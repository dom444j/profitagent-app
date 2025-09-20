/**
 * Monitoring API Routes for ProFitAgent
 * Provides endpoints for system monitoring, metrics, and health checks
 */

const express = require('express');
const router = express.Router();
const monitoringService = require('../services/monitoring-service');
const { authenticateToken, requireAdmin, rateLimit } = require('../middleware/auth');
const { validatePagination } = require('../middleware/validation');

// Apply rate limiting to monitoring endpoints
router.use(rateLimit(50, 15 * 60 * 1000)); // 50 requests per 15 minutes

/**
 * @route GET /api/monitoring/health
 * @desc Get system health status
 * @access Public (for load balancers)
 */
router.get('/health', async (req, res) => {
  try {
    const healthStatus = monitoringService.getHealthStatus();
    
    const statusCode = healthStatus.status === 'healthy' ? 200 : 
                      healthStatus.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json({
      success: true,
      data: healthStatus
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      success: false,
      error: 'Health check failed',
      details: error.message
    });
  }
});

/**
 * @route GET /api/monitoring/metrics
 * @desc Get system metrics
 * @access Admin only
 */
router.get('/metrics', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const metrics = monitoringService.getMetrics();
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve metrics',
      details: error.message
    });
  }
});

/**
 * @route GET /api/monitoring/alerts
 * @desc Get recent alerts
 * @access Admin only
 */
router.get('/alerts', authenticateToken, requireAdmin, validatePagination, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const alerts = monitoringService.getAlerts(limit);
    
    res.json({
      success: true,
      data: {
        alerts,
        total: alerts.length,
        limit
      }
    });
  } catch (error) {
    console.error('Alerts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve alerts',
      details: error.message
    });
  }
});

/**
 * @route GET /api/monitoring/report
 * @desc Get comprehensive monitoring report
 * @access Admin only
 */
router.get('/report', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const report = monitoringService.generateReport();
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate report',
      details: error.message
    });
  }
});

/**
 * @route POST /api/monitoring/start
 * @desc Start monitoring service
 * @access Admin only
 */
router.post('/start', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await monitoringService.startMonitoring();
    
    res.json({
      success: true,
      message: 'Monitoring service started successfully'
    });
  } catch (error) {
    console.error('Start monitoring error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start monitoring service',
      details: error.message
    });
  }
});

/**
 * @route POST /api/monitoring/stop
 * @desc Stop monitoring service
 * @access Admin only
 */
router.post('/stop', authenticateToken, requireAdmin, async (req, res) => {
  try {
    monitoringService.stopMonitoring();
    
    res.json({
      success: true,
      message: 'Monitoring service stopped successfully'
    });
  } catch (error) {
    console.error('Stop monitoring error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop monitoring service',
      details: error.message
    });
  }
});

/**
 * @route GET /api/monitoring/status
 * @desc Get monitoring service status
 * @access Admin only
 */
router.get('/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const status = {
      isRunning: monitoringService.isMonitoring,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    };
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve status',
      details: error.message
    });
  }
});

/**
 * @route GET /api/monitoring/payments/stats
 * @desc Get payment system statistics
 * @access Admin only
 */
router.get('/payments/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const metrics = monitoringService.getMetrics();
    const paymentStats = metrics.payments;
    
    // Add additional payment statistics
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const [daily, weekly, monthly] = await Promise.all([
      prisma.orderDeposit.aggregate({
        where: {
          created_at: { gte: last24Hours },
          status: 'confirmed'
        },
        _sum: { amount: true },
        _count: true
      }),
      prisma.orderDeposit.aggregate({
        where: {
          created_at: { gte: lastWeek },
          status: 'confirmed'
        },
        _sum: { amount: true },
        _count: true
      }),
      prisma.orderDeposit.aggregate({
        where: {
          created_at: { gte: lastMonth },
          status: 'confirmed'
        },
        _sum: { amount: true },
        _count: true
      })
    ]);
    
    const enhancedStats = {
      ...paymentStats,
      periods: {
        daily: {
          count: daily._count,
          volume: daily._sum.amount || 0
        },
        weekly: {
          count: weekly._count,
          volume: weekly._sum.amount || 0
        },
        monthly: {
          count: monthly._count,
          volume: monthly._sum.amount || 0
        }
      }
    };
    
    res.json({
      success: true,
      data: enhancedStats
    });
  } catch (error) {
    console.error('Payment stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve payment statistics',
      details: error.message
    });
  }
});

/**
 * @route GET /api/monitoring/agents/performance
 * @desc Get agent performance metrics
 * @access Admin only
 */
router.get('/agents/performance', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const agentPerformance = await prisma.agentPerformance.findMany({
      include: {
        agent: {
          select: {
            code: true,
            name: true,
            agent_type: true,
            status: true
          }
        },
        assignment: {
          select: {
            allocated_capital: true,
            user: {
              select: {
                email: true
              }
            }
          }
        }
      },
      orderBy: {
        updated_at: 'desc'
      },
      take: 100
    });
    
    const performanceStats = {
      totalAgents: agentPerformance.length,
      avgDailyReturn: agentPerformance.reduce((sum, p) => sum + (p.daily_return || 0), 0) / agentPerformance.length,
      avgTotalReturn: agentPerformance.reduce((sum, p) => sum + (p.total_return || 0), 0) / agentPerformance.length,
      totalTrades: agentPerformance.reduce((sum, p) => sum + (p.trades_count || 0), 0),
      topPerformers: agentPerformance
        .sort((a, b) => (b.total_return || 0) - (a.total_return || 0))
        .slice(0, 10)
    };
    
    res.json({
      success: true,
      data: {
        performance: agentPerformance,
        stats: performanceStats
      }
    });
  } catch (error) {
    console.error('Agent performance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve agent performance',
      details: error.message
    });
  }
});

/**
 * @route GET /api/monitoring/blockchain/status
 * @desc Get blockchain connection status
 * @access Admin only
 */
router.get('/blockchain/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const metrics = monitoringService.getMetrics();
    const blockchainStatus = metrics.blockchain;
    
    res.json({
      success: true,
      data: blockchainStatus
    });
  } catch (error) {
    console.error('Blockchain status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve blockchain status',
      details: error.message
    });
  }
});

/**
 * @route POST /api/monitoring/test-alert
 * @desc Send test alert (for testing notification systems)
 * @access Admin only
 */
router.post('/test-alert', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { type = 'test', message = 'Test alert from ProFitAgent monitoring system' } = req.body;
    
    await monitoringService.sendAlert(type, {
      severity: 'info',
      message,
      data: {
        test: true,
        triggeredBy: req.user.email,
        timestamp: new Date().toISOString()
      }
    });
    
    res.json({
      success: true,
      message: 'Test alert sent successfully'
    });
  } catch (error) {
    console.error('Test alert error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test alert',
      details: error.message
    });
  }
});

/**
 * @route GET /api/monitoring/logs
 * @desc Get recent system logs
 * @access Admin only
 */
router.get('/logs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    const { lines = 100 } = req.query;
    
    const logFiles = {
      payments: 'logs/payments.log',
      errors: 'logs/payment-errors.log',
      audit: 'logs/audit.log'
    };
    
    const logs = {};
    
    for (const [type, filePath] of Object.entries(logFiles)) {
      try {
        const fullPath = path.join(process.cwd(), filePath);
        const content = await fs.readFile(fullPath, 'utf8');
        const logLines = content.split('\n').filter(line => line.trim());
        logs[type] = logLines.slice(-lines).reverse(); // Get last N lines, newest first
      } catch (fileError) {
        logs[type] = [`Log file not found: ${filePath}`];
      }
    }
    
    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('Logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve logs',
      details: error.message
    });
  }
});

module.exports = router;