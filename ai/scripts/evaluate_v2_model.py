"""
Evaluation & Benchmark Suite for Presaleee V2 Fine-Tuned LLM (Qwen-4B + LoRA)
Tests all 6 Core Presaleee Product Capabilities:
1. Lead Parameter Extraction to Strict JSON
2. Meeting Transcript Cleaning & Action Items
3. Proposal Gap Analysis & Proactive Question Generation
4. BANT & Risk Qualification Engine (Score 0-100)
5. Proposal Builder & Sheet Synthesis (Scope, Pricing, Timeline)
6. Technical Architecture Deep-Dive (Constraints, Decisions, Risks)

Supports Apple Silicon MPS, NVIDIA CUDA, and CPU.
"""

import os
import sys
import json
import re
import argparse
from typing import Tuple, Dict, Any
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel

SYSTEM_PROMPTS = {
    "task1_lead_json": (
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
    "task2_clean_transcript": (
        "You are an expert AI Presale Meeting Assistant for 'Presaleee'. "
        "Clean, normalize, and distill the raw messy meeting transcript into a structured summary. "
        "Remove filler words (um, uh, you know, like), stuttering, repetitive chatter, and conversational noise. "
        "Structure the output into:\n"
        "### Key Discussion Points\n"
        "### Clarified Client Requirements\n"
        "### Action Items & Ownership\n"
        "### Open Questions for Next Sync"
    ),
    "task3_gap_analysis": (
        "You are an expert AI Proposal Reviewer and Solution Consultant for 'Presaleee'. "
        "Review the preliminary project requirements against standard enterprise proposal template sections "
        "(Scope & Architecture, Timeline & Milestones, Team & Pricing, SLA & Support). "
        "Identify critical missing information, ambiguities, and under-specified requirements. "
        "Structure your response as:\n"
        "### Missing Proposal Parameters & Gaps\n"
        "### Proactive Discovery Questions for the Client\n"
        "### Presale Consultant Recommendations"
    ),
    "task4_bant_qualification": (
        "You are an expert Enterprise Presale Qualification Director for 'Presaleee'. "
        "Perform a rigorous Lead Qualification evaluation using the BANT framework (Budget, Authority, Need, Timeline). "
        "Provide:\n"
        "1. Overall Qualification Score (0-100)\n"
        "2. BANT Component Breakdown (Budget /25, Authority /25, Need /25, Timeline /25)\n"
        "3. Key Deal Risks & Friction Points\n"
        "4. Presale Pursuit Recommendation (PURSUE AGGRESSIVELY / PURSUE WITH CONDITIONS / NURTURE / DISQUALIFY)"
    ),
    "task5_proposal_builder": (
        "You are an expert Proposal Architect and Bid Manager for 'Presaleee'. "
        "Synthesize client pain points, objectives, and project parameters into tailored content for proposal sheets. "
        "Structure your output into the following proposal sections:\n"
        "### 1. Executive Summary & 'Why This Solution'\n"
        "### 2. Scope of Work & Deliverables Breakdown\n"
        "### 3. Implementation Timeline & Phasing\n"
        "### 4. Commercial Model & Pricing Strategy"
    ),
    "task6_tech_architecture": (
        "You are a Principal Cloud Solutions Architect for 'Presaleee'. "
        "Analyze the project requirements and synthesize a comprehensive Technical Architecture Deep-Dive. "
        "Structure your response as:\n"
        "### Recommended Architecture & Tech Stack\n"
        "### Key Architectural Decisions (ADRs)\n"
        "### Architectural Constraints & Technical Assumptions\n"
        "### Non-Functional Requirements & Security Baseline"
    )
}

TEST_INPUTS = {
    "task1_lead_json": """Client Inquiry:
We are Coastal Stay Hotel Group, a premier boutique hospitality chain with 14 locations across California.
We urgently need a modern Mobile & Web Guest Experience Platform.
Guests must be able to do mobile check-in/out, digital room keys (door lock integration with Assa Abloy / Salto), order 24/7 room service & dining, book spa treatments, and chat with guest relations.
Key Requirements:
- Platforms: iOS (Swift/SwiftUI), Android (Kotlin), and Web Guest Portal (React).
- Integrations: Oracle Opera Cloud PMS for guest profiles/reservations, Stripe for payments, Salesforce Marketing Cloud.
- Compliance: PCI-DSS Level 1 for payments, California CCPA data privacy compliance.
- Target Timeline: Phase 1 pilot launch in 18 weeks across 4 flagship resorts.
- Estimated Budget: We have an allocated budget of $180,000 to $220,000 for development.
- Priority: High - board mandate to modernize guest experience before peak summer season.""",

    "task2_clean_transcript": """Transcript:
[00:00] Alice (Presale): Um, okay, so thanks everyone for joining. Today we're, like, talking about the mobile check-in feature for Coastal Stay.
[00:15] Bob (Client PM): Yeah, so, uh, basically, right now our front desk gets totally slammed between 3 PM and 6 PM. Lines are, you know, 20 minutes long.
[00:32] Alice: Right, right. And the digital key integration?
[00:40] Bob: Yeah, uh, so we use Assa Abloy VingCard locks. They have an SDK for BLE digital keys. We really, really need that to work seamlessly without guests having to download a separate third-party app.
[01:05] Charlie (Lead Architect): Got it. Does Opera PMS have webhooks enabled for room ready status?
[01:15] Bob: Um, I think so, but uh, Dave from our IT team needs to verify the API credentials and API version. He's out today, but he'll email you by Thursday.
[01:40] Alice: Perfect. So Charlie will review the Assa Abloy SDK documentation by Friday, and Bob will send Opera PMS credentials. Next sync on Monday 10 AM.""",

    "task3_gap_analysis": """Project Brief:
Client: Nexus Logistics Solutions
Goal: Build a real-time driver dispatch and route optimization dashboard.
Known Info:
- Web dashboard for 12 dispatchers.
- Mobile app for 150 subcontracted truck drivers.
- Must integrate with Google Maps Matrix API.
- Launch target: ASAP (within 2-3 months).
- Budget: Mentioned 'reasonable market rate' around $50,000.""",

    "task4_bant_qualification": """Lead Profile:
Company: Global Retail FinTech (Series B, 250 employees)
Stakeholders: Speaking directly with VP of Engineering (Economic Decision Maker) and Head of Product.
Problem: Current checkout microservice fails at >2,000 TPS on Black Friday, costing estimated $400,000 in lost revenue.
Budget: $150,000 firmly approved in Q4 IT modernization budget.
Timeline: Hard contractual deadline to go live October 1st before holiday peak shopping.
Evaluation: Evaluating us against 1 other vendor, RFP decision by end of this month.""",

    "task5_proposal_builder": """Opportunity Summary:
Client: MediCare Health Network (12 clinics, 85 doctors).
Problem: High no-show rates (18%) and 45-minute patient waiting room delays causing negative patient reviews.
Target Solution: Smart Patient Intake & Telehealth Portal with SMS appointment reminders, digital insurance card OCR, and automated pre-visit medical questionnaires.
Budget: $120,000.
Timeline: 16 weeks phased rollout.""",

    "task6_tech_architecture": """Architecture Brief:
System: High-frequency IoT Fleet Telemetry & Predictive Maintenance Platform.
Scale: 5,000 delivery vehicles streaming GPS, engine temperature, and diagnostic codes every 5 seconds (1,000 events/sec).
Latency requirement: Sub-500ms anomaly detection alerts for engine overheating.
Compliance: SOC2 Type II, ISO 27001, GDPR for driver location logs."""
}


def find_adapter_dir(preferred_path: str = None) -> str:
    candidates = []
    if preferred_path:
        candidates.append(preferred_path)
    candidates.extend([
        "./qwen_presale_adapter_v2",
        "./qwen_presale_adapter_v2/qwen_presale_adapter_v2",
        "./qwen_presale_adapter/qwen_presale_adapter",
        "./qwen_presale_adapter"
    ])
    for path in candidates:
        if os.path.isdir(path) and os.path.exists(os.path.join(path, "adapter_config.json")):
            return os.path.abspath(path)
    return preferred_path or "./qwen_presale_adapter_v2"


os.environ["PYTORCH_MPS_HIGH_WATERMARK_RATIO"] = "0.0"


def get_optimal_device(requested_device: str = None) -> Tuple[torch.device, torch.dtype]:
    if requested_device == "cpu":
        print(">> Selected Device: CPU (Float32)")
        return torch.device("cpu"), torch.float32
    elif requested_device == "cuda" or (requested_device is None and torch.cuda.is_available()):
        print(">> Acceleration: NVIDIA CUDA GPU")
        return torch.device("cuda"), torch.float16
    elif requested_device == "mps" or (requested_device is None and hasattr(torch.backends, "mps") and torch.backends.mps.is_available()):
        print(">> Acceleration: Apple Silicon MPS (Metal Performance Shaders GPU)")
        return torch.device("mps"), torch.float16
    else:
        print(">> Acceleration: CPU")
        return torch.device("cpu"), torch.float32


def load_model_and_tokenizer(base_model_name: str, adapter_dir: str, requested_device: str = None):
    print(f"\n==================================================")
    print(f">> Loading Base Model: {base_model_name}")
    print(f">> Adapter Path:      {adapter_dir}")
    print(f"==================================================")

    device, torch_dtype = get_optimal_device(requested_device)

    tokenizer = AutoTokenizer.from_pretrained(
        base_model_name,
        trust_remote_code=True,
        padding_side="right"
    )
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    print(">> Initializing Base Model...")
    base_model = AutoModelForCausalLM.from_pretrained(
        base_model_name,
        torch_dtype=torch_dtype,
        device_map=None,
        low_cpu_mem_usage=True,
        trust_remote_code=True
    )
    base_model = base_model.to(device)

    print(">> Attaching Fine-Tuned LoRA Adapter...")
    model = PeftModel.from_pretrained(
        base_model,
        adapter_dir,
        torch_dtype=torch_dtype
    )
    model.eval()
    print(">> Model loaded and ready for evaluation!\n")
    return model, tokenizer, device


def run_single_inference(
    model,
    tokenizer,
    device,
    system_prompt: str,
    user_input: str,
    max_new_tokens: int = 512,
    temperature: float = 0.2
) -> str:
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_input}
    ]
    formatted_prompt = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True
    )

    inputs = tokenizer(formatted_prompt, return_tensors="pt").to(device)

    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            temperature=temperature,
            do_sample=(temperature > 0),
            top_p=0.9 if temperature > 0 else 1.0,
            pad_token_id=tokenizer.pad_token_id,
            eos_token_id=tokenizer.eos_token_id
        )

    prompt_length = inputs["input_ids"].shape[1]
    generated_ids = outputs[0][prompt_length:]
    return tokenizer.decode(generated_ids, skip_special_tokens=True).strip()


def run_full_evaluation(model, tokenizer, device, selected_task: str = None) -> Dict[str, Any]:
    tasks_to_run = [selected_task] if selected_task else list(SYSTEM_PROMPTS.keys())
    results = {}

    for task_name in tasks_to_run:
        sys_prompt = SYSTEM_PROMPTS[task_name]
        user_text = TEST_INPUTS[task_name]
        max_tokens = 600 if task_name in ["task1_lead_json", "task5_proposal_builder"] else 500

        print(f"\n{'='*70}")
        print(f"🚀 RUNNING TASK: {task_name.upper()}")
        print(f"{'='*70}")
        print(f"[INPUT PREVIEW]:\n{user_text[:200]}...\n")

        output = run_single_inference(
            model=model,
            tokenizer=tokenizer,
            device=device,
            system_prompt=sys_prompt,
            user_input=user_text,
            max_new_tokens=max_tokens,
            temperature=0.1
        )

        print(f"[MODEL RESPONSE]:\n{output}\n")

        # Specific verification for Task 1: JSON validation
        if task_name == "task1_lead_json":
            try:
                # Try to clean out markdown fence if any
                clean_str = output.strip()
                if clean_str.startswith("```json"):
                    clean_str = clean_str[7:]
                if clean_str.startswith("```"):
                    clean_str = clean_str[3:]
                if clean_str.endswith("```"):
                    clean_str = clean_str[:-3]
                parsed_json = json.loads(clean_str.strip())
                print(f"✅ TASK 1 VALIDATION: Strict JSON parsed successfully! Keys: {list(parsed_json.keys())}")
                results[task_name] = {"output": output, "valid_json": True, "data": parsed_json}
            except Exception as e:
                print(f"❌ TASK 1 VALIDATION FAILED: Invalid JSON: {e}")
                results[task_name] = {"output": output, "valid_json": False, "error": str(e)}
        else:
            results[task_name] = {"output": output}

    return results


def main():
    parser = argparse.ArgumentParser(description="Evaluate Fine-Tuned Presaleee V2 LLM")
    parser.add_argument("--base_model", type=str, default="Qwen/Qwen1.5-4B-Chat", help="Base model identifier")
    parser.add_argument("--adapter_dir", type=str, default=None, help="Path to LoRA adapter")
    parser.add_argument("--device", type=str, choices=["mps", "cpu", "cuda"], default=None, help="Device to run on")
    parser.add_argument("--task", type=str, choices=list(SYSTEM_PROMPTS.keys()), default=None, help="Specific task to test")
    args = parser.parse_args()

    adapter_path = find_adapter_dir(args.adapter_dir)
    if not os.path.isdir(adapter_path):
        print(f"Error: Adapter directory not found: {adapter_path}")
        sys.exit(1)

    model, tokenizer, device = load_model_and_tokenizer(args.base_model, adapter_path, requested_device=args.device)
    run_full_evaluation(model, tokenizer, device, selected_task=args.task)


if __name__ == "__main__":
    main()

