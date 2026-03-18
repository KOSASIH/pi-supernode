use crate::config::Config;
use sea_orm::{Database, DatabaseConnection, EntityTrait, ActiveModelTrait};
use sqlx::postgres::PgPoolOptions;
use std::sync::Arc;
use tokio::sync::RwLock;
use dashmap::DashMap;

pub struct V20Service {
    pub db: DatabaseConnection,
    pub blocks: Arc<RwLock<DashMap<u64, Block>>>,
    pub transactions: Arc<RwLock<DashMap<String, Transaction>>>,
    pub wallet_balances: Arc<RwLock<DashMap<String, u64>>>,
}

#[derive(Clone)]
pub struct Block {
    pub height: u64,
    pub hash: String,
    pub timestamp: i64,
    pub transactions: Vec<String>,
}

#[derive(Clone)]
pub struct Transaction {
    pub txid: String,
    pub from: String,
    pub to: String,
    pub amount: u64,
    pub signature: String,
}

impl V20Service {
    pub async fn new(config: &Config) -> anyhow::Result<Self> {
        // Production Database
        let pool = PgPoolOptions::new()
            .max_connections(50)
            .connect(&config.database_url).await?;
        
        let db = Database::connect(&config.database_url).await?;
        
        // Init V20 Schema
        sqlx::migrate!("./migrations")
            .run(&pool)
            .await?;

        Ok(Self {
            db,
            blocks: Arc::new(RwLock::new(DashMap::new())),
            transactions: Arc::new(RwLock::new(DashMap::new())),
            wallet_balances: Arc::new(RwLock::new(DashMap::new())),
        })
    }

    pub async fn process_v20_transfer(&self, tx: Transaction) -> anyhow::Result<String> {
        // V20 Atomic Transfer Logic
        let txid = hex::encode(ed25519_dalek::ShaR512::digest(&tx.txid.as_bytes()));
        
        // Update balances atomically
        let from_balance = self.wallet_balances.read().await;
        let mut balances = self.wallet_balances.write().await;
        
        let from_bal = from_balance.get(&tx.from).unwrap_or(&0).clone();
        if from_bal < tx.amount {
            return Err(anyhow::anyhow!("Insufficient balance"));
        }
        
        *balances.entry(tx.from.clone()).or_insert(0) -= tx.amount;
        *balances.entry(tx.to.clone()).or_insert(0) += tx.amount;
        
        // Store TX
        self.transactions.write().await.insert(txid.clone(), tx);
        
        info!("✅ V20 Transfer: {} -> {} ({} PI)", tx.from, tx.to, tx.amount);
        Ok(txid)
    }
}
