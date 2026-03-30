"""
PiDex Stability Pool - $314K PI Stablecoin CDP Engine
✅ Collateralized Debt Positions (CDP)
✅ 1000% Overcollateralization ($3.14M collateral per PI)
✅ Liquidation engine + stability fees
✅ Multi-asset collateral (53 assets)
⚠️ DEMO/EDUCATIONAL - FICTIONAL ECONOMICS
"""

from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from .stellar_wallet import StellarPiWallet
from .constant import (
    PI_STELLAR, STELLAR_CONFIG, STELLAR_DISCLAIMER
)
from decimal import Decimal, getcontext
import json

getcontext().prec = 18  # High precision for $314K math

@dataclass
class CollateralPosition:
    """Single CDP position"""
    cdp_id: int
    owner: str
    collateral_amount: Decimal  # USD value
    collateral_assets: List[str]
    debt_pi: Decimal  # PI minted ($314K each)
    collateral_ratio: Decimal
    stability_fee_apr: float = 2.5  # 2.5% APR
    liquidation_ratio: float = 1.10  # 110%
    is_liquidatable: bool = False
    timestamp: float = field(default_factory=time.time)

class StabilityPool:
    """
    PiDex Stability Pool - Maintains $314,159 PI peg
    1000% overcollateralized (10x collateral ratio)
    """
    
    def __init__(self, pool_address: str = "GPISTABILITYPOOL314159"):
        self.pool_address = pool_address
        self.positions: Dict[int, CollateralPosition] = {}
        self.total_collateral_usd: Decimal = Decimal('0')
        self.total_debt_pi: Decimal = Decimal('0')
        self.target_peg: Decimal = Decimal(PI_STELLAR.FIXED_VALUE_USD)
    
    def open_cdp(self, owner_wallet: StellarPiWallet, 
                collateral_usd: float, assets: List[str]) -> int:
        """
        Open new CDP - Lock collateral, mint PI
        
        Args:
            collateral_usd: USD value of collateral deposited
            assets: List of collateral assets (BTC, XLM, etc)
            
        Returns:
            CDP ID
        """
        cdp_id = len(self.positions) + 1
        
        # Mint PI based on 10x collateral ratio
        max_pi_mintable = Decimal(collateral_usd) / self.target_peg / Decimal('10')
        debt_pi = max_pi_mintable
        
        position = CollateralPosition(
            cdp_id=cdp_id,
            owner=owner_wallet.public_key,
            collateral_amount=Decimal(collateral_usd),
            collateral_assets=assets,
            debt_pi=debt_pi,
            collateral_ratio=Decimal('10.0')  # 1000%
        )
        
        self.positions[cdp_id] = position
        self.total_collateral_usd += Decimal(collateral_usd)
        self.total_debt_pi += debt_pi
        
        usd_value = float(debt_pi * self.target_peg)
        print(f"🔓 CDP #{cdp_id} OPENED:")
        print(f"   💰 Collateral: ${collateral_usd:,.0f} (10x)")
        print(f"   🪙 PI Minted: {debt_pi:.6f} PI = ${usd_value:,.0f}")
        print(f"   📈 Collateral Ratio: {position.collateral_ratio:.1f}x")
        
        return cdp_id
    
    def deposit_collateral(self, cdp_id: int, additional_usd: float) -> bool:
        """Add more collateral to CDP"""
        if cdp_id not in self.positions:
            return False
        
        position = self.positions[cdp_id]
        old_collateral = position.collateral_amount
        
        position.collateral_amount += Decimal(additional_usd)
        position.collateral_ratio = position.collateral_amount / (position.debt_pi * self.target_peg)
        self.total_collateral_usd += Decimal(additional_usd)
        
        print(f"➕ CDP #{cdp_id} COLLATERAL UPDATED:")
        print(f"   💰 Added: ${additional_usd:,.0f}")
        print(f"   📊 New Ratio: {position.collateral_ratio:.2f}x")
        
        return True
    
    def repay_debt(self, cdp_id: int, pi_amount: float) -> bool:
        """Repay PI debt + stability fee"""
        if cdp_id not in self.positions:
            return False
        
        position = self.positions[cdp_id]
        if pi_amount >= float(position.debt_pi):
            # Close CDP
            del self.positions[cdp_id]
            self.total_debt_pi -= position.debt_pi
            print(f"✅ CDP #{cdp_id} FULLY CLOSED")
            return True
        
        # Partial repayment
        stability_fee = pi_amount * (STELLAR_CONFIG["stability_fee_apr"] / 100 / 365 / 24 / 60 / 60)
        total_repay = pi_amount + stability_fee
        
        position.debt_pi -= Decimal(total_repay)
        self.total_debt_pi -= Decimal(total_repay)
        position.collateral_ratio = position.collateral_amount / (position.debt_pi * self.target_peg)
        
        print(f"💸 CDP #{cdp_id} DEBT REPAID:")
        print(f"   🪙 PI Repaid: {pi_amount:.6f}")
        print(f"   💰 Fee: ${stability_fee * PI_STELLAR.FIXED_VALUE_USD:,.2f}")
        print(f"   📈 New Ratio: {position.collateral_ratio:.2f}x")
        
        return True
    
    def check_liquidations(self) -> List[int]:
        """Check undercollateralized positions"""
        liquidatable = []
        
        for cdp_id, position in self.positions.items():
            if float(position.collateral_ratio) < STELLAR_CONFIG["liquidation_ratio"]:
                position.is_liquidatable = True
                liquidatable.append(cdp_id)
        
        if liquidatable:
            print(f"🚨 {len(liquidatable)} POSITIONS LIQUIDATABLE!")
            
        return liquidatable
    
    def liquidate_cdp(self, cdp_id: int, liquidator_wallet: StellarPiWallet) -> bool:
        """Liquidate undercollateralized CDP"""
        if cdp_id not in self.positions:
            return False
        
        position = self.positions[cdp_id]
        if not position.is_liquidatable:
            return False
        
        # Liquidation bonus for liquidator (5%)
        bonus = 0.05
        collateral_won = position.collateral_amount * Decimal(bonus)
        debt_covered = position.debt_pi * self.target_peg
        
        print(f"💥 CDP #{cdp_id} LIQUIDATED:")
        print(f"   👤 Liquidator: {liquidator_wallet.public_key}")
        print(f"   💰 Collateral Won: ${float(collateral_won):,.0f}")
        print(f"   🪙 Debt Covered: {position.debt_pi:.6f} PI")
        print(f"   📈 Pool Health: {self.get_pool_health():.2f}%")
        
        # Remove from pool
        del self.positions[cdp_id]
        self.total_collateral_usd -= position.collateral_amount
        self.total_debt_pi -= position.debt_pi
        
        return True
    
    def get_pool_health(self) -> float:
        """Pool collateralization ratio"""
        if self.total_debt_pi == 0:
            return 100.0
        return float(self.total_collateral_usd / (self.total_debt_pi * self.target_peg) * 100)
    
    def get_position_risk(self, cdp_id: int) -> Dict[str, float]:
        """Risk metrics for CDP"""
        if cdp_id not in self.positions:
            return {}
        
        pos = self.positions[cdp_id]
        distance_to_liquidation = float((pos.collateral_ratio - Decimal(STELLAR_CONFIG["liquidation_ratio"])) / pos.collateral_ratio * 100)
        
        return {
            "collateral_ratio_pct": float(pos.collateral_ratio * 100),
            "distance_to_liq_pct": distance_to_liquidation,
            "debt_usd": float(pos.debt_pi * self.target_peg),
            "is_safe": distance_to_liquidation > 10
        }

# ========================================
# 🎮 STABILITY POOL DEMO
# ========================================
def demo_stability_pool():
    """Complete CDP demo"""
    pool = StabilityPool()
    wallet1 = StellarPiWallet("DEMO_WALLET_1")
    wallet2 = StellarPiWallet("DEMO_WALLET_2")
    
    print("🏦 PiDex Stability Pool Demo ($314K PI)")
    print(f"🎯 Target Peg: ${PI_STELLAR.FIXED_VALUE_USD:,}")
    
    # Open CDPs
    cdp1 = pool.open_cdp(wallet1, collateral_usd=3141590, assets=["XLM", "BTC"])  # 10x
    cdp2 = pool.open_cdp(wallet2, collateral_usd=1000000, assets=["ETH", "USDC"])   # Risky
    
    # Add collateral
    pool.deposit_collateral(cdp1, 500000)
    
    # Check liquidations
    pool.check_liquidations()
    
    # Repay debt
    pool.repay_debt(cdp1, 0.5)
    
    # Risk metrics
    print("\n📊 RISK METRICS:")
    print(json.dumps(pool.get_position_risk(cdp1), indent=2))
    
    print(f"\n🌊 POOL HEALTH: {pool.get_pool_health():.1f}%")
    print(f"💎 Total Value Locked: ${float(pool.total_collateral_usd):,.0f}")

if __name__ == "__main__":
    demo_stability_pool()
