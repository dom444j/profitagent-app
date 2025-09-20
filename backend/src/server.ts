import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

// Import routes
import { authRoutes } from './modules/auth/routes';
import { userRoutes } from './modules/user/routes';
import { productRoutes } from './modules/products/routes';
import { orderRoutes } from './modules/orders/routes';
import { adminRoutes } from './modules/admin/routes';
import { licenseRoutes } from './modules/licenses/routes';
import { balanceRoutes } from './modules/balance/routes';
import { withdrawalRoutes } from './modules/withdrawals/routes';
import { adminWithdrawalRoutes } from './modules/admin/withdrawals.routes';
import { sseRoutes } from './modules/sse/routes';
import referralRoutes from './modules/referrals/routes';
import { notificationRoutes } from './modules/notifications/routes';
import telegramRoutes from './modules/telegram/routes';
import telegramCommunicationRoutes from './routes/telegram';
import telegramAdminRoutes from './routes/telegram-admin';
import { systemRoutes } from './modules/system/routes';
// Import OTP routes (JavaScript module)
const otpRoutes = require('../routes/otp');
import { sseService } from './services/sse';
import { authMiddleware, adminMiddleware } from './lib/middleware';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure correct proxy handling for secure cookies and HTTPS behind Nginx
app.set('trust proxy', 1);


// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'development' ? ['http://localhost:3000', 'http://localhost:5173'] : process.env.FRONTEND_URL,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET));

// Health checks
app.get('/api/v1/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/v1/admin/health', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',
      redis: 'connected',
      sse: 'active'
    }
  });
});

// API routes logging middleware
app.use('/api/v1', (req: Request, res: Response, next: NextFunction) => {
  logger.info({ method: req.method, url: req.url }, 'API Request');
  next();
});

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/licenses', licenseRoutes);
app.use('/api/v1/balance', balanceRoutes);
app.use('/api/v1/withdrawals', withdrawalRoutes);
app.use('/api/v1/admin/withdrawals', adminWithdrawalRoutes);
app.use('/api/v1/sse', sseRoutes);
app.use('/api/v1', referralRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/telegram', telegramRoutes);
app.use('/api/v1/telegram-communication', telegramCommunicationRoutes);
app.use('/api/v1/telegram-admin', telegramAdminRoutes);
app.use('/api/v1/system', systemRoutes);
app.use('/api/v1/otp', otpRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found', path: req.path });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(err, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize Redis and Queue for scheduling
const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null
});

const dailyEarningsQueue = new Queue('dailyEarnings', { connection: redis });
const systemMonitoringQueue = new Queue('systemMonitoring', { connection: redis });
const dailySummaryQueue = new Queue('dailySummary', { connection: redis });
const withdrawalExpirerQueue = new Queue('withdrawalExpirer', { connection: redis });

// Schedule dailyEarnings job to run every hour for proper 24h individual timing
const scheduleDailyEarnings = async () => {
  try {
    const repeatableJobs = await dailyEarningsQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      await dailyEarningsQueue.removeRepeatableByKey(job.key);
    }
    
    await dailyEarningsQueue.add(
      'processDailyEarnings',
      {},
      {
        repeat: {
          pattern: '0 * * * *'
        },
        removeOnComplete: 10,
        removeOnFail: 5
      }
    );
    
    logger.info('Daily earnings job scheduled to run every hour (respects 24h individual timing)');
  } catch (error) {
    logger.error({ error }, 'Failed to schedule daily earnings job');
  }
};

const scheduleSystemMonitoring = async () => {
  try {
    const repeatableJobs = await systemMonitoringQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      await systemMonitoringQueue.removeRepeatableByKey(job.key);
    }
    
    await systemMonitoringQueue.add(
      'systemMonitoring',
      {},
      {
        repeat: {
          pattern: '0,30 * * * *'
        },
        removeOnComplete: 5,
        removeOnFail: 3
      }
    );
    
    logger.info('System monitoring job scheduled to run every 30 minutes');
  } catch (error) {
    logger.error({ error }, 'Failed to schedule system monitoring job');
  }
};

const scheduleDailySummary = async () => {
  try {
    const repeatableJobs = await dailySummaryQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      await dailySummaryQueue.removeRepeatableByKey(job.key);
    }
    
    await dailySummaryQueue.add(
      'dailySummary',
      {},
      {
        repeat: {
          pattern: '0 9 * * *'
        },
        removeOnComplete: 7,
        removeOnFail: 3
      }
    );
    
    logger.info('Daily summary job scheduled to run at 9:00 AM daily');
  } catch (error) {
    logger.error({ error }, 'Failed to schedule daily summary job');
  }
};

const scheduleWithdrawalExpirer = async () => {
  try {
    const repeatableJobs = await withdrawalExpirerQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      await withdrawalExpirerQueue.removeRepeatableByKey(job.key);
    }
    
    await withdrawalExpirerQueue.add(
      'processWithdrawalExpirer',
      {},
      {
        repeat: {
          pattern: '0 * * * *'
        },
        removeOnComplete: 10,
        removeOnFail: 5
      }
    );
    
    logger.info('Withdrawal expirer job scheduled to run every hour');
  } catch (error) {
    logger.error({ error }, 'Failed to schedule withdrawal expirer job');
  }
};

app.listen(PORT, async () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`🔍 Health check: http://localhost:${PORT}/health`);
  logger.info(`📡 SSE endpoint: http://localhost:${PORT}/api/v1/sse/events`);
  
  // Initialize SSE service
  sseService.start();
  logger.info('📡 SSE service initialized');
  
  // Enable automatic processing
  await scheduleDailyEarnings();
  await scheduleSystemMonitoring();
  await scheduleDailySummary();
  await scheduleWithdrawalExpirer();
});

export default app;