use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use thiserror::Error;

#[derive(Parser, Clone, Debug, Serialize, Deserialize)]
pub struct Config {
    /// Node wallet address
    #[arg(long, env = "PI_WALLET")]
    pub wallet_address: String,
    
    /// Node private key (hex)
    #[arg(long, env = "PI_NODE_KEY")]
    pub node_key: String,
    
    /// P2P Port
    #[arg(long, default_value = "31400")]
    pub p2p_port: u16,
    
    /// RPC Port
    #[arg(long, default_value = "31401")]
    pub rpc_port: u16,
    
    /// Database URL
    #[arg(long, env = "DATABASE_URL", default_value = "postgres://pi:pi@localhost/pi_v20")]
    pub database_url: String,
    
    /// V20 Protocol Version
    #[arg(long, default_value = "2.0.0")]
    pub protocol_version: String,
    
    /// Bootstrap Peers
    #[arg(long, value_delimiter = ',')]
    pub bootstrap_peers: Vec<String>,
    
    /// Data Directory
    #[arg(long, default_value = "./data")]
    pub data_dir: PathBuf,
}

impl Config {
    pub fn validate(&self) -> Result<(), ConfigError> {
        if self.wallet_address.is_empty() {
            return Err(ConfigError::MissingWallet);
        }
        if self.node_key.len() != 128 { // 64 bytes hex
            return Err(ConfigError::InvalidKey);
        }
        Ok(())
    }
}

#[derive(Error, Debug)]
pub enum ConfigError {
    #[error("Wallet address required")]
    MissingWallet,
    #[error("Node key must be 64 bytes hex (128 chars)")]
    InvalidKey,
}
