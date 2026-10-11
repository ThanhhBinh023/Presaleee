"""
Realistic Enterprise SaaS Sales Lead Test
Evaluates the fine-tuned Qwen-4B LoRA Presale model on a realistic multi-turn sales transcript across all 5 tasks:
1. Pain Point Extraction
2. Requirement Extraction
3. Intent Classification
4. Objection Extraction
5. Lead Qualification (BANT)
"""

import os
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel

REALISTIC_TRANSCRIPT = """Customer: Hey Sarah, thanks for hopping on. Our core issue right now is that our engineering team is burning 25+ hours each sprint manually managing test runs and syncing environments between AWS and on-prem. Last week a regression escaped to production and broke our payment webhooks for 40 minutes.
Sales Rep: Ouch, payment downtime is critical in fintech. How are your QA engineers currently triaging those regressions before release?
Customer: That's the problem—we don't have a dedicated QA team anymore. Developers write their own Playwright and Cypress tests, but we lack automated flaky test quarantine and unified reporting. We desperately need a platform that integrates natively with GitHub Actions, automatically quarantines flaky tests, and gives our engineering managers an executive quality dashboard.
Sales Rep: TestPulse integrates directly with GitHub Actions and our ML engine isolates flaky tests in real time. How does your timeline and budget look for solving this?
Customer: Our CTO approved a $35,000–$45,000 annual budget for Q4 if we can roll this out before our holiday freeze in November. But here's our major hesitation: our security team has strict requirements—we must have SOC2 Type II compliance and data isolation. Also, my team is already stretched thin, so we can't afford a complex tool that takes 4 weeks of setup. Can we get self-serve onboarding in under 5 business days?
Sales Rep: Absolutely. We are SOC2 Type II certified with VPC peering options, and 90% of our customers onboard via our GitHub App within 48 hours.
Customer: That sounds promising. Send over your SOC2 audit package and commercial proposal for 40 developer seats. If the compliance checks out, I'll loop in our CTO next Tuesday for final approval."""

COMPANY_NAME = "NovaPay Financial"
PRODUCT_NAME = "TestPulse Enterprise Orchestrator"

TASKS = [
    (
        "1. PAIN POINT EXTRACTION",
        "You are an expert AI Presale Analyst. Analyze the sales conversation transcript and identify the customer's key pain points, operational bottlenecks, and current frustrations.",
        "Identify and list the customer's primary pain points and operational bottlenecks:"
    ),
    (
        "2. REQUIREMENT EXTRACTION",
        "You are an expert AI Presale Analyst. Analyze the sales conversation transcript and extract the functional and technical requirements/needs expressed by the customer.",
        "Extract the customer's functional and technical requirements for the solution:"
    ),
    (
        "3. INTENT CLASSIFICATION",
        "You are an expert AI Presale Analyst. Classify the customer's primary intent in this sales interaction into one of the following categories: [Product Capability Evaluation, Pricing & ROI Evaluation, Implementation & Onboarding Assessment, Initial Discovery, Commercial Negotiation]. Provide a concise justification based on the conversation.",
        "Classify the customer's primary intent and provide a brief justification:"
    ),
    (
        "4. OBJECTION EXTRACTION",
        "You are an expert AI Presale Analyst. Identify all objections, hesitations, risks, and concerns raised by the customer during this sales interaction regarding pricing, complexity, time, or change management.",
        "Identify and analyze the customer's objections, hesitations, and risk concerns:"
    ),
    (
        "5. BANT LEAD QUALIFICATION",
        "You are an expert AI Presale Solution Architect. Conduct a comprehensive Lead Qualification assessment using the BANT framework (Budget, Authority, Need, Timeline/Engagement) and assign a qualification status.",
        f"Company: {COMPANY_NAME}\nProduct Discussed: {PRODUCT_NAME}\nConduct a BANT Lead Qualification analysis and deliver the evaluation:"
    ),
]


def run_realistic_test():
    adapter_dir = os.path.abspath("./qwen_presale_adapter/qwen_presale_adapter")
    base_model_id = "Qwen/Qwen1.5-4B-Chat"

    print("==================================================================")
    print("RUNNING REALISTIC ENTERPRISE PRESALE LEAD EVALUATION")
    print("==================================================================")
    print(f"Company: {COMPANY_NAME}")
    print(f"Product: {PRODUCT_NAME}")
    print("\n--- SALES CONVERSATION TRANSCRIPT ---")
    print(REALISTIC_TRANSCRIPT)
    print("-------------------------------------\n")

    device = torch.device("mps" if torch.backends.mps.is_available() else "cuda" if torch.cuda.is_available() else "cpu")
    dtype = torch.float16 if device.type in ["cuda", "mps"] else torch.float32

    print(f"Loading Tokenizer & Model onto {device} ({dtype})...")
    tokenizer = AutoTokenizer.from_pretrained(adapter_dir, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    base_model = AutoModelForCausalLM.from_pretrained(
        base_model_id,
        torch_dtype=dtype,
        low_cpu_mem_usage=True,
        trust_remote_code=True
    ).to(device)

    model = PeftModel.from_pretrained(base_model, adapter_dir)
    model.eval()
    print(">> Model & LoRA Adapter Ready!\n")

    for title, sys_prompt, user_query in TASKS:
        print("=" * 65)
        print(f"🎯 TASK: {title}")
        print("=" * 65)

        messages = [
            {"role": "system", "content": sys_prompt},
            {
                "role": "user",
                "content": f"Sales Conversation Transcript:\n```\n{REALISTIC_TRANSCRIPT}\n```\n\n{user_query}"
            }
        ]

        prompt_text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        inputs = tokenizer(prompt_text, return_tensors="pt").to(device)

        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=350,
                temperature=0.2,
                top_p=0.9,
                do_sample=True,
                pad_token_id=tokenizer.pad_token_id
            )

        resp = tokenizer.decode(outputs[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True)
        print(resp.strip())
        print("\n")


if __name__ == "__main__":
    run_realistic_test()
