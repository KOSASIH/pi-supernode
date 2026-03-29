# src/agents/autonomous_agent.py
from langgraph.graph import StateGraph, END
from typing import TypedDict, Annotated, List
from langchain_core.messages import BaseMessage
import operator
from crewai import Agent, Task, Crew
import uuid

class AgentState(TypedDict):
    messages: Annotated[List[BaseMessage], operator.add]
    goal: str
    current_task: str
    iteration: int
    final_output: str

class AutonomousAgent:
    def __init__(self, name: str, role: str, goal: str, tools=None):
        self.name = name
        self.role = role
        self.goal = goal
        self.tools = tools or []
        self.id = str(uuid.uuid4())
    
    async def researcher_node(self, state: AgentState):
        # Research implementation
        return {
            "messages": [f"Researched: {state['current_task']}"],
            "iteration": state["iteration"] + 1
        }
    
    async def planner_node(self, state: AgentState):
        return {"current_task": f"Plan for {state['goal']}"}
    
    def build_graph(self):
        workflow = StateGraph(AgentState)
        workflow.add_node("researcher", self.researcher_node)
        workflow.add_node("planner", self.planner_node)
        
        workflow.set_entry_point("planner")
        workflow.add_edge("planner", "researcher")
        workflow.add_conditional_edges(
            "researcher",
            lambda state: END if state["iteration"] >= 3 else "planner"
        )
        
        return workflow.compile()
    
    async def execute(self, goal: str):
        graph = self.build_graph()
        initial_state = {
            "messages": [],
            "goal": goal,
            "current_task": "initialize",
            "iteration": 0,
            "final_output": ""
        }
        result = await graph.ainvoke(initial_state)
        return result["final_output"]
