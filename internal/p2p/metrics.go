package p2p

import (
	"github.com/KOSASIH/pi-supernode/internal/metrics"
	"go.opentelemetry.io/otel/attribute"
)

func (n *P2PNode) Peers() int {
	n.mu.RLock()
	defer n.mu.RUnlock()
	return len(n.peers)
}

func (n *P2PNode) recordPeerEvent(event string, p peer.ID) {
	metrics.P2PEventCounter.Add(context.Background(), 1,
		metric.WithAttributes(
			attribute.String("event", event),
			attribute.String("peer_id", p.String()),
			attribute.String("protocol", "quic-v1"),
		),
	)
}
