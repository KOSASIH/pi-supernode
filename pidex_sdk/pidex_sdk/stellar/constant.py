"""PiDex Stellar Constants - Production"""
from stellar_sdk import Asset

PI_ASSET = Asset("PI", "GBEZ6KWEOOWTB6GCK5L5HAPWMJ5NBJZA7M6AJ5G2H2LT7T4YS3JMKH6I")
XLM_ASSET = Asset.native()

STELLAR_CONFIG = {
    "PI_USD_PEG": 314159,
    "HORIZON_MAINNET": [
        "https://horizon.stellar.org",
        "https://horizon.stellar.org:443"
    ],
    "CERT_PINS": [
        "sha256/StellarDevelopmentFoundation"
    ]
}
