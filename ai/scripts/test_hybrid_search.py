import os
import json
import psycopg2
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv(dotenv_path="backend/.env")
DB_URL = os.getenv("DATABASE_URL")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

def test_hybrid_search(query_text: str):
    print("====================================================")
    print(f"🔍 TESTING HYBRID RAG SEARCH: '{query_text}'")
    print("====================================================\n")

    # 1. Tạo embedding bằng Gemini gemini-embedding-001 (768 dims)
    print("⏳ 1. Đang sinh vector embedding 768 dims từ Gemini API...")
    client = genai.Client(api_key=GEMINI_API_KEY)
    res = client.models.embed_content(
        model="gemini-embedding-001",
        contents=query_text,
        config=types.EmbedContentConfig(output_dimensionality=768)
    )
    query_vector = res.embeddings[0].values
    vector_str = f"[{','.join(map(str, query_vector))}]"

    # 2. Kết nối và gọi hàm RPC hybrid_search_chunks trên Supabase
    print("⏳ 2. Đang truy vấn hàm hybrid_search_chunks (RRF Fusion) trên Supabase...")
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
            rrf_k => 60
        );
        """,
        (query_text, vector_str)
    )

    rows = cursor.fetchall()
    print(f"\n🎯 KẾT QUẢ TÌM KIẾM ĐƯỢC ({len(rows)} chunks liên quan nhất):\n")

    for rank, row in enumerate(rows, 1):
        chunk_id, content, meta_json, combined_score, sem_rank, fts_rank = row
        title = meta_json.get("title", "")
        section = meta_json.get("section", "")
        tech = meta_json.get("tech_stack", [])
        compliance = meta_json.get("compliance", [])

        print(f"🥇 TOP {rank} (Combined RRF Score: {combined_score:.4f}):")
        print(f"   📌 Tài liệu: {title} | Phần: {section}")
        print(f"   🏷️  Thứ hạng Semantic: {sem_rank if sem_rank else 'Không lọt top 20'} | Thứ hạng Full-text: {fts_rank if fts_rank else 'Không khớp exact'}")
        print(f"   🛠️  Tech stack: {', '.join(tech) if tech else 'N/A'}")
        print(f"   🛡️  Compliance: {', '.join(compliance) if compliance else 'N/A'}")
        print(f"   📄 Trích đoạn: \"{content[:160]}...\"\n")

    cursor.close()
    conn.close()

if __name__ == "__main__":
    import sys
    query = sys.argv[1] if len(sys.argv) > 1 else "Cần làm hệ thống bán lẻ POS hỗ trợ Offline và bảo mật thanh toán thẻ PCI-DSS"
    test_hybrid_search(query)

