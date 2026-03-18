use libp2p::{
    noise, quic, tcp, yamux, Transport,
    core::upgrade::Version,
    futures::prelude::*,
    identity::Keypair,
    Multiaddr, TransportError,
};
use std::time::Duration;

pub fn build_transport(key: Keypair) -> anyhow::Result<libp2p::transport::Boxed<(PeerId, StreamMuxerBox)>> {
    let noise_config = noise::Config::new(&key)?;
    let yamux_config = yamux::Config::default();

    let tcp_transport = tcp::tokio::Transport::new(tcp::Config::default())
        .upgrade(Version::V1Lazy)
        .authenticate(noise_config)
        .multiplex(yamux_config)
        .boxed();

    let quic_transport = quic::tokio::Transport::new(quic::Config::new(&key))
        .boxed();

    // V20 Multi-Transport (TCP + QUIC)
    let transport = libp2p::transport::OrTransport::new(tcp_transport, quic_transport)
        .map(|either_output| either_output.map(|(peer_id, muxer)| (peer_id, StreamMuxerBox::new(muxer))))
        .boxed();

    Ok(transport)
}
