use crate::bridge::{BridgeTx, BridgeStatus};
use dashmap::DashMap;
use std::sync::Arc;

pub struct BridgeManager {
    pub pending_txs: Arc<DashMap<String, BridgeTx>>,
    pub completed_txs: Arc<DashMap<String, BridgeTx>>,
}

impl BridgeManager {
    pub fn new() -> Self {
        Self {
            pending_txs: Arc::new(DashMap::new()),
            completed_txs: Arc::new(DashMap::new()),
        }
    }

    pub fn track_tx(&self, tx: BridgeTx) {
        self.pending_txs.insert(tx.pi_txid.clone(), tx);
    }

    pub fn complete_tx(&self, pi_txid: &str, status: BridgeStatus) {
        if let Some(mut tx) = self.pending_txs.remove(pi_txid) {
            tx.status = status;
            self.completed_txs.insert(pi_txid.to_string(), tx);
        }
    }
}
