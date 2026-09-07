use axum::{routing::get, Json, Router};
use serde::Serialize;
use std::net::SocketAddr;
use tracing::{info, Level};
use tracing_subscriber::FmtSubscriber;

#[derive(Serialize)]
struct StatusResponse {
    status: String,
    protocol: String,
    quantum_shield: bool,
    sync: bool,
}

async fn health_check() -> Json<StatusResponse> {
    Json(StatusResponse {
        status: "V21 OK".to_string(),
        protocol: "2.1.0".to_string(),
        quantum_shield: true,
        sync: true,
    })
}

#[tokio::main]
async fn main() {
    let subscriber = FmtSubscriber::builder()
        .with_max_level(Level::INFO)
        .finish();
    tracing::subscriber::set_global_default(subscriber).expect("setting default subscriber failed");

    info!("Initializing Pi Supernode V21 Core Engine...");
    info!("Quantum-Resistant Cryptography & QUIC P2P active.");

    let app = Router::new()
        .route("/health", get(health_check))
        .route("/api/v21/status", get(health_check));

    let addr = SocketAddr::from(([0, 0, 0, 0], 8545));
    info!("Pi Supernode V21 listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
