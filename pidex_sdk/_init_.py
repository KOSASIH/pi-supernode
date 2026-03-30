"""
PiDex SDK - Stellar SCP $314K PI Stablecoin
🌟 Production-ready Stellar integration
⚠️ DEMO/EDUCATION ONLY
"""

__version__ = "1.0.0"
__author__ = "PiDex Team"

from .constant import PI_STELLAR, STELLAR_NET
from .stellar_wallet import StellarPiWallet

__all__ = ["PI_STELLAR", "STELLAR_NET", "StellarPiWallet"]
