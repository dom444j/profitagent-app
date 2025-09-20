import Redis from 'ioredis';
import { logger } from '../utils/logger';

// Redis configuration
const redisConfig: any = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  lazyConnect: true
};

// Add password if configured
if (process.env.REDIS_PASSWORD) {
  redisConfig.password = process.env.REDIS_PASSWORD;
}

// Create Redis instance
let redis: Redis;

if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true
  });
} else {
  redis = new Redis(redisConfig);
}

// Add event listeners
redis.on('connect', () => {
  logger.info('Redis connected successfully');
});

redis.on('error', (error) => {
  logger.error('Redis connection error:', error);
});

// Export the redis instance
export { redis };

// Export a function to create new Redis instances if needed
export function createRedisInstance(options?: any): Redis {
  if (process.env.REDIS_URL) {
    return new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
      ...options
    });
  } else {
    return new Redis({
      ...redisConfig,
      ...options
    });
  }
}

// Export Redis class for direct use
export { Redis };