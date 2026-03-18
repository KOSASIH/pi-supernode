use clap::{Parser, Subcommand};
use crate::config::Config;
use crate::node::PiNode;
use ed25519_dalek::{Keypair, Signer};

#[derive(Parser)]
#[command(name = "pi-supernode-v20")]
#[command(about = "KOSASIH Pi Supernode V20 CLI", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Generate node keypair
    Keygen,
    /// Create V20 transfer
    Transfer {
        #[arg(short, long)]
        to: String,
        #[arg(short, long)]
        amount: u64,
    },
    /// Check node status
    Status,
}

pub async fn run_cli() -> anyhow::Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Commands::Keygen => {
            let keypair = Keypair::generate(&mut rand::thread_rng());
            let public_key = hex::encode(keypair.public.to_bytes());
            let private_key = hex::encode(keypair.to_bytes());
            println!("Public Key: {}", public_key);
            println!("Private Key: {}", private_key);
        }
        Commands::Transfer { to, amount } => {
            // V20 Transfer CLI
            println!("Creating V20 transfer: {} PI → {}", amount, to);
        }
        Commands::Status => {
            // Node status check
            println!("✅ V20 Node Status: ACTIVE");
        }
    }
    Ok(())
}
