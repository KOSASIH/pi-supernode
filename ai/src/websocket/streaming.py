# src/websocket/streaming.py
from fastapi import WebSocket, WebSocketDisconnect
from vllm import LLM, SamplingParams
import json
import asyncio
from typing import AsyncGenerator

class StreamingService:
    def __init__(self):
        self.llm = LLM(
            model="microsoft/DialoGPT-medium",
            tensor_parallel_size=1,  # Multi-GPU ready
            gpu_memory_utilization=0.9,
            max_model_len=4096
        )
    
    async def stream_response(self, prompt: str, websocket: WebSocket) -> AsyncGenerator:
        """Real-time token streaming"""
        sampling_params = SamplingParams(
            temperature=0.7,
            top_p=0.95,
            max_tokens=512,
            stop=["<|endoftext|>"]
        )
        
        async for request_output in self.llm.generate(prompt, sampling_params, request_id="stream"):
            for output in request_output.outputs:
                new_token = output.text[len(output.text) - 1] if output.text else ""
                if new_token:
                    yield {
                        "token": new_token,
                        "cumulative": output.text,
                        "finish_reason": output.finish_reason
                    }
                    await websocket.send_text(json.dumps({
                        "type": "token",
                        "data": new_token
                    }))
        
        await websocket.send_text(json.dumps({
            "type": "complete",
            "finish_reason": request_output.outputs[0].finish_reason
        }))
