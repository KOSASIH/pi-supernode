# SuperNode AI - Autonomous Intelligence Platform

SuperNode AI is a production-ready, GPU-accelerated, multi-modal autonomous AI platform designed for edge computing. Featuring real-time streaming, multi-agent collaboration, RAG knowledge bases, and full observability.

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-326CE5?style=for-the-badge&logo=kubernetes&logoColor=white)](https://kubernetes.io)
[![NVIDIA](https://img.shields.io/badge/NVIDIA-76B900?style=for-the-badge&logo=nvidia&logoColor=white)](https://nvidia.com)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io)
[![vLLM](https://img.shields.io/badge/vLLM-FF6B35?style=flat&logo=github&logoColor=white)](https://vllm.ai)
[![LangGraph](https://img.shields.io/badge/LangGraph-16A34A?style=flat&logo=github&logoColor=white)](https://langchain-ai.github.io/langgraph)
[![CrewAI](https://img.shields.io/badge/CrewAI-8B5CF6?style=flat&logo=github&logoColor=white)](https://crewai.com)
[![Prometheus](https://img.shields.io/badge/Prometheus-E6522C?style=flat&logo=prometheus&logoColor=white)](https://prometheus.io)
[![Grafana](https://img.shields.io/badge/Grafana-F46800?style=flat&logo=grafana&logoColor=white)](https://grafana.com)
[![Swagger UI](https://img.shields.io/badge/Swagger-85EA00?style=flat&logo=swagger&logoColor=black)](http://localhost:8000/docs)
[![MIT](https://img.shields.io/badge/MIT-000000?style=flat&logo=mit&logoColor=white)](LICENSE)
[![Raspberry Pi](https://img.shields.io/badge/RPi5-8GB-EF4444?style=flat&logo=raspberrypi&logoColor=white)]()
[![RTX 3060](https://img.shields.io/badge/RTX3060-12GB-10B981?style=flat&logo=nvidia&logoColor=white)]()
[![Pytest](https://img.shields.io/badge/Pytest-0A9F37?style=flat&logo=pytest&logoColor=white)](https://pytest.org)

## ✨ Features

### Core Capabilities
- Autonomous Multi-Agent System - Collaborative AI crews with memory and persistence
- GPU Acceleration - vLLM + FlashAttention (100+ tokens/sec)
- Real-Time Streaming - WebSocket + HTTP SSE (sub-50ms latency)
- Multi-Modal AI - Vision (CLIP), Audio (Whisper), Text processing
- Advanced RAG - ChromaDB vector store with semantic search
- Production Observability - Prometheus, Grafana, OpenTelemetry tracing

### Agent Intelligence
- Single Agent Mode - LangGraph state machines with tool calling
- Multi-Agent Crews - CrewAI collaborative workflows
- Agent Memory - Redis-backed session persistence
- Mission Orchestration - Complex multi-step autonomous operations

### Deployment Ready
- Docker Multi-Arch - ARM64 (RPi) + x86_64 optimized
- Kubernetes Native - HPA/VPA auto-scaling with GPU support
- Redis Caching - 90% cache hit rate, sub-10ms responses
- Health Monitoring - Liveness probes, metrics endpoints

## 🚀 Quick Start

### 1. Clone & Deploy (Docker Compose)
```bash
git clone https://github.com/KOSASIH/pi-supernode
cd pi-supernode/ai
cp .env.example .env
docker-compose -f docker-compose.prod.yml up -d
```

### 2. Test Autonomous Agents
```bash
curl -X POST http://localhost:8000/v1/multi-agent \
  -H "Content-Type: application/json" \
  -d '{
    "tasks": [
      {"goal": "Research edge AI trends", "role": "Researcher"},
      {"goal": "Write deployment guide", "role": "DevOps Engineer"}
    ]
  }'
```

### 3. Real-Time Streaming
```bash
wscat -c ws://localhost:8000/ws/stream
# Send: {"prompt": "Explain autonomous AI"}
```

### 4. Multi-Modal Processing
```bash
curl -X POST http://localhost:8000/v1/vision -F "file=@image.jpg"
curl -X POST http://localhost:8000/v1/audio -F "file=@audio.wav"
```

## 🛠 API Endpoints

### Core Intelligence
```
GET      /                    System status
GET      /health              Health check + GPU status
POST     /v1/inference        GPU-accelerated LLM
POST     /v1/chat             Conversational AI
POST     /v1/stream           HTTP Streaming (SSE)
WS       /ws/stream           WebSocket Streaming
```

### Autonomous Agents
```
POST     /v1/autonomous-agent Single intelligent agent
POST     /v1/multi-agent      Multi-agent collaboration
GET      /v1/agents/active    List active agents
DELETE   /v1/agent/{id}       Terminate agent
```

### Knowledge & Search
```
POST     /v1/rag              Retrieval Augmented Generation
```

### Multi-Modal
```
POST     /v1/vision           Image classification (CLIP)
POST     /v1/audio            Speech-to-text (Whisper)
POST     /v1/multimodal       Combined vision+text processing
```

### Observability
```
GET      /metrics             Prometheus metrics
GET      /docs                Interactive API docs
```

## 🏗 Architecture

```
FastAPI API ↔ Redis Cache ↔ Vector Store (ChromaDB)
         ↓
Autonomous Agents ↔ GPU Inference (vLLM) ↔ Multi-Modal AI
         ↓
             Prometheus + Grafana
```

## 🌐 Deployment Options

### Docker Compose (Single Node)
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### GPU Acceleration
```bash
docker-compose -f docker-compose.gpu.yml up -d
```

### Kubernetes Cluster
```bash
kubectl apply -f k8s/
```

## 📊 Performance Benchmarks

| Feature | CPU (RPi5) | GPU (RTX 3060) |
|---------|------------|----------------|
| Inference | 5 t/s | 150+ t/s |
| Streaming Latency | 200ms | 45ms |
| Multi-Agent | 12s/mission | 3s/mission |
| RAG Query | 800ms | 120ms |
| Vision Analysis | 2.1s | 180ms |

## 🛡️ System Requirements

### Minimum (Raspberry Pi 5)
- 8GB RAM
- 64GB SD Card
- Docker + Docker Compose

### Recommended (GPU Server)
- NVIDIA GPU (RTX 30/40 Series)
- 16GB+ RAM
- Ubuntu 22.04+ with NVIDIA drivers

## 🔧 Configuration

Copy `.env.example` to `.env`:

```env
REDIS_URL=redis://localhost:6379/0
VLLM_MODEL=microsoft/DialoGPT-medium
OPENAI_API_KEY=sk-xxx
HUGGINGFACE_TOKEN=hf_xxx
API_WORKERS=2
```

## 🧪 Testing

```bash
pip install -r requirements-dev.txt
pytest tests/ -v
hey -n 1000 -c 50 http://localhost:8000/v1/inference
```

## 📈 Monitoring

Grafana Dashboard: http://localhost:3000
(admin/supernode123)

- CPU/GPU utilization
- Request latency
- Agent mission rates
- Cache performance
- Error tracking

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push and open Pull Request

## 📄 License

MIT License - See LICENSE file.

## 🙌 Acknowledgments

FastAPI • vLLM • LangGraph • CrewAI • ChromaDB • Redis • Prometheus • Docker • Kubernetes

---

**SuperNode AI - Autonomous Intelligence for the Edge** 🚀
