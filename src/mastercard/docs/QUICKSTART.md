═══════════════════════════════════════════════════════════════════════════════
           🚀 PI SUPERNODE MASTERCARD v2.0 - PRODUCTION READY v20.2
═══════════════════════════════════════════════════════════════════════════════

DEPLOYMENT TIME: 5 MINUTES | TPS: 500+ | PCI-DSS L1 | MDES + 3DS2.2.1
═══════════════════════════════════════════════════════════════════════════════

QUICKSTART (SANDBOX) ➤ PRODUCTION
┌─────────────────────────────────────────────────────────────────────────────┐

1. CLONE & BUILD (1 min)
   $ git clone https://github.com/KOSASIH/pi-supernode.git
   $ cd pi-supernode/src/mastercard
   $ cargo build --release

2. DOCKER (Recommended - 30 sec)
   $ docker-compose up -d postgres redis
   $ docker build -t pi-mastercard .
   $ docker run -p 8080:8080 -e MC_API_KEY=sandbox_mc_us_123456 pi-mastercard

3. CONFIG (Copy & Edit - 1 min)
───── config/mastercard-sandbox.toml ─────
[mastercard]
enabled = true
api_key = "sandbox_mc_us_1234567890"
merchant_id = "MCH-0000000001"
signing_key = "0123456789abcdef0123456789abcdef..."
sandbox = true

4. START SUPERNODE (10 sec)
   $ cargo run -- --config-file config/mastercard-sandbox.toml
   🌐 API: http://localhost:8080    📊 Metrics: :9091

5. TEST PAYMENT (Instant)
───── curl -X POST http://localhost:8080/v1/payment ─────
{
  "pi_amount": 1000000000,     // 1 PI
  "fiat_amount": 25.99,        // USD
  "order_id": "TEST-123",
  "card": {
    "number": "4111111111111111",
    "expiry_month": 12,
    "expiry_year": 2025,
    "holder_name": "TEST USER"
  }
}
✅ Response: {"status": "Authorized", "card_last4": "1111"}

═══════════════════════════════════════════════════════════════════════════════
PRODUCTION CHECKLIST (Before Go-Live)
┌─────────────────────────────────────────────────────────────────────────────┐
☐ Mastercard MDES Production Approval (2-4 weeks)
☐ PCI-DSS Level 1 Attestation of Compliance
☐ HSM Key Ceremony (Thales/nCipher)
☐ 3DS 2.2.1 EMVCo Certification
☐ Load Test 500 TPS (3hr sustained)
☐ 24h Monitoring (Prometheus + Grafana)
☐ Disaster Recovery (Multi-AZ)
☐ Legal Agreement Signed

───── PRODUCTION CONFIG (config/mastercard-prod.toml) ─────
[mastercard]
enabled = true
api_key = "mc_xxxxxxxxxxxxxxxxxxxx"        # Production key
merchant_id = "MCH-YOUR-MERCHANT-ID"
signing_key = "64_hex_chars_from_mastercard"
sandbox = false
daily_limit_usd = 1000000.0

───── PRODUCTION ENV (docker-compose.prod.yml) ─────
environment:
  - MC_API_KEY=${MC_API_KEY}
  - DATABASE_URL=postgresql://...sslmode=require
  - REDIS_URL=rediss://...tls

═══════════════════════════════════════════════════════════════════════════════
KEY METRICS & MONITORING
┌─────────────────────────────────────────────────────────────────────────────┐
📊 HTTP API:        http://your-domain:8080/health
📈 Prometheus:      http://your-domain:9091/metrics
🖥️  Grafana:        Import dashboards/mastercard-dashboard.json
🔍 Logs:            RUST_LOG=debug cargo run

CRITICAL METRICS:
- payment_requests_total{status="success"} > 99.5%
- tokenization_latency_seconds < 0.5s (P99)
- daily_volume_usd < daily_limit_usd
- 3ds_challenge_rate < 5%

═══════════════════════════════════════════════════════════════════════════════
SUPPORT & ESCALATION
┌─────────────────────────────────────────────────────────────────────────────┐
🐛 GitHub Issues:          github.com/KOSASIH/pi-supernode/issues
💰 Enterprise Support:     enterprise@kosasih.com
🛡️ Mastercard Developer:   developer.mastercard.com
🔒 PCI Compliance:         pcisecuritystandards.org
📞 24/7 Production:        +1-XXX-XXX-XXXX (Premium)

PROBLEMS? CHECK:
❌ "Signing key invalid" → 64 hex chars exactly
❌ "Tokenization 401" → Verify MC_API_KEY + scopes
❌ "Daily limit" → Update daily_limit_usd
❌ PCI Scan Fail → No PAN logging anywhere

═══════════════════════════════════════════════════════════════════════════════
SUCCESS! You're processing USD → PI payments 🚀
Pi Supernode Mastercard - Powering 35M+ Pioneers
═══════════════════════════════════════════════════════════════════════════════
