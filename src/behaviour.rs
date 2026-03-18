use libp2p::kad::{Kademlia, KademliaEvent, store::MemoryStore};
use libp2p::request_response::{RequestResponse, ProtocolSupport};
use libp2p::PeerId;

pub enum Event {
    Kademlia(KademliaEvent),
    RequestResponse(/* ... */),
}

pub struct PiBehaviour {
    kademlia: Kademlia<MemoryStore>,
    request_response: RequestResponse<Codec>,
}

impl PiBehaviour {
    pub fn new(local_peer_id: PeerId) -> anyhow::Result<Self> {
        let store = MemoryStore::new(local_peer_id);
        let kademlia = Kademlia::with_config(local_peer_id, store, Default::default());
        
        let request_response = RequestResponse::new(
            Codec::default(),
            ProtocolSupport::Full,
            Default::default(),
        );
        
        Ok(Self { kademlia, request_response })
    }
}
