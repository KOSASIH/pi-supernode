package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"runtime"
	"syscall"
	"time"

	"github.com/KOSASIH/pi-supernode/internal/api"
	"github.com/KOSASIH/pi-supernode/internal/metrics"
	"github.com/KOSASIH/pi-supernode/internal/p2p"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"google.golang.org/grpc"
	"google.golang.org/grpc/health/grpc_health_v1"
)

var (
	buildVersion = "dev"
	buildCommit  = "unknown"
	buildDate    = "unknown"
)

type Server struct {
	p2pNode *p2p.P2PNode
	metrics *metrics.Metrics
	grpcSrv *grpc.Server
	httpSrv *echo.Echo
}

func main() {
	// Init context
	ctx := context.Background()
	
	log.Printf("🚀 Starting Pi Supernode v%s (%s) [%s] on %s/%s",
		buildVersion, buildCommit, buildDate, runtime.GOOS, runtime.GOARCH)
	
	// 1. Initialize Metrics & Tracing
	m, err := metrics.NewMetrics(ctx, "localhost:4317", "pi-supernode")
	if err != nil {
		log.Printf("⚠️ Metrics disabled: %v", err)
	}
	defer func() {
		if m != nil {
			m.Shutdown(ctx)
		}
	}()
	
	// 2. Initialize P2P Node
	nodeKey := os.Getenv("NODE_PRIVATE_KEY")
	if nodeKey == "" {
		log.Fatal("❌ NODE_PRIVATE_KEY required")
	}
	
	p2pNode, err := p2p.NewP2PNode(ctx, []byte(nodeKey), 30001)
	if err != nil {
		log.Fatal("❌ P2P init failed:", err)
	}
	defer p2pNode.Close()
	
	// 3. Create server
	server := &Server{
		p2pNode: p2pNode,
		metrics: m,
	}
	
	// 4. Start all services
	if err := server.startServices(ctx); err != nil {
		log.Fatal("❌ Failed to start services:", err)
	}
	
	log.Printf("✅ All services started successfully!")
	log.Printf("🌐 P2P Multiaddr: %s", p2pNode.Multiaddr())
	if m != nil {
		log.Printf("📊 Prometheus: %s", m.PrometheusURL())
	}
	
	// 5. Graceful shutdown
	server.waitForShutdown()
}

func (s *Server) startServices(ctx context.Context) error {
	var g errgroup.Group
	
	// gRPC Server (port 9090)
	g.Go(func() error {
		return s.startGRPC(ctx, ":9090")
	})
	
	// HTTP/REST API (port 8080)
	g.Go(func() error {
		return s.startHTTP(ctx, ":8080")
	})
	
	// Prometheus Metrics (port 9091)
	g.Go(func() error {
		return s.startPrometheus(ctx, ":9091")
	})
	
	// Healthcheck (port 8081)
	g.Go(func() error {
		return s.startHealthcheck(ctx, ":8081")
	})
	
	return g.Wait()
}

func (s *Server) startGRPC(ctx context.Context, addr string) error {
	lis, err := net.Listen("tcp", addr)
	if err != nil {
		return fmt.Errorf("grpc listen failed: %w", err)
	}
	
	s.grpcSrv = grpc.NewServer(
		grpc.ChainUnaryInterceptor(metrics.GRPCServerInterceptor()),
	)
	
	// Register services
	api.RegisterP2PServiceServer(s.grpcSrv, api.NewP2PService(s.p2pNode))
	grpc_health_v1.RegisterHealthServer(s.grpcSrv, api.NewHealthServer())
	
	log.Printf("📡 gRPC server listening on %s", addr)
	return s.grpcSrv.Serve(lis)
}

func (s *Server) startHTTP(ctx context.Context, addr string) error {
	e := echo.New()
	
	// Middleware
	e.Use(middleware.Recover())
	e.Use(middleware.Logger())
	e.Use(metrics.HTTPMetricsMiddleware())
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: []string{"*"},
		AllowMethods: []string{echo.GET, echo.POST, echo.PUT, echo.DELETE},
	}))
	
	// Routes
	e.GET("/health", s.healthHandler)
	e.GET("/metrics", echo.WrapHandler(promhttp.Handler()))
	e.GET("/p2p/peers", s.peersHandler)
	e.POST("/p2p/connect", s.connectHandler)
	api.RegisterHTTPRoutes(e, s.p2pNode)
	
	s.httpSrv = e
	log.Printf("🌐 HTTP API listening on %s", addr)
	return e.Start(addr)
}

func (s *Server) startPrometheus(ctx context.Context, addr string) error {
	mux := http.NewServeMux()
	mux.Handle("/metrics", promhttp.Handler())
	
	lis, err := net.Listen("tcp", addr)
	if err != nil {
		return err
	}
	
	log.Printf("📈 Prometheus metrics on %s", addr)
	return http.Serve(lis, mux)
}

func (s *Server) startHealthcheck(ctx context.Context, addr string) error {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(200)
		fmt.Fprint(w, `{"status":"healthy","peers":`+fmt.Sprint(s.p2pNode.Peers())+`}`)
	})
	
	lis, err := net.Listen("tcp", addr)
	if err != nil {
		return err
	}
	
	log.Printf("❤️ Healthcheck on %s", addr)
	return http.Serve(lis, mux)
}

func (s *Server) healthHandler(c echo.Context) error {
	return c.JSON(200, map[string]interface{}{
		"status":      "healthy",
		"version":     buildVersion,
		"peers":       s.p2pNode.Peers(),
		"uptime":      time.Now().Unix(),
		"prometheus":  s.metrics.PrometheusURL(),
	})
}

func (s *Server) peersHandler(c echo.Context) error {
	peers := s.p2pNode.PeersList()
	return c.JSON(200, peers)
}

func (s *Server) connectHandler(c echo.Context) error {
	var req struct {
		Multiaddr string `json:"multiaddr"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(400, map[string]string{"error": err.Error()})
	}
	
	if err := s.p2pNode.Connect(c.Request().Context(), req.Multiaddr); err != nil {
		return c.JSON(500, map[string]string{"error": err.Error()})
	}
	
	return c.JSON(200, map[string]string{"status": "connected"})
}

func (s *Server) waitForShutdown() {
	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
	
	<-sig
	log.Println("🛑 Shutting down gracefully...")
	
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	
	// Shutdown in reverse order
	if s.httpSrv != nil {
		s.httpSrv.Shutdown(ctx)
	}
	if s.grpcSrv != nil {
		s.grpcSrv.GracefulStop()
	}
}
