// src/mastercard/gateway.rs - Mastercard Gateway Configuration + OAuth2
use serde::{Deserialize, Serialize};
use secrecy::{SecretString, Secret};
use std::env;
use anyhow::Result;

#[derive(Clone, Serialize, Deserialize)]
pub struct MasterCardGateway {
    pub base_url: String,
    pub token_url: String,
    pub three_ds_url: String,
    pub oauth_client_id: SecretString,
    pub oauth_client_secret: SecretString,
    #[serde(skip)]
    pub oauth_token: SecretString,
    pub merchant_id: String,
    pub signing_key_id: String,
    pub environment: GatewayEnvironment,
}

#[derive(Clone, Serialize, Deserialize, PartialEq)]
pub enum GatewayEnvironment {
    Sandbox,
    Production,
}

impl MasterCardGateway {
    pub fn sandbox() -> Self {
        Self {
            base_url: "https://sandbox.api.mastercard.com/mdes".to_string(),
            token_url: "https://sandbox.api.mastercard.com/oauth2/token".to_string(),
            three_ds_url: "https://sandbox.api.mastercard.com/3ds".to_string(),
            oauth_client_id: SecretString::new("your_sandbox_client_id".to_string()),
            oauth_client_secret: SecretString::new("your_sandbox_secret".to_string()),
            oauth_token: SecretString::new("".to_string()),
            merchant_id: "MCH-0000000001".to_string(),
            signing_key_id: "key-123".to_string(),
            environment: GatewayEnvironment::Sandbox,
        }
    }

    pub fn production() -> Result<Self> {
        Ok(Self {
            base_url: "https://api.mastercard.com/mdes".to_string(),
            token_url: "https://api.mastercard.com/oauth2/token".to_string(),
            three_ds_url: "https://api.mastercard.com/3ds".to_string(),
            oauth_client_id: SecretString::new(env::var("MC_OAUTH_CLIENT_ID")?),
            oauth_client_secret: SecretString::new(env::var("MC_OAUTH_CLIENT_SECRET")?),
            oauth_token: SecretString::new("".to_string()),
            merchant_id: env::var("MC_MERCHANT_ID")?,
            signing_key_id: env::var("MC_SIGNING_KEY_ID")?,
            environment: GatewayEnvironment::Production,
        })
    }

    pub async fn refresh_token(&mut self, http_client: &reqwest::Client) -> Result<()> {
        let params = [
            ("grant_type", "client_credentials"),
            ("scope", "mdes tokens:read tokens:write 3ds:read 3ds:write"),
        ];

        let response = http_client
            .post(&self.token_url)
            .basic_auth(
                self.oauth_client_id.expose_secret(),
                Some(self.oauth_client_secret.expose_secret())
            )
            .form(&params)
            .send()
            .await?;

        let token_resp: OAuthResponse = response.json().await?;
        self.oauth_token = SecretString::new(token_resp.access_token);
        Ok(())
    }
}

#[derive(Deserialize)]
struct OAuthResponse {
    access_token: String,
    token_type: String,
    expires_in: u64,
}
