import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import dotenv from 'dotenv';
import path from 'path';
import { processOrderExpirer } from './jobs/orderExpirer';
import { processDailyEarnings } from './jobs/dailyEarnings';
import { systemMonitoringJob, dailySummaryJob } from './jobs/systemMonitoring';
import { processTransactionValidation } from './jobs/transactionValidation';
import { processWithdrawalExpirer } from './jobs/withdrawalExpirer';
import { logger } from './utils/logger';

// Load environment variables with explicit path
const envPath = path.resolve(__dirname, '../.env');
logger.info('Loading .env from: ' + envPath);
const result = dotenv.config({ path: envPath });
logger.info('Dotenv result: ' + JSON.stringify(result));

// Log all environment variables starting with DATABASE
Object.keys(process.env).filter(key => key.startsWith('DATABASE')).forEach(key => {
  logger.info(`${key}: ${process.env[key]}`);
});

// Fallback for DATABASE_URL if not loaded
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://grow5x:password123@localhost:55432/grow5x?schema=public';
}
logger.info('Final DATABASE_URL: ' + process.env.DATABASE_URL);

const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null
});

// Order expirer worker
const orderExpirerWorker = new Worker('orderExpirer', processOrderExpirer, {
  connection: redis,
  concurrency: 5
});

// Daily earnings worker
const dailyEarningsWorker = new Worker('dailyEarnings', processDailyEarnings, {
  connection: redis,
  concurrency: 1 // Only one daily earnings job should run at a time
});

// System monitoring worker
const systemMonitoringWorker = new Worker('systemMonitoring', systemMonitoringJob, {
  connection: redis,
  concurrency: 1
});

// Daily summary worker
const dailySummaryWorker = new Worker('dailySummary', dailySummaryJob, {
  connection: redis,
  concurrency: 1
});

// Transaction validation worker
const transactionValidationWorker = new Worker('transactionValidation', processTransactionValidation, {
  connection: redis,
  concurrency: 3 // Allow multiple validations in parallel
});

// Withdrawal expirer worker
const withdrawalExpirerWorker = new Worker('withdrawalExpirer', processWithdrawalExpirer, {
  connection: redis,
  concurrency: 5
});

// Event handlers
orderExpirerWorker.on('completed', (job: Job) => {
  logger.info({ jobId: job.id }, 'Order expirer job completed');
});

orderExpirerWorker.on('failed', (job: Job | undefined, err: Error) => {
  logger.error({ jobId: job?.id, error: err.message }, 'Order expirer job failed');
});

dailyEarningsWorker.on('completed', (job: Job) => {
  logger.info({ jobId: job.id }, 'Daily earnings job completed');
});

dailyEarningsWorker.on('failed', (job: Job | undefined, err: Error) => {
  logger.error({ jobId: job?.id, error: err?.message || 'Unknown error' }, 'Daily earnings job failed');
});

// System monitoring event handlers
systemMonitoringWorker.on('completed', (job: Job) => {
  logger.info({ jobId: job.id }, 'System monitoring job completed');
});

systemMonitoringWorker.on('failed', (job: Job | undefined, err: Error) => {
  logger.error({ jobId: job?.id, error: err.message }, 'System monitoring job failed');
});

// Daily summary event handlers
dailySummaryWorker.on('completed', (job: Job) => {
  logger.info({ jobId: job.id }, 'Daily summary job completed');
});

dailySummaryWorker.on('failed', (job: Job | undefined, err: Error) => {
  logger.error({ jobId: job?.id, error: err.message }, 'Daily summary job failed');
});

// Transaction validation event handlers
transactionValidationWorker.on('completed', (job: Job) => {
  logger.info({ jobId: job.id, orderId: job.data.orderId }, 'Transaction validation job completed');
});

transactionValidationWorker.on('failed', (job: Job | undefined, err: Error) => {
  logger.error({ jobId: job?.id, orderId: job?.data?.orderId, error: err.message }, 'Transaction validation job failed');
});

// Withdrawal expirer event handlers
withdrawalExpirerWorker.on('completed', (job: Job) => {
  logger.info({ jobId: job.id }, 'Withdrawal expirer job completed');
});

withdrawalExpirerWorker.on('failed', (job: Job | undefined, err: Error) => {
  logger.error({ jobId: job?.id, error: err.message }, 'Withdrawal expirer job failed');
});

logger.info('Worker started successfully');

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down workers...');
  await orderExpirerWorker.close();
  await dailyEarningsWorker.close();
  await systemMonitoringWorker.close();
  await dailySummaryWorker.close();
  await transactionValidationWorker.close();
  await redis.quit();
  process.exit(0);
});