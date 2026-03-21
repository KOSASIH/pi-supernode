package p2p

import (
	"context"
	"github.com/libp2p/go-libp2p/core"
)

func (n *P2PNode) NewStream(ctx context.Context, p peer.ID, pid core.ProtocolID) (core.Stream, error) {
	stream, err := n.host.NewStream(ctx, p, pid)
	if err != nil {
		return nil, err
	}
	
	// QUIC stream metrics
	metrics.RecordStreamCreated(pid.String())
	
	return stream, nil
}

func (n *P2PNode) handleStream(s core.Stream) {
	n.mu.Lock()
	if manager, exists := n.streams[s.Conn().RemotePeer()]; exists {
		manager.streams <- s
	} else {
		manager = &StreamManager{streams: make(chan core.Stream, 10)}
		n.streams[s.Conn().RemotePeer()] = manager
		manager.streams <- s
	}
	n.mu.Unlock()
}
