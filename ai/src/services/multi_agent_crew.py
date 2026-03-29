# src/services/multi_agent_crew.py
from crewai import Agent, Task, Crew
from langchain_openai import ChatOpenAI
from .vector_store import VectorStore

class MultiAgentCrew:
    def __init__(self, vector_store: VectorStore):
        self.vector_store = vector_store
        self.llm = ChatOpenAI(model="gpt-3.5-turbo", temperature=0)
    
    def create_crew(self, tasks: List[dict]):
        agents = []
        crew_tasks = []
        
        # Researcher Agent
        researcher = Agent(
            role='Research Specialist',
            goal='Find accurate and relevant information',
            backstory="""You are a world-class researcher with access to 
            all knowledge sources.""",
            llm=self.llm,
            verbose=True
        )
        agents.append(researcher)
        
        # Writer Agent
        writer = Agent(
            role='Expert Writer',
            goal='Write compelling content',
            backstory="""You transform research into beautifully written content.""",
            llm=self.llm,
            verbose=True
        )
        agents.append(writer)
        
        # Create tasks
        for i, task_data in enumerate(tasks):
            task = Task(
                description=task_data['goal'],
                agent=agents[i % 2],
                context=[t['goal'] for t in tasks[:i]]
            )
            crew_tasks.append(task)
        
        return Crew(
            agents=agents,
            tasks=crew_tasks,
            verbose=2,
            memory=True
        )
    
    async def execute_crew(self, tasks: List[dict]):
        crew = self.create_crew(tasks)
        result = crew.kickoff()
        return {"result": result, "agents_used": len(crew.agents)}
