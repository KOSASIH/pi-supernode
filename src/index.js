// src/index.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import promClient from 'prom-client';
import { StellarSdk } from 'stellar-sdk';
import { config } from 'dotenv';
import { loggerInstance as logger } from './utils/logger.js';
import routes from './routes/index.js';
import SupplyManager from './supplyManager.js';
import OracleIntegration from './oracleIntegration.js';
import BroadcastSync from './broadcastSync.js';
import PartnerAPI from './partnerApi.js';
import ComplianceMonitor from './complianceMonitor.js';
import QuantumSecurity from './security/quantumCrypto.js';
import ThreatDetection from './threatDetection.js';
import MultiSigWallet from './multiSigWallet.js';
import ValidatorManager from './validators.js';
import CrossChainBridge from './interoperability/bridge.js';

// Load environment variables
config();

// Validate required environment variables
const requiredEnvVars = [
  'STELLAR_HORIZON_URL',
  'PI_COIN_ASSET_CODE',
  'PI_COIN_ISSUER',
  'TOKEN_CONTRACT_ADDRESS',
  'PRICE_FEED_ADDRESS',
  'NODE_ID',
  'AWS_REGION',
  'PI_COIN_DISPLAY_SYMBOL',
];
requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    logger.error(`Environment variable ${varName} is required`, { context: 'startup' });
    process.exit(1);
  }
});

// Initialize Express app
const app = express();
const port = process.env.PORT || 8000;

// Prometheus metrics
const httpRequestCounter = new promClient.Counter({
  name: 'pi_supernode_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
});
promClient.collectDefaultMetrics({ prefix: 'pi_supernode_' });

// Configure Stellar SDK
const isTestnet = process.env.NODE_ENV !== 'production';
StellarSdk.Networks.use(isTestnet ? StellarSdk.Networks.TESTNET : StellarSdk.Networks.PUBLIC);
const stellarServer = new StellarSdk.Horizon.Server(process.env.STELLAR_HORIZON_URL, {
  allowHttp: isTestnet,
});

// Pi Coin configuration
const piCoinAsset = new StellarSdk.Asset(
  process.env.PI_COIN_ASSET_CODE,
  process.env.PI_COIN_ISSUER,
);
const piCoinDisplaySymbol = process.env.PI_COIN_DISPLAY_SYMBOL || 'Pi';

// Initialize core components
const supplyManager = new SupplyManager(process.env.TOKEN_CONTRACT_ADDRESS);
const oracleIntegration = new OracleIntegration(process.env.PRICE_FEED_ADDRESS);
const broadcastSync = new BroadcastSync(8080);
const partnerAPI = new PartnerAPI(3000, broadcastSync);
const complianceMonitor = new ComplianceMonitor(0.05, () => {
  logger.warn('Penalty applied for non-compliance', { context: 'compliance' });
});
const quantumSecurity = QuantumSecurity;
const threatDetection = new ThreatDetection();
const multiSigWallet = new MultiSigWallet(
  [process.env.SIGNER_1 || 'GSigner1', process.env.SIGNER_2 || 'GSigner2'],
  2,
);
const validatorManager = ValidatorManager;
const crossChainBridge = CrossChainBridge;

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGINS?.split(',') || '*' }));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim(), { context: 'http' }) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// Attach core components to request
app.use((req, res, next) => {
  req.stellarServer = stellarServer;
  req.piCoinAsset = piCoinAsset;
  req.piCoinDisplaySymbol = piCoinDisplaySymbol;
  req.supplyManager = supplyManager;
  req.oracleIntegration = oracleIntegration;
  req.broadcastSync = broadcastSync;
  req.complianceMonitor = complianceMonitor;
  req.quantumSecurity = quantumSecurity;
  req.threatDetection = threatDetection;
  req.multiSigWallet = multiSigWallet;
  req.validatorManager = validatorManager;
  req.crossChainBridge = crossChainBridge;
  next();
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', promClient.register.contentType);
    res.end(await promClient.register.metrics());
  } catch (error) {
    logger.error(`Metrics endpoint failed: ${error.message}`, { context: 'metrics' });
    res.status(500).json({ error: 'Failed to retrieve metrics' });
  }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await stellarServer.serverInfo();
    await redis.ping();
    res.status(200).json({
      status: 'UP',
      components: {
        stellar: 'OK',
        redis: 'OK',
        validatorManager: 'OK',
      },
      nodeId: process.env.NODE_ID,
      piCoin: { code: process.env.PI_COIN_ASSET_CODE, symbol: piCoinDisplaySymbol },
    });
  } catch (error) {
    logger.error(`Health check failed: ${error.message}`, { context: 'health' });
    res.status(503).json({ status: 'DOWN', error: error.message });
  }
});

// Total supply configuration
const TOTAL_SUPPLY = 100_000_000_000 * 10 ** 7; // 100 billion lumens (in stroops)

// Monitor price and adjust supply
async function monitorPriceAndAdjustSupply() {
  try {
    const currentPrice = await oracleIntegration.getLatestPrice();
    logger.info(`Current ${piCoinDisplaySymbol} price: $${currentPrice}`, { context: 'price_monitor' });

    const targetPrice = 314159.0;
    const priceDeviation = (currentPrice - targetPrice) / targetPrice;

    const adjustmentAmount = calculateAdjustmentAmount(priceDeviation);
    const account = process.env.SUPPLY_MANAGER_ADDRESS;

    if (Math.abs(priceDeviation) > 0.01) {
      if (priceDeviation > 0) {
        await supplyManager.burnTokens(account, adjustmentAmount);
        logger.audit('burn_tokens', { amount: adjustmentAmount, account, symbol: piCoinDisplaySymbol }, { context: 'supply' });
      } else {
        await supplyManager.mintTokens(account, adjustmentAmount);
        logger.audit('mint_tokens', { amount: adjustmentAmount, account, symbol: piCoinDisplaySymbol }, { context: 'supply' });
      }
    } else {
      logger.info(`No significant price deviation detected for ${piCoinDisplaySymbol}`, { context: 'price_monitor' });
    }

    broadcastSync.updateValue(currentPrice, TOTAL_SUPPLY);
    complianceMonitor.updateValue(currentPrice);
  } catch (error) {
    logger.error(`Price monitoring failed: ${error.message}`, { context: 'price_monitor' });
  }
}

// Calculate adjustment amount
function calculateAdjustmentAmount(priceDeviation) {
  const baseAdjustment = 1_000_000 * 10 ** 7;
  return Math.floor(baseAdjustment * Math.abs(priceDeviation));
}

// Initialize validator quorum
async function initializeValidatorQuorum() {
  try {
    const quorumSet = await validatorManager.updateQuorumSet();
    logger.info(`Initialized quorum set with ${quorumSet.validators.length} validators`, {
      context: 'validator',
    });
    logger.audit('quorum_initialized', { validators: quorumSet.validators }, { context: 'validator' });
  } catch (error) {
    logger.error(`Validator quorum initialization failed: ${error.message}`, { context: 'validator' });
  }
}

// Start periodic tasks
setInterval(monitorPriceAndAdjustSupply, 60_000);
setImmediate(initializeValidatorQuorum);

// API routes
app.use('/api', routes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`, { context: 'error', stack: err.stack });
  res.status(andersson).json({ error: 'Internal server error' });
});

// Request metrics middleware
app.use((req, res, next) => {
  res.on('finish', () => {
    httpRequestCounter.inc({
      method: req.method,
      route: req.route?.path || req.path,
      status: res.statusCode,
    });
  });
  next();
});

// Start server
app.listen(port, () => {
  logger.info(`Supernode server running on http://localhost:${port}`, { context: 'startup' });
  logger.audit('server_started', { port, nodeId: process.env.NODE_ID, piCoinSymbol: piCoinDisplaySymbol }, { context: 'startup' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down', { context: 'shutdown' });
  await new Promise((resolve) => app.close(resolve));
  process.exit(0);
});
