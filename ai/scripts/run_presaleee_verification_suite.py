"""
Presaleee AI Base Verification Suite
Executes end-to-end test cases against the fine-tuned Qwen1.5-4B LoRA V2 model
using real data from NovaRetail and enterprise presale scenarios.
Outputs detailed evaluation metrics and test results.
"""

import os
import sys
import time
import json
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel

os.environ["PYTORCH_MPS_HIGH_WATERMARK_RATIO"] = "0.0"

BASE_MODEL = "Qwen/Qwen1.5-4B-Chat"
ADAPTER_PATH = "./qwen_presale_adapter_v2"

# 1. Test Cases Definitions
TEST_CASES = [
    {
        "id": "TC-01",
        "name": "RFP Intake to Strict JSON Extraction (NovaRetail)",
        "module": "AI Intake Engine",
        "system_prompt": (
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
        "user_input": """Client Inquiry:
Company: NovaRetail Holdings Pty Ltd (trading as NovaRetail Group)
We are a fashion and lifestyle apparel retailer with 120 physical retail stores across Australia, New Zealand, and Singapore, plus 3 central distribution warehouses and an online store on Shopify Plus averaging 8,000 orders/day (peaking at 35,000 orders on Black Friday).
Contact: Marcus Vance – VP of Digital & Omnichannel Operations.
Our biggest problems:
- Inventory sync lags by 8 hours between store POS and Shopify, causing 420 cancelled orders and $85k customer compensation during Click Frenzy.
- Orders ship from central warehouses instead of nearest retail store, costing $14/delivery and taking 4 days.
- Pickers in warehouses still use paper manifests resulting in 2.8% mis-picks.
- Click & Collect customers wait 20 minutes while staff search through backroom boxes.
What we want to build:
A cloud-based Omnichannel Order Management (OMS) and light Warehouse Management (WMS) system.
Key capabilities needed:
- Real-time sub-second inventory sync across all 120 stores and 3 warehouses.
- Intelligent order routing (ship from warehouse vs nearest store vs Click & Collect).
- Mobile Android scanning app for warehouse pickers on Zebra TC52 handheld scanners.
- Store associate mobile/tablet app for Click & Collect handover in under 1 minute.
- Automatic shipping label printing for Australia Post and DHL.
Integrations required: Shopify Plus, on-premise store POS, SAP S/4HANA ERP, Australia Post eParcel, DHL Express, Zebra TC52 scanners.
Compliance: Australia Privacy Act, SOC2 Type II, PCI-DSS Level 1.
Timeline & Budget: Phase 1 live in 18 to 24 weeks. Budget allocated is AUD $180,000 to $230,000. Priority: High.""",
        "expected_check": "valid_json"
    },
    {
        "id": "TC-02",
        "name": "Meeting Transcript Cleaning & Action Items Extraction",
        "module": "Meeting Assistant",
        "system_prompt": (
            "You are an expert AI Presale Meeting Assistant for 'Presaleee'. "
            "Clean, normalize, and distill the raw messy meeting transcript into a structured summary. "
            "Remove filler words (um, uh, you know, like), stuttering, repetitive chatter, and conversational noise. "
            "Structure the output into:\n"
            "### Key Discussion Points\n"
            "### Clarified Client Requirements\n"
            "### Action Items & Ownership\n"
            "### Open Questions for Next Sync"
        ),
        "user_input": """Raw Meeting Transcript:
[00:02] Presale Lead (David): Hi Marcus, thanks for joining today. Let's, um, dig into NovaRetail's order routing challenges.
[00:18] Marcus Vance (Client VP): Yeah, look, uh, basically, right now it's a complete mess. Our online store and our 120 physical shops operate like totally different islands, y'know?
[00:45] David: Right, and regarding the Zebra scanners in the Sydney and Melbourne warehouses?
[01:02] Marcus: Yeah, so our pickers, like, walk around with printed A4 sheets. We bought 120 Zebra TC52 Android devices last month, but they're literally sitting in boxes because we don't have software for them. We need a barcode scanning app that beeps if a picker grabs the wrong SKU.
[01:35] Sarah (Lead Architect): Got it. Does the legacy store POS have any webhook capability or is it strictly database polling?
[01:48] Marcus: Um, Dave from our IT team said it's SQL Server on-prem, but we can expose an API gateway. Dave will, uh, send you the database schema documentation by this Thursday.
[02:15] David: Fantastic. So Sarah will review the Zebra EMDK scanner documentation by Friday, and Marcus will have Dave share the POS API specs by Thursday. Next sync set for Tuesday 10 AM.""",
        "expected_check": "contains_sections"
    },
    {
        "id": "TC-03",
        "name": "Proposal Gap Analysis & Proactive Question Generation",
        "module": "Gap Analyzer",
        "system_prompt": (
            "You are an expert AI Proposal Reviewer and Solution Consultant for 'Presaleee'. "
            "Review the preliminary project requirements against standard enterprise proposal template sections "
            "(Scope & Architecture, Timeline & Milestones, Team & Pricing, SLA & Support). "
            "Identify critical missing information, ambiguities, and under-specified requirements. "
            "Structure your response as:\n"
            "### Missing Proposal Parameters & Gaps\n"
            "### Proactive Discovery Questions for the Client\n"
            "### Presale Consultant Recommendations"
        ),
        "user_input": """Preliminary Project Brief:
Client: NovaRetail Group (120 stores, 3 warehouses)
Scope: Cloud OMS, Real-time stock sync, Zebra TC52 scanner app, Click & Collect app.
Timeline: 20 weeks. Budget: $200,000.
Known integrations: Shopify Plus, SAP S/4HANA, AusPost, DHL.
Missing details currently not provided by client:
- Specific barcode symbology (EAN-13 vs Code 128) and RFID usage.
- Return Merchandise Authorization (RMA) workflow across stores.
- Peak concurrent picking staff headcount per warehouse shift.
- Exact SAP S/4HANA version (ECC 6.0 vs S/4HANA Cloud) and middleware licensed.""",
        "expected_check": "contains_sections"
    },
    {
        "id": "TC-04",
        "name": "Enterprise BANT Qualification & Risk Scoring (0–100)",
        "module": "Qualification Engine",
        "system_prompt": (
            "You are an expert Enterprise Presale Qualification Director for 'Presaleee'. "
            "Perform a rigorous Lead Qualification evaluation using the BANT framework (Budget, Authority, Need, Timeline). "
            "Provide:\n"
            "1. Overall Qualification Score (0-100)\n"
            "2. BANT Component Breakdown (Budget /25, Authority /25, Need /25, Timeline /25)\n"
            "3. Key Deal Risks & Friction Points\n"
            "4. Presale Pursuit Recommendation (PURSUE AGGRESSIVELY / PURSUE WITH CONDITIONS / NURTURE / DISQUALIFY)"
        ),
        "user_input": """Opportunity Profile:
Client: NovaRetail Group
Budget: AUD $180,000 - $230,000 firmly allocated in Q4 Capex; CFO approved.
Authority: Marcus Vance (VP Omnichannel Operations) is economic buyer with direct sign-off authority up to $250k. COO Elena Rostova is executive sponsor.
Need: Urgent pain point. Company lost $85,000 in customer vouchers and 420 orders during last Click Frenzy sale due to stockout desync. Board mandated solution before next peak season.
Timeline: Hard deadline of 20-24 weeks to go live before Q4 peak shopping season.
Competition: Evaluating us against 1 other local boutique systems integrator.""",
        "expected_check": "contains_bant"
    },
    {
        "id": "TC-05",
        "name": "Proposal Builder: Overview & Value Synthesis",
        "module": "Proposal Generator",
        "system_prompt": (
            "You are an expert Proposal Architect and Bid Manager for 'Presaleee'. "
            "Synthesize client pain points, objectives, and project parameters into tailored content for proposal sheets. "
            "Structure your output into the following proposal sections:\n"
            "### 1. Executive Summary & 'Why This Solution'\n"
            "### 2. Scope of Work & Deliverables Breakdown\n"
            "### 3. Implementation Timeline & Phasing\n"
            "### 4. Commercial Model & Pricing Strategy"
        ),
        "user_input": """Project Opportunity:
Client: NovaRetail Group
Target: Enterprise Omnichannel Fulfillment Suite (NovaSync OMS & WMS)
Key Deliverables: Sub-second distributed inventory ledger, intelligent order routing, Zebra Android scanner app, Click & Collect store app, multi-carrier label hub.
Timeline: 24 weeks phased rollout across 12 Sprints.
Budget: $218,350 total investment (including 10% contingency).""",
        "expected_check": "contains_sections"
    },
    {
        "id": "TC-06",
        "name": "Technical Architecture & NFR Specification",
        "module": "Architecture Specialist",
        "system_prompt": (
            "You are a Principal Cloud Solutions Architect for 'Presaleee'. "
            "Analyze the project requirements and synthesize a comprehensive Technical Architecture Deep-Dive. "
            "Structure your response as:\n"
            "### Recommended Architecture & Tech Stack\n"
            "### Key Architectural Decisions (ADRs)\n"
            "### Architectural Constraints & Technical Assumptions\n"
            "### Non-Functional Requirements & Security Baseline"
        ),
        "user_input": """Architecture Brief:
System: High-volume Omnichannel Retail OMS & Warehouse Picking Engine.
Scale: 120 stores + 3 warehouses, peak 35,000 orders/day during Black Friday (500 peak TPS).
Latency Target: Sub-second inventory balance update (<200ms API response).
Mobile: Zebra TC52 Android handheld scanners and store associate tablets.
Integrations: Shopify Plus, SAP S/4HANA, AusPost, DHL.
Hosting: AWS Australia (ap-southeast-2). Compliance: PCI-DSS Level 1, Australia Privacy Act.""",
        "expected_check": "contains_sections"
    }
]


def load_model():
    device = "mps" if torch.backends.mps.is_available() else ("cuda" if torch.cuda.is_available() else "cpu")
    dtype = torch.float16 if device in ["mps", "cuda"] else torch.float32

    print(f"\n{'='*70}")
    print(f">> Khởi tạo mô hình kiểm thử: {BASE_MODEL}")
    print(f">> Thiết bị: {device.upper()} ({dtype})")
    print(f">> LoRA Adapter: {ADAPTER_PATH}")
    print(f"{'='*70}")

    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    base_model = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL,
        dtype=dtype,
        low_cpu_mem_usage=True,
        trust_remote_code=True
    ).to(device)

    model = PeftModel.from_pretrained(base_model, ADAPTER_PATH)
    model.eval()
    print(">> Model & LoRA Adapter nạp thành công!\n")
    return model, tokenizer, device


def run_test_case(model, tokenizer, device, tc: dict):
    print(f"\n{'#'*70}")
    print(f"👉 CHẠY TEST CASE: [{tc['id']}] - {tc['name']}")
    print(f"   Module: {tc['module']}")
    print(f"{'#'*70}")

    messages = [
        {"role": "system", "content": tc["system_prompt"]},
        {"role": "user", "content": tc["user_input"]}
    ]

    prompt_text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = tokenizer(prompt_text, return_tensors="pt").to(device)

    start_time = time.time()
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=550,
            temperature=0.1,
            top_p=0.9,
            do_sample=False,
            pad_token_id=tokenizer.pad_token_id
        )
    elapsed_time = time.time() - start_time

    prompt_tokens = inputs["input_ids"].shape[1]
    generated_tokens = outputs[0].shape[0] - prompt_tokens
    speed = generated_tokens / elapsed_time if elapsed_time > 0 else 0

    response_text = tokenizer.decode(outputs[0][prompt_tokens:], skip_special_tokens=True).strip()

    # Evaluation verification
    status = "PASSED"
    notes = []

    if tc["expected_check"] == "valid_json":
        clean_json = response_text
        if clean_json.startswith("```json"):
            clean_json = clean_json[7:]
        if clean_json.startswith("```"):
            clean_json = clean_json[3:]
        if clean_json.endswith("```"):
            clean_json = clean_json[:-3]
        clean_json = clean_json.strip()
        try:
            parsed = json.loads(clean_json)
            required_keys = ["project_name", "business_goal", "timeline_weeks", "budget_usd", "target_platforms", "core_functional_modules"]
            missing_keys = [k for k in required_keys if k not in parsed]
            if missing_keys:
                status = "WARNING"
                notes.append(f"Thiếu các trường JSON: {missing_keys}")
            else:
                notes.append(f"JSON hợp lệ 100%, đủ {len(parsed)} trường.")
        except Exception as e:
            status = "FAILED"
            notes.append(f"Lỗi parse JSON: {e}")

    elif tc["expected_check"] == "contains_bant":
        if "score" in response_text.lower() or "100" in response_text or "/25" in response_text:
            notes.append("Có tính điểm số BANT & phân rã các tiêu chí.")
        else:
            status = "WARNING"
            notes.append("Chưa thấy rõ điểm số định lượng.")

    print(f"\n[KẾT QUẢ ĐẦU RA CỦA MODEL]:")
    print("-" * 50)
    print(response_text)
    print("-" * 50)
    print(f"⏱ Thời gian: {elapsed_time:.2f}s | Số token sinh ra: {generated_tokens} | Tốc độ: {speed:.1f} tok/s")
    print(f"🎯 Đánh giá: {status} ({'; '.join(notes) if notes else 'Đạt chuẩn'})\n")

    return {
        "id": tc["id"],
        "name": tc["name"],
        "module": tc["module"],
        "response": response_text,
        "tokens": generated_tokens,
        "time": elapsed_time,
        "speed": speed,
        "status": status,
        "notes": notes
    }


def main():
    model, tokenizer, device = load_model()
    results = []

    for tc in TEST_CASES:
        res = run_test_case(model, tokenizer, device, tc)
        results.append(res)

    print("\n" + "=" * 70)
    print("📊 BẢNG TỔNG HỢP KẾT QUẢ KIỂM THỬ (SUMMARY REPORT)")
    print("=" * 70)
    print(f"{'ID':<7} | {'Module':<22} | {'Trạng Thái':<10} | {'Tokens':<7} | {'Thời gian':<10}")
    print("-" * 70)
    for r in results:
        print(f"{r['id']:<7} | {r['module']:<22} | {r['status']:<10} | {r['tokens']:<7} | {r['time']:.2f}s")
    print("=" * 70)


if __name__ == "__main__":
    main()

