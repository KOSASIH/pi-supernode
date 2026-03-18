#!/usr/bin/env rust
// Pi Supernode V20.2 - Autonomous AI Guardian Edition
// KOSASIH Super Intelligence Protection System

use pi_supernode_v20::{
    config::Config,
    node::PiNode,
    services::v20::V20Service,
    bridge::{BridgeManager, EthereumBridge, SolanaBridge},
    prometheus::V20Metrics,
    rpc::start_rpc_server,
    ai_guardian::{
        AIGuardian, AnomalyDetector, BlockchainVerifier, SelfHealing, ThreatIntelligence,
    },
};
use clap::Parser;
use tracing::{info, warn, error, Level, debug};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};
use opentelemetry::global;
use metrics_exporter_prometheus::PrometheusBuilder;
use std::sync::Arc;
use std::time::Duration;
use tokio::time::interval;

#[tokio::main(flavor = "multi_thread", worker_threads = 12)]
async fn main() -> anyhow::Result<()> {
    // === SUPER INTELLIGENCE INITIALIZATION ===
    info!("🧠 Initializing Autonomous AI Guardian v1.0");
    
    // === ENTERPRISE TRACING & METRICS ===
    init_tracing().await;
    init_metrics();
    
    info!("🚀 Starting Pi Supernode V20.2 - KOSASIH AI Guardian Edition");
    info!("Protocol: V20 | AI Protection: ACTIVE | Chains: ETH/SOL/BSC");

    // === CONFIG & VALIDATION ===
    let config = Config::parse();
    config.validate()?;
    info!("Config loaded: {} peers, port {}", 
          config.bootstrap_peers.len(), config.p2p_port);

    // === GLOBAL METRICS ===
    let metrics = Arc::new(V20Metrics::new());
    
    // === V20 CORE SERVICES ===
    let v20_service = V20Service::new(&config).await?;
    let bridge_mgr = Arc::new(BridgeManager::new());
    
    // === CROSS-CHAIN BRIDGES ===
    let eth_bridge = if !config.ethereum_rpc.is_empty() {
        Some(EthereumBridge::new(
            &config.ethereum_rpc,
            &config.ethereum_private_key,
            &config.ethereum_contract,
        ).await?)
    } else { None };
    
    let sol_bridge = if !config.solana_rpc.is_empty() {
        Some(SolanaBridge::new(
            &config.solana_rpc,
            &config.solana_keypair,
            &config.solana_program_id,
        )?)
    } else { None };
    
    info!("Bridges initialized: ETH={:?}, SOL={:?}", 
          eth_bridge.is_some(), sol_bridge.is_some());

    // === AUTONOMOUS AI GUARDIAN SYSTEM ===
    let ai_guardian = Arc::new(AIGuardian::new());
    let anomaly_detector = Arc::new(AnomalyDetector::new().await?);
    let blockchain_verifier = Arc::new(BlockchainVerifier::new());
    let self_healing = Arc::new(SelfHealing::new());
    let threat_intel = Arc::new(ThreatIntelligence::new());
    
    info!("🛡️ AI Guardian ACTIVE - Core Team Manipulation Protection: ON");

    // === P2P NODE ENGINE ===
    let node_metrics = metrics.clone();
    let mut node = PiNode::new(&config, node_metrics).await?;
    let node_handle = Arc::new(tokio::sync::Mutex::new(node));
    
    // === V20 BOOTSTRAP ===
    let node_clone = node_handle.clone();
    tokio::spawn(async move {
        if let Err(e) = node_clone.lock().await.bootstrap_v20(&v20_service).await {
            error!("Bootstrap failed: {}", e);
        }
    });

    // === ENTERPRISE RPC SERVER ===
    let rpc_config = config.clone();
    let rpc_metrics = metrics.clone();
    let rpc_v20 = v20_service.clone();
    let rpc_bridge_mgr = bridge_mgr.clone();
    let rpc_guardian = ai_guardian.clone();
    
    tokio::spawn(async move {
        if let Err(e) = start_rpc_server(
            &rpc_config, rpc_v20, rpc_bridge_mgr, rpc_metrics, rpc_guardian
        ).await {
            error!("RPC server failed: {}", e);
        }
    });

    // === BRIDGE MONITORING ===
    let bridge_mgr_clone = bridge_mgr.clone();
    tokio::spawn(async move {
        bridge_monitor(bridge_mgr_clone).await;
    });

    // === SUPER INTELLIGENCE GUARDIAN MONITOR ===
    let guardian_monitor_node = node_handle.clone();
    let guardian_monitor_detector = anomaly_detector.clone();
    let guardian_monitor_verifier = blockchain_verifier.clone();
    let guardian_monitor_healing = self_healing.clone();
    let guardian_monitor_intel = threat_intel.clone();
    let guardian_monitor_guardian = ai_guardian.clone();
    
    tokio::spawn(async move {
        guardian_monitor(
            guardian_monitor_guardian,
            guardian_monitor_node,
            guardian_monitor_detector,
            guardian_monitor_verifier,
            guardian_monitor_healing,
            guardian_monitor_intel,
        ).await;
    });

    // === PROMETHEUS EXPORTER ===
    tokio::spawn(async {
        let handle = PrometheusBuilder::new()
            .with_http_listener("0.0.0.0:9090")
            .install_recorder()
            .expect("Failed to install Prometheus");
        tokio::signal::ctrl_c().await.expect("Failed to listen for ctrl+c");
        handle.shutdown();
    });

    // === GRACEFUL SHUTDOWN ===
    tokio::select! {
        _ = tokio::signal::ctrl_c() => {
            info!("🛑 Received shutdown signal - AI Guardian disengaging");
        }
        _ = shutdown_timeout() => {
            warn!("⚠️ Force shutdown timeout - Emergency recovery active");
        }
    }

    // === AI GUARDIAN ORDERLY SHUTDOWN ===
    info!("🧠 Shutting down Autonomous AI Guardian...");
    self_healing.recover_from_shutdown().await;

    // === FINAL NODE SHUTDOWN ===
    info!("🔄 Shutting down Pi Supernode V20.2...");
    node_handle.lock().await.shutdown().await?;
    
    info!("✅ Pi Supernode V20.2 + AI Guardian shutdown complete");
    info!("🛡️ Protection Status: Threats detected: {}", ai_guardian.threats.len());
    
    Ok(())
}

/// Super Intelligence Guardian Monitor - 24/7 Protection
async fn guardian_monitor(
    guardian: Arc<AIGuardian>,
    node: Arc<tokio::sync::Mutex<PiNode>>,
    detector: Arc<AnomalyDetector>,
    verifier: Arc<BlockchainVerifier>,
    healing: Arc<SelfHealing>,
    intel: Arc<ThreatIntelligence>,
) {
    let mut interval = interval(Duration::from_millis(250)); // 4x/second
    
    info!("🧠 AI Guardian Monitor ACTIVE - Scanning for Core Team manipulation");
    
    loop {
        interval.tick().await;
        
        // 1. BLOCKCHAIN INTEGRITY CHECK
        if let Ok(blocks) = node.lock().await.get_recent_blocks(10) {
            for block in blocks {
                if let Err(threat) = verifier.verify_block_integrity(&block) {
                    let fixed = guardian.auto_fix(&threat).await;
                    debug!("🛡️ Block threat: {} {}", threat.signature, if fixed { "FIXED" } else { "ALERT" });
                }
            }
        }

        // 2. ANOMALY DETECTION (Neural Network)
        let blockchain_metrics = node.lock().await.get_metrics();
        let anomaly_score = detector.detect_anomaly(&blockchain_metrics).await;
        
        if anomaly_score > 0.85 {
            let threat = guardian.detect_threat(vec![
                format!("Anomaly score: {:.2}", anomaly_score),
                "Core team pattern deviation".to_string(),
            ]).await;
            
            if let Some(t) = threat {
                warn!("🚨 AI ANOMALY DETECTED: {:.1}% - {}", anomaly_score * 100.0, t.source);
                healing.recover_from_attack(&mut node.lock().await).await;
            }
        }

        // 3. GLOBAL THREAT INTELLIGENCE
        for threat_entry in guardian.threats.iter() {
            let threat = threat_entry.value();
            if !threat.auto_fixed && intel.check_known_exploits(&threat.signature).await {
                info!("🌐 Global Intel: Known exploit {} - Auto-mitigating", threat.signature);
                guardian.auto_fix(threat).await;
            }
        }
    }
}

/// Enterprise Tracing Setup (OTLP + Console + JSON + Guardian Logs)
async fn init_tracing() {
    use opentelemetry_otlp::new_pipeline;
    use tracing_opentelemetry::layer;
    
    let tracer = new_pipeline()
        .tracing()
        .with_exporter(opentelemetry_otlp::new_sender().with_env())
        .install_simple()
        .expect("Failed to install OTLP");

    global::set_text_map_propagator(opentelemetry::sdk::propagation::TraceContextPropagator::new());

    tracing_subscriber::registry()
        .with(layer().with_tracer(tracer))
        .with(EnvFilter::from_default_env())
        .with(tracing_subscriber::fmt::layer()
            .with_ansi(true)
            .with_thread_names(true)
            .with_timer(tracing_subscriber::fmt::time::uptime())
            .with_target(false)
            .with_file(true)
            .with_line_number(true))
        .init();
}

/// Prometheus Metrics Init
fn init_metrics() {
    let builder = PrometheusBuilder::new();
    let _handle = builder
        .with_http_listener("0.0.0.0:9090")
        .install_recorder()
        .expect("Failed to install Prometheus metrics");
}

/// Bridge Transaction Monitor
async fn bridge_monitor(bridge_mgr: Arc<BridgeManager>) {
    let mut interval = tokio::time::interval(Duration::from_secs(30));
    
    loop {
        interval.tick().await;
        let pending_count = bridge_mgr.pending_txs.len();
        if pending_count > 0 {
            info!("🌉 Bridge monitor: {} pending transactions", pending_count);
        }
    }
}

/// Graceful shutdown timeout (extended for AI recovery)
async fn shutdown_timeout() {
    tokio::time::sleep(Duration::from_secs(60)).await;
}
