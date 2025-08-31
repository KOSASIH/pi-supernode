// src/routes/index.js
import express from 'express';
const router = express.Router();

router.get('/status', (req, res) => {
  res.json({ status: 'API running', nodeId: process.env.NODE_ID });
});

router.get('/asset', (req, res) => {
  res.json({
    code: process.env.PI_COIN_ASSET_CODE,
    issuer: process.env.PI_COIN_ISSUER,
    displaySymbol: req.piCoinDisplaySymbol || 'Pi',
    type: 'native',
    totalSupply: 100_000_000_000 * 10 ** 7, // In stroops
  });
});

export default router;
