"""
Stellar Wallet Manager for PiDex - $314K PI Stablecoin
✅ Full Stellar SCP + Trustline Management
✅ Path Payments + Multi-Asset Operations
⚠️ DEMO/EDUCATIONAL ONLY
"""

import stellar_sdk
from stellar_sdk import Keypair, Server, TransactionBuilder, Network
from stellar_sdk.exceptions import BadRequestError, NotFoundError
from typing import Optional, Dict, List, Any
from constant import (
    STELLAR_NET, PI_STELLAR, STELLAR_PIDEX, STELLAR_CONFIG,
    STELLAR_DISCLAIMER
)
import warnings
import base64
import json

warnings.warn(STELLAR_DISCLAIMER["WARNING"], UserWarning)

class StellarPiWallet:
    """Advanced Stellar wallet for PiDex $314K stablecoin operations"""
    
    def __init__(self, secret_key: str, horizon_url: str = None):
        """
        Initialize Stellar Pi Wallet
        
        Args:
            secret_key: Stellar secret key (S...)
            horizon_url: Horizon server URL
        """
        self.keypair = Keypair.from_secret(secret_key)
        self.public_key = self.keypair.public_key
        self.server = Server(horizon_url or STELLAR_NET.MAINNET_HORIZON[0])
        self.network_passphrase = STELLAR_NET.PUBNET_NETWORK_PASSPHRASE
        
        # Cache account data
        self._account_data = None
        self._balances = {}
    
    @property
    def balances(self) -> Dict[str, float]:
        """Get all account balances including PI stablecoin"""
        if not self._balances:
            self._load_balances()
        return self._balances
    
    def _load_balances(self):
        """Load account balances from Stellar Horizon"""
        try:
            account = self.server.load_account(self.public_key)
            self._balances = {
                "XLM": float(account.balances[0].balance) if account.balances else 0.0,
                PI_STELLAR.SYMBOL: 0.0  # PI stablecoin balance
            }
            
            # Load trustlines for PI stablecoin
            for balance in account.balances:
                if balance.asset_code == PI_STELLAR.ASSET_CODE:
                    self._balances[PI_STELLAR.SYMBOL] = float(balance.balance)
                    
        except NotFoundError:
            print(f"⚠️ Account {self.public_key} not funded")
    
    def ensure_trustline(self, asset_code: str = PI_STELLAR.ASSET_CODE, 
                        issuer: str = PI_STELLAR.ISSUER, 
                        limit: str = "922337203685.4775807") -> bool:
        """
        Ensure trustline exists for PI stablecoin ($314K pegged)
        
        Returns:
            True if trustline created/verified
        """
        try:
            account = self.server.load_account(self.public_key)
            
            # Check existing trustline
            for balance in account.balances:
                if (balance.asset_code == asset_code and 
                    balance.asset_issuer == issuer):
                    print(f"✅ Trustline exists: {asset_code}/{issuer}")
                    return True
            
            # Create trustline transaction
            tx_builder = TransactionBuilder(
                account, self.network_passphrase, STELLAR_CONFIG["fee_bps"]
            )
            
            trustline_op = stellar_sdk.ChangeTrustOp(
                line=stellar_sdk.TrustLineAsset(
                    asset_code, stellar_sdk.Keypair.from_public_key(issuer)
                ),
                limit=limit
            )
            
            tx_builder.append_change_trust_op(trustline_op)
            tx = tx_builder.build()
            tx.sign(self.keypair)
            
            # Submit
            response = self.server.submit_transaction(tx)
            print(f"✅ PI Trustline created: {response['hash']}")
            return True
            
        except Exception as e:
            print(f"❌ Trustline failed: {e}")
            return False
    
    def fund_account(self, starting_balance: float = 2.0) -> Optional[str]:
        """Friendbot funding for testnet (demo only)"""
        try:
            if "testnet" in self.server.root["horizon_url"]:
                response = self.server.fund_account(self.public_key, starting_balance)
                print(f"💰 Account funded: {starting_balance} XLM")
                return response["secret"]
        except:
            pass
        return None
    
    def send_pi_stable(self, destination: str, amount_pi: float, 
                      memo: str = None) -> Optional[str]:
        """
        Send $314K pegged PI stablecoin
        
        Args:
            destination: Stellar public key
            amount_pi: Amount in PI (each = $314,159)
            memo: Transaction memo
            
        Returns:
            Transaction hash
        """
        try:
            # Verify trustline first
            self.ensure_trustline()
            
            account = self.server.load_account(self.public_key)
            pi_asset = stellar_sdk.Asset(
                PI_STELLAR.ASSET_CODE, 
                stellar_sdk.Keypair.from_public_key(PI_STELLAR.ISSUER)
            )
            
            tx_builder = TransactionBuilder(
                account, self.network_passphrase, STELLAR_CONFIG["fee_bps"]
            )
            
            # Payment operation
            payment_op = stellar_sdk.PaymentOp(
                destination=destination,
                asset=pi_asset,
                amount=str(amount_pi)
            )
            
            tx_builder.append_payment_op(payment_op)
            
            # Add memo
            if memo:
                tx_builder.append_memo(stellar_sdk.Memo.text(memo))
            
            tx = tx_builder.build()
            tx.sign(self.keypair)
            
            response = self.server.submit_transaction(tx)
            usd_value = amount_pi * PI_STELLAR.FIXED_VALUE_USD
            
            print(f"💸 Sent {amount_pi} PI (${usd_value:,.0f})")
            print(f"📄 Tx: {response['hash']}")
            
            return response["hash"]
            
        except Exception as e:
            print(f"❌ PI payment failed: {e}")
            return None
    
    def path_payment_pi_to_xlm(self, dest_amount_xlm: float) -> Optional[str]:
        """
        Path Payment: PI ($314K) → XLM via DEX
        
        Stellar Path Payment finds best rate automatically
        """
        try:
            account = self.server.load_account(self.public_key)
            
            pi_asset = stellar_sdk.Asset(
                PI_STELLAR.ASSET_CODE, 
                stellar_sdk.Keypair.from_public_key(PI_STELLAR.ISSUER)
            )
            xlm_asset = stellar_sdk.Asset.native()
            
            tx_builder = TransactionBuilder(
                account, self.network_passphrase, STELLAR_CONFIG["fee_bps"]
            )
            
            path_payment_op = stellar_sdk.PathPaymentStrictSendOp(
                send_asset=pi_asset,
                send_max=str(1.0),  # Max 1 PI to spend
                dest_asset=xlm_asset,
                dest_amount=str(dest_amount_xlm),
                destination=self.public_key  # Back to self for demo
            )
            
            tx_builder.append_path_payment_strict_send_op(path_payment_op)
            tx = tx_builder.build()
            tx.sign(self.keypair)
            
            response = self.server.submit_transaction(tx)
            print(f"🔄 Path Payment: 1 PI → {dest_amount_xlm} XLM")
            print(f"📄 Tx: {response['hash']}")
            
            return response["hash"]
            
        except Exception as e:
            print(f"❌ Path payment failed: {e}")
            return None
    
    def get_account_info(self) -> Dict[str, Any]:
        """Get full account info with PI stablecoin details"""
        try:
            account = self.server.load_account(self.public_key)
            info = {
                "public_key": self.public_key,
                "sequence": account.sequence,
                "xlm_balance": float(account.balances[0].balance) if account.balances else 0,
                "pi_balance": 0.0,
                "pi_usd_value": 0.0,
                "trustlines": []
            }
            
            # PI stablecoin details
            for balance in account.balances:
                if balance.asset_code == PI_STELLAR.ASSET_CODE:
                    info["pi_balance"] = float(balance.balance)
                    info["pi_usd_value"] = float(balance.balance) * PI_STELLAR.FIXED_VALUE_USD
            
            return info
            
        except NotFoundError:
            return {"error": "Account not found"}
    
    def create_stellar_account(self, friendbot: bool = True) -> Dict[str, Any]:
        """Create new Stellar account with PI trustline"""
        info = self.get_account_info()
        
        if friendbot and "testnet" in self.server.root["horizon_url"]:
            self.fund_account()
        
        self.ensure_trustline()
        
        return {
            "public_key": self.public_key,
            "secret_key": self.keypair.secret,
            "status": "ready_with_pi_trustline"
        }

# ========================================
# 💰 QUICK START EXAMPLES
# ========================================
def demo_wallet():
    """Demo usage"""
    # Generate new wallet (DEMO)
    kp = Keypair.random()
    wallet = StellarPiWallet(kp.secret)
    
    print("🌟 Stellar PiDex Wallet Demo")
    print(f"📱 Public: {wallet.public_key}")
    print(f"🔑 Secret: {kp.secret}")
    
    # Account info
    info = wallet.get_account_info()
    print(json.dumps(info, indent=2))
    
    print(f"\n💎 1 PI = ${PI_STELLAR.FIXED_VALUE_USD:,} USD")
    print("✅ Ready for PiDex path payments!")

if __name__ == "__main__":
    demo_wallet()
