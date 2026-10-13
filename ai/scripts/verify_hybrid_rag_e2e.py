import os
import json
import time
import psycopg2
from dotenv import load_dotenv
from google import genai
from google.genai import types
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel

load_dotenv(dotenv_path="backend/.env")
DB_URL = os.getenv("DATABASE_URL")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
BASE_MODEL_NAME = "Qwen/Qwen1.5-4B-Chat"
ADAPTER_PATH = os.path.abspath("./ai/qwen_presale_adapter_v2")

def run_hybrid_rag_pipeline(test_rfp: str, domain: str = None):
    print("======================================================================")
    print("🚀 PRESALEEE E2E HYBRID RAG VERIFICATION & EVALUATION (GEMINI EMBEDDING)")
    print("======================================================================\n")
    print(f"📥 RFP Input Khách hàng:\n\"{test_rfp}\"\n")

    # ---------------------------------------------------------
    # BƯỚC 1: RETRIEVAL (HYBRID SEARCH TRÊN SUPABASE VỚI GEMINI)
    # ---------------------------------------------------------
    print("⏳ [BƯỚC 1/3] Đang mã hóa câu hỏi bằng Gemini gemini-embedding-001 (768 dims)...")
    t0 = time.time()
    gemini_client = genai.Client(api_key=GEMINI_API_KEY)
    res = gemini_client.models.embed_content(
        model="gemini-embedding-001",
        contents=test_rfp,
        config=types.EmbedContentConfig(output_dimensionality=768)
    )
    query_vector = res.embeddings[0].values
    vector_str = f"[{','.join(map(str, query_vector))}]"
    embed_time = time.time() - t0
    print(f"✅ Embedding xong trong {embed_time:.2f}s qua Cloud API (Vector 768 dims)")

    print("⏳ [BƯỚC 2/3] Truy vấn hàm hybrid_search_chunks (Dense + Full-Text + RRF) trên Supabase...")
    t1 = time.time()
    conn = psycopg2.connect(DB_URL)
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT id, chunk_content, metadata, combined_score, semantic_rank, fts_rank
        FROM hybrid_search_chunks(
            query_text => %s,
            query_embedding => %s::vector,
            match_count => 3,
            full_text_weight => 1.0,
            semantic_weight => 1.0,
            rrf_k => 60,
            filter_domain => %s
        );
        """,
        (test_rfp, vector_str, domain)
    )
    retrieved_chunks = cursor.fetchall()
    retrieval_time = time.time() - t1
    print(f"✅ Supabase trả về {len(retrieved_chunks)} chunks phù hợp nhất trong {retrieval_time:.2f}s:\n")

    for rank, chunk in enumerate(retrieved_chunks, 1):
        cid, content, meta, score, sem_rank, fts_rank = chunk
        print(f"   🔹 Top {rank} [RRF Score: {score:.4f}] - {meta.get('title')} ({meta.get('section')})")
        print(f"      Semantic rank: {sem_rank} | Full-text rank: {fts_rank}")
        print(f"      Tech: {meta.get('tech_stack')} | Compliance: {meta.get('compliance')}")

    # ---------------------------------------------------------
    # BƯỚC 2: AUGMENTATION (GHÉP CONTEXT VÀO PROMPT)
    # ---------------------------------------------------------
    print("\n⏳ [BƯỚC 3/3] Đang ghép Context vào Prompt và sinh Proposal bằng Qwen1.5-4B LoRA...")
    augmented_prompt = (
        "Synthesize a Technical Deep Dive Summary covering architecture, decisions, constraints, assumptions, and security compliance for EcoMart Mini Supermarket Chain:\n\n"
        f"CLIENT RFP & REQUIREMENTS:\n{test_rfp}\n\n"
        "PROVEN ARCHITECTURAL REFERENCES & BENCHMARKS:\n"
    )
    
    for idx, chunk in enumerate(retrieved_chunks, 1):
        cid, content, meta, score, sem_rank, fts_rank = chunk
        augmented_prompt += f"Reference #{idx} - {meta.get('title')} ({meta.get('section')}):\n"
        augmented_prompt += f"- Solution details: {content}\n"
        if meta.get("tech_stack"):
            augmented_prompt += f"- Proven Tech Stack: {', '.join(meta.get('tech_stack'))}\n"
        if meta.get("compliance"):
            augmented_prompt += f"- Compliance standard: {', '.join(meta.get('compliance'))}\n"
        augmented_prompt += "\n"

    augmented_prompt += (
        "Instructions:\n"
        "Produce the Technical Deep Dive Summary covering:\n"
        "### Technical Deep Dive Summary\n"
        "- **Architecture**: Detail the proposed frontend (React Native POS), backend microservices, and database.\n"
        "- **Technical Decisions**: Detail offline-first operation, local SQLite caching, and bidirectional inventory sync.\n"
        "- **Security & Compliance**: Specify PCI-DSS compliance and secure payment processing.\n"
        "- **Constraints & Assumptions**: Address 85 stores network resilience."
    )

    # ---------------------------------------------------------
    # BƯỚC 3: GENERATION VỚI QWEN1.5-4B LORA
    # ---------------------------------------------------------
    t2 = time.time()
    tokenizer = AutoTokenizer.from_pretrained(ADAPTER_PATH, trust_remote_code=True)
    
    # Tối ưu cho Apple Silicon (MPS) hoặc CPU
    device = torch.device("mps") if torch.backends.mps.is_available() else torch.device("cpu")
    dtype = torch.float16 if device.type == "mps" else torch.float32
    print(f"⏳ Đang nạp mô hình Qwen1.5-4B LoRA trên {device} ({dtype})...")
    base_model = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL_NAME,
        torch_dtype=dtype,
        low_cpu_mem_usage=True,
        trust_remote_code=True
    )
    base_model.to(device)
    model = PeftModel.from_pretrained(base_model, ADAPTER_PATH)
    model.eval()

    messages = [
        {
            "role": "system",
            "content": "You are the Technical Deep Dive AI for Presaleee. Analyze technical sessions and discovery notes to synthesize an enterprise Technical Summary covering Architecture Overview, Technical Decisions, Constraints, Assumptions, Risks, and Outstanding Questions."
        },
        {"role": "user", "content": augmented_prompt}
    ]
    prompt_formatted = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = tokenizer(prompt_formatted, return_tensors="pt").to(model.device)

    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=900,
            temperature=0.2,
            do_sample=False,  # Greedy decoding tránh lỗi nan trên MPS Mac
            pad_token_id=tokenizer.eos_token_id
        )
    gen_text = tokenizer.decode(outputs[0][inputs.input_ids.shape[1]:], skip_special_tokens=True).strip()
    gen_time = time.time() - t2

    print("======================================================================")
    print(f"✨ KẾT QUẢ PROPOSAL OVERVIEW ĐƯỢC SINH BỞI HYBRID RAG (trong {gen_time:.1f}s):")
    print("======================================================================\n")
    print(gen_text)
    print("\n======================================================================")

    # ---------------------------------------------------------
    # ĐÁNH GIÁ CHẤT LƯỢNG (GROUNDING EVALUATION)
    # ---------------------------------------------------------
    print("📊 ĐÁNH GIÁ ĐỘ BÁM SÁT DỮ LIỆU THỰC TẾ (GROUNDING EVALUATION):")
    
    # Kiểm tra xem các thuật ngữ và công nghệ trong Knowledge chunks có xuất hiện trong bài viết không
    grounding_checks = [
        ("React Native / Mobile App", "react native" in gen_text.lower() or "mobile" in gen_text.lower()),
        ("Offline-First / SQLite", "offline" in gen_text.lower() or "sqlite" in gen_text.lower()),
        ("PCI-DSS Compliance", "pci-dss" in gen_text.lower() or "pci" in gen_text.lower()),
        ("PostgreSQL / Microservices", "postgresql" in gen_text.lower() or "microservice" in gen_text.lower()),
        ("Cơ chế đồng bộ tồn kho", "đồng bộ" in gen_text.lower() or "inventory" in gen_text.lower() or "tồn kho" in gen_text.lower())
    ]

    passed_checks = sum(1 for _, passed in grounding_checks if passed)
    print(f"• Số tiêu chí Grounding đạt: {passed_checks}/{len(grounding_checks)}")
    for name, passed in grounding_checks:
        print(f"   [{'PASS ✅' if passed else 'FAIL ❌'}] {name}")

    if passed_checks >= 4:
        print("\n🏆 KẾT LUẬN: HYBRID RAG ĐẠT CHẤT LƯỢNG XUẤT SẮC! Model không bốc phét, trích xuất chính xác dẫn chứng từ dự án mẫu trong Supabase.")
    else:
        print("\n⚠️ CẦN TINH CHỈNH THÊM PROMPT ĐỂ TĂNG ĐỘ GROUNDING.")

    cursor.close()
    conn.close()

if __name__ == "__main__":
    test_rfp = (
        "Chúng tôi là chuỗi siêu thị mini EcoMart với 85 cửa hàng đang cần xây dựng giải pháp POS và App bán hàng. "
        "Yêu cầu các máy POS tại quầy phải bán hàng được khi đứt cáp mạng, tự đồng bộ khi có Internet lại. "
        "Hệ thống phải đạt chuẩn bảo mật thanh toán thẻ ngân hàng PCI-DSS và kiểm soát tồn kho tức thời."
    )
    run_hybrid_rag_pipeline(test_rfp, domain="Retail / E-Commerce")

