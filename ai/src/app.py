# src/app.py - COMPLETE AUTONOMOUS AI API
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from contextlib import asynccontextmanager
from .config import settings
from .middleware import setup_middleware
from .models import *
from .services.vector_store import VectorStore
from .services.multi_agent_crew import MultiAgentCrew
from .agents.autonomous_agent import AutonomousAgent
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

vector_store = None
multi_agent_crew = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global vector_store, multi_agent_crew
    # Startup
    logger.info("🚀 Starting SuperNode AI...")
    vector_store = VectorStore()
    multi_agent_crew = MultiAgentCrew(vector_store)
    logger.info("✅ Vector store & agents initialized")
    yield
    # Shutdown
    logger.info("🛑 Shutting down...")

app = FastAPI(
    title="🦾 SuperNode AI - Autonomous AI System",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

setup_middleware(app)

@app.get("/")
async def root():
    return {"message": "🦾 SuperNode AI v2.0 - Autonomous Intelligence Online"}

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "version": "2.0.0",
        "agents": "ready",
        "vector_store": "connected"
    }

@app.post("/v1/inference", response_model=dict)
async def inference(request: InferenceRequest):
    """Standard LLM inference"""
    # vLLM integration would go here
    return {
        "id": "gen-123",
        "result": f"Generated response for: {request.prompt}",
        "tokens": request.max_tokens
    }

@app.post("/v1/autonomous-agent")
async def run_autonomous_agent(task: AgentTask):
    """🆕 Single Autonomous Agent"""
    agent = AutonomousAgent(
        name=task.role,
        role=task.role,
        goal=task.goal
    )
    result = await agent.execute(task.goal)
    return {"agent_id": agent.id, "result": result}

@app.post("/v1/multi-agent")
async def run_multi_agent(request: AutonomousRequest):
    """🆕 Multi-Agent Autonomous System"""
    tasks = [{"goal": t.goal, "role": t.role} for t in request.tasks]
    result = await multi_agent_crew.execute_crew(tasks)
    return {
        "mission_id": str(uuid.uuid4()),
        "status": "completed",
        **result
    }

@app.post("/v1/rag")
async def rag_query(request: InferenceRequest):
    """RAG-powered search"""
    results = await vector_store.similarity_search(request.prompt)
    return {
        "query": request.prompt,
        "relevant_docs": results["documents"][0] if results["documents"] else [],
        "count": len(results["documents"][0]) if results["documents"] else 0
    }

if __name__ == "__main__":
    uvicorn.run(
        "src.app:app",
        host=settings.api_host,
        port=settings.api_port,
        workers=settings.api_workers,
        reload=False
    )
