import os
import json
import psycopg2
from dotenv import load_dotenv
from google import genai
from google.genai import types

# Load environment variables
load_dotenv(dotenv_path="backend/.env")
DB_URL = os.getenv("DATABASE_URL")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not DB_URL:
    raise ValueError("❌ DATABASE_URL không tìm thấy trong backend/.env")
if not GEMINI_API_KEY:
    raise ValueError("❌ GEMINI_API_KEY không tìm thấy trong backend/.env")

# 1. Định nghĩa kho tri thức chuẩn gồm 4 Dự án IT Presale thực tế (Đa ngành)
KNOWLEDGE_ITEMS = [
    {
        "title": "NovaRetail Omnichannel Platform Proposal & Case Study",
        "category": "PROPOSAL_TEMPLATE",
        "domain": "Retail / E-Commerce",
        "chunks": [
            {
                "section": "Overview & Architecture",
                "content": (
                    "Dự án NovaRetail Omnichannel Platform là giải pháp bán lẻ hợp nhất cho chuỗi 120 cửa hàng. "
                    "Hệ thống bao gồm Mobile App (React Native), POS Web & Mobile App hỗ trợ chế độ Offline-First với SQLite, "
                    "hệ thống Quản lý Đơn hàng tập trung (OMS), và Cổng tích hợp Khách hàng thân thiết (Loyalty Hub). "
                    "Kiến trúc Backend sử dụng Microservices trên Node.js/TypeScript và Go, cơ sở dữ liệu PostgreSQL kết hợp Redis Caching, "
                    "triển khai trên AWS EKS với Kong API Gateway."
                ),
                "tech_stack": ["React Native", "Node.js", "Go", "PostgreSQL", "Redis", "AWS EKS", "Kong Gateway"],
                "compliance": ["PCI-DSS Level 1"]
            },
            {
                "section": "Functional Requirements & Inventory",
                "content": (
                    "Tính năng cốt lõi của NovaRetail: Đồng bộ tồn kho thời gian thực giữa 120 cửa hàng và kho trung tâm trong dưới 2 giây. "
                    "POS hỗ trợ bán hàng và in hóa đơn ngay cả khi mất kết nối Internet, tự động đồng bộ khi có mạng trở lại. "
                    "Tích hợp các cổng thanh toán VNPay, MoMo, ZaloPay và quẹt thẻ mPOS. "
                    "Hệ thống khuyến mãi đa tầng hỗ trợ Flash Sale chịu tải 15,000 CCU."
                ),
                "tech_stack": ["SQLite", "RabbitMQ", "Kafka"],
                "compliance": ["PCI-DSS"]
            },
            {
                "section": "Non-Functional Requirements & Security",
                "content": (
                    "Yêu cầu phi chức năng NovaRetail: Hệ thống đạt chuẩn bảo mật thanh toán thẻ PCI-DSS Level 1. "
                    "Thời gian phản hồi API trung bình dưới 250ms cho 95% request (p95 latency). "
                    "Khả năng mở rộng tự động (Autoscaling) từ 5 lên 40 pods trong các dịp khuyến mãi 11.11, 12.12. "
                    "Độ sẵn sàng hệ thống cam kết SLA 99.95% với cơ chế Multi-AZ High Availability."
                ),
                "tech_stack": ["Kubernetes", "AWS RDS Multi-AZ", "Datadog"],
                "compliance": ["PCI-DSS Level 1", "OWASP Top 10"]
            }
        ]
    },
    {
        "title": "PayStream Digital Wallet & QR Payment Solution",
        "category": "PROPOSAL_TEMPLATE",
        "domain": "Fintech / Banking",
        "chunks": [
            {
                "section": "Executive Overview & Core Wallet",
                "content": (
                    "PayStream là giải pháp ví điện tử và cổng thanh toán QR chuẩn VietQR và EMVCo cho các tổ chức tài chính. "
                    "Hệ thống xử lý giao dịch nạp, rút, chuyển tiền P2P, và thanh toán hóa đơn với công suất thiết kế 5,000 TPS. "
                    "Kiến trúc tài chính lõi dựa trên nguyên lý Kế toán kép (Double-entry bookkeeping) đảm bảo tính toàn vẹn số dư tuyệt đối. "
                    "Công nghệ lõi: Java Spring Boot 3, Apache Kafka cho event-driven ledger, và cơ sở dữ liệu phân tán Spanner / PostgreSQL."
                ),
                "tech_stack": ["Java Spring Boot", "Apache Kafka", "PostgreSQL", "Redis Enterprise"],
                "compliance": ["ISO 27001", "SBV Circular 09"]
            },
            {
                "section": "Security & Compliance & Hardware Security Module",
                "content": (
                    "Bảo mật tài chính PayStream: Mã hóa đầu cuối E2EE cho toàn bộ luồng thanh toán. "
                    "Tích hợp thiết bị bảo mật phần cứng HSM (Hardware Security Module) của Thales để ký số và quản lý khóa PIN/OTP. "
                    "Hệ thống đạt chứng chỉ ISO/IEC 27001:2022 và tuân thủ Thông tư 09/2020/TT-NHNN của Ngân hàng Nhà nước về an toàn thông tin. "
                    "Công cụ chống gian lận (Fraud Detection Engine) phân tích rủi ro giao dịch thời gian thực bằng Machine Learning."
                ),
                "tech_stack": ["Thales HSM", "Vault", "Elasticsearch", "ML Risk Engine"],
                "compliance": ["ISO 27001", "PCI-DSS Level 1", "SBV Circular 09"]
            }
        ]
    },
    {
        "title": "MediCare Telehealth & Electronic Health Records (EHR) Platform",
        "category": "PROPOSAL_TEMPLATE",
        "domain": "Healthcare / Telemedicine",
        "chunks": [
            {
                "section": "Telemedicine Overview & Video Consultations",
                "content": (
                    "Nền tảng y tế số MediCare kết nối bệnh nhân và bác sĩ từ xa qua cuộc gọi Video HD chuẩn WebRTC bảo mật. "
                    "Hệ thống bao gồm ứng dụng di động cho bệnh nhân, cổng thông tin bác sĩ trên Web, và mô-đun Hồ sơ bệnh án điện tử (EHR). "
                    "Tích hợp lịch hẹn khám thông minh, kê đơn thuốc điện tử có chữ ký số và giao thuốc tận nhà qua đối tác vận chuyển. "
                    "Công nghệ: ReactJS, Flutter, WebRTC SFU Server (LiveKit), Golang backend."
                ),
                "tech_stack": ["Flutter", "ReactJS", "WebRTC", "LiveKit", "Golang", "PostgreSQL"],
                "compliance": ["HIPAA", "HL7/FHIR"]
            },
            {
                "section": "Medical Data Compliance & Interoperability",
                "content": (
                    "Tuân thủ dữ liệu y tế MediCare: Toàn bộ dữ liệu bệnh án tuân thủ nghiêm ngặt tiêu chuẩn bảo mật dữ liệu y tế HIPAA. "
                    "Chuẩn hóa dữ liệu sức khỏe theo tiêu chuẩn quốc tế HL7 FHIR R4 giúp liên thông dễ dàng với các hệ thống bệnh viện lớn (HIS/LIS). "
                    "Mã hóa dữ liệu tại chỗ (Data at rest) bằng AES-256 và mã hóa khi truyền (Data in transit) qua TLS 1.3."
                ),
                "tech_stack": ["HL7 FHIR", "AES-256", "TLS 1.3"],
                "compliance": ["HIPAA", "HL7/FHIR R4", "GDPR"]
            }
        ]
    },
    {
        "title": "LogiTrack Real-Time Fleet & Cold-Chain Logistics Platform",
        "category": "CASE_STUDY",
        "domain": "Logistics / Supply Chain",
        "chunks": [
            {
                "section": "Fleet Management & IoT Tracking",
                "content": (
                    "LogiTrack là hệ thống quản lý đội xe 500 phương tiện vận tải lạnh (Cold-Chain). "
                    "Hệ thống tiếp nhận dữ liệu định vị GPS và cảm biến nhiệt độ thùng xe từ các thiết bị IoT với tần suất 5 giây/lần. "
                    "Tự động cảnh báo tức thì khi nhiệt độ thùng xe vượt ngưỡng cho phép (2 - 8 độ C) hoặc xe đi lệch tuyến đường quy định. "
                    "Công nghệ: Python FastAPI, MQTT Broker (EMQX), TimescaleDB cho chuỗi thời gian, và Redis Geofencing."
                ),
                "tech_stack": ["Python FastAPI", "MQTT EMQX", "TimescaleDB", "Redis", "Leaflet Maps"],
                "compliance": ["GDP Good Distribution Practice"]
            }
        ]
    }
]

def seed_knowledge_base():
    print("====================================================")
    print("🚀 SEEDING REAL-WORLD KNOWLEDGE BASE INTO SUPABASE")
    print("====================================================\n")

    # 1. Khởi tạo Gemini Client cho Embedding (gemini-embedding-001, 768 dims)
    print("⏳ 1. Đang kết nối tới Gemini API (gemini-embedding-001, 768 dims)...")
    client = genai.Client(api_key=GEMINI_API_KEY)
    print("✅ Kết nối Gemini API thành công!\n")

    # 2. Kết nối tới Supabase PostgreSQL
    print("⏳ 2. Đang kết nối tới Supabase PostgreSQL...")
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = True
    cursor = conn.cursor()
    print("✅ Kết nối Database thành công!\n")

    # Dọn dẹp dữ liệu cũ trước khi nạp lại
    cursor.execute("TRUNCATE TABLE document_chunks CASCADE;")
    cursor.execute("TRUNCATE TABLE knowledge_docs CASCADE;")

    # Lấy Default Organization
    cursor.execute("SELECT id FROM organizations LIMIT 1;")
    org_row = cursor.fetchone()
    if not org_row:
        cursor.execute("INSERT INTO organizations (name) VALUES ('Presaleee Default Workspace') RETURNING id;")
        org_id = cursor.fetchone()[0]
    else:
        org_id = org_row[0]

    # 3. Lặp qua từng tài liệu và nạp vào DB
    print("⏳ 3. Đang tiến hành Chunking, Embedding với Gemini và Lưu vào Database...")
    total_docs = 0
    total_chunks = 0

    for item in KNOWLEDGE_ITEMS:
        # Thêm vào bảng knowledge_docs
        cursor.execute(
            """
            INSERT INTO knowledge_docs (organization_id, title, category, domain)
            VALUES (%s, %s, %s, %s)
            RETURNING id;
            """,
            (org_id, item["title"], item["category"], item["domain"])
        )
        doc_id = cursor.fetchone()[0]
        total_docs += 1

        # Lấy danh sách nội dung text để embed hàng loạt qua Gemini API
        chunk_texts = [c["content"] for c in item["chunks"]]
        embeddings = []
        for text in chunk_texts:
            res = client.models.embed_content(
                model="gemini-embedding-001",
                contents=text,
                config=types.EmbedContentConfig(output_dimensionality=768)
            )
            embeddings.append(res.embeddings[0].values)

        # Thêm từng chunk vào bảng document_chunks
        for idx, (chunk_data, embedding) in enumerate(zip(item["chunks"], embeddings)):
            metadata = {
                "title": item["title"],
                "domain": item["domain"],
                "section": chunk_data.get("section", ""),
                "tech_stack": chunk_data.get("tech_stack", []),
                "compliance": chunk_data.get("compliance", [])
            }
            vector_str = f"[{','.join(map(str, embedding))}]"

            cursor.execute(
                """
                INSERT INTO document_chunks (doc_id, chunk_index, chunk_content, metadata, embedding)
                VALUES (%s, %s, %s, %s, %s::vector);
                """,
                (doc_id, idx, chunk_data["content"], json.dumps(metadata), vector_str)
            )
            total_chunks += 1

        print(f"   -> Đã nạp tài liệu: '{item['title']}' ({len(item['chunks'])} chunks)")

    print(f"\n🎉 HOÀN THÀNH XUẤT SẮC! Đã nạp {total_docs} tài liệu và {total_chunks} chunks vào Supabase.")
    cursor.close()
    conn.close()

if __name__ == "__main__":
    seed_knowledge_base()
