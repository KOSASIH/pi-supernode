#!/bin/bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Input validation
validate_port() {
    local port=$1
    if ! [[ "$port" =~ ^[0-9]+$ ]] || [ "$port" -lt 1 ] || [ "$port" -gt 65535 ]; then
        error "Invalid port: $port"
    fi
}

# Generate secure random secret
generate_secret() {
    openssl rand -base64 32
}

main() {
    log "Installing Pi Supernode (Secure Edition)..."
    
    # Validate architecture
    if [[ "$(uname -m)" != "aarch64" && "$(uname -m)" != "armv7l" ]]; then
        warn "Not on ARM architecture (Raspberry Pi). Continuing anyway..."
    fi
    
    # Update system
    log "Updating system..."
    apt-get update && apt-get upgrade -y
    
    # Install dependencies
    log "Installing dependencies..."
    apt-get install -y docker.io docker-compose ufw curl jq supervisor nginx openssl
    
    # Configure firewall
    log "Configuring firewall..."
    ufw --force enable
    ufw allow 22/tcp        # SSH
    ufw allow 8080/tcp      # Web UI (local only)
    ufw allow 443/tcp       # HTTPS
    ufw --reload
    
    # Generate secure config
    NODE_SECRET=$(generate_secret)
    echo "NODE_SECRET=$NODE_SECRET" > .env
    
    # Docker compose with security
    cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  supernode:
    build: .
    restart: unless-stopped
    ports:
      - "127.0.0.1:8080:8080"  # Local only!
    environment:
      - NODE_SECRET=${NODE_SECRET}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    volumes:
      - ./data:/app/data
EOF
    
    # Start services
    log "Starting services..."
    docker-compose up -d
    
    log "✅ Installation complete!"
    log "🔑 Secret: $(cat .env)"
    log "🌐 Access: http://localhost:8080"
    log "🔥 Firewall: ufw status"
}

main "$@"
