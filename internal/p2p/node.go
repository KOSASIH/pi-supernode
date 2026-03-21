package p2p

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/KOSASIH/pi-supernode/internal/metrics"
	"github.com/KOSASIH/pi-supernode/pkg/crypto"
	core "github.com/libp2p/go-libp2p/core"
	crypto_libp2p "github.com/libp2p/go-libp2p/core/crypto"
	peer "github.com/libp2p/go-libp2p/core/peer"
	swarm "github.com/libp2p/go-libp2p/p2p/net/swarm"
	"github.com/libp2p/go-libp2p"
	dht "github.com/libp2p/go-libp2p-kad-dht"
	mdht "github.com/libp2p/go-libp2p-kad-dht/mdns"
	quic "github.com/libp2p/go-libp2p-quic"
	noise "github.com/libp2p/go-libp2p-noise"
	routing "github.com/libp2p/go-libp2p/p2p/discovery/routing"
	discover "github.com/libp2p/go-libp2p/p2p/discovery/mdns"
	relay "github.com/libp2p/go-libp2p/p2p/protocol/circuitv2/relay"
	"github.com/multiformats/go-multiaddr"
	"go.opentelemetry.io/otel/attribute"
)

type P2PNode struct {
	ctx       context.Context
	cancel    context.CancelFunc
	host      core.Host
	dht       *dht.IpfsDHT
	disco     *routing.RoutingDiscovery
	mdns      discover.Service
	zkSig     *crypto.ThresholdSig
	streams   map[peer.ID]*StreamManager
	peers     map[peer.ID]*PeerInfo
	mu        sync.RWMutex
	protocols []core.ProtocolID
	bootstrap []string
}

type PeerInfo struct {
	Addr       multiaddr.Multiaddr
	Protocols  []core.ProtocolID
	Latency    time.Duration
	TrustScore float64
}

type StreamManager struct {
	streams chan core.Stream
	closed  bool
	mu      sync.Mutex
}

func NewP2PNode(ctx context.Context, privKeyBytes []byte, port int) (*P2PNode, error) {
	// Parse config
	bootstrapNodes := parseBootstrapNodes(os.Getenv("BOOTSTRAP_NODES"))
	
	// Load/generate private key
	var privKey crypto_libp2p.PrivKey
	var err error
	if len(privKeyBytes) > 0 {
		privKey, _, err = crypto_libp2p.UnmarshalEd25519PrivateKey(privKeyBytes)
	} else {
		privKey, _, err = crypto_libp2p.GenerateEd25519Key(rand.Reader)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to load/generate private key: %w", err)
	}

	// Context with timeout
	nodeCtx, cancel := context.WithCancel(ctx)
	
	// Advanced libp2p options
	opts := []libp2p.Option{
		libp2p.ListenAddrStrings(
			fmt.Sprintf("/ip4/0.0.0.0/udp/%d/quic-v1", port),
			fmt.Sprintf("/ip4/0.0.0.0/tcp/%d", port),
			"/ip4/0.0.0.0/tcp/0", // Dynamic WebSocket
		),
		libp2p.PrivateKey(privKey),
		libp2p.ChainOptions(
			noise.New(),
			quic.NewTransport,
			libp2p.Relay(relay.OptionActive(true)),
			libp2p.EnableAutoRelay(),
			libp2p.EnableNATService(),
			libp2p.EnableHolePunching(),
			libp2p.ConnectionManager(libp2p.ConnectionManagerOpts{
				MinConnections: 10,
				HighWater:      50,
				GracePeriod:    30 * time.Second,
			}),
		),
		libp2p.AddrsFactory(func(addrs []multiaddr.Multiaddr) []multiaddr.Multiaddr {
			return prioritizeQUIC(addrs)
		}),
		libp2p.UserAgent("pi-supernode/2.0.0"),
	}

	host, err := libp2p.New(opts...)
	if err != nil {
		cancel()
		return nil, fmt.Errorf("failed to create libp2p host: %w", err)
	}

	// Kademlia DHT (Server mode)
	kadDHT, err := dht.New(nodeCtx, host, 
		dht.Mode(dht.ModeServer),
		dht.ProtocolVersion("/pi-kad/2.0.0"),
	)
	if err != nil {
		host.Close()
		cancel()
		return nil, fmt.Errorf("failed to create DHT: %w", err)
	}

	// mDNS + DHT hybrid discovery
	mdnsSvc, err := discover.NewMdnsService(nodeCtx, host, time.Second*10, "pi-supernode")
	if err != nil {
		return nil, fmt.Errorf("failed to create mDNS: %w", err)
	}

	// Routing discovery
	routingDiscovery := routing.NewRoutingDiscovery(kadDHT)

	// Initialize ZK Threshold Crypto
	zkSig, err := crypto.NewThresholdSig(2, 3)
	if err != nil {
		return nil, fmt.Errorf("failed to init ZK crypto: %w", err)
	}

	node := &P2PNode{
		ctx:        nodeCtx,
		cancel:     cancel,
		host:       host,
		dht:        kadDHT,
		disco:      routingDiscovery,
		mdns:       mdnsSvc,
		zkSig:      zkSig,
		streams:    make(map[peer.ID]*StreamManager),
		peers:      make(map[peer.ID]*PeerInfo),
		protocols:  Protocols,
		bootstrap:  bootstrapNodes,
	}

	// Register event handlers
	node.registerEventHandlers()

	// Start discovery services
	if err := node.startServices(); err != nil {
		node.Close()
		return nil, fmt.Errorf("failed to start services: %w", err)
	}

	// Bootstrap to DHT
	go node.bootstrap()

	metrics.UpdatePeerCount(nodeCtx, int64(node.PeerCount()))
	
	log.Printf("🌐 P2P Node initialized: %s (zk-pubkey: %s)", 
		node.String(), node.zkSig.PublicKey().SerializeToHex())
	
	return node, nil
}

// prioritizeQUIC reorders addresses to prefer QUIC
func prioritizeQUIC(addrs []multiaddr.Multiaddr) []multiaddr.Multiaddr {
	var quicAddrs, others []multiaddr.Multiaddr
	for _, addr := range addrs {
		if strings.Contains(addr.String(), "quic-v1") {
			quicAddrs = append(quicAddrs, addr)
		} else {
			others = append(others, addr)
		}
	}
	return append(quicAddrs, others...)
}

func parseBootstrapNodes(nodesStr string) []string {
	if nodesStr == "" {
		return nil
	}
	return strings.Split(nodesStr, ",")
}

func (n *P2PNode) String() string {
	addrs := n.host.Addrs()
	if len(addrs) == 0 {
		return n.host.ID().String()
	}
	return fmt.Sprintf("%s/p2p/%s", addrs[0], n.host.ID())
}

func (n *P2PNode) ID() peer.ID {
	return n.host.ID()
}

func (n *P2PNode) Addrs() []multiaddr.Multiaddr {
	return n.host.Addrs()
}

func (n *P2PNode) Multiaddr() string {
	id := n.ID()
	for _, addr := range n.host.Addrs() {
		ma, _ := multiaddr.NewMultiaddr(fmt.Sprintf("/p2p/%s/p2p-circuit", id))
		return addr.String() + ma.String()
	}
	return n.ID().String()
}

func (n *P2PNode) PeerCount() int {
	n.mu.RLock()
	defer n.mu.RUnlock()
	return len(n.peers)
}

func (n *P2PNode) Connect(ctx context.Context, addrStr string) error {
	addr, err := multiaddr.NewMultiaddr(addrStr)
	if err != nil {
		return fmt.Errorf("invalid multiaddr: %w", err)
	}
	
	pi, err := peer.AddrInfoFromP2pAddr(addr)
	if err != nil {
		return fmt.Errorf("parse peer info: %w", err)
	}
	
	ctx, span := metrics.tracer.Start(ctx, "p2p.connect")
	defer span.End()
	
	if err := n.host.Connect(ctx, *pi); err != nil {
		metrics.RecordP2PEvent(ctx, "connect_failed", pi.ID)
		return fmt.Errorf("connection failed: %w", err)
	}
	
	n.mu.Lock()
	n.peers[pi.ID] = &PeerInfo{
		Addr:      addr,
		Protocols: pi.Protocols,
	}
	n.mu.Unlock()
	
	metrics.UpdatePeerCount(ctx, int64(n.PeerCount()))
	metrics.RecordP2PEvent(ctx, "connect_success", pi.ID)
	
	return nil
}

func (n *P2PNode) SignMessage(msg []byte) []byte {
	sig := n.zkSig.Sign(msg)
	return sig.Serialize()
}

func (n *P2PNode) Close() error {
	n.mu.Lock()
	for _, mgr := range n.streams {
		mgr.Close()
	}
	n.mu.Unlock()
	
	n.cancel()
	if n.mdns != nil {
		n.mdns.Close()
	}
	if n.dht != nil {
		n.dht.Close()
	}
	return n.host.Close()
}

// Placeholder implementations (implement these)
func (n *P2PNode) registerEventHandlers() {}
func (n *P2PNode) registerProtocols()     {}
func (n *P2PNode) startServices() error   { return nil }
func (n *P2PNode) bootstrap()             {}
