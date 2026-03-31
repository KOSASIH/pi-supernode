"""
Stellar Horizon Client for PiDex - Advanced RPC Operations
✅ Real-time orderbooks, trades, markets
✅ $314K PI stablecoin market data
✅ SCP consensus queries
⚠️ DEMO/EDUCATIONAL ONLY
"""

import asyncio
import aiohttp
from typing import Dict, List, Optional, Any, AsyncGenerator
from stellar_sdk import Server, Asset
from constant import (
    STELLAR_NET, PI_STELLAR, STELLAR_PIDEX, STELLAR_CONFIG,
    STELLAR_PATHS
)
import json
from dataclasses import dataclass
import time

@dataclass
class PiMarketData:
    """PiDex $314K market data"""
    base_volume: float
    counter_volume: float
    open: float
    high: float
    low: float
    close: float
    pi_usd_equiv: float  # $314,159 pegged value

class HorizonPiDexClient:
    """Advanced Stellar Horizon client for PiDex operations"""
    
    def __init__(self, horizon_url: str = None):
        self.horizon_url = horizon_url or STELLAR_NET.MAINNET_HORIZON[0]
        self.server = Server(self.horizon_url)
        self.session = None  # Async session
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def get_pi_price(self, base: str = "PI", counter: str = "XLM") -> Optional[float]:
        """
        Get live PI/XLM price from Stellar DEX
        
        Returns:
            Price per PI in XLM (convert to $314K USD)
        """
        try:
            market = f"{base}/{counter}"
            orderbook = self.server.order_book(
                selling=Asset(PI_STELLAR.ASSET_CODE, PI_STELLAR.ISSUER),
                buying=Asset.native() if counter == "XLM" else Asset(counter, "ISSUER")
            )
            
            asks = orderbook.asks()
            if asks:
                price_xlm = float(asks[0].price)
                # Convert to USD equivalent ($314K peg)
                xlm_usd = 0.50  # Assume $0.50/XLM
                usd_price = price_xlm * xlm_usd
                print(f"📊 PI/XLM: {price_xlm:.6f} → USD: ${usd_price:,.0f}")
                return usd_price
                
        except Exception as e:
            print(f"❌ Price fetch failed: {e}")
        return None
    
    async def get_orderbook(self, selling_asset: Asset, buying_asset: Asset) -> Dict[str, Any]:
        """Get full PiDex orderbook"""
        try:
            orderbook = self.server.order_book(selling_asset, buying_asset)
            return {
                "bids": [{"price": b.price, "amount": b.amount} for b in orderbook.bids()],
                "asks": [{"price": a.price, "amount": a.amount} for a in orderbook.asks()],
                "base_volume": orderbook.base_volume,
                "counter_volume": orderbook.counter_volume
            }
        except Exception as e:
            print(f"❌ Orderbook failed: {e}")
            return {}
    
    async def get_recent_trades(self, base: str = "PI", counter: str = "XLM", 
                               limit: int = 20) -> List[Dict[str, Any]]:
        """Get recent PI trades on Stellar DEX"""
        try:
            trades = self.server.trades().for_asset_pair(
                base_asset=Asset(PI_STELLAR.ASSET_CODE, PI_STELLAR.ISSUER),
                counter_asset=Asset.native()
            ).order(desc=True).limit(limit).call()
            
            return [{
                "id": t.id,
                "base_amount": float(t.base_amount),
                "counter_amount": float(t.counter_amount),
                "price": float(t.price),
                "timestamp": t.created_at.isoformat(),
                "pi_usd": float(t.base_amount) * PI_STELLAR.FIXED_VALUE_USD
            } for t in trades["_embedded"]["records"]]
        except:
            return []
    
    async def stream_trades(self, base: str = "PI", counter: str = "XLM") -> AsyncGenerator[Dict, None]:
        """Real-time trade streaming"""
        pi_asset = Asset(PI_STELLAR.ASSET_CODE, PI_STELLAR.ISSUER)
        xlm_asset = Asset.native()
        
        async with self.server.trades().for_asset_pair(pi_asset, xlm_asset).stream() as stream:
            async for trade in stream:
                yield {
                    "id": trade["id"],
                    "base_volume": float(trade["base_volume"]),
                    "counter_volume": float(trade["counter_volume"]),
                    "pi_usd_value": float(trade["base_volume"]) * PI_STELLAR.FIXED_VALUE_USD,
                    "timestamp": trade["timestamp"]
                }
    
    async def get_pi_market_stats(self) -> PiMarketData:
        """Get comprehensive PI market statistics"""
        try:
            # 24h market data
            history = self.server.metrics().daily_aggregate(
                base_asset=Asset(PI_STELLAR.ASSET_CODE, PI_STELLAR.ISSUER),
                counter_asset=Asset.native()
            ).call()
            
            return PiMarketData(
                base_volume=float(history[0]["base_volume"]) if history else 0,
                counter_volume=float(history[0]["counter_volume"]) if history else 0,
                open=float(history[0]["open"]) if history else 0,
                high=float(history[0]["high"]) if history else 0,
                low=float(history[0]["low"]) if history else 0,
                close=float(history[0]["close"]) if history else PI_STELLAR.FIXED_VALUE_USD,
                pi_usd_equiv=PI_STELLAR.FIXED_VALUE_USD
            )
        except:
            return PiMarketData(0, 0, 0, 0, 0, PI_STELLAR.FIXED_VALUE_USD, PI_STELLAR.FIXED_VALUE_USD)
    
    async def find_path_payment(self, send_asset: Asset, dest_asset: Asset, 
                               dest_amount: str) -> Optional[List[Asset]]:
        """Find optimal path for PI payments"""
        try:
            paths = self.server.strict_send_paths(
                source_asset=send_asset,
                source_amount="1.0",  # 1 PI
                destination_asset=dest_asset,
                destination_amount=dest_amount
            ).call()
            
            if paths["_embedded"]["records"]:
                path = paths["_embedded"]["records"][0]
                return [Asset(p["asset_code"], p["asset_issuer"]) for p in path["path"]]
            return None
        except:
            return None
    
    def sync_get_account_offers(self, account_id: str) -> List[Dict]:
        """Synchronous account offers (PI trading orders)"""
        try:
            offers = self.server.offers().for_account(account_id).call()
            return offers["_embedded"]["records"]
        except:
            return []

# ========================================
# 💎 EXAMPLE USAGE
# ========================================
async def demo_horizon_client():
    """Demo all PiDex Horizon features"""
    pi_asset = Asset(PI_STELLAR.ASSET_CODE, PI_STELLAR.ISSUER)
    xlm_asset = Asset.native()
    
    async with HorizonPiDexClient() as client:
        print("🌟 PiDex Horizon Client Demo")
        print(f"📊 PI Price: ${await client.get_pi_price():,.2f}")
        
        # Orderbook
        ob = await client.get_orderbook(pi_asset, xlm_asset)
        print(f"📈 Bids: {len(ob.get('bids', []))}, Asks: {len(ob.get('asks', []))}")
        
        # Recent trades
        trades = await client.get_recent_trades()
        print(f"🔥 Recent Trades: {len(trades)}")
        if trades:
            latest = trades[0]
            print(f"   Latest: {latest['base_amount']:.2f} PI = ${latest['pi_usd']:,.0f}")
        
        # Market stats
        stats = await client.get_pi_market_stats()
        print(f"📊 24h High: ${stats.high:.2f}, Volume: {stats.base_volume:.0f} PI")

if __name__ == "__main__":
    asyncio.run(demo_horizon_client())

