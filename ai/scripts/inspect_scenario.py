import json
from datasets import load_dataset

ds = load_dataset("DeepMostInnovations/saas-sales-conversations", split="train", streaming=True)
sample = next(iter(ds))

print("=== SCENARIO JSON ===")
scenario_obj = json.loads(sample["scenario"]) if isinstance(sample["scenario"], str) else sample["scenario"]
print(json.dumps(scenario_obj, indent=2))

print("\n=== CONVERSATION TURNS ===")
conv_obj = json.loads(sample["conversation"]) if isinstance(sample["conversation"], str) else sample["conversation"]
for turn in conv_obj:
    print(f"[{turn.get('speaker')}]: {turn.get('message')}")
