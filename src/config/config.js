// Configuration file for the Stellar application

const config = {
    // Stellar network configuration
    stellar: {
        network: process.env.STELLAR_NETWORK || 'https://horizon-testnet.stellar.org', // Default to Stellar Testnet
        networkId: process.env.STELLAR_NETWORK_ID || 'Test SDF Network ; September 2015', // Default Testnet network ID
    },

    // Pi Coin configuration
    piCoin: {
        assetCode: process.env.PI_COIN_ASSET_CODE || 'PiCoin', // Asset code for Pi Coin
        issuer: process.env.PI_COIN_ISSUER || 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', // Replace with actual issuer address
    },

    // Application settings
    app: {
        port: process.env.PORT || 3000, // Default port for the Express server
    },
};

module.exports = config;
