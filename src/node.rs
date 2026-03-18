use crate::config::Config;
use crate::services::v20::V20Service;
use libp2p::{identity, Multiaddr, PeerId, Swarm};
use libp2p::kad::{Kademlia, store::MemoryStore};
use libp2p::swarm::{SwarmBuilder, SwarmEvent};
use std::collections::HashSet;
use tokio::sync::RwLock;
use dashmap::DashMap;

pub struct PiNode {
    pub swarm: RwLock<Swarm<pi_supernode_v20::behaviour::PiBehaviour>>,
    pub peers: DashMap<PeerId, String>,
    pub config: Config,
    pub v20_service: V20Service,
}

impl PiNode {
    pub async fn new(config: &Config) -> anyhow::Result<Self> {
        let local_key = identity::Keypair::from_protobuf_hex(&config.node_key)?;
        let local_peer_id = PeerId::from(local_key.public());
        
        let transport = pi_supernode_v20::transport::build_transport(local_key.clone())?;
        let behaviour = pi_supernode_v20::behaviour::PiBehaviour::new(local_peer_id)?;
        
        let mut swarm = SwarmBuilder::with_tokio_executor(transport, behaviour, local_peer_id)
            .build()?;

        // Listen on all interfaces
        let listen_addr: Multiaddr = format!("/ip4/0.0.0.0/tcp/{}", config.p2p_port).parse()?;
        swarm.listen_on(listen_addr)?;

        let v20_service = V20Service::new(config).await?;
        
        Ok(Self {
            swarm: RwLock::new(swarm),
            peers: DashMap::new(),
            config: config.clone(),
            v20_service,
        })
    }

    pub async fn bootstrap_v20(&mut self, v20_svc: &V20Service) -> anyhow::Result<()> {
        // Connect to bootstrap peers
        for peer in &self.config.bootstrap_peers {
            let addr: Multiaddr = peer.parse()?;
            self.swarm.write().await.dial(addr)?;
        }
        
        // V20 Kademlia Bootstrap
        let mut swarm = self.swarm.write().await;
        let kad = swarm.behaviour_mut().kademlia.as_mut().unwrap();
        kad.bootstrap()?;
        
        info!("🌐 V20 Network bootstrapped");
        Ok(())
    }

    pub async fn run(&mut self) -> anyhow::Result<()> {
        loop {
            let event = {
                let mut swarm = self.swarm.write().await;
                swarm.select_next_some().await
            };

            match event {
                SwarmEvent::NewListenAddr { address, .. } => {
                    info!("Listening on {}", address);
                }
                SwarmEvent::Behaviour(pi_supernode_v20::behaviour::Event::Kademlia(event)) => {
                    self.handle_kademlia(event).await;
                }
                SwarmEvent::Behaviour(pi_supernode_v20::behaviour::Event::RequestResponse(_)) => {
                    // Handle RPC
                }
                _ => {}
            }
        }
    }
}
