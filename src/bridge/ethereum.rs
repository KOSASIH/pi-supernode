use alloy::primitives::{Address, U256};
use alloy::providers::{Provider, ProviderBuilder};
use alloy::transports::ws::WsConnect;
use serde::{Deserialize, Serialize};
use std::str::FromStr;

#[derive(Clone)]
pub struct EthereumBridge {
    rpc_url: String,
    private_key: String,
    contract_address: Address,
}

#[derive(Serialize, Deserialize)]
pub struct BridgeTx {
    pub pi_txid: String,
    pub eth_tx_hash: String,
    pub amount: U256,
    pub recipient: Address,
    pub status: BridgeStatus,
}

#[derive(Serialize, Deserialize, Clone, Copy)]
pub enum BridgeStatus {
    Pending,
    Confirmed,
    Claimed,
    Failed,
}

impl EthereumBridge {
    pub fn new(rpc_url: &str, private_key: &str, contract_addr: &str) -> Self {
        Self {
            rpc_url: rpc_url.to_string(),
            private_key: private_key.to_string(),
            contract_address: Address::from_str(contract_addr).unwrap(),
        }
    }

    pub async fn bridge_pi_to_eth(&self, amount: u64, pi_txid: &str) -> anyhow::Result<String> {
        let provider = ProviderBuilder::new()
            .on_ws(WsConnect::new(self.rpc_url.clone()))
            .await?;

        // V20 Bridge Logic
        let wallet = LocalWallet::from_str(&self.private_key)?.with_chain_id(1u64);
        let client = provider.with_wallet(wallet);

        // Call bridge contract
        let call = self.contract_address
            .bridgePi(amount.into(), pi_txid.to_string())
            .gas(500_000);

        let tx = client.send_transaction(call).await?;
        let tx_hash = tx.tx_hash().to_string();

        info!("🌉 V20 Bridge PI→ETH: {} | Tx: {}", amount, tx_hash);
        Ok(tx_hash)
    }

    pub async fn claim_eth_to_pi(&self, eth_tx_hash: &str) -> anyhow::Result<()> {
        // Claim logic from Ethereum to Pi mainnet
        info!("🌉 Claim ETH→PI: {}", eth_tx_hash);
        Ok(())
    }
}
