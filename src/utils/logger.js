// src/utils/logger.js
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { CloudWatchTransport } from 'winston-cloudwatch';
import promClient from 'prom-client';
import { createClient } from 'ioredis';
import { config } from 'dotenv';

// Load environment variables
config();

// Initialize Redis client for distributed logging
const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

// Prometheus metrics
const logCounter = new promClient.Counter({
  name: 'pi_supernode_log_events',
  help: 'Total number of log events by level',
  labelNames: ['level'],
});

// Custom format for logs
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.metadata(),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, metadata }) => {
    const context = metadata.context ? ` [${metadata.context}]` : '';
    return JSON.stringify({
      timestamp,
      level: level.toUpperCase(),
      message,
      context,
      metadata: { ...metadata, nodeId: process.env.NODE_ID || 'unknown' },
    });
  }),
);

// Winston logger configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
    // Daily rotating file transport
    new DailyRotateFile({
      filename: 'logs/pi-supernode-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '100m',
      maxFiles: '30d',
      zippedArchive: true,
    }),
    // CloudWatch transport
    new CloudWatchTransport({
      logGroupName: process.env.CLOUDWATCH_LOG_GROUP || 'pi-supernode',
      logStreamName: process.env.NODE_ID || 'supernode',
      awsRegion: process.env.AWS_REGION || 'us-east-1',
      awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
      awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      messageFormatter: ({ level, message, metadata }) =>
        JSON.stringify({ level, message, ...metadata }),
    }),
    // Redis transport for distributed logging
    new winston.transports.Stream({
      stream: {
        write: async (message) => {
          try {
            await redis.lpush('pi:logs', message);
            await redis.ltrim('pi:logs', 0, 9999); // Keep last 10,000 logs
          } catch (error) {
            console.error(`Redis logging failed: ${error.message}`);
          }
        },
      },
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' }),
  ],
});

// Middleware to increment Prometheus metrics
logger.on('data', ({ level }) => {
  logCounter.inc({ level: level.toLowerCase() });
});

// Secure logging for sensitive data
const secureLog = async (level, message, metadata = {}) => {
  const sanitizedMessage = sanitizeSensitiveData(message);
  logger.log(level, sanitizedMessage, { ...metadata, secure: true });
};

// Sanitize sensitive data (e.g., private keys, seeds)
const sanitizeSensitiveData = (message) => {
  const sensitivePatterns = [
    /(S[A-Z0-9]{55})/g, // Stellar secret keys
    /(0x[a-fA-F0-9]{64})/g, // Ethereum private keys
    /(Bearer\s+[A-Za-z0-9\-._~+/]+)/g, // JWT tokens
  ];
  let sanitized = message;
  for (const pattern of sensitivePatterns) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }
  return sanitized;
};

// Audit log for critical actions
const auditLog = async (action, details, metadata = {}) => {
  const auditMessage = `AUDIT: ${action} - ${JSON.stringify(details)}`;
  await redis.lpush('pi:audit', JSON.stringify({
    timestamp: new Date().toISOString(),
    action,
    details,
    nodeId: process.env.NODE_ID || 'unknown',
    ...metadata,
  }));
  logger.info(auditMessage, { ...metadata, type: 'audit' });
};

// Export logger with enhanced methods
export const loggerInstance = {
  info: (message, metadata = {}) => logger.info(message, metadata),
  error: (message, metadata = {}) => logger.error(message, metadata),
  warn: (message, metadata = {}) => logger.warn(message, metadata),
  debug: (message, metadata = {}) => logger.debug(message, metadata),
  secure: secureLog,
  audit: auditLog,
  metrics: {
    getLogCounter: () => logCounter,
  },
};

// Handle Redis connection errors
redis.on('error', (error) => {
  logger.error(`Redis connection error: ${error.message}`, { context: 'redis' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Shutting down logger', { context: 'shutdown' });
  await redis.quit();
  logger.end();
});

// Export for backward compatibility
export default loggerInstance;
