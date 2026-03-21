package metrics

import (
	"context"
	"time"

	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/metric"
)

var (
	// Counters
	txProcessed = meter.Int64Counter("pi.transactions_processed", 
		metric.WithDescription("Total transactions processed"))
	blocksProduced = meter.Int64Counter("pi.blocks.produced",
		metric.WithDescription("Blocks produced by this node"))
	peersConnected = meter.Int64Counter("p2p.peers.connected",
		metric.WithDescription("P2P peers connected"))

	// Gauges
	peerCount = meter.Int64Gauge("p2p.peer_count",
		metric.WithDescription("Current number of connected peers"))
	tps = meter.Float64Gauge("pi.tps",
		metric.WithDescription("Transactions per second"))
	blockHeight = meter.Int64Gauge("pi.block.height",
		metric.WithDescription("Current blockchain height"))

	// Histograms
	txLatency = meter.Float64Histogram("pi.tx.latency_ms",
		metric.WithDescription("Transaction processing latency"))
	p2pLatency = meter.Float64Histogram("p2p.ping.latency_ms",
		metric.WithDescription("P2P ping latency"))
)

// Usage examples
func RecordTransaction(ctx context.Context, latency time.Duration, success bool) {
	txProcessed.Add(ctx, 1,
		metric.WithAttributes(
			attribute.Bool("success", success),
			attribute.String("type", "transfer"),
		),
	)
	txLatency.Record(ctx, float64(latency.Milliseconds()),
		metric.WithAttributes(attribute.String("method", "process_tx")),
	)
}

func UpdatePeerCount(ctx context.Context, count int64) {
	peerCount.Record(ctx, count)
}

func RecordTPS(ctx context.Context, tpsValue float64) {
	tps.Record(ctx, tpsValue)
}
