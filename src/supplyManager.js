// src/supplyManager.js
// SPDX-License-Identifier: MIT
import { StellarSdk } from 'stellar-sdk';
import { config } from 'dotenv';
import { loggerInstance as logger } from './utils/logger.js';
import promClient from 'prom-client';
import { createClient } from 'ioredis';
import QuantumSecurity from './security/quantumCrypto.js';

// Load environment variables
config();

// Initialize Redis for caching supply data
const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

// Prometheus metrics
const supplyAdjustCounter = new promClient.Counter({
  name: 'pi_supernode_supply_adjustments_total',
  help: 'Total number of Pi Coin supply adjustments',
  labelNames: ['type', 'account'],
});

const supplyAdjustLatency = new promClient.Histogram({
  name: 'pi_supernode_supply_adjustment_latency_seconds',
  help: 'Latency of supply adjustment operations',
  buckets: [0.1, 0.5, 1, 2, 5],
});

export default class SupplyManager {
  constructor(issuerAccount) {
    this.issuerAccount = issuerAccount;
    this.displaySymbol = process.env.PI_COIN_DISPLAY_SYMBOL || 'Pi';
    this.assetCode = process.env.PI_COIN_ASSET_CODE || 'PINATIVE';
    this.stellarServer = new StellarSdk.Horizon.Server(process.env.STELLAR_HORIZON_URL, {
      allowHttp: process.env.NODE_ENV !== 'production',
    });
    this.issuerKeypair = StellarSdk.Keypair.fromSecret(process.env.ISSUER_SECRET);
    this.minAdjustmentThreshold = parseFloat(process.env.MIN_ADJUSTMENT_THRESHOLD || 1000); // In stroops
    this.priceTarget = parseFloat(process.env.PRICE_TARGET || 314159.0);
    this.maxSupplyDeviation = parseFloat(process.env.MAX_SUPPLY_DEVIATION || 0.01); // 1%
    this.quantumSecurity = QuantumSecurity;
    logger.info(`SupplyManager initialized for ${this.displaySymbol} (code: ${this.assetCode}, issuer: ${issuerAccount})`, {
      context: 'supply',
    });
  }

  /**
   * Mint tokens by increasing the supply to a target account
   * @param {string} to - Target account public key
   * @param {number} amount - Amount in stroops
   */
  async mintTokens(to, amount) {
    const startTime = Date.now();
    try {
      if (!(await this.shouldMint(amount))) {
        logger.info(`Minting ${amount} ${this.displaySymbol} tokens not required`, { context: 'supply' });
        return;
      }

      const issuerAccount = await this.stellarServer.loadAccount(this.issuerAccount);
      const transaction = new StellarSdk.TransactionBuilder(issuerAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.PUBLIC,
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination: to,
            asset: new StellarSdk.Asset(this.assetCode, this.issuerAccount),
            amount: (amount / 10 ** 7).toFixed(7), // Convert stroops to lumens
          }),
        )
        .setTimeout(30)
        .build();

      // Sign with quantum-resistant signature
      const signature = await this.quantumSecurity.sign(transaction.hash(), this.issuerKeypair.publicKey());
      transaction.sign(this.issuerKeypair);
      // Verify signature (placeholder; implement verification logic)
      await this.quantumSecurity.verify(transaction.hash(), signature, this.issuerKeypair.publicKey());

      const result = await this.stellarServer.submitTransaction(transaction);
      supplyAdjustCounter.inc({ type: 'mint', account: to });
      supplyAdjustLatency.observe((Date.now() - startTime) / 1000);

      logger.audit(
        'mint_tokens',
        { account: to, amount, symbol: this.displaySymbol, txHash: result.hash },
        { context: 'supply' },
      );
      await redis.set(`supply:${to}`, (await this.getAccountBalance(to)) + amount);

      logger.info(`Minted ${amount} ${this.displaySymbol} tokens to ${to}`, { context: 'supply' });
      this.emitMintEvent(to, amount);
    } catch (error) {
      logger.error(`Failed to mint ${amount} ${this.displaySymbol} tokens: ${error.message}`, {
        context: 'supply',
      });
      throw error;
    }
  }

  /**
   * Burn tokens by reducing the supply from a source account
   * @param {string} from - Source account public key
   * @param {number} amount - Amount in stroops
   */
  async burnTokens(from, amount) {
    const startTime = Date.now();
    try {
      if (!(await this.shouldBurn(amount))) {
        logger.info(`Burning ${amount} ${this.displaySymbol} tokens not required`, { context: 'supply' });
        return;
      }

      const sourceAccount = await this.stellarServer.loadAccount(from);
      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.PUBLIC,
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination: this.issuerAccount,
            asset: new StellarSdk.Asset(this.assetCode, this.issuerAccount),
            amount: (amount / 10 ** 7).toFixed(7), // Convert stroops to lumens
          }),
        )
        .setTimeout(30)
        .build();

      // Sign with quantum-resistant signature
      const sourceKeypair = StellarSdk.Keypair.fromSecret(process.env.SOURCE_SECRET);
      const signature = await this.quantumSecurity.sign(transaction.hash(), sourceKeypair.publicKey());
      transaction.sign(sourceKeypair);
      await this.quantumSecurity.verify(transaction.hash(), signature, sourceKeypair.publicKey());

      const result = await this.stellarServer.submitTransaction(transaction);
      supplyAdjustCounter.inc({ type: 'burn', account: from });
      supplyAdjustLatency.observe((Date.now() - startTime) / 1000);

      logger.audit(
        'burn_tokens',
        { account: from, amount, symbol: this.displaySymbol, txHash: result.hash },
        { context: 'supply' },
      );
      await redis.set(`supply:${from}`, (await this.getAccountBalance(from)) - amount);

      logger.info(`Burned ${amount} ${this.displaySymbol} tokens from ${from}`, { context: 'supply' });
      this.emitBurnEvent(from, amount);
    } catch (error) {
      logger.error(`Failed to burn ${amount} ${this.displaySymbol} tokens: ${error.message}`, {
        context: 'supply',
      });
      throw error;
    }
  }

  /**
   * Determine if minting is necessary based on price deviation and supply
   * @param {number} amount - Proposed mint amount
   * @returns {boolean}
   */
  async shouldMint(amount) {
    try {
      if (amount < this.minAdjustmentThreshold) {
        return false;
      }

      // Fetch current price from oracle (via index.js or external service)
      const currentPrice = parseFloat(await this.getCurrentPrice());
      const deviation = (currentPrice - this.priceTarget) / this.priceTarget;

      // Mint if price is below target by more than maxSupplyDeviation
      return deviation < -this.maxSupplyDeviation;
    } catch (error) {
      logger.error(`Failed to evaluate mint condition: ${error.message}`, { context: 'supply' });
      return false;
    }
  }

  /**
   * Determine if burning is necessary based on price deviation and supply
   * @param {number} amount - Proposed burn amount
   * @returns {boolean}
   */
  async shouldBurn(amount) {
    try {
      if (amount < this.minAdjustmentThreshold) {
        return false;
      }

      const currentPrice = parseFloat(await this.getCurrentPrice());
      const deviation = (currentPrice - this.priceTarget) / this.priceTarget;

      // Burn if price is above target by more than maxSupplyDeviation
      return deviation > this.maxSupplyDeviation;
    } catch (error) {
      logger.error(`Failed to evaluate burn condition: ${error.message}`, { context: 'supply' });
      return false;
    }
  }

  /**
   * Fetch current price from cache or external oracle
   * @returns {number}
   */
  async getCurrentPrice() {
    try {
      const cachedPrice = await redis.get('pi:price');
      if (cachedPrice) {
        return cachedPrice;
      }
      // Placeholder: Fetch from OracleIntegration (injected via index.js)
      const price = 314159.0; // Mock price
      await redis.setex('pi:price', 60, price); // Cache for 60 seconds
      return price;
    } catch (error) {
      logger.error(`Failed to fetch price: ${error.message}`, { context: 'supply' });
      return this.priceTarget; // Fallback to target
    }
  }

  /**
   * Get account balance for Pi Coin
   * @param {string} account - Account public key
   * @returns {number}
   */
  async getAccountBalance(account) {
    try {
      const cachedBalance = await redis.get(`supply:${account}`);
      if (cachedBalance) {
        return parseFloat(cachedBalance);
      }
      const accountData = await this.stellarServer.loadAccount(account);
      const balance = accountData.balances.find(
        (b) => b.asset_code === this.assetCode && b.asset_issuer === this.issuerAccount,
      );
      const balanceInStroops = parseFloat(balance?.balance || 0) * 10 ** 7;
      await redis.setex(`supply:${account}`, 300, balanceInStroops); // Cache for 5 minutes
      return balanceInStroops;
    } catch (error) {
      logger.error(`Failed to fetch balance for ${account}: ${error.message}`, { context: 'supply' });
      return 0;
    }
  }

  /**
   * Emit mint event (for compatibility with Ethereum-style events)
   */
  emitMintEvent(to, amount) {
    logger.info(`Event: Mint ${amount} ${this.displaySymbol} to ${to}`, { context: 'supply_event' });
    // Placeholder: Emit to WebSocket or event bus (e.g., broadcastSync.js)
  }

  /**
   * Emit burn event
   */
  emitBurnEvent(from, amount) {
    logger.info(`Event: Burn ${amount} ${this.displaySymbol} from ${from}`, { context: 'supply_event' });
    // Placeholder: Emit to WebSocket or event bus
  }

  /**
   * Handle cross-chain supply adjustments
   * @param {string} chain - Target chain (e.g., Ethereum, Solana)
   * @param {string} to - Target address
   * @param {number} amount - Amount in stroops
   */
  async crossChainMint(chain, to, amount) {
    try {
      logger.info(`Initiating cross-chain mint of ${amount} ${this.displaySymbol} to ${chain} address ${to}`, {
        context: 'supply_crosschain',
      });
      // Placeholder: Use CrossChainBridge from bridge.js
      logger.audit('crosschain_mint', { chain, to, amount, symbol: this.displaySymbol }, { context: 'supply' });
    } catch (error) {
      logger.error(`Cross-chain mint failed: ${error.message}`, { context: 'supply_crosschain' });
      throw error;
    }
  }
}

// Handle Redis errors
redis.on('error', (error) => {
  logger.error(`Redis error: ${error.message}`, { context: 'redis' });
});
