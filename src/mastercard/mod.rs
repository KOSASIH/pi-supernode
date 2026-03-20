// src/mastercard/mod.rs - Pi Supernode Mastercard Processor
pub mod api_client;
pub mod tokenization;
pub mod three_ds;
pub mod settlement;
pub mod types;

pub use api_client::MasterCardGateway;
pub use types::{PaymentRequest, PaymentResponse, CardDetails, PaymentTransaction, PaymentStatus};

use std::sync::Arc;
use tokio::sync::Mutex;
use serde::{Deserialize, Serialize};
use anyhow::Result;

#[derive(Clone, Serialize, Deserialize)]
pub struct PaymentTransaction {
    pub id: String,
    pub pi_amount: u64,           // nanoPI (1e9 = 1 PI)
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
    token_vault: Arc<tokenization::TokenVault>,
    settlement_active: Arc<Mutex<bool>>,
    daily_limit: Arc<Mutex<f64>>,  // USD
    daily_volume: Arc<Mutex<f64>>,
}

impl MasterCardProcessor {
    pub async fn new(gateway: MasterCardGateway) -> Result<Self> {
        let token_vault = tokenization::TokenVault::new(gateway.clone()).await?;
        
        Ok(Self {
            gateway: Arc::new(gateway),
            token_vault: Arc::new(token_vault),
            settlement_active: Arc::new(Mutex::new(true)),
            daily_limit: Arc::new(Mutex::new(100_000.0)), // $100k USD
            daily_volume: Arc::new(Mutex::new(0.0)),
        })
    }

    /// Full Payment Flow: Tokenize → 3DS → Authorize → Capture
    pub async fn process_payment(&self, req: PaymentRequest) -> Result<PaymentResponse> {
        // 1. Tokenization
        let card_token = self.tokenize_card(&req.card).await?;
        
        // 2. Check Daily Limits
        self.check_daily_limits(req.fiat_amount).await?;

        // 3. 3DS Authentication (if required)
        let transaction = PaymentTransaction {
            id: uuid::Uuid::new_v4().to_string(),
            pi_amount: req.pi_amount,
            fiat_amount: req.fiat_amount,
            card_token: card_token.clone(),
            status: PaymentStatus::Pending,
            three_ds_required: false,
            created_at: chrono::Utc::now(),
        };

        let three_ds_token = if req.three_ds_required {
            self.authenticate_3ds(&transaction, &req.acs_challenge).await?
        } else {
            three_ds::ThreeDSToken::default()
        };

        // 4. Authorization
        let auth_result = self.authorize_payment(&transaction, &three_ds_token).await?;
        
        // 5. Capture (for PI purchases)
        let final_status = if auth_result.status == PaymentStatus::Authorized {
            self.capture_payment(&auth_result).await?
        } else {
            auth_result.status
        };

        Ok(PaymentResponse {
            transaction_id: transaction.id,
            status: final_status,
            pi_amount: transaction.pi_amount,
            fiat_amount: transaction.fiat_amount,
            card_last4: card_token.chars().skip(12).take(4).collect(),
        })
    }

    async fn tokenize_card(&self, card: &CardDetails) -> Result<String> {
        let token_resp = self.token_vault.tokenize_card(card.clone()).await?;
        Ok(token_resp.token)
    }

    async fn check_daily_limits(&self, amount: f64) -> Result<()> {
        let mut daily_vol = self.daily_volume.lock().await;
        let limit = *self.daily_limit.lock().await;
        
        if *daily_vol + amount > limit {
            return Err(anyhow::anyhow!("Daily limit exceeded: ${:.2}", limit));
        }
        
        *daily_vol += amount;
        Ok(())
    }

    async fn authenticate_3ds(
        &self, 
        transaction: &PaymentTransaction,
        acs_challenge: &str
    ) -> Result<three_ds::ThreeDSToken> {
        self.token_vault.three_ds_authenticate(transaction, acs_challenge).await
    }

    async fn authorize_payment(
        &self,
        transaction: &PaymentTransaction,
        three_ds: &three_ds::ThreeDSToken
    ) -> Result<PaymentTransaction> {
        // Mock authorization - real MDES call
        Ok(transaction.clone())
    }

    async fn capture_payment(&self, transaction: &PaymentTransaction) -> Result<PaymentStatus> {
        self.settlement::capture(transaction.clone()).await
    }
        }
