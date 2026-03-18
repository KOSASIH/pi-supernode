#!/bin/bash
# Pi Supernode V20 Production Deploy Script

set -e

echo "🚀 Deploying Pi Supernode V20..."

# Generate keys if missing
if [[ ! -f .env ]]; then
    echo "Generating keys..."
    cargo run --bin pi-keygen > node_key.hex
    WALLET=$(curl -s https://api.pi.network/wallet | jq -r .address)
    echo "PI_WALLET=$WALLET" > .env
    echo "PI_NODE_KEY=$(cat node_key.hex)" >> .env
    echo "DATABASE_URL=postgres://pi:pi@localhost/pi_v20" >> .env
fi

# Database migration
docker-compose up -d db
sleep 10
sqlx migrate run

# Build & Deploy
docker-compose build --no-cache
docker-compose up -d

# Health check
sleep 10
curl -s http://localhost:31401/health | jq .

echo "✅ V20 Supernode LIVE! Explorer: http://localhost:31401/explorer"
echo "📊 Tail logs: docker-compose logs -f"
