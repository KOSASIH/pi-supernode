// Polygon = EVM - Reuse EthereumBridge
use super::{ethereum::EthereumBridge, types::Chain};

pub struct PolygonBridge {
    inner: EthereumBridge,
}

impl PolygonBridge {
    pub async fn new(rpc_url: &str, private_key: &str, contract: &str) -> anyhow::Result<Self> {
        let inner = EthereumBridge::new(rpc_url, private_key, contract).await?;
        Ok(Self { inner })
    }

    // Same interface as Ethereum
}
