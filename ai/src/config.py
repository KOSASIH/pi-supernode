# src/config.py
from pydantic_settings import BaseSettings
from typing import Optional, List
import os

class Settings(BaseSettings):
    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_workers: int = 2
    
    # Redis
    redis_url: str = "redis://redis:6379/0"
    
    # LLMs
    vllm_model: str = "microsoft/DialoGPT-medium"
    openai_api_key: Optional[str] = None
    huggingface_token: Optional[str] = None
    
    # Autonomous Agents
    agent_memory_ttl: int = 3600
    max_agent_iterations: int = 10
    
    # RAG
    vector_db_path: str = "./chroma_db"
    
    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()
