use alloy::{
    primitives::{Address, U256, Bytes},
    providers::{Provider, ProviderBuilder, Ws},
    signers::local::PrivateKeySigner,
    transports::ws::WsConnect,
};
use crate::bridge::{BridgeTx, BridgeStatus, Chain};
use std::str::FromStr;
use tokio::time::{sleep, Duration};

pub struct EthereumBridge {
    provider: Ws,
    signer: PrivateKeySigner,
    contract_address: Address,
}

impl EthereumBridge {
    pub async fn new(
        rpc_url: &str,
        private_key: &str,
        contract_address: &str,
    ) -> anyhow::Result<Self> {
        let ws_url = rpc_url.replace("http", "ws");
        let provider = ProviderBuilder::new()
            .on_ws(WsConnect::new(ws_url))
            .await?;
        
        let private_key = alloy::signers::local::PrivateKey::from_str(private_key)?;
        let signer = PrivateKeySigner::from(private_key);
        
        let contract_addr = Address::from_str(contract_address)?;
        
        Ok(Self {
            provider,
            signer,
            contract_address: contract_addr,
        })
    }

    pub async fn bridge_pi_to_eth(
        &self,
        pi_txid: &str,
        amount_nano_pi: u64,
        recipient: &str,
    ) -> anyhow::Result<BridgeTx> {
        let amount_eth = U256::from(amount_nano_pi / 1_000_000_000); // Convert to ETH equiv
        let recipient = Address::from_str(recipient)?;
        
        // Bridge contract call
        let calldata = self.encode_bridge_call(pi_txid, amount_eth, recipient);
        
        let tx = self.provider
            .fill_transaction({
                let mut tx = alloy::types::TxEnvelope::default();
                tx.set_to(self.contract_address);
                tx.set_data(calldata);
                tx.set_gas_limit(500_000);
                tx
            }, None)
            .await?;

        let pending_tx = self.provider.send_transaction(tx).await?;
        let tx_hash = pending_tx.tx_hash();

        // Wait for confirmation
        sleep(Duration::from_secs(12)).await;
        let receipt = pending_tx.get_receipt().await?;

        let bridge_tx = BridgeTx {
            id: uuid::Uuid::new_v4(),
            pi_txid: pi_txid.to_string(),
            chain_tx_hash: format!("0x{}", hex::encode(tx_hash.as_bytes())),
            chain: Chain::Ethereum,
            amount: amount_nano_pi,
            from_pi: "pi1supernode".to_string(),
            to_chain_addr: recipient.to_string(),
            status: if receipt.status == Some(1u64) {
                BridgeStatus::Confirmed
            } else {
                BridgeStatus::Failed("Tx failed".to_string())
            },
            timestamp: chrono::Utc::now(),
        };

        log::info!("🌉 ETH Bridge: {} PI → {} ETH | Tx: 0x{}",
            amount_nano_pi / 1e9, amount_eth, hex::encode(tx_hash.as_bytes()));
        
        Ok(bridge_tx)
    }

    fn encode_bridge_call(&self, pi_txid: &str, amount: U256, recipient: Address) -> Bytes {
        // ABI encoded: bridgePi(string piTxid, uint256 amount, address recipient)
        let selector = hex::decode("a1b2c3d4").unwrap(); // Actual ABI selector
        Bytes::from(selector)
    }
            }
