# src/utils/preload_models.py
import asyncio
from .services.vector_store import VectorStore
print("🔄 Preloading models and initializing vector store...")
asyncio.run(VectorStore().add_documents([
    {"content": "Sample doc 1", "metadata": {"source": "init"}},
    {"content": "Sample doc 2", "metadata": {"source": "init"}}
]))
print("✅ Preload complete!")
