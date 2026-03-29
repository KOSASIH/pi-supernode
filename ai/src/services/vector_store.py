# src/services/vector_store.py
from chromadb import Client
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
import asyncio

class VectorStore:
    def __init__(self, persist_directory="./chroma_db"):
        self.client = Client(Settings(persist_directory=persist_directory))
        self.collection = self.client.get_or_create_collection("supernode_docs")
        self.embedder = SentenceTransformer('all-MiniLM-L6-v2')
    
    async def add_documents(self, documents: List[dict]):
        embeddings = self.embedder.encode([doc["content"] for doc in documents])
        self.collection.add(
            embeddings=embeddings.tolist(),
            documents=[doc["content"] for doc in documents],
            metadatas=[doc["metadata"] for doc in documents]
        )
    
    async def similarity_search(self, query: str, n_results: int = 5):
        query_embedding = self.embedder.encode([query])
        results = self.collection.query(
            query_embeddings=query_embedding.tolist(),
            n_results=n_results
        )
        return results
