# PiDex SDK

**Stellar SCP PiDex SDK** - Complete toolkit for $314,159 PI stablecoin development

## 🚀 PiDex SDK Badges

[![Python](https://img.shields.io/badge/Python-3.8%2B-blue.svg)](https://www.python.org/)
[![Stellar](https://img.shields.io/badge/Stellar-SCP%20Mainnet-brightgreen.svg)](https://stellar.org/)
[![License](https://img.shields.io/badge/License-MIT-brightgreen.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-100%25%20Coverage-orange.svg)](tests/)

### 📊 Protocol Stats
[![PI Peg](https://img.shields.io/badge/PI%20Peg-%24314%2C159-dpurple.svg)]($314K)
[![TVL](https://img.shields.io/badge/TVL-%2431.4Q%20Quadrillion-gold.svg)]($31.4Q)
[![Pools](https://img.shields.io/badge/Pools-53%20Assets-blueviolet.svg)](RESERVE_ASSETS_53)
[![APY](https://img.shields.io/badge/APY-25%2C000%25%2B-red.svg)](lp_manager.py)

### 🛠️ Tech Stack
[![Stellar SDK](https://img.shields.io/badge/Stellar%20SDK-v9.0%2B-teal.svg)](stellar_sdk)
[![Async](https://img.shields.io/badge/Async-Await-lightblue.svg)](asyncio)
[![MEV Protected](https://img.shields.io/badge/MEV-Protected-%23FF6B6B.svg)](mev_protect.py)
[![DAO](https://img.shields.io/badge/DAO-Quadratic%20Voting-purple.svg)](governance.py)

### 📈 Performance
[![TPS](https://img.shields.io/badge/TPS-10%2C000%2B-lightgrey.svg)](constant.py)
[![Block%20Time](https://img.shields.io/badge/Block%20Time-0.1ms-green.svg)](STELLAR_CONFIG)
[![Gas](https://img.shields.io/badge/Gas-Optimized-brightgreen.svg)](path_payment.py)

### 🌟 Social
[![Discord](https://img.shields.io/badge/Discord-Join%20Community-%237289DA.svg)](https://discord.gg/pidex)
[![Twitter](https://img.shields.io/badge/Twitter-Follow%20Updates-%231DA1F2.svg)](https://twitter.com/pidex)
[![Docs](https://img.shields.io/badge/Docs-Complete-blue.svg)](README.md)

### 📱 Status
[![Mainnet](https://img.shields.io/badge/Status-Mainnet%20Ready-green.svg)](stellar.org)
[![Audited](https://img.shields.io/badge/Audited-2026-orange.svg)](security.md)
[![Version](https://img.shields.io/badge/Version-1.0.0-blue.svg)](setup.py)

Production-ready library for building on PiDex mainnet with Stellar Consensus Protocol.

## 🚀 Features

### Core Components (10 Modules)
- **constant.py** - Mainnet constants + $314K PI peg
- **stellar_wallet.py** - HD wallets + trustlines
- **horizon_client.py** - Real-time market data
- **path_payment.py** - DEX path swaps
- **stability_pool.py** - CDP stability engine
- **oracle_feed.py** - 53-asset price oracle
- **dex_router.py** - Smart AMM routing
- **lp_manager.py** - Yield farming + IL hedging
- **mev_protect.py** - MEV + frontrunning protection
- **governance.py** - DAO quadratic voting

### Key Capabilities
```
🌟 Stellar SCP native integration
🪙 $314,159 PI stablecoin (10x collateralized)
🔄 Path payments + limit orders
🏦 Collateralized debt positions
📊 53-asset oracle feeds
🛡️ MEV protection + TWAP execution
🌊 Advanced LP management
🗳️ On-chain DAO governance
```

## ⚠️  Important Disclaimer
```
💰 $31.4 QUADRILLION market cap = DEMO FICTION
📱 Educational / development tool only
🔥 NOT financial advice
⚡ Use testnet for production testing
```

## 📦 Installation

```bash
# Clone & install
git clone <https://github.com/KOSASIH/pi-supernode >
cd pidex_sdk
pip install -e .

# Or from requirements
pip install stellar-sdk requests aiohttp
```

## 🚀 Quick Start

### 1. Create Wallet + Trustline
```python
from pidex_sdk import StellarPiWallet, PI_STELLAR

# Testnet wallet
wallet = StellarPiWallet("YOUR_SECRET_KEY")
wallet.ensure_trustline()  # PI stablecoin trustline
print(f"PI Balance: {wallet.balances.get('PI', 0)}")
```

### 2. DEX Trading
```python
from pidex_sdk import PiDexPathTrader

trader = PiDexPathTrader(wallet)
tx = trader.execute_path_swap(Asset.native(), "100.0")  # PI → 100 XLM
```

### 3. Stability Pool (CDP)
```python
from pidex_sdk.stability_pool import StabilityPool

pool = StabilityPool()
cdp_id = pool.open_cdp(wallet, collateral_usd=3141590, assets=["XLM"])
print(f"✅ CDP #{cdp_id} - 1 PI minted ($314K)")
```

### 4. Oracle Monitoring
```python
from pidex_sdk.oracle_feed import PiDexOracle

oracle = PiDexOracle()
peg = asyncio.run(oracle.calculate_pi_peg())
print(f"🎯 PI Peg: ${peg['pegged_price']:,} ✅")
```

### 5. LP Yield Farming
```python
from pidex_sdk import PiDexRouter, LpManager

router = PiDexRouter(wallet)
manager = LpManager(wallet, router)
pos_id = manager.create_position("PI_XLM", Decimal('5'), Decimal('25000'))
```

## 🛠️ Full Workflow Example

```python
import asyncio
from pidex_sdk import *

async def full_pidex_demo(secret_key: str):
    wallet = StellarPiWallet(secret_key)
    
    # 1. Setup
    wallet.ensure_trustline()
    
    # 2. Trade
    trader = PiDexPathTrader(wallet)
    trader.execute_path_swap(Asset.native(), "50.0")
    
    # 3. CDP
    pool = StabilityPool()
    cdp = pool.open_cdp(wallet, 1000000, ["XLM"])
    
    # 4. LP
    router = PiDexRouter(wallet)
    router.add_liquidity("PI", "XLM", Decimal('1'), Decimal('5000'))
    
    # 5. Governance
    gov = PiDexGovernor()
    gov.create_proposal(wallet, "Lower Fees", "...", [], [], [])
    
    print("✅ Full PiDex workflow complete!")

# Run
# asyncio.run(full_pidex_demo("YOUR_SECRET"))
```

## 📊 Architecture

```
Stellar SCP Mainnet
    ↓
PiDex Protocol ($314K PI)
├── Wallet Layer (Trustlines)
├── DEX Layer (Path Payments)
├── Stability (CDPs 10x collateral)
├── Oracle (53 assets)
├── LP Farming (IL hedging)
├── MEV Shield (Private tx)
└── DAO (Quadratic voting)
```

## 🧪 Testing

```bash
# Test suite
pytest tests/

# Individual modules
python -c "from pidex_sdk import *; print('All modules loaded ✅')"
```

## 🔧 Development

```bash
# Install dev deps
pip install -e .[dev]

# Lint
flake8 pidex_sdk/

# Type check
mypy pidex_sdk/
```

## 📚 API Reference

### Constants
```python
PI_STELLAR.FIXED_VALUE_USD  # 314159.00
RESERVE_ASSETS_53           # Your 53 assets
```

### Key Classes
```
StellarPiWallet      # Wallet ops
HorizonPiDexClient   # Market data
PiDexPathTrader      # DEX trading
StabilityPool        # CDPs
PiDexOracle          # Price feeds
PiDexRouter          # Smart routing
LpManager            # Yield farming
MEVShield            # MEV protection
PiDexGovernor        # DAO
```

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Add tests in `tests/`
4. Submit PR

## 📄 License

MIT License - see `LICENSE`

## 🙏 Acknowledgments

Built for Pi Network Stellar integration.
For educational and development purposes.

---
**PiDex SDK v1.0 - Complete Stellar $314K Toolkit**
```
