// BSC = Ethereum clone - Reuse EthereumBridge with different RPC
use super::ethereum::EthereumBridge;
use crate::bridge::Chain;

pub struct BscBridge {
    inner: EthereumBridge,
}

impl BscBridge {
    pub async fn new(rpc_url: &str, private_key: &str, contract: &str) -> anyhow::Result<Self> {
        let inner = EthereumBridge::new(rpc_url, private_key, contract).await?;
        Ok(Self { inner })
    }

    pub async fn bridge_pi_to_bsc(
        &self,
        pi_txid: &str,
        amount: u64,
        recipient: &str,
    ) -> anyhow::Result<BridgeTx> {
        let tx = self.inner.bridge_pi_to_eth(pi_txid, amount, recipient).await?;
        Ok(BridgeTx { 
            chain: Chain::Bsc,
            ..tx 
        })
    }
}
