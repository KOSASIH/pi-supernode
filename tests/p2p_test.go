package p2p

import (
	"context"
	"testing"
	"time"
)

func TestNewP2PNode(t *testing.T) {
	ctx := context.Background()
	
	node, err := NewP2PNode(ctx, nil, 0)
	if err != nil {
		t.Fatal("Failed to create P2PNode:", err)
	}
	defer node.Close()
	
	if node.PeerCount() != 0 {
		t.Error("Expected 0 peers initially")
	}
	
	if node.ID() == "" {
		t.Error("Expected non-empty peer ID")
	}
}
