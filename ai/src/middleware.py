# src/middleware.py
from fastapi import Request, HTTPException
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from prometheus_fastapi_instrumentator import Instrumentator
from opentelemetry import trace
from contextlib import asynccontextmanager
import time
import logging

limiter = Limiter(key_func=get_remote_address)
instrumentator = Instrumentator()

@asynccontextmanager
async def timeout_context(request: Request, timeout: int = 30):
    """Request timeout context"""
    start_time = time.time()
    try:
        yield
    except asyncio.TimeoutError:
        raise HTTPException(408, "Request timeout exceeded")
    finally:
        request.state.duration = time.time() - start_time

def setup_middleware(app):
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, lambda req, exc: HTTPException(429))
    
    @app.middleware("http")
    async def metrics_middleware(request: Request, call_next):
        with trace.get_tracer(__name__).start_as_current_span(request.url.path):
            response = await call_next(request)
            response.headers["X-Response-Time"] = str(request.state.duration)
            return response
    
    instrumentator.instrument(app).expose(app)
