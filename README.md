# Presaleee (PBL6) - AI-Powered Presale & Proposal Platform

Monorepo quản lý toàn bộ hệ thống nền tảng Presaleee, bao gồm 3 phân hệ chính:
1. **`frontend/`**: Ứng dụng giao diện người dùng (React 19 + TypeScript + Vite + TailwindCSS).
2. **`backend/`**: Dịch vụ backend API & quản lý dữ liệu (Node.js / Express / TypeScript + PostgreSQL `pgvector`, Clean Architecture).
3. **`ai/`**: Bộ máy trí tuệ nhân tạo (Fine-tuned LLM Qwen1.5-4B + BAAI/bge-m3 Embedding + Python scripts + Gemini Cloud Fallback).

---

## 🏗️ Cấu Trúc Thư Mục Monorepo

```
Presaleee/
├── frontend/             # Frontend Client (React 19, TypeScript, Vite)
│   ├── src/              # Components, Services, Pages, Assets
│   ├── package.json
│   └── vite.config.ts
│
├── backend/              # Backend Core API & Business Logic (Clean Architecture)
│   ├── src/
│   │   ├── domain/       # Entities, Repositories Interfaces, App Errors
│   │   ├── application/  # Use Cases (Meetings, Lead Intake, RAG, Proposal) & DTOs
│   │   ├── infrastructure/ # DB Connection, Postgres Repositories, AI Gateways
│   │   └── presentation/ # Express Controllers, Middlewares, Routes
│   ├── package.json
│   └── tsconfig.json
│
├── ai/                   # AI Service & Model Foundation
│   ├── scripts/          # Các script inference, đánh giá, sinh dữ liệu
│   ├── data_v2/          # Dataset huấn luyện multi-task
│   ├── qwen_presale_adapter_v2/ # LoRA Adapter weights & configs
│   ├── requirements.txt  # Python dependencies
│   └── README.md         # Hướng dẫn chi tiết về AI Core
│
├── docs/                 # Tài liệu thiết kế hệ thống, Product Ideas & AI Guide
└── .gitignore            # Root ignore cho cả Node.js, Python & file nhị phân
```

---

## ⚡ Khởi Chạy Nhanh Dự Án (All-in-One)

Từ thư mục gốc `Presaleee/`, bạn có thể chạy đồng thời cả Frontend và Backend chỉ bằng một lệnh duy nhất:

```bash
cd Presaleee
npm install
npm run dev
```

- **Frontend Client**: [http://localhost:5173](http://localhost:5173) (chọn Tab **Discovery Meetings** trong AI Workspace)
- **Backend API**: [http://localhost:5000](http://localhost:5000) (Healthcheck: `http://localhost:5000/health`)

---

## 🚀 Hướng Dẫn Chạy Từng Phân Hệ Riêng Biệt

### 1. Frontend (`frontend/`)
```bash
cd Presaleee/frontend
npm install
npm run dev
# Truy cập giao diện tại http://localhost:5173
```

### 2. Backend (`backend/`)
```bash
cd Presaleee/backend
npm install
npm run dev
# Server lắng nghe tại http://localhost:5000
```

*(Tùy chọn)* Kiểm tra luồng Discovery Meetings E2E trên backend:
```bash
cd Presaleee/backend
npx tsx src/scripts/testDiscoveryMeetingE2E.ts
```

### 3. AI Service (`ai/`) *(Tùy chọn khi muốn chạy Qwen 4B LoRA cục bộ)*
```bash
cd Presaleee/ai
python -m venv .venv
# Kích hoạt virtualenv (Windows: .venv\Scripts\activate, Linux/macOS: source .venv/bin/activate)
.venv\Scripts\activate
pip install -r requirements.txt

# Khởi chạy AI FastAPI Engine:
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```
> **Lưu ý**: Backend đã được tích hợp cơ chế dự phòng thông minh (Gemini Cloud LLM & Resilient Heuristic Engine), do đó ngay cả khi chưa bật AI Service Python cục bộ, hệ thống vẫn hoạt động trơn tru 100%!

---

## 🤝 Module Discovery Meetings (PDF Page 2 & Module 2-3)

Hệ thống hỗ trợ quy trình họp Discovery nhiều vòng (Iterative Discovery Sessions):

1. **Ingest Transcript từ bên thứ 3**: Hỗ trợ ghi nhận transcript cuộc họp từ Zoom, Google Meet, Microsoft Teams, Fireflies.ai, Otter.ai hoặc nhập tay.
2. **Meeting Lifecycle Quản lý**: Chuyển trạng thái linh hoạt:
   - `OPEN`: Đang diễn ra hoặc vừa tạo mới.
   - `LOCKED`: Đã kết thúc và chốt biên bản để phân tích.
   - `INSPECTED`: Đã qua AI Inspect, trích xuất dữ liệu có cấu trúc.
   - `REOPENED`: Mở lại để bổ sung ghi chú khi cần.
3. **AI Transcript Inspect**:
   - **Executive Clean Notes**: Lọc sạch từ đệm (`um`, `uh`, `like`), chuẩn hóa thành báo cáo markdown tóm tắt cuộc họp.
   - **Key Discussion Points**: Các luận điểm chính đã thảo luận.
   - **Clarified Client Requirements**: Các yêu cầu nghiệp vụ / kỹ thuật / hạ tầng được khách hàng xác nhận.
   - **Action Items & Ownership**: Danh mục việc cần làm, người phụ trách và deadline (có thể click hoàn thành).
   - **Gap Analysis**: Nhận diện các thông tin còn thiếu đối chiếu với 10 sheets của hồ sơ kỹ thuật.
4. **Suggested Follow-up Questions & Carry-forward Mechanism**:
   - AI tự động sinh 4-6 câu hỏi gợi ý đào sâu sắc bén cho các buổi họp sau.
   - Khi tạo cuộc họp tiếp theo (Meeting #2, #3,...), hệ thống tự động kế thừa danh sách câu hỏi này làm **Chủ đề thảo luận chính (Discussion Topics)**, đảm bảo discovery tiến triển liên tục theo chiều sâu.

---

## 👥 Tài Liệu Cho Thành Viên Nhóm
- Hướng dẫn tích hợp AI cho các module: [docs/AI_INTEGRATION_GUIDE_FOR_TEAM.md](docs/AI_INTEGRATION_GUIDE_FOR_TEAM.md)
- Product Ideas & Feature Specs: [docs/Presaleee — Product Ideas.pdf](docs/Presaleee%20%E2%80%94%20Product%20Ideas.pdf)
