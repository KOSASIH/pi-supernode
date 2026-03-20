// src/mastercard/types.rs - Public API Types
use serde::{Deserialize, Serialize};

#[derive(Clone, Serialize, Deserialize)]
pub struct CardDetails {
    pub number: String,
    pub expiry_month: u8,
    pub expiry_year: u16,
    pub cvv: String,     // PCI: Never store
    pub holder_name: String,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct PaymentRequest {
    pub pi_amount: u64,
    pub fiat_amount: f64,
    pub currency: String,
    pub order_id: String,
    pub card: CardDetails,
    pub three_ds_required: bool,
    pub acs_challenge: Option<String>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct PaymentResponse {
    pub transaction_id: String,
    pub status: super::PaymentStatus,
    pub pi_amount: u64,
    pub fiat_amount: f64,
    pub card_last4: String,
}
