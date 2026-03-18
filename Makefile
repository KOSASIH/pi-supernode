# Pi Supernode V20 - Production Makefile
.PHONY: all build test clean docker dev prod keygen

# Default
all: build test

# Build Release
build:
	cargo build --release --all-features
	@echo "✅ Build complete: target/release/pi-supernode"

# Full Test Suite
test:
	cargo test --all-features
	cargo bench
	@echo "✅ All tests passed"

# Docker Production
docker:
	docker-compose build --no-cache
	docker-compose up -d
	@echo "✅ Docker deployed: http://localhost:31401"

# Development Mode
dev:
	cargo watch -x check -x test -x 'run --bin pi-supernode'

# Production Deploy
prod:
	make clean
	cargo build --release --all-features
	docker-compose -f docker-compose.prod.yml up -d --build
	@echo "✅ Production deployed"

# Keygen
keygen:
	cargo run --bin pi-keygen -- --wallet > .env.local
	@echo "✅ Keys generated in .env.local"

# Metrics Endpoint
metrics:
	curl http://localhost:9090/metrics

# Clean
clean:
	cargo clean
	docker-compose down -v
	rm -rf target/ data/ logs/

# Explorer
explorer:
	cd frontend/explorer && npm install && npm run dev

# Complete Setup
setup: keygen build docker
	@sleep 5 && curl http://localhost:31401/health
