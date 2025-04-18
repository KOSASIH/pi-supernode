// Import required packages
const express = require('express');
const bodyParser = require('body-parser');
const StellarSdk = require('stellar-sdk');
const dotenv = require('dotenv');
const routes = require('./routes'); // Import routes
const morgan = require('morgan'); // HTTP request logger middleware
const rateLimit = require('express-rate-limit'); // Rate limiting middleware
const cors = require('cors'); // CORS middleware
const SupplyManager = require('./supplyManager'); // Import SupplyManager
const OracleIntegration = require('./oracleIntegration'); // Import OracleIntegration
const BroadcastSync = require('./broadcastSync'); // Import BroadcastSync
const PartnerAPI = require('./partnerApi'); // Import PartnerAPI
const ComplianceMonitor = require('./complianceMonitor'); // Import ComplianceMonitor
const QuantumSecurity = require('./quantumSecurity'); // Import QuantumSecurity
const ThreatDetection = require('./threatDetection'); // Import ThreatDetection
const MultiSigWallet = require('./multiSigWallet'); // Import MultiSigWallet

// Load environment variables from .env file
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['STELLAR_HORIZON_URL', 'PI_COIN_ASSET_CODE', 'PI_COIN_ISSUER', 'TOKEN_CONTRACT_ADDRESS', 'PRICE_FEED_ADDRESS'];
requiredEnvVars.forEach((varName) => {
    if (!process.env[varName]) {
        throw new Error(`Environment variable ${varName} is required.`);
    }
});

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(cors()); // Enable CORS
app.use(morgan('combined')); // Log HTTP requests

// Configure Stellar SDK
StellarSdk.Network.useTestNetwork(); // Use Test Network
const server = new StellarSdk.Server(process.env.STELLAR_HORIZON_URL); // Stellar Horizon URL

// Pi Coin configuration
const piCoinAsset = new StellarSdk.Asset(
    process.env.PI_COIN_ASSET_CODE,
    process.env.PI_COIN_ISSUER
);

// Initialize SupplyManager and OracleIntegration
const supplyManager = new SupplyManager(process.env.TOKEN_CONTRACT_ADDRESS);
const oracleIntegration = new OracleIntegration(process.env.PRICE_FEED_ADDRESS);

// Initialize BroadcastSync and PartnerAPI
const broadcastSync = new BroadcastSync(8080); // WebSocket server for broadcasting
const partnerAPI = new PartnerAPI(3000, broadcastSync); // API for partners

// Initialize ComplianceMonitor
const complianceMonitor = new ComplianceMonitor(0.05, () => {
    console.log('Penalty applied for non-compliance!');
});

// Initialize Quantum Security, Threat Detection, and Multi-Sig Wallet
const quantumSecurity = new QuantumSecurity();
const threatDetection = new ThreatDetection();
const multiSigWallet = new MultiSigWallet(['0xSigner1', '0xSigner2'], 2); // Example signers and required signatures

// Middleware to attach Stellar server and Pi Coin asset to the request
app.use((req, res, next) => {
    req.stellarServer = server;
    req.piCoinAsset = piCoinAsset;
    req.supplyManager = supplyManager;
    req.oracleIntegration = oracleIntegration;
    req.broadcastSync = broadcastSync; // Attach broadcast sync
    req.complianceMonitor = complianceMonitor; // Attach compliance monitor
    req.quantumSecurity = quantumSecurity; // Attach quantum security
    req.threatDetection = threatDetection; // Attach threat detection
    req.multiSigWallet = multiSigWallet; // Attach multi-sig wallet
    next();
});

// Rate limiting middleware
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // Limit each IP to 100 requests per windowMs
});
app.use('/api/', apiLimiter); // Apply to all API routes

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP' });
});

// Define the total supply of Pi Coin
const TOTAL_SUPPLY = 100000000000; // Set total supply to 100 billion

// Function to monitor price and adjust supply
async function monitorPriceAndAdjustSupply() {
    try {
        // Get the latest price from the oracle
        const currentPrice = await oracleIntegration.getLatestPrice();
        console.log(`Current Price of Pi Coin: $${currentPrice}`);

        // Implement your dynamic pegging logic here
        const targetPrice = 314159.00; // Example target price
        const priceDeviation = ((currentPrice - targetPrice)/ targetPrice);

        // Determine the amount to mint or burn based on price deviation
        const adjustmentAmount = calculateAdjustmentAmount(priceDeviation);

        if (priceDeviation > 0) {
            // Price is above target, burn tokens
            await supplyManager.burnTokens(process.env.SUPPLY_MANAGER_ADDRESS, adjustmentAmount);
        } else if (priceDeviation < 0) {
            // Price is below target, mint tokens
            await supplyManager.mintTokens(process.env.SUPPLY_MANAGER_ADDRESS, adjustmentAmount);
        } else {
            console.log("No significant price deviation detected. No action taken.");
        }

        // Broadcast the updated value and total supply
        broadcastSync.updateValue(currentPrice, TOTAL_SUPPLY); // Use the defined TOTAL_SUPPLY

        // Update compliance monitor with the current price
        complianceMonitor.updateValue(currentPrice);
    } catch (error) {
        console.error("Error in monitoring price and adjusting supply:", error);
    }
}

// Function to calculate the adjustment amount based on price deviation
function calculateAdjustmentAmount(priceDeviation) {
    const baseAdjustment = 1000; // Base adjustment amount
    return Math.floor(baseAdjustment * Math.abs(priceDeviation)); // Adjust based on deviation
}

// Set an interval to monitor the price every minute
setInterval(monitorPriceAndAdjustSupply, 60000);

// Use the routes
app.use('/api', routes); // Prefix all routes with /api

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
