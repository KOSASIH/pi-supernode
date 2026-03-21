package main

import (
	"context"
	"embed"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"runtime"
	"runtime/pprof"
	"strings"
	"syscall"
	"time"

	"github.com/KOSASIH/pi-supernode/internal/ai"
	"github.com/KOSASIH/pi-supernode/internal/api"
	"github.com/KOSASIH/pi-supernode/internal/db"
	"github.com/KOSASIH/pi-supernode/internal/metrics"
	"github.com/KOSASIH/pi-supernode/internal/p2p"
	"github.com/KOSASIH/pi-supernode/internal/stellar"
	"github.com/KOSASIH/pi-supernode/pkg/crypto"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.uber.org/zap"
	"golang.org/x/sync/errgroup"
	"google.golang.org/grpc"
	"google.golang.org/grpc/health/grpc_health_v1"
)

//go:embed config/*.yaml config/*.toml config/*.json
var embeddedConfigs embed.FS

// Build info (injected by ldflags)
var (
	Version   = "dev"
	Commit    = "unknown"
	BuildDate = "unknown"
)

type EnterpriseServer struct {
	ctx         context.Context
	p2pNode     *p2p.P2PNode
	aiGuardian  *ai.AIGuardian
	db          *db.Database
	stellar     *stellar.Client
	zkCrypto    *crypto.ThresholdSig
	metrics     *metrics.Metrics
	logger      *zap.Logger
	grpcSrv     *grpc.Server
	httpSrv     *echo.Echo
	profilePort string
}

func main() {
	// Enterprise logging
	logger, _ := zap.NewProduction()
	defer logger.Sync()
	zap.ReplaceGlobals(logger)
	
	log.Printf("🚀 Starting Pi Supernode ENTERPRISE v%s (%s) [%s]", 
		Version, Commit, BuildDate)
	log.Printf("💻 Platform: %s/%s | Workers: %d", runtime.GOOS, runtime.GOARCH, runtime.NumCPU())
	
	ctx := context.Background()
	
	// ========================================
	// 🧠 1. ENTERPRISE INITIALIZATION
	// ========================================
	server := &EnterpriseServer{ctx: ctx, logger: logger}
	
	// Metrics & Tracing
	server.metrics = server.initMetrics(ctx)
	defer server.metrics.Shutdown(ctx)
	
	// Database
	server.db = server.initDatabase(ctx)
	defer server.db.Close()
	
	// ZK Threshold Crypto
	server.zkCrypto = server.initZKCrypto()
	
	// P2P Network
	server.p2pNode = server.initP2P(ctx)
	defer server.p2pNode.Close()
	
	// Stellar Integration
	server.stellar = server.initStellar()
	
	// 🤖 AI GUARDIAN (Pi Ecosystem Protector)
	server.aiGuardian = server.initAIGuardian(ctx)
	go server.aiGuardian.AutonomousEnforcer.WatchNetwork(ctx)
	
	// ========================================
	// ⚡ 2. START ENTERPRISE SERVICES
	// ========================================
	if err := server.startAllServices(ctx); err != nil {
		log.Fatalf("❌ Enterprise startup failed: %v", err)
	}
	
	log.Printf("✅ ENTERPRISE SUPERNODE FULLY OPERATIONAL!")
	log.Printf("🌐 P2P: %s", server.p2pNode.Multiaddr())
	log.Printf("🤖 AI Guardian: Protecting Pi Ecosystem")
	log.Printf("📊 Metrics: %s", server.metrics.PrometheusURL())
	
	// ========================================
	// 🛡️ 3. ENTERPRISE MONITORING & GRACEFUL SHUTDOWN
	// ========================================
	server.enterpriseShutdown()
}

func (s *EnterpriseServer) initMetrics(ctx context.Context) *metrics.Metrics {
	m, err := metrics.NewMetrics(ctx, getEnv("OTLP_ENDPOINT", "localhost:4317"), "pi-supernode-enterprise")
	if err != nil {
		log.Printf("⚠️ Metrics partial init: %v", err)
	}
	return m
}

func (s *EnterpriseServer) initDatabase(ctx context.Context) *db.Database {
	dsn := getEnv("DATABASE_URL", "")
	db, err := db.NewPostgres(ctx, dsn)
	if err != nil {
		log.Fatalf("❌ Database init failed: %v", err)
	}
	return db
}

func (s *EnterpriseServer) initZKCrypto() *crypto.ThresholdSig {
	zk, err := crypto.NewThresholdSig(
		getEnvInt("ZK_THRESHOLD_REQUIRED", 2),
		getEnvInt("ZK_THRESHOLD_PARTIES", 3),
	)
	if err != nil {
		log.Fatalf("❌ ZK Crypto init failed: %v", err)
	}
	return zk
}

func (s *EnterpriseServer) initP2P(ctx context.Context) *p2p.P2PNode {
	nodeKey := getEnv("NODE_PRIVATE_KEY", "")
	if nodeKey == "" {
		log.Fatal("❌ NODE_PRIVATE_KEY environment variable required")
	}
	
	node, err := p2p.NewP2PNode(ctx, []byte(nodeKey), getEnvInt("P2P_PORT", 30001))
	if err != nil {
		log.Fatalf("❌ P2P initialization failed: %v", err)
	}
	return node
}

func (s *EnterpriseServer) initStellar() *stellar.Client {
	horizon := getEnv("STELLAR_HORIZON_URL", "https://horizon-testnet.stellar.org")
	return stellar.NewClient(horizon)
}

func (s *EnterpriseServer) initAIGuardian(ctx context.Context) *ai.AIGuardian {
	openaiKey := getEnv("OPENAI_API_KEY", "")
	if openaiKey == "" {
		log.Println("⚠️ AI Guardian disabled (no OPENAI_API_KEY)")
		return nil
	}
	
	guardian, err := ai.NewAIGuardian(ctx, openaiKey)
	if err != nil {
		log.Printf("⚠️ AI Guardian partial init: %v", err)
		return nil
	}
	log.Println("🤖 AI Guardian ACTIVATED - Protecting Pi Ecosystem from token scams!")
	return guardian
}

func (s *EnterpriseServer) startAllServices(ctx context.Context) error {
	g, ctx := errgroup.WithContext(ctx)
	
	// 🚀 gRPC Enterprise API (9090)
	g.Go(func() error { return s.startGRPC(ctx, ":9090") })
	
	// 🌐 HTTP/REST API + Explorer (8080)
	g.Go(func() error { return s.startHTTP(ctx, ":8080") })
	
	// 📊 Prometheus + Metrics (9091)
	g.Go(func() error { return s.startMetrics(ctx, ":9091") })
	
	// ❤️ Health + Status (8081)
	g.Go(func() error { return s.startHealth(ctx, ":8081") })
	
	// 🔍 Legacy RPC (31401)
	g.Go(func() error { return s.startLegacyRPC(ctx, ":31401") })
	
	// 💾 Background services
	g.Go(s.backgroundServices)
	
	return g.Wait()
}

func (s *EnterpriseServer) backgroundServices() error {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	
	for {
		select {
		case <-s.ctx.Done():
			return nil
		case <-ticker.C:
			s.metrics.UpdatePeerCount(s.ctx, int64(s.p2pNode.PeerCount()))
			s.gcAndMetrics()
		}
	}
}

func (s *EnterpriseServer) gcAndMetrics() {
	runtime.GC()
	
	// Enterprise metrics
	metrics.RecordTPS(s.ctx, s.getTPS())
	metrics.RecordMemoryUsage()
}

func (s *EnterpriseServer) enterpriseShutdown() {
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM, syscall.SIGQUIT)
	
	sig := <-sigCh
	log.Printf("🛑 Shutdown signal received: %v", sig)
	
	// Profiling dump
	if s.profilePort != "" {
		s.dumpProfiles()
	}
	
	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(getEnvInt("SHUTDOWN_TIMEOUT", 30))*time.Second)
	defer cancel()
	
	log.Println("🔄 Graceful shutdown started...")
	
	// Shutdown sequence
	if s.httpSrv != nil {
		ctx2, cancel2 := context.WithTimeout(ctx, 5*time.Second)
		s.httpSrv.Shutdown(ctx2)
		cancel2()
	}
	
	if s.grpcSrv != nil {
		s.grpcSrv.GracefulStop()
	}
	
	log.Println("✅ Enterprise shutdown complete!")
}

// HTTP Handlers
func (s *EnterpriseServer) healthHandler(c echo.Context) error {
	return c.JSON(http.StatusOK, map[string]interface{}{
		"status":        "healthy",
		"version":       Version,
		"commit":        Commit,
		"uptime":        time.Since(time.Now()).Unix(),
		"peers":         s.p2pNode.PeerCount(),
		"zk_threshold":  fmt.Sprintf("%d-of-%d", 2, 3),
		"ai_guardian":   s.aiGuardian != nil,
		"prometheus":    s.metrics.PrometheusURL(),
		"goroutines":    runtime.NumGoroutine(),
	})
}

func (s *EnterpriseServer) aiAuditHandler(c echo.Context) error {
	if s.aiGuardian == nil {
		return c.JSON(http.StatusServiceUnavailable, map[string]string{
			"error": "AI Guardian not available",
		})
	}
	
	var req struct {
		Contract string `json:"contract"`
		Issuer   string `json:"issuer"`
	}
	
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	}
	
	audit, err := s.aiGuardian.AuditToken(c.Request().Context(), req.Contract, req.Issuer)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	
	return c.JSON(http.StatusOK, audit)
}

// Placeholder service starters (implement these)
func (s *EnterpriseServer) startGRPC(ctx context.Context, addr string) error {
	return nil
}

func (s *EnterpriseServer) startHTTP(ctx context.Context, addr string) error {
	return nil
}

func (s *EnterpriseServer) startMetrics(ctx context.Context, addr string) error {
	return nil
}

func (s *EnterpriseServer) startHealth(ctx context.Context, addr string) error {
	return nil
}

func (s *EnterpriseServer) startLegacyRPC(ctx context.Context, addr string) error {
	return nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		fmt.Sscanf(value, "%d", &defaultValue)
	}
	return defaultValue
}
