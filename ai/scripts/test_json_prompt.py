"""
Test Structured JSON Extraction on the Hotel RFP using our fine-tuned Qwen-4B LoRA model.
Uses Strong System Prompting + Schema Enforcement to see if the model can output JSON.
"""

import os
import json
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel

HOTEL_RFP = """From: Coastal Stay Hotels Pty Ltd     |     Date sent: 2 October 2026
Company: Coastal Stay Hotels Pty Ltd
What we do: We own and run three boutique hotels on the east coast of Australia.
Properties:
- Byron Bay, NSW: 48 rooms
- Gold Coast, QLD: 112 rooms (has a restaurant and a bar)
- Sydney CBD, NSW: 60 rooms
(220 rooms in total)
Contact: Sarah Mitchell – Group Operations Manager (sarah.mitchell@coastalstay.example)
Current setup: All three hotels run on an old on-premise PMS from 2013 with separate servers. Rates and housekeeping are in spreadsheets.
What isn't working:
- Double bookings last summer because OTA calendars didn't update in time.
- Staff update rates on Booking.com, Expedia and Airbnb one by one manually.
- Housekeeping still uses printed room sheets.
- Night audit is manual and takes a couple of hours.
- Server at Gold Coast went down twice. Head office waits for emailed reports.
What we're looking for: Cloud PMS (SaaS) across all three hotels with front desk, reservations, billing, mobile housekeeping, direct booking engine.
Integrations needed: Booking.com, Expedia, Airbnb, Stripe, Tyro (restaurant), Xero, Restaurant POS, Salto door locks, Website booking engine.
Must-haves: Mobile housekeeping, Australia cloud data hosting, GST handling, 24/7 urgent support.
Budget: Roughly AUD 150k–200k for Year 1 including setup.
Timing: Start early November 2026. Byron Bay pilot first. Avoid Christmas–January peak. All live by mid-2027."""

JSON_SYSTEM_PROMPT = """You are a specialized Enterprise Presale Data Extraction Engine.
Your sole job is to extract quantitative parameters from incoming hotel requests for proposals (RFPs) and output STRICT, VALID JSON ONLY.
Do NOT include explanations, conversational filler, or markdown code blocks if possible.
Output must match this exact schema:
{
  "client_name": string,
  "contact_person": string,
  "total_rooms": integer,
  "properties": [
    {"name": string, "state": string, "rooms": integer, "notes": string}
  ],
  "budget": {
    "min_aud": integer,
    "max_aud": integer
  },
  "integrations": [string],
  "timeline": {
    "start_target": string,
    "pilot_property": string,
    "target_completion": string
  },
  "core_pain_points": [string]
}"""


def test_json_extraction():
    adapter_dir = os.path.abspath("./qwen_presale_adapter/qwen_presale_adapter")
    base_model_id = "Qwen/Qwen1.5-4B-Chat"

    device = torch.device("mps" if torch.backends.mps.is_available() else "cuda" if torch.cuda.is_available() else "cpu")
    dtype = torch.float16 if device.type in ["cuda", "mps"] else torch.float32

    print(f"Loading Tokenizer & Model onto {device}...")
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

    user_query = f"Extract all proposal parameters from this Hotel RFP and return STRICT JSON:\n\n{HOTEL_RFP}"

    messages = [
        {"role": "system", "content": JSON_SYSTEM_PROMPT},
        {"role": "user", "content": user_query}
    ]

    prompt_text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = tokenizer(prompt_text, return_tensors="pt").to(device)

    print("\n" + "=" * 60)
    print("GENERATING STRUCTURED JSON FROM HOTEL RFP...")
    print("=" * 60 + "\n")

    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=600,
            temperature=0.1,  # Low temperature for strict structural adherence
            top_p=0.9,
            do_sample=True,
            pad_token_id=tokenizer.pad_token_id
        )

    raw_output = tokenizer.decode(outputs[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True).strip()
    print("RAW MODEL OUTPUT:")
    print("-" * 50)
    print(raw_output)
    print("-" * 50)

    # Validate JSON parsing
    clean_json = raw_output
    if "```json" in clean_json:
        clean_json = clean_json.split("```json")[1].split("```")[0].strip()
    elif "```" in clean_json:
        clean_json = clean_json.split("```")[1].split("```")[0].strip()

    try:
        parsed = json.loads(clean_json)
        print("\n✅ VALIDATION RESULT: JSON PARSED SUCCESSFULLY!")
        print(f"- Client Name: {parsed.get('client_name')}")
        print(f"- Total Rooms: {parsed.get('total_rooms')}")
        print(f"- Properties Count: {len(parsed.get('properties', []))}")
        print(f"- Integrations Count: {len(parsed.get('integrations', []))}")
        print(f"- Budget: {parsed.get('budget')}")
    except Exception as e:
        print(f"\n❌ JSON Parse Error: {e}")


if __name__ == "__main__":
    test_json_extraction()
