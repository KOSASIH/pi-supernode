use tower_http::{cors::CorsLayer, trace::TraceLayer};
use hyper::service::{make_service_fn, service_fn};
use std::convert::Infallible;
use std::net::SocketAddr;

pub async fn start_rpc_server(config: &Config, v20_service: V20Service) -> anyhow::Result<()> {
    let app = axum::Router::new()
        .route("/health", axum::routing::get(health_check))
        .route("/v20/transfer", axum::routing::post(create_transfer))
        .route("/v20/balance/:address", axum::routing::get(get_balance))
        .route("/explorer", axum::routing::get(explorer))
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http());

    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", config.rpc_port)).await?;
    axum::serve(listener, app).await?;
    Ok(())
}

async fn health_check() -> &'static str {
    "{\"status\":\"V20 OK\",\"protocol\":\"2.0.0\",\"sync\":true}"
}

async fn create_transfer(
    axum::extract::Json(payload): axum::extract::Json<TransferRequest>
) -> axum::Json<TransferResponse> {
    // V20 Transfer endpoint
    axum::Json(TransferResponse {
        txid: "0xabc123".to_string(),
        status: "confirmed".to_string(),
    })
}

#[derive(serde::Deserialize)]
struct TransferRequest {
    to: String,
    amount: u64,
    memo: Option<String>,
}
