# 📋 Báo Cáo Hiện Trạng & Danh Sách Tính Năng Chưa Hoàn Thiện (Backlog & Roadmap)

> **Dự án:** Presaleee — Hệ thống tự động hóa Presale IT kết hợp Hybrid RAG & Fine-tuned LLM (PBL6)  
> **Cập nhật:** Tháng 10/2026

Tài liệu này tổng hợp chi tiết **những phần đã hoàn thiện 100%**, **những tính năng còn dang dở/chưa làm**, và **kế hoạch hành động cụ thể** để các thành viên nhận task hoàn thiện đồ án.

---

## 🏆 1. Những Phần Đã Hoàn Thiện 100% (Completed Foundation)

| Phân hệ | Hạng mục đã hoàn tất | Chi tiết kỹ thuật |
| :--- | :--- | :--- |
| **Monorepo Architecture** | Setup Monorepo & npm workspaces | Phân chia `frontend/`, `backend/`, `ai/`, `docs/`, CI Pipeline GitHub Actions kiểm tra typecheck và build tự động. |
| **Coding Convention** | Chuẩn hóa quy ước phát triển | Root `CONVENTION.md`, `frontend/CONVENTION.md`, `backend/CONVENTION.md` (Clean Architecture), `ai/CONVENTION.md`. |
| **Database & Vector DB** | Supabase PostgreSQL + `pgvector` | Khởi tạo đầy đủ 12 bảng thực thể doanh nghiệp (`organizations`, `users`, `leads`, `proposals`, `proposal_sheets`, `rate_cards`, `audit_logs`, `knowledge_docs`, `document_chunks`). |
| **Hybrid Search Engine** | Dense Vector + Full-Text Search (RRF) | Hàm RPC `hybrid_search_chunks` kết hợp Cosine Similarity (`vector(768)`) và PostgreSQL FTS (`websearch_to_tsquery`) với thuật toán Reciprocal Rank Fusion ($k=60$). |
| **Cloud Embedding** | Google Gemini `gemini-embedding-001` | Chuyển đổi sang Cloud API, Matryoshka output 768 chiều, tiết kiệm 100% ổ cứng máy local, tốc độ embedding ~0.86s. |
| **Knowledge Base Seed** | Seed 4 dự án mẫu (Retail, FinTech, Healthcare, Logistics) | Đã nạp 8 chunks chi tiết vào Supabase, có đầy đủ metadata về tech stack, compliance, offline architecture. |
| **Fine-Tuned LLM Engine** | Qwen1.5-4B LoRA V2 Adapter | Huấn luyện chuyên sâu 6 tác vụ Presale IT (JSON extraction, meeting cleaning, gap analysis, BANT scoring, proposal builder, tech deep-dive). |
| **Backend Architecture** | Clean Architecture (Express + TS) | Cấu trúc 4 tầng chuẩn mực (*Domain*, *Application*, *Infrastructure*, *Presentation*), IoC Container, 100% tiếng Anh trong code/log. |

---

## ⏳ 2. Danh Sách Tính Năng Chưa Hoàn Thiện Cần Triển Khai (Pending Features)

Dưới đây là chi tiết các hạng mục còn thiếu, được phân loại theo từng phân hệ:

---

### PHÂN HỆ 1: FRONTEND (Giao diện người dùng React 19 + TailwindCSS)
> *Hiện trạng:* Thư mục `frontend/` mới chỉ có bộ khung Vite + Tailwind cơ bản, chưa có các màn hình nghiệp vụ kết nối với Backend API.

* [ ] **1.1. Màn hình Xác thực & Không gian làm việc (Auth & Workspace UI):**
  * Trang Đăng nhập / Đăng ký (kết nối Supabase Auth hoặc JWT).
  * Bộ chọn Không gian làm việc (Organization Switcher) cho phép làm việc theo từng công ty/team.
* [ ] **1.2. Màn hình Tiếp nhận Lead & Trích xuất RFP (AI Lead Intake UI):**
  * Form nhập liệu: Cho phép paste text email/yêu cầu hoặc upload file tài liệu.
  * Nút "Trích xuất thông số bằng AI": Hiển thị Loading State và render kết quả dạng Form/JSON trực quan (Ngân sách, Deadline, Nền tảng, Phân hệ chính).
  * Cho phép người dùng chỉnh sửa lại các thông số trước khi lưu thành Lead chính thức.
* [ ] **1.3. Màn hình Xử lý Biên bản họp (Meeting Transcript Processor UI):**
  * Giao diện paste nội dung ghi âm cuộc họp (transcript thô).
  * Tab hiển thị 4 phân vùng kết quả sau khi AI lọc sạch:
    1. *Key Discussion Points (Điểm thảo luận chính)*
    2. *Clarified Requirements (Yêu cầu đã làm rõ)*
    3. *Action Items & Owners (Việc cần làm & Người phụ trách)*
    4. *Open Questions (Câu hỏi tồn đọng cho lần gặp sau)*
* [ ] **1.4. Dashboard Chấm điểm Cơ hội (BANT Deal Qualification Dashboard):**
  * Hiển thị điểm số Deal (0 - 100).
  * Biểu đồ Radar hoặc Gauge phân tích 4 trụ cột BANT: Ngân sách (/25), Thẩm quyền (/25), Nhu cầu (/25), Tiến độ (/25).
  * Thẻ Badge khuyến nghị màu sắc: `PURSUE AGGRESSIVELY` (Xanh lá), `PURSUE WITH CONDITIONS` (Vàng), `DISQUALIFY` (Đỏ).
* [ ] **1.5. Proposal Studio (Giao diện 10 Sheet Proposal):**
  * Sidebar danh sách 10 Sheets:
    * *Sheet 1: Executive Summary & Overview*
    * *Sheet 2: Scope of Work (WBS Modules)*
    * *Sheet 3: Architecture & Tech Stack*
    * *Sheet 4: Implementation Timeline & Gantt*
    * *Sheet 5: Team Composition & Rate Cards*
    * *Sheet 6: Pricing & Payment Milestones*
    * *Sheet 7: Assumptions & Client Dependencies*
    * *Sheet 8: Risk Management & Mitigation*
    * *Sheet 9: SLA & Maintenance Support*
    * *Sheet 10: Appendices & Case Studies*
  * Rich-text Editor hoặc Table Editor cho phép chỉnh sửa trực tiếp từng sheet.
  * Nút "AI Regenerate Sheet": Cho phép sinh lại nội dung từng sheet riêng biệt.
  * Nút "Export to Excel (.xlsx)": Tải file bảng tính hoàn chỉnh về máy.
* [ ] **1.6. Quản trị Kho tri thức (Knowledge Vault Manager):**
  * Màn hình tra cứu tài liệu quá khứ.
  * Form nạp thêm Case Study mới (gọi API Ingest).

---

### PHÂN HỆ 2: BACKEND (Node.js + Express + Clean Architecture)
> *Hiện trạng:* Đã có tầng Domain, RAG Use Cases, Gemini Gateway và DB Connection. Cần bổ sung các module nghiệp vụ CRUD và tích hợp tệp tin.

* [ ] **2.1. Module Quản lý Tài khoản & Phân quyền (Auth & RBAC):**
  * API Đăng nhập / Đăng ký / Refresh Token.
  * Middleware kiểm tra vai trò người dùng (Roles: `ADMIN`, `PRE_SALE_LEAD`, `SALES`, `VIEWER`).
* [ ] **2.2. Module CRUD Đề xuất (Proposal Management Service):**
  * Use Cases: Tạo Proposal mới, Cập nhật từng Sheet, Lấy lịch sử phiên bản.
  * Bảng `proposal_sheets`: Lưu trữ dữ liệu dạng JSON cho từng sheet trong 10 sheets.
* [ ] **2.3. Module Bảng giá & Nhân sự (Rate Cards Management):**
  * API CRUD bảng giá theo vị trí (Project Manager, Solution Architect, Senior Dev,...).
  * API tính toán tự động tổng chi phí: $\sum (\text{Effort Man-month} \times \text{Rate Card}) = \text{Tổng giá trị gói thầu}$.
* [ ] **2.4. Module Xuất File Excel (10-Sheet Excel Exporter):**
  * Viết Use Case `ExportProposalToExcelUseCase` sử dụng thư viện `exceljs`.
  * Format template Excel chuyên nghiệp: Cài đặt font chữ đồng bộ, kẻ bảng, highlight tiêu đề, format tiền tệ USD/VND và công thức SUM tự động.
* [ ] **2.5. Xử lý File Tài Liệu (Document Parser & OCR):**
  * Viết parser đọc nội dung text từ file `.pdf`, `.docx`, `.xlsx` mà khách hàng upload lên trước khi đẩy vào AI RAG.
* [ ] **2.6. Xử lý Tác vụ Bất đồng bộ (Async Queue / Background Worker):**
  * Các tác vụ AI như đọc tài liệu dài 50 trang hoặc sinh toàn bộ 10 sheets mất nhiều thời gian (>30s) cần chuyển sang xử lý bằng hàng đợi (BullMQ + Redis hoặc Worker Thread) thay vì giữ kết nối HTTP đồng bộ.
* [ ] **2.7. Ghi nhận Nhật ký Hoạt động (Audit Logging):**
  * Tự động ghi log vào bảng `audit_logs` khi có người tạo/sửa proposal hoặc thay đổi rate card.

---

### PHÂN HỆ 3: AI CORE & RAG PIPELINE
> *Hiện trạng:* Đã hoàn tất Fine-tune Qwen 4B LoRA, kết nối Gemini Embedding 768 dims và hàm Hybrid Search RRF trên Supabase.

* [ ] **3.1. Cơ chế Ghép Toán học (Math & Pricing Logic Guardrail):**
  * LLM rất dễ tính nhẩm sai số học khi cộng trừ ngân sách.
  * Cần xây dựng cơ chế: AI đề xuất số lượng nhân sự và thời gian (ví dụ: 2 Dev làm 3 tháng = 6 Man-month), sau đó Backend code dùng thuật toán chính xác để nhân với Rate Card, tránh để AI tự bịa ra con số tổng tiền.
* [ ] **3.2. Tính năng Chat Tinh Chỉnh Từng Sheet ("Chat with Proposal"):**
  * Cung cấp endpoint cho phép người dùng ra lệnh bằng ngôn ngữ tự nhiên để sửa đổi đề xuất (ví dụ: *"Thêm 1 QA vào giai đoạn UAT"*, *"Đổi cơ chế xác thực từ OAuth2 sang SAML SSO"*).
* [ ] **3.3. Đánh giá Tự động Chất lượng RAG (RAG Triad Evaluation):**
  * Xây dựng script tự động đánh giá:
    1. *Context Relevance:* Ngữ cảnh trích xuất từ Supabase có đúng trọng tâm câu hỏi không?
    2. *Groundedness:* Câu trả lời của AI có lấy từ tài liệu tham khảo không, hay tự bịa (Hallucination)?
    3. *Answer Relevance:* Câu trả lời có giải quyết đúng bài toán của khách hàng không?

---

## 📅 3. Kế Hoạch Triển Khai Đề Xuất (Sprint Roadmap)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SPRINT 1 (Tuần này): HOÀN THIỆN CRUD BACKEND & KẾT NỐI EXCEL EXPORTER       │
│ • Hoàn thiện các API CRUD Proposals, Leads, Rate Cards                      │
│ • Viết Service xuất file Excel 10-Sheet bằng exceljs                        │
│ • Tích hợp middleware xác thực Auth & kiểm tra quyền người dùng             │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ SPRINT 2 (Tuần kế tiếp): XÂY DỰNG TOÀN BỘ GIAO DIỆN FRONTEND REACT          │
│ • Dựng giao diện Lead Intake & Meeting Cleaner (kết nối API Task 1 & 2)     │
│ • Dựng giao diện BANT Qualification Dashboard (biểu đồ radar)               │
│ • Xây dựng Proposal Studio 10 Sheet Matrix với tính năng Export Excel       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ SPRINT 3: TỐI ƯU HÓA E2E, TESTING & TỔNG DUYỆT BẢO VỆ PBL6                 │
│ • Test toàn bộ luồng từ Input Khách hàng -> Sinh Proposal -> Tải Excel      │
│ • Xử lý Upload file PDF/Word và Background Worker                           │
│ • Đo lường chỉ số đánh giá, viết báo cáo luận văn đồ án                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 👥 4. Phân Công Công Việc Gợi Ý Cho Nhóm

* **Thành viên phụ trách Frontend (FE):**
  * Tập trung phát triển giao diện theo thiết kế trong tài liệu `docs/Presaleee — Product Ideas.pdf`.
  * Tích hợp các hàm trong `docs/AI_SETUP_AND_USAGE_GUIDE.md` để lấy dữ liệu từ Backend.
* **Thành viên phụ trách Backend (BE):**
  * Mở rộng thêm các Use Cases trong `backend/src/application/use-cases/` (CRUD Proposal, Rate Cards, Export Excel).
  * Viết Router và Controllers tương ứng theo chuẩn Clean Architecture đã thiết lập.
* **Thành viên phụ trách AI / Data (AI):**
  * Nạp thêm nhiều Case Study đa dạng vào Supabase Knowledge Vault (ngành Bất động sản, Giáo dục, Sản xuất).
  * Kiểm thử các prompt edge-case và tối ưu hoá độ chính xác của bảng thông số trích xuất.
