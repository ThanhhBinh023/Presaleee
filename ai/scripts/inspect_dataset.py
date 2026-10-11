import json
from datasets import load_dataset

print("Connecting to Hugging Face and loading dataset...")
ds = load_dataset("DeepMostInnovations/saas-sales-conversations", split="train", streaming=True)
sample = next(iter(ds))

non_embedding_keys = [k for k in sample.keys() if not k.startswith("embedding_")]
print("=== NON-EMBEDDING KEYS ===")
print(non_embedding_keys)

print("\n=== SAMPLE DATA FOR NON-EMBEDDING KEYS ===")
for k in non_embedding_keys:
    print(f"\n--- {k} ---")
    val_str = str(sample[k])
    if len(val_str) > 1000:
        print(val_str[:1000] + "... [truncated]")
    else:
        print(val_str)
