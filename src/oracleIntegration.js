// src/oracleIntegration.js
// SPDX-License-Identifier: MIT
import axios from 'axios';
import { config } from 'dotenv';
import { loggerInstance as logger } from './utils/logger.js';
import promClient from 'prom-client';
import { createClient } from 'ioredis';
import QuantumSecurity from './security/quantumCrypto.js';
import CrossChainBridge from './interoperability/bridge.js';

// Load environment variables
config();

// Initialize Redis for caching price data
const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

// Prometheus metrics
const priceUpdateCounter = new promClient.Counter({
  name: 'pi_supernode_price_updates_total',
  help: 'Total number of price updates fetched',
  labelNames: ['source', 'status'],
});

const priceFetchLatency = new promClient.Histogram({
  name: 'pi_supernode_price_fetch_latency_seconds',
  help: 'Latency of price fetch operations',
  buckets: [0.1, 0.5, 1, 2, 5],
});

export default class OracleIntegration {
  constructor(priceFeedAddresses = {}) {
    this.priceFeedAddresses = {
      chainlink: priceFeedAddresses.chainlink || process.env.CHAINLINK_FEED_ADDRESS,
      band: priceFeedAddresses.band || process.env.BAND_FEED_ADDRESS,
      mock: priceFeedAddresses.mock || 'http://mock.oracle/pi-price',
    };
    this.displaySymbol = process.env.PI_COIN_DISPLAY_SYMBOL || 'Pi';
    this.priceTarget = parseFloat(process.env.PRICE_TARGET || 314159.0);
    this.maxPriceDeviation = parseFloat(process.env.MAX_PRICE_DEVIATION || 0.05); // 5%
    this.cacheTTL = parseInt(process.env.PRICE_CACHE_TTL || 60); // 60 seconds
    this.quantumSecurity = QuantumSecurity;
    this.crossChainBridge = CrossChainBridge;
    this.oracleSources = ['chainlink', 'band', 'mock'];
    logger.info(`OracleIntegration initialized for ${this.displaySymbol} with feeds: ${JSON.stringify(this.priceFeedAddresses)}`, {
      context: 'oracle',
    });
  }

  /**
   * Fetch the latest price of Pi Coin from multiple oracles
   * @returns {Promise<number>} Median price in USD
   */
  async getLatestPrice() {
    const startTime = Date.now();
    try {
      const prices = await Promise.all(
        this.oracleSources.map(async (source) => {
          try {
            const price = await this.fetchPriceFromSource(source);
            priceUpdateCounter.inc({ source, status: 'success' });
            return price;
          } catch (error) {
            logger.error(`Failed to fetch price from ${source}: ${error.message}`, { context: 'oracle' });
            priceUpdateCounter.inc({ source, status: 'error' });
            return null;
          }
        }),
      );

      // Filter valid prices and calculate median
      const validPrices = prices.filter((p) => p !== null && p > 0);
      if (validPrices.length === 0) {
        logger.error('No valid prices fetched from oracles', { context: 'oracle' });
        throw new Error('No valid price data available');
      }

      const medianPrice = this.calculateMedian(validPrices);
      if (Math.abs(medianPrice - this.priceTarget) / this.priceTarget > this.maxPriceDeviation) {
        logger.warn(`Price deviation too high: ${medianPrice} vs target ${this.priceTarget}`, { context: 'oracle' });
      }

      // Cache price
      await redis.setex('pi:price', this.cacheTTL, medianPrice);
      priceFetchLatency.observe((Date.now() - startTime) / 1000);

      logger.info(`Fetched ${this.displaySymbol} price: $${medianPrice}`, { context: 'oracle' });
      logger.audit('price_updated', { price: medianPrice, symbol: this.displaySymbol, sources: validPrices.length }, { context: 'oracle' });

      return medianPrice;
    } catch (error) {
      logger.error(`Failed to fetch latest price: ${error.message}`, { context: 'oracle' });
      throw error;
    }
  }

  /**
   * Fetch price from a specific oracle source
   * @param {string} source - Oracle source (chainlink, band, mock)
   * @returns {Promise<number>} Price in USD
   */
  async fetchPriceFromSource(source) {
    try {
      switch (source) {
        case 'chainlink':
          return await this.fetchChainlinkPrice();
        case 'band':
          return await this.fetchBandPrice();
        case 'mock':
          return await this.fetchMockPrice();
        default:
          throw new Error(`Unsupported oracle source: ${source}`);
      }
    } catch (error) {
      throw new Error(`Source ${source} failed: ${error.message}`);
    }
  }

  /**
   * Fetch price from Chainlink (mock implementation)
   * @returns {Promise<number>}
   */
  async fetchChainlinkPrice() {
    try {
      const response = await axios.get(this.priceFeedAddresses.chainlink, {
        timeout: 5000,
      });
      const price = parseFloat(response.data.price || 314159.0); // Mock data
      return price;
    } catch (error) {
      throw new Error(`Chainlink fetch failed: ${error.message}`);
    }
  }

  /**
   * Fetch price from Band Protocol (mock implementation)
   * @returns {Promise<number>}
   */
  async fetchBandPrice() {
    try {
      const response = await axios.get(this.priceFeedAddresses.band, {
        timeout: 5000,
      });
      const price = parseFloat(response.data.price || 314159.0); // Mock data
      return price;
    } catch (error) {
      throw new Error(`Band fetch failed: ${error.message}`);
    }
  }

  /**
   * Fetch price from mock oracle
   * @returns {Promise<number>}
   */
  async fetchMockPrice() {
    try {
      const response = await axios.get(this.priceFeedAddresses.mock, {
        timeout: 5000,
      });
      return parseFloat(response.data.price || 314159.0);
    } catch (error) {
      throw new Error(`Mock oracle fetch failed: ${error.message}`);
    }
  }

  /**
   * Calculate median of an array of numbers
   * @param {number[]} values
   * @returns {number}
   */
  calculateMedian(values) {
    if (values.length === 0) return 0;
    const sorted = values.sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * Update price feed addresses
   * @param {object} newAddresses - New feed addresses
   */
  async updatePriceFeed(newAddresses) {
    try {
      const oldAddresses = { ...this.priceFeedAddresses };
      this.priceFeedAddresses = { ...this.priceFeedAddresses, ...newAddresses };
      logger.audit(
        'price_feed_updated',
        { old: oldAddresses, new: this.priceFeedAddresses, symbol: this.displaySymbol },
        { context: 'oracle' },
      );
      logger.info(`Updated price feed addresses: ${JSON.stringify(this.priceFeedAddresses)}`, { context: 'oracle' });
    } catch (error) {
      logger.error(`Failed to update price feed: ${error.message}`, { context: 'oracle' });
      throw error;
    }
  }

  /**
   * Fetch cross-chain price data
   * @param {string} chain - Target chain (e.g., Ethereum, Solana)
   * @returns {Promise<number>}
   */
  async getCrossChainPrice(chain) {
    try {
      logger.info(`Fetching ${this.displaySymbol} price from ${chain}`, { context: 'oracle_crosschain' });
      // Placeholder: Use CrossChainBridge to fetch price
      const price = 314159.0; // Mock cross-chain price
      logger.audit('crosschain_price_fetched', { chain, price, symbol: this.displaySymbol }, { context: 'oracle' });
      return price;
    } catch (error) {
      logger.error(`Cross-chain price fetch failed: ${error.message}`, { context: 'oracle_crosschain' });
      throw error;
    }
  }

  /**
   * Validate price data with quantum-resistant signature
   * @param {number} price
   * @param {string} signature
   * @param {string} publicKey
   * @returns {Promise<boolean>}
   */
  async validatePrice(price, signature, publicKey) {
    try {
      const isValid = await this.quantumSecurity.verify(Buffer.from(price.toString()), signature, publicKey);
      logger.info(`Price validation ${isValid ? 'succeeded' : 'failed'} for price: ${price}`, { context: 'oracle' });
      return isValid;
    } catch (error) {
      logger.error(`Price validation failed: ${error.message}`, { context: 'oracle' });
      return false;
    }
  }
}

// Handle Redis errors
redis.on('error', (error) => {
  logger.error(`Redis error: ${error.message}`, { context: 'redis' });
});

export { OracleIntegration };
