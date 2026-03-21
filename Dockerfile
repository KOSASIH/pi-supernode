# syntax=docker/dockerfile:1
FROM --platform=$BUILDPLATFORM golang:1.21-alpine AS builder

# Build arguments
ARG TARGETOS
ARG TARGETARCH
ARG VERSION=dev

WORKDIR /app

# Cache dependencies
COPY go.mod go.sum ./
RUN go mod download && go mod verify

# Copy source and build
COPY . .
RUN --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 \
    GOOS=${TARGETOS:-linux} \
    GOARCH=${TARGETARCH:-amd64} \
    go build \
    -trimpath \
    -ldflags="-s -w -X main.Version=${VERSION}" \
    -o /usr/bin/supernode \
    ./cmd/supernode

# Runtime stage - Ultra lightweight (~15MB)
FROM alpine:3.19 AS runtime

# Labels
LABEL org.opencontainers.image.title="pi-supernode"
LABEL org.opencontainers.image.description="Privacy-focused P2P supernode for Raspberry Pi"
LABEL org.opencontainers.image.version="latest"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.source="https://github.com/KOSASIH/pi-supernode"

# Install minimal dependencies
RUN apk add --no-cache \
    ca-certificates \
    tzdata \
    tini \
    && addgroup -g 1001 -S app \
    && adduser -S -D -H -u 1001 -h /home/app -s /sbin/nologin -G app -g app app \
    && mkdir -p /data /etc/supernode \
    && chown -R app:app /data /etc/supernode

# Copy binary and configs
COPY --from=builder /usr/bin/supernode /usr/bin/supernode
COPY config/*.yaml config/*.toml config/*.json /etc/supernode/ 2>/dev/null || true

# Switch to non-root user
USER app
WORKDIR /home/app

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || \
        wget --no-verbose --tries=1 --spider http://localhost:8080/ping || exit 1

# Expose ports
EXPOSE 8080/tcp
EXPOSE 30001/udp

# Volumes
VOLUME ["/data"]

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["supernode", \
     "--config", "/etc/supernode/config.yaml", \
     "--data-dir", "/data", \
     "--bind", "0.0.0.0:8080", \
     "--p2p-port", "30001", \
     "--log-level", "info"]
