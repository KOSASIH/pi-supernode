module github.com/KOSASIH/pi-supernode

go 1.22

require (
    // P2P Networking (QUIC + libp2p)
    github.com/libp2p/go-libp2p v0.32.1
    github.com/libp2p/go-libp2p-quic v0.28.0
    github.com/libp2p/go-libp2p-noise v1.1.0
    
    // gRPC + Protobuf
    google.golang.org/grpc v1.60.1
    google.golang.org/protobuf v1.32.0
    
    // GraphQL
    github.com/graphql-go/graphql/v2 v2.6.0
    github.com/99designs/gqlgen v0.17.40
    
    // Database (Multi-storage)
    github.com/dgraph-io/badger/v4 v4.2.0
    github.com/ipfs/go-datastore v0.6.0
    github.com/redis/go-redis/v9 v9.5.1
    github.com/lib/pq v1.10.9
    
    // EVM + WASM VM
    github.com/ethereum/go-ethereum v1.13.5
    github.com/tendermint/tendermint v0.38.1
    github.com/CosmWasm/wasmvm v1.5.5
    
    // ZK + Crypto
    github.com/arnaud-morini/zk v0.2.0
    github.com/consensys/gnark v0.10.1
    github.com/zeebo/blake3 v0.0.0-20210812034059-9e92ad135526
    
    // AI/ML (LLM + ZKML)
    github.com/tiktoken-go/tokenizer v0.0.0-20231023195723-8554f9d4c5a8
    github.com/sashabaranov/go-openai v1.19.1
    
    // Observability
    go.opentelemetry.io/otel v1.21.0
    go.opentelemetry.io/contrib/instrumentation v0.45.0
    github.com/prometheus/client_golang v1.19.0
    
    // Web UI (Embedded)
    github.com/a-h/templ v0.2.436
    github.com/labstack/echo-contrib v0.15.1
)
