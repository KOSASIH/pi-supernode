# src/models.py
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum

class TaskType(str, Enum):
    GENERATION = "generation"
    CLASSIFICATION = "classification"
    RAG = "rag"
    AGENT = "agent"
    MULTI_AGENT = "multi_agent"

class InferenceRequest(BaseModel):
    prompt: str
    model: str = "default"
    max_tokens: int = 512
    temperature: float = 0.7
    task_type: TaskType = TaskType.GENERATION

class AgentTask(BaseModel):
    goal: str
    role: str
    backstory: str = ""
    tools: Optional[List[str]] = []
    max_iterations: int = 5

class AutonomousRequest(BaseModel):
    tasks: List[AgentTask]
    collaborative: bool = False
    final_goal: str = ""

class ChatMessage(BaseModel):
    role: str
    content: str
    metadata: Optional[Dict[str, Any]] = {}
