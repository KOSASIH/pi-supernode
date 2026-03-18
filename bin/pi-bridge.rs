use pi_supernode_v20::bridge::*;
use clap::{Parser, Subcommand};

#[derive(Parser)]
struct Cli {
    #[command(subcommand)]
    command: BridgeCommand,
}

#[derive(Subcommand)]
enum BridgeCommand {
    /// Bridge PI to Ethereum
    Eth {
        #[arg(short, long)]
        pi_txid: String,
        #[arg(short, long)]
        amount: u64,
        #[arg(short, long)]
        recipient: String,
    },
    /// Bridge PI to Solana
    Sol {
        #[arg(short, long)]
        pi_txid: String,
        #[arg(short, long)]
        amount: u64,
        #[arg(short, long)]
        recipient: String,
    },
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();
    
    match cli.command {
        BridgeCommand::Eth { pi_txid, amount, recipient } => {
            let bridge = EthereumBridge::new(
                "https://eth-mainnet.alchemyapi.io/v2/YOUR_KEY",
                "YOUR_PRIVATE_KEY",
                "0xBridgeContractAddress",
            ).await?;
            
            let tx = bridge.bridge_pi_to_eth(&pi_txid, amount, &recipient).await?;
            println!("✅ ETH Bridge TX: {:?}", tx);
        }
        BridgeCommand::Sol { pi_txid, amount, recipient } => {
            let bridge = SolanaBridge::new(
                "https://api.mainnet-beta.solana.com",
                include_bytes!("solana_keypair.json"),
                "BridgeProgramID",
            )?;
            
            let tx = bridge.bridge_pi_to_sol(&pi_txid, amount, &recipient).await?;
            println!("✅ Solana Bridge TX: {:?}", tx);
        }
    }
    
    Ok(())
}
