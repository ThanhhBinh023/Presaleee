# 📘 Hướng Dẫn Setup & Chạy AI Core Cho Nhóm Phát Triển (Presaleee)

> **Dành cho:** Tất cả thành viên trong nhóm phát triển (Frontend, Backend, AI & Product/QA).  
> **Mục tiêu:** Cung cấp hướng dẫn từng bước để cài đặt môi trường trong 5 phút và cách lấy kết quả (output) từ AI cho từng tính năng/màn hình mà bạn đang phụ trách.

---

## 🚀 1. Tổng Quan Kiến Trúc AI Trong Dự Án

Hệ thống AI của **Presaleee** gồm 2 thành phần chính phối hợp nhịp nhàng:

1. **Google Gemini Cloud Embedding (`gemini-embedding-001`, 768 dims):**
   * Hoạt động 100% qua Cloud API.
   * **Không tải bất kỳ model nặng nào về máy**, không tốn dung lượng ổ đĩa.
   * Dùng để biến câu hỏi / RFP của khách hàng thành vector 768 chiều và tìm kiếm tài liệu tương đồng trên Supabase PostgreSQL (`pgvector` + Full-Text Search qua thuật toán RRF).

2. **Qwen1.5-4B LoRA Fine-Tuned Model:**
   * Nằm tại thư mục `ai/qwen_presale_adapter_v2`.
   * Đã được học chuyên sâu 6 tác vụ nghiệp vụ Presale IT doanh nghiệp (Trích xuất JSON, Dọn meeting, Soát lỗ hổng, Chấm điểm BANT, Viết Proposal, Thiết kế Kiến trúc).

```
   [Client Request / RFP]
             │
             ▼
┌───────────────────────────┐      Dense + Full-Text (RRF)      ┌──────────────────────────┐
│  Backend / AI Controller  │ ────────────────────────────────► │   Supabase PostgreSQL    │
│ (gemini-embedding-001)    │ ◄──────────────────────────────── │ (pgvector - 768 dims)    │
└────────────┬──────────────┘       Top-3 Relevant Chunks       └──────────────────────────┘
             │
             │ (Augmented Prompt + Case Study Context)
             ▼
┌───────────────────────────┐
│  Qwen1.5-4B LoRA Engine   │ ────────────────────────────────► Output chuyên nghiệp cho Proposal
└───────────────────────────┘
```

---

## 🛠️ 2. Hướng Dẫn Setup Môi Trường (5 Phút)

### Bước 2.1: Clone repo & Cài đặt môi trường Python

Mỗi thành viên chỉ cần tạo một môi trường Python ảo duy nhất tại thư mục gốc:

```bash
# 1. Đi đến thư mục gốc của dự án
cd pbl6

# 2. Tạo virtual environment Python (khuyên dùng Python 3.10 - 3.12)
python3 -m venv .venv

# 3. Kích hoạt môi trường ảo
# Trên macOS / Linux:
source .venv/bin/activate
# Trên Windows (cmd / powershell):
.venv\Scripts\activate

# 4. Cài đặt các thư viện AI cần thiết
pip install -r ai/requirements.txt
```

> 💡 **Lưu ý:** Thư viện `google-genai` đã nằm trong `requirements.txt`. Bạn **không cần** tải model embedding HuggingFace nào về máy!

---

### Bước 2.2: Cấu hình file biến môi trường (`backend/.env`)

Tạo hoặc mở file `backend/.env` và đảm bảo có 2 biến quan trọng sau:

```env
# 1. Supabase PostgreSQL Connection String (Đã có sẵn pgvector & 12 tables)


# 2. Google Gemini API Key (Dùng cho Cloud Embedding)
```

---

### Bước 2.3: Cài đặt Dependencies cho Backend & Frontend

Tại thư mục gốc dự án:

```bash
# Cài đặt toàn bộ packages cho cả frontend và backend
npm install
```

---

## 🎯 3. Cách Lấy Output AI Cho Từng Module Của Bạn

Tuỳ theo vai trò của bạn (Frontend, Backend, hay test nhanh AI), bạn có **3 cách** cực kỳ thuận tiện để lấy output:

---

### CÁCH 1: Test Ngay Lập Tức Bằng 1 Dòng Lệnh CLI (`chat_interactive.py`)
> **Phù hợp nhất cho:** Các bạn muốn xem ngay mẫu input/output thực tế để thiết kế UI hoặc viết mock data mà không cần dựng server.

Hệ thống đã có sẵn CLI tool `ai/scripts/chat_interactive.py` hỗ trợ trọn vẹn **6 Tasks Presale**:

```bash
# Kích hoạt venv trước
source .venv/bin/activate

# Lệnh mẫu:
.venv/bin/python ai/scripts/chat_interactive.py --mode <SỐ_TASK> --prompt "<NỘI_DUNG_INPUT>"
```

#### Bảng tra cứu 6 Tasks:

| Task Mode | Tên Tính Năng | Mô Tả Nghiệp Vụ | Input Mẫu | Output Trả Về |
| :---: | :--- | :--- | :--- | :--- |
| **`--mode 1`** | **Lead RFP Extraction** | Bóc tách yêu cầu khách hàng thành JSON | Đoạn email/RFP thô của khách | **JSON chuẩn 100%** (budget, timeline, modules, tech stack,...) |
| **`--mode 2`** | **Meeting Transcript Cleaner** | Dọn dẹp biên bản họp thô | Transcript cuộc họp ghi âm | Bóc tách: Discussion Points, Requirements, Action Items, Open Questions |
| **`--mode 3`** | **Proposal Gap Analysis** | Soát lỗ hổng & sinh câu hỏi | Yêu cầu sơ bộ của khách | Missing Parameters, 5 Câu hỏi Discovery, Đề xuất tư vấn |
| **`--mode 4`** | **BANT Lead Qualification** | Chấm điểm chất lượng Deal | Thông tin cuộc gặp khách hàng | **Điểm 0-100**, phân tích Budget/Authority/Need/Timeline & Rủi ro |
| **`--mode 5`** | **Proposal Builder** | Viết nội dung Executive Overview | Pain points & thông số dự án | Executive Summary, Scope of Work, Phasing, Commercial Model |
| **`--mode 6`** | **Architecture Deep-Dive** | Phân tích giải pháp kỹ thuật | Yêu cầu phi chức năng/tech | Kiến trúc hệ thống, ADRs, Ràng buộc, Tiêu chuẩn bảo mật (PCI, HIPAA) |

#### Ví dụ lệnh thực tế:

**1. Trích xuất Lead thành JSON (Dành cho thành viên làm Màn hình Intake Lead):**
```bash
.venv/bin/python ai/scripts/chat_interactive.py --mode 1 --prompt "Khách hàng VietLogistics cần xây hệ thống TMS quản lý 200 xe tải, ngân sách tầm 40k USD, làm trong 4 tháng. Cần mobile app cho tài xế và web dashboard cho điều phối viên."
```
👉 *Output trả về:*
```json
{
  "project_name": "VietLogistics Transport Management System (TMS)",
  "client_industry": "Logistics & Supply Chain",
  "business_goal": "Quản lý và điều phối hạm đội 200 xe tải thời gian thực",
  "timeline_weeks": 16,
  "budget_usd": 40000,
  "target_platforms": ["Mobile App (iOS/Android)", "Web Admin Dashboard"],
  "core_functional_modules": ["Fleet Tracking", "Order Dispatching", "Driver Manifest"],
  "integrations_required": ["GPS Telematics", "Payment Gateway"],
  "compliance_and_security": ["Role-based Access Control", "Data Encryption"],
  "priority_level": "High"
}
```

**2. Chấm điểm BANT Deal (Dành cho thành viên làm Dashboard Đánh Giá Cơ Hội):**
```bash
.venv/bin/python ai/scripts/chat_interactive.py --mode 4 --prompt "Khách hàng EcoMart: Chuỗi 85 siêu thị mini, ngân sách đã duyệt 60.000 USD từ CEO, cần hoàn thành gấp trước Tết (3 tháng). Yêu cầu POS bán hàng offline khi đứt mạng."
```

---

### CÁCH 2: Gọi Qua Backend REST API (Clean Architecture)
> **Phù hợp nhất cho:** Frontend Dev gọi API từ React/Vite hoặc Backend Dev mở rộng endpoint.

#### 1. Khởi động Backend:
```bash
npm run dev:backend
# Server sẽ lắng nghe tại: http://localhost:5000
```

#### 2. Các Endpoint RAG sẵn sàng sử dụng:

##### A. Tìm kiếm ngữ cảnh mẫu từ kho tri thức (Hybrid Search: Vector + FTS + RRF)
* **URL:** `POST http://localhost:5000/api/v1/rag/search`
* **Request Body:**
```json
{
  "query": "Hệ thống POS bán lẻ offline đồng bộ tồn kho",
  "domain": "Retail / E-Commerce",
  "topK": 3
}
```
* **Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid...",
      "chunkContent": "Thiết kế kiến trúc Offline-first POS sử dụng SQLite lưu cache cục bộ...",
      "metadata": {
        "title": "NovaRetail Omnichannel Platform Proposal & Case Study",
        "tech_stack": ["React Native", "Node.js", "SQLite"],
        "compliance": ["PCI-DSS Level 1"]
      },
      "combinedScore": 0.0325
    }
  ],
  "meta": { "total": 1 }
}
```

##### B. Sinh Proposal Overview tự động kết hợp RAG
* **URL:** `POST http://localhost:5000/api/v1/rag/generate-proposal`
* **Request Body:**
```json
{
  "rfpText": "Chuỗi siêu thị mini EcoMart cần ứng dụng POS bán lẻ hoạt động khi mất mạng và đồng bộ tồn kho tự động.",
  "domain": "Retail / E-Commerce"
}
```

##### C. Ingest thêm tài liệu mới vào Knowledge Vault
* **URL:** `POST http://localhost:5000/api/v1/rag/ingest`
* **Request Body:**
```json
{
  "title": "Case Study ERP Bệnh Viện Đa Khoa Tâm Trí",
  "category": "CASE_STUDY",
  "domain": "Healthcare",
  "content": "Toàn văn kiến trúc HIS/LIS tuân thủ tiêu chuẩn HL7/FHIR..."
}
```

---

### CÁCH 3: Chạy AI Service Microservice (FastAPI Swagger UI)
> **Phù hợp nhất cho:** Bạn nào muốn test trực quan trên giao diện Swagger UI.

```bash
# 1. Kích hoạt môi trường ảo
source .venv/bin/activate

# 2. Khởi chạy FastAPI
python ai/server.py
```
* Mở trình duyệt truy cập: **`http://localhost:8000/docs`**
* Bạn có thể test trực tiếp các endpoint:
  * `POST /api/v1/embed`: Sinh vector 768 chiều từ text bằng Gemini.
  * `POST /api/v1/generate`: Gọi model Qwen LoRA với các task mode từ 1 đến 6.

---

## 💡 4. Mã Mẫu (Code Snippets) Tích Hợp Vào Frontend React

Các bạn làm Frontend có thể dùng hàm tiện ích sau để gọi Backend:

```typescript
// src/services/aiService.ts
import axios from 'axios';

const API_BASE = 'http://localhost:5000/api/v1';

export interface ProposalSearchResult {
  id: string;
  chunkContent: string;
  metadata: {
    title: string;
    tech_stack?: string[];
    compliance?: string[];
  };
  combinedScore: number;
}

// 1. Tìm kiếm giải pháp tham khảo trong cơ sở dữ liệu
export async function searchKnowledgeVault(query: string, domain?: string): Promise<ProposalSearchResult[]> {
  const response = await axios.post(`${API_BASE}/rag/search`, {
    query,
    domain,
    topK: 3
  });
  return response.data.data;
}

// 2. Tự động sinh nội dung Proposal Overview từ RFP
export async function generateProposalOverview(rfpText: string, domain?: string) {
  const response = await axios.post(`${API_BASE}/rag/generate-proposal`, {
    rfpText,
    domain
  });
  return response.data.data; // { overview: string, sources: [...] }
}
```

---

## ❓ 5. Xử Lý Các Vấn Đề Thường Gặp (Troubleshooting)

1. **Lỗi `GEMINI_API_KEY is not defined`:**
   * Kiểm tra file `backend/.env` xem đã có dòng `GEMINI_API_KEY=...` chưa.
2. **Lỗi `Connection refused` hoặc `ECONNREFUSED`:**
   * Đảm bảo chuỗi kết nối `DATABASE_URL` trong `backend/.env` không bị ngắt mạng Internet. Supabase Tokyo yêu cầu máy tính của bạn có kết nối mạng.
3. **Mô hình AI chạy chậm trên máy:**
   * Script đã được tối ưu tự động dùng GPU Apple Silicon (**Metal/MPS**) trên Mac hoặc CUDA trên máy Windows/Linux. Nếu máy chỉ có CPU thông thường, việc sinh văn bản có thể mất từ 15-30 giây, điều này hoàn toàn bình thường khi chạy LLM local.

