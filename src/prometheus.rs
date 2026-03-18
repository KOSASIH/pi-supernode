use metrics::{describe_counter, describe_gauge, register_counter, register_gauge};
use metrics_exporter_prometheus::{PrometheusBuilder, PrometheusHandle};
use once_cell::sync::Lazy;
use prometheus::register_histogram_vec_with_registry;

pub static PROMETHEUS_HANDLE: Lazy<PrometheusHandle> = Lazy::new(|| {
    let builder = PrometheusBuilder::new();
    builder.install_recorder().unwrap()
});

pub fn init_metrics() {
    // V20 Core Metrics
    describe_counter!("pi_blocks_total", "Total blocks processed");
    describe_counter!("pi_txs_total", "Total transactions");
    describe_gauge!("pi_node_peers", "Active P2P peers");
    describe_gauge!("pi_balance_pi", "Node PI balance");
    
    // Bridge Metrics
    describe_counter!("pi_bridge_eth_total", "ETH bridge transactions");
    describe_histogram!("pi_transfer_latency", "Transfer latency seconds");
}

pub struct V20Metrics {
    pub blocks_total: Counter,
    pub txs_total: Counter,
    pub peers_count: Gauge,
    pub transfer_latency: Histogram,
}

impl V20Metrics {
    pub fn new() -> Self {
        Self {
            blocks_total: register_counter!("pi_blocks_total"),
            txs_total: register_counter!("pi_txs_total"),
            peers_count: register_gauge!("pi_node_peers"),
            transfer_latency: register_histogram!("pi_transfer_latency"),
        }
    }

    pub fn block_processed(&self) {
        self.blocks_total.increment(1);
    }

    pub fn tx_processed(&self, latency: f64) {
        self.txs_total.increment(1);
        self.transfer_latency.observe(latency);
    }
}
