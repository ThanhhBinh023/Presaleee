"""
Interactive Chat & Testing CLI for Fine-Tuned Presaleee LLM (Qwen-4B + LoRA)
Enables real-time streaming text generation from user prompts.
Supports:
- All 6 Core Presaleee Pipeline Tasks:
  1. Lead Parameter Extraction to Strict JSON
  2. Meeting Transcript Cleaning & Action Items
  3. Proposal Gap Analysis & Proactive Question Generation
  4. BANT & Risk Qualification Engine (0-100)
  5. Proposal Builder & Sheet Mapping (Scope, Timeline, Pricing)
  6. Technical Architecture Deep-Dive
- Interactive prompt loop & One-shot prompt via --prompt
- Real-time token streaming (TextStreamer)
- Apple Silicon GPU (MPS) / NVIDIA CUDA / CPU
"""

import os
import sys
import argparse
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, TextStreamer
from peft import PeftModel

DEFAULT_BASE_MODEL = "Qwen/Qwen1.5-4B-Chat"
DEFAULT_ADAPTER_PATH = "./qwen_presale_adapter_v2"

PRESET_SYSTEM_PROMPTS = {
    "default": (
        "You are an expert AI Presale Solutions Architect and Enterprise Analyst for 'Presaleee'. "
        "You assist sales and engineering teams by analyzing RFPs, client inquiries, meeting transcripts, "
        "extracting project parameters, identifying missing proposal gaps, qualifying deals, and synthesizing proposals."
    ),
    "1": (
        "You are an expert AI Presale Intake Specialist for 'Presaleee'. "
        "Analyze the client inquiry / RFP and extract all key project parameters into a single, valid JSON object. "
        "Return ONLY the raw JSON object without markdown formatting, code fences, or explanations. "
        "The JSON MUST follow this exact schema:\n"
        "{\n"
        '  "project_name": "<string>",\n'
        '  "client_industry": "<string>",\n'
        '  "business_goal": "<string>",\n'
        '  "timeline_weeks": <number or null>,\n'
        '  "budget_usd": <number or null>,\n'
        '  "target_platforms": ["<string>"],\n'
        '  "core_functional_modules": ["<string>"],\n'
        '  "integrations_required": ["<string>"],\n'
        '  "compliance_and_security": ["<string>"],\n'
        '  "priority_level": "<High|Medium|Low>"\n'
        "}"
    ),
    "2": (
        "You are an expert AI Presale Meeting Assistant for 'Presaleee'. "
        "Clean, normalize, and distill the raw messy meeting transcript into a structured summary. "
        "Remove filler words (um, uh, you know, like), stuttering, repetitive chatter, and conversational noise. "
        "Structure the output into:\n"
        "### Key Discussion Points\n"
        "### Clarified Client Requirements\n"
        "### Action Items & Ownership\n"
        "### Open Questions for Next Sync"
    ),
    "3": (
        "You are an expert AI Proposal Reviewer and Solution Consultant for 'Presaleee'. "
        "Review the preliminary project requirements against standard enterprise proposal template sections "
        "(Scope & Architecture, Timeline & Milestones, Team & Pricing, SLA & Support). "
        "Identify critical missing information, ambiguities, and under-specified requirements. "
        "Structure your response as:\n"
        "### Missing Proposal Parameters & Gaps\n"
        "### Proactive Discovery Questions for the Client\n"
        "### Presale Consultant Recommendations"
    ),
    "4": (
        "You are an expert Enterprise Presale Qualification Director for 'Presaleee'. "
        "Perform a rigorous Lead Qualification evaluation using the BANT framework (Budget, Authority, Need, Timeline). "
        "Provide:\n"
        "1. Overall Qualification Score (0-100)\n"
        "2. BANT Component Breakdown (Budget /25, Authority /25, Need /25, Timeline /25)\n"
        "3. Key Deal Risks & Friction Points\n"
        "4. Presale Pursuit Recommendation (PURSUE AGGRESSIVELY / PURSUE WITH CONDITIONS / NURTURE / DISQUALIFY)"
    ),
    "5": (
        "You are an expert Proposal Architect and Bid Manager for 'Presaleee'. "
        "Synthesize client pain points, objectives, and project parameters into tailored content for proposal sheets. "
        "Structure your output into the following proposal sections:\n"
        "### 1. Executive Summary & 'Why This Solution'\n"
        "### 2. Scope of Work & Deliverables Breakdown\n"
        "### 3. Implementation Timeline & Phasing\n"
        "### 4. Commercial Model & Pricing Strategy"
    ),
    "6": (
        "You are a Principal Cloud Solutions Architect for 'Presaleee'. "
        "Analyze the project requirements and synthesize a comprehensive Technical Architecture Deep-Dive. "
        "Structure your response as:\n"
        "### Recommended Architecture & Tech Stack\n"
        "### Key Architectural Decisions (ADRs)\n"
        "### Architectural Constraints & Technical Assumptions\n"
        "### Non-Functional Requirements & Security Baseline"
    )
}


def get_optimal_device() -> torch.device:
    if torch.cuda.is_available():
        return torch.device("cuda")
    elif torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


def resolve_adapter_dir(path: str) -> str:
    candidates = [
        path,
        "./ai/qwen_presale_adapter_v2",
        "./qwen_presale_adapter_v2",
        "./ai/qwen_presale_adapter_v2/qwen_presale_adapter_v2",
        "./qwen_presale_adapter_v2/qwen_presale_adapter_v2",
        "./ai/qwen_presale_adapter",
        "./qwen_presale_adapter"
    ]
    for p in candidates:
        if p and os.path.isdir(p) and os.path.exists(os.path.join(p, "adapter_config.json")):
            return os.path.abspath(p)
    return path


def load_model(base_model_id: str, adapter_path: str):
    device = get_optimal_device()
    print(f"\n==================================================================")
    print(f"Loading Fine-Tuned Presaleee LLM...")
    print(f"- Device: {device} ({'Apple Silicon GPU (MPS)' if device.type == 'mps' else 'CUDA GPU' if device.type == 'cuda' else 'CPU'})")
    print(f"- Base Model: {base_model_id}")
    
    adapter_dir = resolve_adapter_dir(adapter_path)
    print(f"- Adapter: {adapter_dir}")
    print(f"==================================================================")

    # 1. Tokenizer
    print("\n[1/3] Loading tokenizer...")
    try:
        tokenizer = AutoTokenizer.from_pretrained(adapter_dir, trust_remote_code=True)
    except Exception:
        tokenizer = AutoTokenizer.from_pretrained(base_model_id, trust_remote_code=True)
    
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    # 2. Base Model
    dtype = torch.float16 if device.type in ["cuda", "mps"] else torch.float32
    print(f"[2/3] Loading base model ({dtype})...")
    base_model = AutoModelForCausalLM.from_pretrained(
        base_model_id,
        torch_dtype=dtype,
        low_cpu_mem_usage=True,
        trust_remote_code=True
    )
    base_model.to(device)

    # 3. LoRA Adapter
    if os.path.exists(os.path.join(adapter_dir, "adapter_config.json")):
        print(f"[3/3] Attaching fine-tuned LoRA weights...")
        model = PeftModel.from_pretrained(base_model, adapter_dir)
        print(">> Hoàn tất! Fine-tuned LoRA Adapter đã sẵn sàng.")
    else:
        print(f">> CẢNH BÁO: Không tìm thấy adapter tại {adapter_dir}. Chạy base model mặc định.")
        model = base_model

    model.eval()
    return model, tokenizer, device


def generate_response(model, tokenizer, device, user_input: str, system_prompt: str = PRESET_SYSTEM_PROMPTS["default"]):
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_input}
    ]

    prompt_text = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True
    )

    inputs = tokenizer(prompt_text, return_tensors="pt").to(device)
    streamer = TextStreamer(tokenizer, skip_prompt=True, skip_special_tokens=True)

    print("\n💡 AI Output:\n" + "-" * 50)
    with torch.no_grad():
        model.generate(
            **inputs,
            streamer=streamer,
            max_new_tokens=600,
            temperature=0.1,
            top_p=0.9,
            do_sample=True,
            pad_token_id=tokenizer.pad_token_id
        )
    print("-" * 50 + "\n")


def interactive_loop(model, tokenizer, device):
    print("\n" + "=" * 70)
    print("🎯 BẮT ĐẦU PHIÊN TEST TƯƠNG TÁC PRESALEEE V2")
    print("- Chọn nghiệp vụ tương ứng hoặc nhập tự do.")
    print("- Gõ 'exit' hoặc 'quit' để thoát.")
    print("=" * 70 + "\n")

    current_mode = "default"

    while True:
        try:
            print("\n👉 Chọn chế độ hoặc nhập prompt:")
            print("  [1] Lead Extraction (Strict JSON)")
            print("  [2] Meeting Transcript Cleaning")
            print("  [3] Proposal Gap Analysis & Questions")
            print("  [4] BANT & Risk Qualification (0-100)")
            print("  [5] Proposal Builder (Scope, Timeline, Pricing)")
            print("  [6] Technical Architecture Deep-Dive")
            print("  [7] Chế độ tự do (Default)")
            print("  Gõ [1-7] để đổi chế độ, gõ 'sample' để lấy input mẫu, hoặc paste nội dung để chạy trực tiếp.")
            
            user_input = input(f"({current_mode}) > ").strip()

            if not user_input:
                continue

            if user_input.lower() in ["exit", "quit", "q"]:
                print("Tạm biệt!")
                break

            if user_input in ["1", "2", "3", "4", "5", "6"]:
                current_mode = user_input
                mode_names = {
                    "1": "Lead Extraction (Strict JSON)",
                    "2": "Meeting Transcript Cleaning",
                    "3": "Proposal Gap Analysis",
                    "4": "BANT Lead Qualification",
                    "5": "Proposal Builder",
                    "6": "Technical Architecture"
                }
                print(f">> Đã chuyển sang chế độ: {mode_names[current_mode]}")
                continue
            elif user_input == "7":
                current_mode = "default"
                print(">> Đã chuyển sang chế độ: Tự do (Default Presale Analyst)")
                continue

            sys_prompt = PRESET_SYSTEM_PROMPTS.get(current_mode, PRESET_SYSTEM_PROMPTS["default"])
            generate_response(model, tokenizer, device, user_input, system_prompt=sys_prompt)

        except KeyboardInterrupt:
            print("\nĐã dừng phiên tương tác.")
            break
        except Exception as e:
            print(f"Lỗi: {e}")


def main():
    parser = argparse.ArgumentParser(description="Interactive Chat CLI for Fine-Tuned Presaleee LLM")
    parser.add_argument("--base_model", type=str, default=DEFAULT_BASE_MODEL, help="Base HuggingFace model ID")
    parser.add_argument("--adapter_path", type=str, default=DEFAULT_ADAPTER_PATH, help="Path to fine-tuned LoRA adapter")
    parser.add_argument("--mode", type=str, default="default", choices=["default", "1", "2", "3", "4", "5", "6"], help="Presale task mode")
    parser.add_argument("--prompt", type=str, default=None, help="Direct prompt to generate text (one-shot mode)")
    args = parser.parse_args()

    model, tokenizer, device = load_model(args.base_model, args.adapter_path)

    if args.prompt:
        sys_prompt = PRESET_SYSTEM_PROMPTS.get(args.mode, PRESET_SYSTEM_PROMPTS["default"])
        print(f"\nUser Prompt: {args.prompt}")
        generate_response(model, tokenizer, device, args.prompt, system_prompt=sys_prompt)
    else:
        interactive_loop(model, tokenizer, device)


if __name__ == "__main__":
    main()
