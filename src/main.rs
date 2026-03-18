#!/usr/bin/env rust
// Pi Supernode V20 - Production Ready
// KOSASIH Enhanced Edition

use pi_supernode_v20::config::Config;
use pi_supernode_v20::node::PiNode;
use pi_supernode_v20::services::v20::V20Service;
use clap::Parser;
use tracing::{info, Level};
use tracing_subscriber;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // V20 Logging Setup
    tracing_subscriber::fmt()
        .with_max_level(Level::INFO)
        .init();

    info!("🚀 Starting Pi Supernode V20 - KOSASIH Edition");

    // Parse CLI + Config
    let config = Config::parse();
    config.validate()?;

    // Initialize V20 Node
    let mut node = PiNode::new(&config).await?;
    
    // V20 Services Stack
    let v20_service = V20Service::new(&config).await?;
    
    // Bootstrap V20 Network
    node.bootstrap_v20(&v20_service).await?;
    
    // Graceful shutdown
    tokio::signal::ctrl_c().await?;
    node.shutdown().await?;
    
    info!("✅ Pi Supernode V20 shutdown complete");
    Ok(())
}
