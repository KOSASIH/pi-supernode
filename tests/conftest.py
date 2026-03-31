"""
PiDex SDK Test Configuration - pytest-asyncio Production Setup
✅ Auto-mock external services
✅ Live Stellar test toggles
✅ Database fixtures
✅ Coverage optimization
"""

import asyncio
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock
from typing import AsyncGenerator

import httpx
from stellar_sdk import Server

from pidex_sdk import PiDexClient
from pidex_sdk.stellar.horizon_client import HorizonPiDexClient

# ========================================
# 🌐 LIVE STELLAR FIXTURES
# ========================================

@pytest_asyncio.fixture(scope="session")
async def live_stellar_server() -> Server:
    """Live Stellar testnet server"""
    server = Server("https://horizon-testnet.stellar.org")
    try:
        # Health check
        await asyncio.to_thread(server.root.call)
        yield server
    finally:
        pass

@pytest.fixture(scope="session")
def disable_network(monkeypatch):
    """Disable network calls for unit tests"""
    monkeypatch.setattr("httpx.AsyncClient", MagicMock())
    monkeypatch.setattr("stellar_sdk.Server", MagicMock())

# ========================================
# 🧪 MOCKED PRODUCTION CLIENTS
# ========================================

@pytest_asyncio.fixture
async def mock_pidex_client() -> AsyncGenerator[PiDexClient, None]:
    """Fully mocked production client"""
    client = PiDexClient(network="testnet")
    
    # Mock stellar subsystem
    mock_stellar = AsyncMock(spec=HorizonPiDexClient)
    mock_stellar.get_pi_price.return_value = 314159.42
    mock_stellar.get_orderbook.return_value = {
        "bids": [{"price": "314159", "amount": "1"} for _ in range(10)],
        "asks": [{"price": "314160", "amount": "1"} for _ in range(10)],
        "base_volume": "1000000",
        "counter_volume": "314159000"
    }
    
    client.stellar = mock_stellar
    yield client

@pytest_asyncio.fixture
async def mock_rate_limited_client(mock_pidex_client):
    """Client with aggressive rate limiting"""
    mock_pidex_client.rate_limiter = MagicMock()
    mock_pidex_client.rate_limiter.acquire.side_effect = [True, False]
    return mock_pidex_client

# ========================================
# 🧪 DATABASE FIXTURES (FUTURE)
# ========================================

@pytest_asyncio.fixture(scope="session")
async def test_db():
    """In-memory test database"""
    db = {}
    yield db
    # Cleanup not needed for in-memory

@pytest.fixture
def sample_trades():
    """Sample trade data for testing"""
    return [
        {
            "id": f"trade-{i}",
            "base_amount": str(100 + i),
            "counter_amount": str(52 + i * 0.01),
            "price": str(0.52 + i * 0.0001),
            "timestamp": (datetime.now(timezone.utc) - timedelta(minutes=i)).isoformat()
        }
        for i in range(10)
    ]

# ========================================
# 🌟 LIVE INTEGRATION TOGGLES
# ========================================

def pytest_configure(config):
    """Global test configuration"""
    # Register custom markers
    config.addinivalue_line(
        "markers",
        "live_stellar: Live Stellar Mainnet/Testnet integration tests"
    )
    config.addinivalue_line(
        "markers", 
        "stress: Production stress/load tests"
    )
    config.addinivalue_line(
        "markers",
        "offline: Tests that work without internet"
    )

def pytest_collection_modifyitems(config, items):
    """Auto-skip live tests without env vars"""
    live_skip_reason = "Set STELLAR_LIVE_TESTS=1 to run live Stellar tests"
    
    for item in items:
        if "live_stellar" in item.keywords and not int(os.environ.get("STELLAR_LIVE_TESTS", 0)):
            item.add_marker(pytest.mark.skip(reason=live_skip_reason))

# ========================================
# 🧪 HTTP MOCK SERVER
# ========================================

@pytest_asyncio.fixture
async def mock_stellar_horizon(httpx_mock_server):
    """Mock Stellar Horizon API server"""
    
    async def handle_health(request):
        return httpx.Response(200, json={"status": "healthy"})
    
    async def handle_price(request):
        return httpx.Response(200, json={
            "price": {"n": "314159", "d": "1"},
            "base_volume": "1000000"
        })
    
    httpx_mock_server.add_matcher(lambda r: r.url.path == "/health", handle_health)
    httpx_mock_server.add_matcher(lambda r: "order_book" in r.url.path, handle_price)
    
    yield httpx_mock_server

@pytest_asyncio.fixture
async def mock_supernode_api(httpx_mock_server):
    """Mock Pi supernode gRPC gateway"""
    async def handle_query(request):
        return httpx.Response(200, json={
            "success": True,
            "data": [{"node_id": "node-1", "reputation": 0.99}],
            "execution_time_ms": 23
        })
    
    httpx_mock_server.add_matcher(lambda r: "/query" in r.url.path, handle_query)
    yield httpx_mock_server

# ========================================
# 🎯 PARAMETRIZED TEST HELPERS
# ========================================

@pytest.fixture(params=[314159.0, 314160.42, None])
def price_param(request):
    return request.param

@pytest.mark.parametrize("network", ["mainnet", "testnet"])
@pytest_asyncio.fixture
async def network_client(network):
    async with PiDexClient(network=network) as client:
        yield client

# ========================================
# 🛡️ ERROR HANDLING FIXTURES
# ========================================

@pytest_asyncio.fixture
async def failing_stellar_client():
    """Stellar client that fails predictably"""
    mock = AsyncMock(spec=HorizonPiDexClient)
    mock.get_pi_price.side_effect = httpx.ConnectError("Mock failure")
    return mock

@pytest.fixture
def circuit_breaker_scenario():
    """Test data for circuit breaker states"""
    return {
        "success": [314159.0],
        "failures": [Exception("boom")] * 5,
        "recovery": [314159.0]
    }

# ========================================
# 📊 COVERAGE OPTIMIZATION
# ========================================

def pytest_cov_configure(config):
    """Optimize coverage reporting"""
    if config.getoption("--cov"):
        config.option.cov_source = ["src/pidex_sdk"]

# Run with: pytest --cov=src/pidex_sdk --cov-report=html
