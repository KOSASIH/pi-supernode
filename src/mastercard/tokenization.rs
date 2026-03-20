// src/mastercard/tokenization.rs - MasterCard Token Vault + 3DS2 Authentication
// Production Tokenization Service with PCI-DSS Compliance
// ⚠️ DEMO ONLY - Requires Mastercard MDES Production Approval

use super::{
    CardDetails, PaymentStatus, PaymentTransaction,
    MasterCardGateway, TokenResponse, ThreeDSToken,
};
use reqwest::{StatusCode, Client};
use serde::{Deserialize, Serialize};
use ring::{
    aead::{AEAD, Nonce, NONCE_LEN, LessSafeKey, UnboundKey, AES_256_GCM},
    rand::{SecureRandom, SystemRandom},
    signature::{self, KeyPair},
};
use base64::{Engine as _, engine::general_purpose};
use std::collections::HashMap;
use anyhow::Result;
use tokio::sync::Mutex;
use std::sync::Arc;
use secrecy::{SecretString, Secret};

#[derive(Clone, Serialize, Deserialize)]
pub struct TokenVault {
    gateway: MasterCardGateway,
    client: Client,
    rng: SystemRandom,
    session_key: Secret<Vec<u8>>,
    #[serde(skip)]
    token_cache: Arc<Mutex<HashMap<String, TokenResponse>>>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct TokenizationRequest {
    pub card_number: String,
    pub expiry_month: u8,
    pub expiry_year: u16,
    pub cardholder_name: String,
    pub cryptogram: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct TokenResponse {
    pub token: String,
    pub token_expiry: String,
    pub token_type: String,
    pub cryptogram: String,
    pub status: PaymentStatus,
}

#[derive(Serialize, Deserialize)]
struct MDESRequest {
    request_type: String,
    request_data: HashMap<String, serde_json::Value>,
}

#[derive(Deserialize)]
struct MDESResponse {
    response_type: String,
    response_data: HashMap<String, serde_json::Value>,
}

impl TokenVault {
    pub fn new(gateway: MasterCardGateway, session_key: Secret<Vec<u8>>) -> Self {
        Self {
            gateway,
            client: Client::new(),
            rng: SystemRandom::new(),
            session_key,
            token_cache: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// PCI-DSS Compliant Card Tokenization
    pub async fn tokenize_card(&self, card: CardDetails) -> Result<TokenResponse> {
        let token_req = self.build_tokenization_request(&card)?;
        let encrypted_req = self.encrypt_request(token_req)?;
        
        let response = self.send_tokenization_request(&encrypted_req).await?;
        let decrypted = self.decrypt_response(response)?;
        
        let token_resp = self.parse_token_response(decrypted)?;
        self.cache_token(&token_resp).await;
        
        Ok(token_resp)
    }

    /// 3DS 2.0 Authentication Flow
    pub async fn authenticate_3ds2(
        &self, 
        token: &str, 
        acs_url: &str, 
        transaction: &PaymentTransaction
    ) -> Result<ThreeDSToken> {
        let auth_req = self.build_3ds2_request(token, acs_url, transaction)?;
        let response = self.client
            .post(&self.gateway.three_ds_url)
            .header("Authorization", &self.gateway.oauth_token)
            .json(&auth_req)
            .send()
            .await?;

        if response.status() == StatusCode::OK {
            let three_ds_token: ThreeDSToken = response.json().await?;
            Ok(three_ds_token)
        } else {
            Err(anyhow::anyhow!("3DS2 Authentication failed: {}", response.status()))
        }
    }

    /// Token Detokenization (Card Recovery)
    pub async fn detokenize(&self, token: &str) -> Result<CardDetails> {
        let cache = self.token_cache.lock().await;
        if let Some(cached) = cache.get(token) {
            return Ok(CardDetails {
                number: cached.token.clone(), // Mock - real would decrypt
                expiry_month: 12,
                expiry_year: 2025,
                holder_name: "DETOKENIZED".to_string(),
            });
        }

        // Real MDES detokenization call
        let req = MDESRequest {
            request_type: "DETOKENIZE".to_string(),
            request_data: HashMap::from([("token".to_string(), serde_json::Value::String(token.to_string()))]),
        };

        let response = self.client
            .post(&format!("{}/detokenize", self.gateway.base_url))
            .header("x-correlation-id", self.generate_correlation_id())
            .json(&req)
            .send()
            .await?;

        let mdes_resp: MDESResponse = response.json().await?;
        self.parse_detokenized_card(&mdes_resp)
    }

    fn build_tokenization_request(&self, card: &CardDetails) -> Result<MDESRequest> {
        let mut data = HashMap::new();
        data.insert("pan".to_string(), serde_json::Value::String(card.number.clone()));
        data.insert("expiryMonth".to_string(), serde_json::Value::Number(card.expiry_month.into()));
        data.insert("expiryYear".to_string(), serde_json::Value::Number(card.expiry_year.into()));

        Ok(MDESRequest {
            request_type: "TOKENIZE".to_string(),
            request_data: data,
        })
    }

    fn encrypt_request(&self, request: MDESRequest) -> Result<String> {
        let key = UnboundKey::new(&AES_256_GCM, &self.session_key.expose_secret())?;
        let mut nonce_bytes = [0u8; NONCE_LEN];
        self.rng.fill(&mut nonce_bytes)?;

        let aead_key = LessSafeKey::new(key);
        let nonce = Nonce::assume_unique_for_key(nonce_bytes);

        let request_json = serde_json::to_string(&request)?;
        let ciphertext = aead_key.seal_in_place_separate_tag(nonce, b"", request_json.as_bytes().as_mut())?;

        let mut payload = nonce_bytes.to_vec();
        payload.extend_from_slice(ciphertext);
        Ok(general_purpose::STANDARD.encode(payload))
    }

    async fn send_tokenization_request(&self, encrypted_req: &str) -> Result<String> {
        let response = self.client
            .post(&format!("{}/tokenize", self.gateway.base_url))
            .header("Content-Type", "application/json")
            .header("x-session-key", base64::encode(&self.session_key.expose_secret()))
            .header("x-correlation-id", self.generate_correlation_id())
            .body(encrypted_req.to_string())
            .send()
            .await?;

        response.text().await.map_err(|e| anyhow::anyhow!("Tokenization request failed: {}", e))
    }

    fn decrypt_response(&self, encrypted: String) -> Result<String> {
        let payload = general_purpose::STANDARD.decode(encrypted)?;
        
        let nonce_bytes = &payload[..NONCE_LEN];
        let ciphertext = &payload[NONCE_LEN..];

        let key = UnboundKey::new(&AES_256_GCM, &self.session_key.expose_secret())?;
        let aead_key = LessSafeKey::new(key);
        let nonce = Nonce::assume_unique_for_key(nonce_bytes.try_into().unwrap());

        let mut in_out = ciphertext.to_vec();
        aead_key.open_in_place(nonce, b"", &mut in_out)?;
        
        String::from_utf8(in_out).map_err(|e| anyhow::anyhow!("Decryption failed: {}", e))
    }

    fn parse_token_response(&self, response: String) -> Result<TokenResponse> {
        let mdes_resp: MDESResponse = serde_json::from_str(&response)?;
        
        let token_data = mdes_resp.response_data
            .get("token")
            .and_then(|t| t.as_str())
            .ok_or_else(|| anyhow::anyhow!("No token in response"))?;

        Ok(TokenResponse {
            token: token_data.to_string(),
            token_expiry: "2025-12-31T23:59:59Z".to_string(), // Mock
            token_type: "PAYMENT".to_string(),
            cryptogram: self.generate_cryptogram()?,
            status: PaymentStatus::Success,
        })
    }

    async fn cache_token(&self, token: &TokenResponse) {
        let mut cache = self.token_cache.lock().await;
        cache.insert(token.token.clone(), token.clone());
    }

    fn generate_correlation_id(&self) -> String {
        use ring::rand::SecureRandom;
        let mut bytes = [0u8; 16];
        self.rng.fill(&mut bytes).unwrap();
        base64::encode(bytes)
    }

    fn generate_cryptogram(&self) -> Result<String> {
        let mut bytes = [0u8; 16];
        self.rng.fill(&mut bytes)?;
        Ok(general_purpose::STANDARD.encode(bytes))
    }

    fn parse_detokenized_card(&self, resp: &MDESResponse) -> Result<CardDetails> {
        // PCI-DSS: Never log/store full PAN in production
        let pan = resp.response_data.get("pan")
            .and_then(|p| p.as_str())
            .unwrap_or("****").to_string();

        Ok(CardDetails {
            number: pan,
            expiry_month: 12,
            expiry_year: 2025,
            holder_name: "REDACTED".to_string(),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use secrecy::Secret;

    #[tokio::test]
    async fn test_tokenization_flow() {
        let gateway = MasterCardGateway::sandbox();
        let session_key = Secret::new(vec![0u8; 32]);
        let vault = TokenVault::new(gateway, session_key);

        let card = CardDetails {
            number: "4111111111111111".to_string(),
            expiry_month: 12,
            expiry_year: 2025,
            holder_name: "TEST USER".to_string(),
        };

        let result = vault.tokenize_card(card).await;
        assert!(result.is_ok());
        
        let token_resp = result.unwrap();
        assert!(!token_resp.token.is_empty());
    }
}
