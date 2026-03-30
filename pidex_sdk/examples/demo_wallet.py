from pidex_sdk import StellarPiWallet

# Testnet demo
wallet = StellarPiWallet("YOUR_SECRET_KEY_HERE")
print(wallet.get_account_info())
