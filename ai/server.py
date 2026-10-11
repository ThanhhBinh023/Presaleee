import os
import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from fastembed import TextEmbedding
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel

app = FastAPI(title="Presaleee AI Engine", version="1.0.0")

# 1. Khởi tạo BAAI/bge-m3 Embedding Engine (chạy siêu nhanh qua ONNX / FastEmbed)
print("⏳ Loading BAAI/bge-m3 embedding model...")
embedding_model = TextEmbedding(model_name="BAAI/bge-m3")
print("✅ Embedding model ready (1024 dims)!")

# 2. Khởi tạo LLM Engine (Load on startup hoặc load lazy)
BASE_MODEL_NAME = "Qwen/Qwen1.5-4B-Chat"
ADAPTER_PATH = "./qwen_presale_adapter_v2"
llm_model = None
tokenizer = None

def get_llm():
    global llm_model, tokenizer
    if llm_model is None:
        print("⏳ Loading Qwen1.5-4B LoRA adapter...")
        tokenizer = AutoTokenizer.from_pretrained(ADAPTER_PATH, trust_remote_code=True)
        device = "mps" if torch.backends.mps.is_available() else ("cuda" if torch.cuda.is_available() else "cpu")
        dtype = torch.float16 if device != "cpu" else torch.float32
        
        base_model = AutoModelForCausalLM.from_pretrained(
            BASE_MODEL_NAME,
            torch_dtype=dtype,
            device_map={"": device},
            trust_remote_code=True
        )
        llm_model = PeftModel.from_pretrained(base_model, ADAPTER_PATH)
        llm_model.eval()
        print(f"✅ Qwen LLM ready on device: {device}!")
    return llm_model, tokenizer

# --- Request / Response Schemas ---
class EmbedRequest(BaseModel):
    texts: List[str]

class EmbedResponse(BaseModel):
    embeddings: List[List[float]]
    dimension: int

class GenerateRequest(BaseModel):
    task_mode: int
    prompt: str
    temperature: Optional[float] = 0.2
    max_tokens: Optional[int] = 1500

class GenerateResponse(BaseModel):
    output: str

# --- Endpoints ---
@app.get("/health")
def health():
    return {"status": "ok", "service": "presaleee-ai-engine"}

@app.post("/api/v1/embed", response_model=EmbedResponse)
def embed_endpoint(req: EmbedRequest):
    try:
        embeddings_generator = embedding_model.embed(req.texts)
        embeddings = [list(e) for e in embeddings_generator]
        return EmbedResponse(embeddings=embeddings, dimension=len(embeddings[0]) if embeddings else 1024)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/generate", response_model=GenerateResponse)
def generate_endpoint(req: GenerateRequest):
    try:
        model, tok = get_llm()
        system_prompts = {
            1: "You are an expert IT Presale Solutions Architect. Extract strictly valid JSON from the client request.",
            2: "You are an AI meeting assistant. Clean up the transcript, extract key requirements and action items.",
            3: "You are a senior IT Presale Consultant. Analyze gaps in client requirements and suggest 5 sharp questions.",
            4: "You are a Commercial Presale Director. Qualify this lead using the BANT framework (0-100 score).",
            5: "You are a Lead Proposal Architect. Synthesize a comprehensive executive overview for the technical proposal.",
            6: "You are a Principal Solutions Architect. Provide technical architecture, stack justification, and NFRs."
        }
        sys_prompt = system_prompts.get(req.task_mode, "You are a helpful IT Presale Assistant.")
        
        messages = [
            {"role": "system", "content": sys_prompt},
            {"role": "user", "content": req.prompt}
        ]
        text_input = tok.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        inputs = tok(text_input, return_tensors="pt").to(model.device)
        
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=req.max_tokens,
                temperature=req.temperature,
                do_sample=req.temperature > 0,
                pad_token_id=tok.eos_token_id
            )
            
        response_text = tok.decode(outputs[0][inputs.input_ids.shape[1]:], skip_special_tokens=True).strip()
        return GenerateResponse(output=response_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=False)
