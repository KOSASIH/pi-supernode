use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Clone, Serialize, Deserialize)]
pub enum Chain {
    Ethereum,
    Solana,
    Bsc,
    Polygon,
    Arbitrum,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct BridgeTx {
    pub id: uuid::Uuid,
    pub pi_txid: String,
    pub chain_tx_hash: String,
    pub chain: Chain,
    pub amount: u64,        // nanoPI
    pub from_pi: String,
    pub to_chain_addr: String,
    pub status: BridgeStatus,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

#[derive(Clone, Serialize, Deserialize, PartialEq)]
pub enum BridgeStatus {
    Pending,
    Submitted,
    Confirmed,
    Claimed,
    Failed(String),
}

impl fmt::Display for BridgeStatus {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            BridgeStatus::Pending => write!(f, "⏳ Pending"),
            BridgeStatus::Submitted => write!(f, "📤 Submitted"),
            BridgeStatus::Confirmed => write!(f, "✅ Confirmed"),
            BridgeStatus::Claimed => write!(f, "🎉 Claimed"),
            BridgeStatus::Failed(err) => write!(f, "❌ Failed: {}", err),
        }
    }
}

#[derive(Clone, Serialize, Deserialize)]
pub struct BridgeConfig {
    pub ethereum_rpc: String,
    pub ethereum_private_key: String,
    pub ethereum_contract: String,
    pub solana_rpc: String,
    pub solana_keypair: String,
    pub bsc_rpc: String,
    pub gas_limit: u64,
}
