use solana_sdk::{
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    transaction::Transaction,
    instruction::{AccountMeta, Instruction},
    commitment_config::CommitmentConfig,
};
use solana_client::rpc_client::RpcClient;
use crate::bridge::{BridgeTx, Chain};

pub struct SolanaBridge {
    rpc_url: String,
    keypair: Keypair,
    program_id: Pubkey,
}

impl SolanaBridge {
    pub fn new(rpc_url: &str, keypair_bytes: &[u8], program_id: &str) -> anyhow::Result<Self> {
        let keypair = Keypair::from_bytes(keypair_bytes)?;
        let program_id = Pubkey::from_str(program_id)?;
        
        Ok(Self {
            rpc_url: rpc_url.to_string(),
            keypair,
            program_id,
        })
    }

    pub async fn bridge_pi_to_sol(
        &self,
        pi_txid: &str,
        amount_lamports: u64,
        recipient: &str,
    ) -> anyhow::Result<BridgeTx> {
        let client = RpcClient::new_with_commitment(self.rpc_url.clone(), CommitmentConfig::confirmed());
        let recipient = Pubkey::from_str(recipient)?;
        
        // Solana program instruction
        let instruction = Instruction::new_with_bytes(
            self.program_id,
            &self.encode_solana_ix(pi_txid.as_bytes(), &amount_lamports.to_le_bytes(), &recipient.to_bytes()),
            vec![
                AccountMeta::new(self.keypair.pubkey(), true),
                AccountMeta::new(recipient, false),
            ],
        );

        let recent_blockhash = client.get_latest_blockhash()?;
        let tx = Transaction::new_signed_with_payer(
            &[instruction],
            Some(&self.keypair.pubkey()),
            &[&self.keypair],
            recent_blockhash,
        );

        let signature = client.send_and_confirm_transaction(&tx)?;
        
        let bridge_tx = BridgeTx {
            id: uuid::Uuid::new_v4(),
            pi_txid: pi_txid.to_string(),
            chain_tx_hash: signature.to_string(),
            chain: Chain::Solana,
            amount: amount_lamports,
            from_pi: "pi1supernode".to_string(),
            to_chain_addr: recipient.to_string(),
            status: BridgeStatus::Confirmed,
            timestamp: chrono::Utc::now(),
        };

        log::info!("☀️ Solana Bridge: {} PI → {} lamports | Sig: {}", 
            amount_lamports / 1e9, amount_lamports, signature);
        
        Ok(bridge_tx)
    }

    fn encode_solana_ix(&self, pi_txid: &[u8], amount: &[u8], recipient: &[u8]) -> Vec<u8> {
        let mut data = Vec::new();
        data.extend_from_slice(&[0x10, 0x20]); // Bridge instruction discriminator
        data.extend_from_slice(pi_txid);
        data.extend_from_slice(amount);
        data.extend_from_slice(recipient);
        data
    }
}
