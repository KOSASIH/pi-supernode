package p2p

import (
	"context"
	"crypto/rand"
	"fmt"
	"sync"
	"time"

	"github.com/KOSASIH/pi-supernode/internal/metrics"
	core "github.com/libp2p/go-libp2p/core"
	crypto "github.com/libp2p/go-libp2p/core/crypto"
	peer "github.com/libp2p/go-libp2p/core/peer"
	"github.com/libp2p/go-libp2p"
	dht "github.com/libp2p/go-libp2p-kad-dht"
	quic "github.com/libp2p/go-libp2p-quic"
	noise "github.com/libp2p/go-libp2p-noise"
	routing "github.com/libp2p/go-libp2p/p2p/discovery/routing"
	discover "github.com/libp2p/go-libp2p/p2p/discovery/mdns"
	"github.com/libp2p/go-libp2p/p2p/net/swarm"
	"github.com/multiformats/go-multiaddr"
	"go.opentelemetry.io/otel/attribute"
)

type P2PNode struct {
	ctx      context.Context
	cancel   context.CancelFunc
	host     core.Host
	dht      *dht.IpfsDHT
	disco    *routing.RoutingDiscovery
	mdns     discover.Service
	streams  map[peer.ID]*StreamManager
	peers    map[peer.ID]*PeerInfo
	mu       sync.RWMutex
	protocols []core.ProtocolID
}

type PeerInfo struct {
	Addr      multiaddr.Multiaddr
	Protocols []core.ProtocolID
	Latency   time.Duration
}

type StreamManager struct {
	streams chan core.Stream
	closed  bool
}

func NewP2PNode(ctx context.Context, privKeyBytes []byte, port int) (*P2PNode, error) {
	// Generate or load private key
	privKey, _, err := crypto.GenerateEd25519Key(rand.Reader)
	if len(privKeyBytes) > 0 {
		privKey, _, err = crypto.UnmarshalEd25519PrivateKey(privKeyBytes)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to load private key: %w", err)
	}

	nodeCtx, cancel := context.WithCancel(ctx)
	
	// QUIC + Noise + AutoRelay + HolePunching
	opts := []libp2p.Option{
		libp2p.ListenAddrStrings(
			fmt.Sprintf("/ip4/0.0.0.0/udp/%d/quic-v1", port),
			fmt.Sprintf("/ip4/0.0.0.0/tcp/%d", port),
		),
		libp2p.PrivateKey(privKey),
		libp2p.ChainOptions(
			noise.New(),
			quic.NewTransport,
			libp2p.EnableRelay(),
			libp2p.EnableAutoRelay(),
			libp2p.EnableNATService(),
			libp2p.EnableHolePunching(),
		),
		libp2p.AddrsFactory(func(addrs []multiaddr.Multiaddr) []multiaddr.Multiaddr {
			// Prioritize QUIC addresses
			var quicAddrs, tcpAddrs []multiaddr.Multiaddr
			for _, addr := range addrs {
				if strings.Contains(addr.String(), "/quic-v1") {
					quicAddrs = append(quicAddrs, addr)
				} else {
					tcpAddrs = append(tcpAddrs, addr)
				}
			}
			return append(quicAddrs, tcpAddrs...)
		}),
	}

	host, err := libp2p.New(opts...)
	if err != nil {
		cancel()
		return nil, fmt.Errorf("failed to create libp2p host: %w", err)
	}

	// Kademlia DHT
	kadDHT, err := dht.New(nodeCtx, host, dht.Mode(dht.ModeServer))
	if err != nil {
		return nil, err
	}

	// Routing discovery
	routingDiscovery := routing.NewRoutingDiscovery(kadDHT)

	// mDNS discovery
	mdns, err := discover.NewMdnsService(nodeCtx, host, time.Second*15, "_pi-supernode._udp")
	if err != nil {
		return nil, err
	}

	node := &P2PNode{
		ctx:      nodeCtx,
		cancel:   cancel,
		host:     host,
		dht:      kadDHT,
		disco:    routingDiscovery,
		mdns:     mdns,
		streams:  make(map[peer.ID]*StreamManager),
		peers:    make(map[peer.ID]*PeerInfo),
	}

	// Register protocols
	node.registerProtocols()

	// Start services
	if err := node.startServices(); err != nil {
		return nil, err
	}

	metrics.RecordPeers(int64(len(node.Peers())))
	
	return node, nil
}

func (n *P2PNode) ID() peer.ID {
	return n.host.ID()
}

func (n *P2PNode) Addrs() []multiaddr.Multiaddr {
	return n.host.Addrs()
}

func (n *P2PNode) Multiaddr() string {
	for _, addr := range n.host.Addrs() {
		return fmt.Sprintf("/p2p/%s%p2p-circuit", n.ID().String(), addr)
	}
	return ""
}

func (n *P2PNode) Connect(ctx context.Context, addr multiaddr.Multiaddr) error {
	pi, err := peer.AddrInfoFromP2pAddr(addr)
	if err != nil {
		return err
	}
	
	if err := n.host.Connect(ctx, *pi); err != nil {
		return fmt.Errorf("failed to connect: %w", err)
	}
	
	n.mu.Lock()
	n.peers[pi.ID] = &PeerInfo{Addr: addr}
	n.mu.Unlock()
	
	metrics.RecordPeers(int64(len(n.Peers())))
	return nil
}

func (n *P2PNode) Close() error {
	n.cancel()
	n.mdns.Close()
	n.dht.Close()
	return n.host.Close()
}
