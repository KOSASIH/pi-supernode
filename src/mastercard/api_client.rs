// src/mastercard/api_client.rs - MasterCard Gateway v2.0 Production Client
// Enterprise 3DS2 + Tokenization + Settlement + Real-time Processing

use reqwest::{
    Client, Method, header::{HeaderMap, HeaderValue, CONTENT_TYPE},
    StatusCode,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use ring::{
    hmac::{self, Key, HMAC_SHA256},
    rand::{SecureRandom, SystemRandom},
};
use base64::{Engine as _, engine::general_purpose};
use std::{
    time::{SystemTime, UNIX_EPOCH, Duration},
    collections::HashMap,
};
use anyhow::{Result, anyhow};
use tokio::time::timeout;
use uuid::Uuid;

use crate::mastercard::{
    PaymentRequest, PaymentResponse, CardDetails, PaymentTransaction, PaymentStatus,
};

const MASTER_CARD_SANDBOX: &str = "https://sandbox.api.mastercard.com";
const MASTER_CARD_PROD: &str = "https://api.mastercard.com";

#[derive(Clone)]
pub struct MasterCardGateway {
    client: Client,
    api_key: String,
    merchant_id: String,
    signing_key: Key,
    base_url: String,
    access_token: tokio::sync::Mutex<Option<AccessToken>>,
    token_expiry: tokio::sync::Mutex<SystemTime>,
}

#[derive(Clone, Serialize, Deserialize)]
struct AccessToken {
    token: String,
    expires_in: u64,
}

#[derive(Serialize, Deserialize)]
struct AuthSignature {
    timestamp: u64,
    token_requestor_id: String,
    api_key: String,
    signature: String,
}

impl MasterCardGateway {
    /// Initialize production MasterCard Gateway
    pub fn new(
        api_key: String,
        merchant_id: String,
        signing_key_hex: &str,
        sandbox: bool,
    )
