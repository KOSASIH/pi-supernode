package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/KOSASIH/pi-supernode/internal/p2p"
)

func main() {
	ctx := context.Background()
	
	// Load node key from .env or generate
	nodeKey := os.Getenv("NODE_PRIVATE_KEY")
	
	node, err := p2p.NewP2PNode(ctx, []byte(nodeKey), 30001)
	if err != nil {
		log.Fatal("P2P init failed:", err)
	}
	defer node.Close()
	
	log.Printf("🚀 P2P Node started: %s", node.Multiaddr())
	
	// Graceful shutdown
	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
	<-sig
}
