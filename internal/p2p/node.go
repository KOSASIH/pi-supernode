package p2p

import (
    "context"
    "crypto/rand"
    "github.com/libp2p/go-libp2p"
    quic "github.com/libp2p/go-libp2p-quic"
    noise "github.com/libp2p/go-libp2p-noise"
    core "github.com/libp2p/go-libp2p/core"
    crypto "github.com/libp2p/go-libp2p/core/crypto"
    peer "github.com/libp2p/go-libp2p/core/peer"
    discover "github.com/libp2p/go-libp2p/p2p/discovery/routing"
)

type AdvancedNode struct {
    host  core.Host
    disco *discover.RoutingDiscovery
}

func NewAdvancedNode(ctx context.Context, privKey crypto.PrivKey) (*AdvancedNode, error) {
    // QUIC + Noise + Relay + AutoNAT
    opts := []libp2p.Option{
        libp2p.ListenAddrStrings("/ip4/0.0.0.0/udp/30001/quic-v1"),
        libp2p.PrivateKey(privKey),
        libp2p.ChainOptions(
            noise.New(),
            quic.NewTransport,
            libp2p.Relay(options.EnableAutoRelay()),
            libp2p.AutoNAT(),
        ),
        libp2p.EnableNATService(),
        libp2p.EnableHolePunching(),
    }
    
    host, err := libp2p.New(opts...)
    if err != nil {
        return nil, err
    }
    
    // Kademlia DHT + mDNS discovery
    dht := dht.New(ctx, host)
    disco := discover.NewRoutingDiscovery(dht)
    
    return &AdvancedNode{host: host, disco: disco}, nil
}
