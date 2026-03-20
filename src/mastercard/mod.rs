pub mod api_client;
pub mod tokenization;
pub mod three_ds;
pub mod settlement;
pub mod types;

pub use api_client::MasterCardGateway;
pub use types::{PaymentRequest, PaymentResponse, CardDetails};

use std::sync::Arc;
use tokio::sync::Mutex;
use serde::{Deserialize, Serialize};

#[derive(Clone, Serialize, Deserialize)]
pub struct PaymentTransaction {
    pub id: String,
    pub pi_amount: u64,           // nanoPI
    pub fiat_amount: f64,         // USD
    pub card_token: String,
    pub status: PaymentStatus,
    pub three_ds_required: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Clone, Serialize, Deserialize, PartialEq)]
pub enum PaymentStatus {
    Pending,
    Authorized,
    Captured,
    Settled,
    Failed(String),
    Refunded,
}

pub struct MasterCardProcessor {
    gateway: Arc<MasterCardGateway>,
    settlement_active: bool,
    daily_limit: f64,  // USD
}
