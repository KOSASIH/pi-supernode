// src/config.rs - Pi Supernode V20.2 + Mastercard Enterprise Configuration
use clap::{Parser, Subcommand};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::collections::HashSet;
use anyhow::{Result, anyhow};
use secrecy::{SecretString, Secret};
use tokio::fs;

#[derive(Parser, Clone, Debug)]
#[command(author = "KOSASIH", version = "20.2.0", about = "Pi Supernode V20.2 + Mastercard", long_about = None)]
pub struct Config {
    /// Enable Mastercard payment processing
    #[clap(long, default_value = "false")]
    pub mastercard_enabled: bool,

    /// Mastercard API Key (required for production)
    #[clap(long, env = "MC_API_KEY")]
    pub mastercard_api_key: Option<String>,

    /// Mastercard Merchant ID
    #[clap(long, env = "MC_MERCHANT_ID")]
    pub mastercard_merchant_id: Option<String>,

    /// Mastercard Signing Key (64 hex chars)
    #[clap(long, env = "MC_SIGNING_KEY")]
    pub mastercard_signing_key: Option<String>,

    /// Use Mastercard Sandbox (default: true)
    #[clap(long, default_value = "true")]
    pub mastercard_sandbox: bool,

    /// P2P listening port
    #[clap(long, default_value = "31400")]
    pub p2p_port: u16,

    /// Bootstrap peers (multiples allowed)
    #[clap(long, value_delimiter = ',')]
    pub bootstrap_peers: Vec<String>,

    /// Ethereum RPC endpoints
    #[clap(long, value_delimiter = ',')]
    pub ethereum_rpc: Vec<String>,

    /// Ethereum private key (hex)
    #[clap(long, env = "ETH_PRIVATE_KEY")]
    pub ethereum_private_key: Option<String>,

    /// Ethereum bridge contract
    #[clap(long)]
    pub ethereum_contract: Option<String>,

    /// Solana RPC endpoints
    #[clap(long, value_delimiter = ',')]
    pub solana_rpc: Vec<String>,

    /// Solana keypair JSON file
    #[clap(long)]
    pub solana_keypair: Option<PathBuf>,

    /// Solana program ID
    #[clap(long)]
    pub solana_program_id: Option<String>,

    /// Database URL (PostgreSQL)
    #[clap(long, env = "DATABASE_URL")]
    pub database_url: Option<String>,

    /// Redis URL for caching
    #[clap(long, env = "REDIS_URL", default_value = "redis://localhost:6379")]
    pub redis_url: String,

    /// Enable RPC server
    #[clap(long, default_value = "true")]
    pub rpc_enabled: bool,

    /// RPC bind address
    #[clap(long, default_value = "0.0.0.0:8545")]
    pub rpc_addr: String,

    /// Config file override
    #[clap(long, value_parser = parse_config_file)]
    pub config_file: Option<PathBuf>,

    /// Log level
    #[clap(long, default_value = "info")]
    pub log_level: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct LoadedConfig {
    pub mastercard: MastercardConfig,
    pub p2p: P2PConfig,
    pub ethereum: Option<EthereumConfig>,
    pub solana: Option<SolanaConfig>,
    pub database: DatabaseConfig,
    pub redis: RedisConfig,
    pub rpc: RPCConfig,
    pub ai_guardian: AIGuardianConfig,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct MastercardConfig {
    pub enabled: bool,
    pub api_key: SecretString,
    pub merchant_id: String,
    pub signing_key: SecretString,
    pub sandbox: bool,
    pub daily_limit_usd: f64,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct P2PConfig {
    pub port: u16,
    pub bootstrap_peers: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct EthereumConfig {
    pub rpc_urls: Vec<String>,
    pub private_key: SecretString,
    pub contract_address: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct SolanaConfig {
    pub rpc_urls: Vec<String>,
    pub keypair_path: PathBuf,
    pub program_id: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct DatabaseConfig {
    pub url: String,
    pub pool_size: u32,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct RedisConfig {
    pub url: String,
    pub token_ttl_seconds: u64,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct RPCConfig {
    pub enabled: bool,
    pub bind_addr: String,
    pub cors_origins: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct AIGuardianConfig {
    pub enabled: bool,
    pub scan_interval_ms: u64,
    pub threat_threshold: f64,
}

impl Config {
    /// Parse CLI + load config file + validate
    pub async fn parse() -> Self {
        let mut config = Parser::parse();

        // Load config file if specified
        if let Some(config_path) = &config.config_file {
            if config_path.exists() {
                let config_str = fs::read_to_string(config_path).await.unwrap_or_default();
                let loaded: LoadedConfig = toml::from_str(&config_str).unwrap_or_default();
                config.merge_loaded_config(loaded);
            }
        }

        config
    }

    /// Merge loaded TOML config into CLI config
    fn merge_loaded_config(&mut self, loaded: LoadedConfig) {
        // Mastercard
        if let Ok(api_key) = SecretString::new(loaded.mastercard.api_key.expose_secret().clone()) {
            self.mastercard_api_key = Some(api_key.expose_secret().clone());
        }
        // ... merge other fields
    }

    /// Full validation + secrets check
    pub fn validate(&self) -> Result<()> {
        if self.mastercard_enabled {
            self.validate_mastercard()?;
        }
        if !self.ethereum_rpc.is_empty() {
            self.validate_ethereum()?;
        }
        self.validate_network()?;
        self.validate_paths()?;
        Ok(())
    }

    fn validate_mastercard(&self) -> Result<()> {
        if self.mastercard_enabled {
            if self.mastercard_api_key.is_none() {
                return Err(anyhow!("mastercard_enabled=true requires mastercard_api_key"));
            }
            if self.mastercard_merchant_id.is_none() {
                return Err(anyhow!("mastercard_enabled=true requires mastercard_merchant_id"));
            }
            if self.mastercard_signing_key.is_none() {
                return Err(anyhow!("mastercard_enabled=true requires mastercard_signing_key (64 hex chars)"));
            }
            let key = self.mastercard_signing_key.as_ref().unwrap();
            if key.len() != 64 || !key.chars().all(|c| c.is_ascii_hexdigit()) {
                return Err(anyhow!("mastercard_signing_key must be 64 hex characters"));
            }
        }
        Ok(())
    }

    fn validate_ethereum(&self) -> Result<()> {
        if self.ethereum_rpc.is_empty() {
            return Err(anyhow!("ethereum_rpc cannot be empty when bridges enabled"));
        }
        if self.ethereum_private_key.is_none() {
            return Err(anyhow!("ethereum_private_key required for ETH bridge"));
        }
        Ok(())
    }

    fn validate_network(&self) -> Result<()> {
        if self.p2p_port == 0 || self.p2p_port > 65535 {
            return Err(anyhow!("p2p_port must be 1-65535, got {}", self.p2p_port));
        }
        Ok(())
    }

    fn validate_paths(&self) -> Result<()> {
        if let Some(keypair_path) = &self.solana_keypair {
            if !keypair_path.exists() {
                return Err(anyhow!("solana_keypair path does not exist: {:?}", keypair_path));
            }
        }
        Ok(())
    }

    /// Load full runtime config with secrets
    pub async fn load_runtime_config(&self) -> Result<LoadedConfig> {
        LoadedConfig::from_cli(self).await
    }
}

impl LoadedConfig {
    async fn from_cli(cli: &Config) -> Result<Self> {
        Ok(Self {
            mastercard: MastercardConfig {
                enabled: cli.mastercard_enabled,
                api_key: SecretString::new(cli.mastercard_api_key.clone().unwrap_or_default()),
                merchant_id: cli.mastercard_merchant_id.clone().unwrap_or_default(),
                signing_key: SecretString::new(cli.mastercard_signing_key.clone().unwrap_or_default()),
                sandbox: cli.mastercard_sandbox,
                daily_limit_usd: 100_000.0,
            },
            p2p: P2PConfig {
                port: cli.p2p_port,
                bootstrap_peers: cli.bootstrap_peers.clone(),
            },
            ethereum: cli.ethereum_private_key.as_ref().map(|key| EthereumConfig {
                rpc_urls: cli.ethereum_rpc.clone(),
                private_key: SecretString::new(key.clone()),
                contract_address: cli.ethereum_contract.clone().unwrap_or_default(),
            }),
            solana: cli.solana_keypair.as_ref().map(|path| SolanaConfig {
                rpc_urls: cli.solana_rpc.clone(),
                keypair_path: path.clone(),
                program_id: cli.solana_program_id.clone().unwrap_or_default(),
            }),
            database: DatabaseConfig {
                url: cli.database_url.clone().unwrap_or_else(|| "postgresql://localhost/pi_supernode".to_string()),
                pool_size: 20,
            },
            redis: RedisConfig {
                url: cli.redis_url.clone(),
                token_ttl_seconds: 86_400, // 24h
            },
            rpc: RPCConfig {
                enabled: cli.rpc_enabled,
                bind_addr: cli.rpc_addr.clone(),
                cors_origins: vec!["*".to_string()],
            },
            ai_guardian: AIGuardianConfig {
                enabled: true,
                scan_interval_ms: 250,
                threat_threshold: 0.85,
            },
        })
    }
}

/// TOML config file parser
fn parse_config_file(path: &str) -> Result<PathBuf> {
    let path = PathBuf::from(path);
    if path.exists() {
        Ok(path)
    } else {
        Err(anyhow!("Config file not found: {}", path.display()))
    }
}
