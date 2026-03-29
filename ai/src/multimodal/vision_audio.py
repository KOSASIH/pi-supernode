# src/multimodal/vision_audio.py
import torch
from transformers import CLIPProcessor, CLIPModel, WhisperProcessor, WhisperForConditionalGeneration
from PIL import Image
import numpy as np
from typing import List

class MultiModalAI:
    def __init__(self):
        self.clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
        self.clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
        self.whisper_processor = WhisperProcessor.from_pretrained("openai/whisper-tiny")
        self.whisper_model = WhisperForConditionalGeneration.from_pretrained("openai/whisper-tiny")
    
    async def analyze_image(self, image_bytes: bytes, texts: List[str]) -> dict:
        """Vision-language analysis"""
        image = Image.open(image_bytes).convert('RGB')
        inputs = self.clip_processor(text=texts, images=image, return_tensors="pt", padding=True)
        
        with torch.no_grad():
            outputs = self.clip_model(**inputs)
            logits_per_image = outputs.logits_per_image
            probs = logits_per_image.softmax(dim=1)
        
        return {
            "best_match": texts[probs.argmax().item()],
            "confidence": probs.max().item(),
            "all_scores": probs.tolist()[0]
        }
    
    async def transcribe_audio(self, audio_bytes: bytes) -> str:
        """Speech-to-text"""
        input_features = self.whisper_processor(audio_bytes, return_tensors="pt").input_features
        predicted_ids = self.whisper_model.generate(input_features)
        transcription = self.whisper_processor.batch_decode(predicted_ids, skip_special_tokens=True)[0]
        return transcription
