"""
Inference and Testing Script for Fine-Tuned Presale LLM (Qwen-4B + LoRA)
Supports CUDA, Apple Silicon MPS (Mac GPU), and CPU.
Tests all 5 Presale Tasks:
1. Pain Point Extraction
2. Requirement Extraction
3. Intent Classification
4. Objection Extraction
5. Lead Qualification
"""

import os
import sys
import argparse
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel

SYSTEM_PROMPTS = {
    "pain_point": (
        "You are an expert AI Presale Analyst. Analyze the sales conversation transcript and "
        "identify the customer's key pain points, operational bottlenecks, and current frustrations."
    ),
    "requirement": (
        "You are an expert AI Presale Analyst. Analyze the sales conversation transcript and "
        "extract the functional and technical requirements/needs expressed by the customer."
    ),
    "intent": (
        "You are an expert AI Presale Analyst. Classify the customer's primary intent in this sales "
        "interaction into one of the following categories: [Product Capability Evaluation, "
        "Pricing & ROI Evaluation, Implementation & Onboarding Assessment, Initial Discovery, "
        "Commercial Negotiation]. Provide a concise justification based on the conversation."
    ),
    "objection": (
        "You are an expert AI Presale Analyst. Identify all objections, hesitations, risks, and concerns "
        "raised by the customer during this sales interaction regarding pricing, complexity, time, or change management."
    ),
    "qualification": (
        "You are an expert AI Presale Solution Architect. Conduct a comprehensive Lead Qualification "
        "assessment using the BANT framework (Budget, Authority, Need, Timeline/Engagement) and assign a qualification status."
    )
}

DEFAULT_SAMPLE_CONVERSATION = """Customer: Hi, our devops team is struggling with our existing CI/CD pipelines. Every release takes 4 hours because automated tests keep flaking out, and our developers are frustrated.
Sales Rep: That sounds like a major blocker. How many engineers are being affected by these slow builds?
Customer: About 35 engineers across 4 squads. We really need a solution that integrates natively with GitHub Actions and provides flaky test quarantine out of the box.
Sales Rep: We have seamless GitHub Actions integration and our AI test quarantine eliminates 95% of false alarms.
Customer: That sounds promising, but what about pricing? Our budget is pretty tight this quarter, and we need to know if onboarding requires extensive professional services or if our team can self-serve in 2 weeks."""


def find_adapter_dir(preferred_path: str = None) -> str:
    """Find the valid adapter directory containing adapter_config.json."""
    candidates = []
    if preferred_path:
        candidates.append(preferred_path)
    candidates.extend([
        "./qwen_presale_adapter/qwen_presale_adapter",
        "./qwen_presale_adapter",
        "/kaggle/working/qwen_presale_adapter"
    ])
    for path in candidates:
        if os.path.isdir(path) and os.path.exists(os.path.join(path, "adapter_config.json")):
            return os.path.abspath(path)
    return preferred_path or "./qwen_presale_adapter/qwen_presale_adapter"


def get_optimal_device() -> Tuple[torch.device, torch.dtype]:
    if torch.cuda.is_available():
        print(">> Acceleration: NVIDIA CUDA GPU")
        return torch.device("cuda"), torch.float16
    elif torch.backends.mps.is_available():
        print(">> Acceleration: Apple Silicon MPS (Mac GPU)")
        return torch.device("mps"), torch.float16
    else:
        print(">> Acceleration: Standard CPU")
        return torch.device("cpu"), torch.float32


def load_model_and_tokenizer(base_model_id: str, adapter_path: str):
    adapter_dir = find_adapter_dir(adapter_path)
    print(f"\n[1/3] Loading Tokenizer from: {adapter_dir} (or {base_model_id})...")
    try:
        tokenizer = AutoTokenizer.from_pretrained(adapter_dir, trust_remote_code=True)
    except Exception:
        tokenizer = AutoTokenizer.from_pretrained(base_model_id, trust_remote_code=True)

    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    device, dtype = get_optimal_device()

    print(f"[2/3] Loading Base Model: {base_model_id} (dtype={dtype})...")
    base_model = AutoModelForCausalLM.from_pretrained(
        base_model_id,
        torch_dtype=dtype,
        low_cpu_mem_usage=True,
        trust_remote_code=True
    )
    base_model.to(device)

    if os.path.exists(os.path.join(adapter_dir, "adapter_config.json")):
        print(f"[3/3] Attaching LoRA Adapter from: {adapter_dir}...")
        model = PeftModel.from_pretrained(base_model, adapter_dir)
        print(">> Fine-tuned LoRA Adapter loaded successfully!")
    else:
        print(f">> WARNING: Adapter not found at {adapter_dir}. Running zero-shot base model.")
        model = base_model

    model.eval()
    return model, tokenizer, device


def run_task_inference(
    model,
    tokenizer,
    device,
    task_key: str,
    transcript: str,
    company: str = "FinTech Corp",
    product: str = "DevOps Automated Testing Suite"
) -> str:
    system_prompt = SYSTEM_PROMPTS[task_key]

    if task_key == "pain_point":
        user_query = "Identify and list the customer's primary pain points and operational bottlenecks:"
    elif task_key == "requirement":
        user_query = "Extract the customer's functional and technical requirements for the solution:"
    elif task_key == "intent":
        user_query = "Classify the customer's primary intent and provide a brief justification:"
    elif task_key == "objection":
        user_query = "Identify and analyze the customer's objections and hesitations:"
    elif task_key == "qualification":
        user_query = (
            f"Company: {company}\n"
            f"Product Discussed: {product}\n"
            f"Conduct a BANT Lead Qualification analysis and deliver the evaluation:"
        )
    else:
        user_query = "Analyze the sales conversation transcript:"

    user_content = (
        f"Sales Conversation Transcript:\n"
        f"```\n{transcript}\n```\n\n"
        f"{user_query}"
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_content}
    ]

    prompt = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = tokenizer(prompt, return_tensors="pt").to(device)

    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=300,
            temperature=0.2,
            top_p=0.9,
            do_sample=True,
            pad_token_id=tokenizer.pad_token_id
        )

    response = tokenizer.decode(outputs[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True)
    return response.strip()


def main():
    parser = argparse.ArgumentParser(description="Test Fine-Tuned Presale LLM on sales conversations")
    parser.add_argument("--base_model", type=str, default="Qwen/Qwen1.5-4B-Chat", help="Base HuggingFace model")
    parser.add_argument("--adapter_path", type=str, default="./qwen_presale_adapter/qwen_presale_adapter", help="Path to LoRA adapter")
    parser.add_argument("--task", type=str, default="all", choices=["all", "pain_point", "requirement", "intent", "objection", "qualification"], help="Specific task to run")
    parser.add_argument("--input_file", type=str, default=None, help="Text file containing sales conversation transcript")
    args = parser.parse_args()

    if args.input_file and os.path.exists(args.input_file):
        with open(args.input_file, "r", encoding="utf-8") as f:
            transcript = f.read().strip()
    else:
        transcript = DEFAULT_SAMPLE_CONVERSATION

    print("=" * 70)
    print("PRESALE AI ASSISTANT - MODEL INFERENCE & EVALUATION")
    print("=" * 70)
    print("\n[SALES CONVERSATION TRANSCRIPT]")
    print("-" * 50)
    print(transcript)
    print("-" * 50)

    model, tokenizer, device = load_model_and_tokenizer(args.base_model, args.adapter_path)

    tasks_to_run = [
        ("pain_point", "1. 🎯 PAIN POINT EXTRACTION"),
        ("requirement", "2. 📋 REQUIREMENT EXTRACTION"),
        ("intent", "3. 🔍 INTENT CLASSIFICATION"),
        ("objection", "4. 🛡️ OBJECTION EXTRACTION"),
        ("qualification", "5. 🏆 BANT LEAD QUALIFICATION")
    ]

    if args.task != "all":
        tasks_to_run = [t for t in tasks_to_run if t[0] == args.task]

    for key, title in tasks_to_run:
        print(f"\n{'='*25} {title} {'='*25}")
        result = run_task_inference(model, tokenizer, device, key, transcript)
        print(result)

    print("\n" + "=" * 70)
    print("Inference completed successfully!")
    print("=" * 70)


if __name__ == "__main__":
    from typing import Tuple
    main()
