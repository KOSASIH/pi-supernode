package p2p

import (
	"github.com/libp2p/go-libp2p/core/protocol"
)

const (
	ProtocolIDPing     = "/pi/ping/1.0.0"
	ProtocolIDTx       = "/pi/tx/1.0.0"
	ProtocolIDBlock    = "/pi/block/1.0.0"
	ProtocolIDGossip   = "/pi/gossip/1.0.0"
	ProtocolIDDiscovery = "/pi/discovery/1.0.0"
)

var Protocols = []core.ProtocolID{
	ProtocolIDPing,
	ProtocolIDTx,
	ProtocolIDBlock,
	ProtocolIDGossip,
	ProtocolIDDiscovery,
}
