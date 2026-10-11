# Hướng Dẫn Tích Hợp & Khai Thác AI Core Dành Cho Nhóm Phát Triển (PBL6 - Presaleee)

Tài liệu này cung cấp hướng dẫn toàn diện cho tất cả các thành viên trong nhóm phát triển dự án **Presaleee**, giải thích rõ: **AI làm được gì, nhận input gì, trả output gì, và cách gọi AI trong từng module**.

---

## 📌 1. Tổng Quan Kiến Trúc AI Trong Dự Án Presaleee

Hệ thống AI xử lý khoảng **60% logic nghiệp vụ cốt lõi** của ứng dụng, hoạt động dựa trên mô hình nền tảng **Qwen1.5-4B-Chat đã qua tinh chỉnh (Fine-Tuned LoRA V2)** kết hợp với hệ thống **RAG (Retrieval-Augmented Generation)**:

```
[Khách Hàng Gửi Lead / Transcript]
               │
               ▼
┌────────────────────────────────────────────────────────┐
│               AI CORE (Qwen-4B LoRA V2)                │
│  • Task 1: Trích xuất Lead thành Strict JSON           │
│  • Task 2: Dọn dẹp Meeting Transcript & Action Items   │
│  • Task 3: Soát lỗ hổng Proposal & Sinh câu hỏi        │
│  • Task 4: Chấm điểm BANT Qualification (0-100)        │
│  • Task 5: Sinh nội dung các Sheet Proposal            │
│  • Task 6: Phân tích kiến trúc kỹ thuật & Non-FR       │
└────────────────────────────────────────────────────────┘
               │                               ▲
               │ (Metadata JSON)               │ (Context & Templates)
               ▼                               │
┌──────────────────────────────┐ ┌──────────────────────────────┐
│       BACKEND / DATABASE     │ │        RAG ENGINE            │
│  • Quản lý Lead, Meeting     │ │  • Vector DB (Chroma/Qdrant) │
│  • Render Excel 10 Sheet     │ │  • Template 10 sheet Proposal│
│  • Quản lý User / Auth       │ │  • Bảng giá RateCard công ty │
└──────────────────────────────┘ └──────────────────────────────┘
```

### Phân định trách nhiệm rõ ràng:
* **AI (LLM đã Fine-Tune):** Là "Bộ não xử lý", chịu trách nhiệm đọc hiểu, suy luận, bóc tách cấu trúc chuẩn, dọn dẹp văn bản và hành văn theo phong cách tư vấn giải pháp doanh nghiệp.
* **RAG (Kho tri thức):** Cung cấp các thông tin thực tế mà AI không được tự bịa ra: Template mẫu 10 sheet Proposal, Bảng giá RateCard chuẩn của công ty, danh mục nhân sự và giải pháp công nghệ có sẵn.
* **Backend:** Điều phối luồng dữ liệu, lưu trữ cơ sở dữ liệu và gọi thư viện Excel (`openpyxl`) để render file Excel cuối cùng từ dữ liệu do AI + RAG cung cấp.

---

## 🚀 2. Chi Tiết Khả Năng Của AI Trong Từng Module

---

### MODULE 1: AI Lead Intake & RFP Extraction (Trích Xuất Thông Số Khách Hàng)

#### 🎯 AI Làm Được Gì?
Đọc toàn bộ văn bản yêu cầu của khách hàng (email, tin nhắn, nội dung file PDF/Word/Excel thô từ khách) và trích xuất thành **Strict JSON 100% hợp lệ**, tự động bóc tách các thông số then chốt mà không cần regex phức tạp.

#### 📥 Input
Đoạn text thô từ khách (ví dụ bản RFP của Marcus Vance - NovaRetail hoặc Coastal Stay Hotel).

#### 📤 Output Schema (JSON Chuẩn)
```json
{
  "project_name": "Tên dự án được chuẩn hóa",
  "client_industry": "Ngành nghề của khách hàng",
  "business_goal": "Mục tiêu kinh doanh cốt lõi",
  "timeline_weeks": 24,
  "budget_usd": 230000,
  "target_platforms": ["Web", "iOS", "Android"],
  "core_functional_modules": [
    "Module 1", "Module 2", "Module 3"
  ],
  "integrations_required": [
    "Shopify", "SAP", "Bưu điện"
  ],
  "compliance_and_security": [
    "PCI-DSS", "Privacy Act"
  ],
  "priority_level": "High"
}
```

#### 💻 Hướng Dẫn Code Cho Thành Viên Làm Backend:
```python
import json
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel

SYSTEM_PROMPT_INTAKE = (
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
)

def extract_lead_info(raw_text: str, model, tokenizer, device) -> dict:
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT_INTAKE},
        {"role": "user", "content": raw_text}
    ]
    prompt = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = tokenizer(prompt, return_tensors="pt").to(device)
    
    outputs = model.generate(**inputs, max_new_tokens=500, temperature=0.1, do_sample=False)
    resp = tokenizer.decode(outputs[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True).strip()
    
    # Làm sạch markdown fence nếu có
    if resp.startswith("```json"): resp = resp[7:]
    if resp.startswith("```"): resp = resp[3:]
    if resp.endswith("```"): resp = resp[:-3]
    return json.loads(resp.strip())
```

---

### MODULE 2: Discovery Meeting Assistant (Dọn Dẹp Transcript Cuộc Họp & Phân Việc)

#### 🎯 AI Làm Được Gì?
Khi cuộc họp khám phá yêu cầu kết thúc (từ file ghi âm chuyển thành text có chứa nhiều từ đệm *um, uh, like*, lặp từ, ngắt quãng), AI sẽ:
1. Loại bỏ toàn bộ từ đệm và nhiễu hội thoại.
2. Rút ra các điểm cốt lõi đã thảo luận.
3. Chuẩn hóa các yêu cầu khách hàng vừa làm rõ.
4. **Tự động bóc tách Action Items kèm người chịu trách nhiệm (Ownership)**.
5. Liệt kê các câu hỏi còn bỏ ngỏ cho buổi họp tiếp theo.

#### 📥 Input
Đoạn transcript cuộc họp có kèm timestamp hoặc tên người nói.

#### 📤 Output (Markdown Phân Cấp)
```markdown
### Key Discussion Points
- Nội dung thảo luận trọng tâm 1...
- Nội dung thảo luận trọng tâm 2...

### Clarified Client Requirements
- Yêu cầu chức năng vừa được khách xác nhận...

### Action Items & Ownership
- [Tên người phụ trách]: Việc cần làm và hạn chót...
- [Tên người phụ trách]: Việc cần làm và hạn chót...

### Open Questions for Next Sync
- Những câu hỏi kỹ thuật cần xác nhận lại ở buổi họp tới...
```

---

### MODULE 3: Proposal Gap Analyzer (Soát Lỗ Hổng & Gợi Ý Câu Hỏi Cho Khách)

#### 🎯 AI Làm Được Gì?
Khi Presale chuẩn bị làm Proposal nhưng chưa biết thông tin đã đủ để ước lượng (estimate) giá và thời gian chưa:
* AI sẽ đối soát các ghi chú hiện có với **chuẩn 10 sheet Proposal**.
* Chỉ ra chính xác những thông số nào **đang bị thiếu** (ví dụ: chưa rõ chuẩn mã vạch, chưa rõ phiên bản SAP, chưa rõ quy trình trả hàng RMA, chưa rõ lưu lượng truy cập đỉnh).
* **Sinh ra 4–5 câu hỏi phỏng vấn sắc bén** để Presale gửi email hoặc hỏi trực tiếp khách hàng trong buổi Discovery tiếp theo.

#### 📥 Input
Bản tóm tắt sơ bộ về dự án từ các buổi họp trước.

#### 📤 Output
* **Missing Proposal Parameters & Gaps:** Danh sách thông tin còn thiếu.
* **Proactive Discovery Questions:** Các câu hỏi sắc bén chuẩn bị cho khách.
* **Presale Recommendations:** Gợi ý kiến trúc sơ bộ nên đề xuất cho khách.

---

### MODULE 4: Lead Qualification Engine (Chấm Điểm BANT 0–100 & Đánh Giá Rủi Ro)

#### 🎯 AI Làm Được Gì?
Giúp ban giám đốc và đội ngũ kinh doanh quyết định có nên dồn toàn lực theo đuổi thương vụ này không:
1. Chấm điểm cơ hội theo thang điểm **0–100**.
2. Phân tích chi tiết 4 tiêu chí **BANT**:
   * **B (Budget - Ngân sách):** Đủ chi trả không? Đã duyệt hay chỉ dự tính?
   * **A (Authority - Quyền quyết định):** Đang nói chuyện với ai? (C-level, VP hay chỉ nhân viên)?
   * **N (Need - Nhu cầu cấp thiết):** Mức độ đau đớn của bài toán (tổn thất bao nhiêu tiền nếu không làm)?
   * **T (Timeline - Tiến độ):** Thời gian có khả thi không?
3. Cảnh báo các điểm rủi ro lớn của thương vụ.
4. Đưa ra khuyến nghị chốt deal: `PURSUE AGGRESSIVELY` (Theo đuổi quyết liệt), `PURSUE WITH CONDITIONS`, hoặc `DISQUALIFY` (Từ chối).

---

### MODULE 5 & 6: Proposal Content Builder & 10-Sheet Excel Synthesis

#### 🎯 AI Làm Được Gì?
Sau khi đã có đầy đủ thông tin Lead và ngữ cảnh từ RAG, AI sẽ sinh nội dung tương ứng để điền vào **10 Sheet của file Excel Proposal hoàn chỉnh**:

| Tên Sheet | AI Sinh Ra Phần Nào? | Dữ Liệu RAG Bổ Sung Thêm |
|---|---|---|
| **1. Overview** | Tóm tắt Executive Summary, phân tích bài toán & "Why This Solution" | Thông tin metadata dự án, điều khoản bảo hành của công ty |
| **2. Project Roles** | Phân bổ vai trò (Solution Architect, PM, Tech Lead, Senior Devs, QA, UI/UX, DevOps) | Danh sách nhân sự thực tế & CV mẫu của công ty |
| **3. Project Management Approach** | Quy trình Scrum 2 tuần, các buổi lễ Sprint, tiêu chuẩn Code Review | Quy trình chuẩn của công ty (Jira, Confluence, Slack) |
| **4. RAID** | Phân tích 8–12 rủi ro kỹ thuật đặc thù của dự án, các giả định & sự phụ thuộc | Kho rủi ro mẫu từ các dự án quá khứ trong Vector DB |
| **5. Acceptance Docs** | Tiêu chuẩn Definition of Done (DoD) & phân cấp SLA xử lý lỗi (P1, P2, P3, P4) | Quy chuẩn bảo hành & nghiệm thu pháp lý của công ty |
| **6. FR** | Bóc tách 15–25 tính năng chi tiết theo chuẩn MoSCoW (Must/Should) kèm Sprint | Kho tính năng mẫu (Reusable Modules) từ RAG |
| **7. Tech-stack** | Đề xuất giải pháp kiến trúc (Next.js, Flutter, NestJS, Go, Aurora, Kafka, AWS) | Tiêu chuẩn công nghệ và giấy phép của công ty |
| **8. Non-FR** | Định lượng các chỉ số phi chức năng: Latency P95, Throughput TPS, Uptime 99.95%, RPO/RTO | Bộ tiêu chuẩn bảo mật (OWASP, PCI-DSS, SOC2) |
| **9. RateCard** | Map cấp bậc nhân sự vào dự án | **Bảng giá cố định của công ty** (kéo từ RAG, không để AI tự bịa) |
| **10. Macro Plan & Quotation** | Lộ trình các pha (Phases), phân bổ Man-days theo WBS | Công thức tính toán tổng chi phí & lịch thanh toán theo mốc |

---

## 🛠 3. Hướng Dẫn Tích Hợp Kỹ Thuật (Dành Cho Thành Viên Làm Backend)

### Bước 1: Khởi Chạy Model AI Core Qua FastAPI Service

Thành viên phụ trách backend có thể bọc (wrap) model thành một REST API service độc lập (chạy trên local hoặc server GPU nội bộ) bằng file `server.py`:

```python
# server.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel
import json

app = FastAPI(title="Presaleee AI Core API")

BASE_MODEL = "Qwen/Qwen1.5-4B-Chat"
ADAPTER_PATH = "./qwen_presale_adapter_v2"

device = "mps" if torch.backends.mps.is_available() else ("cuda" if torch.cuda.is_available() else "cpu")
dtype = torch.float16 if device in ["mps", "cuda"] else torch.float32

print(f"Loading model on {device}...")
tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL, trust_remote_code=True)
base_model = AutoModelForCausalLM.from_pretrained(BASE_MODEL, dtype=dtype, low_cpu_mem_usage=True, trust_remote_code=True).to(device)
model = PeftModel.from_pretrained(base_model, ADAPTER_PATH)
model.eval()
print("Model ready!")

class PromptRequest(BaseModel):
    system_prompt: str
    user_input: str
    max_tokens: int = 500

@app.post("/api/ai/generate")
def generate_text(req: PromptRequest):
    messages = [
        {"role": "system", "content": req.system_prompt},
        {"role": "user", "content": req.user_input}
    ]
    prompt = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = tokenizer(prompt, return_tensors="pt").to(device)
    
    with torch.no_grad():
        outputs = model.generate(
            **inputs, 
            max_new_tokens=req.max_tokens, 
            temperature=0.1, 
            do_sample=False,
            pad_token_id=tokenizer.pad_token_id
        )
    resp = tokenizer.decode(outputs[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True).strip()
    return {"status": "success", "output": resp}
```

### Bước 2: Danh Sách API Endpoints Backend Cần Cung Cấp Cho Frontend

| Endpoint | Chức Năng | Output Trả Về Cho Frontend |
|---|---|---|
| `POST /api/leads/intake` | Nhận email/RFP của khách $\rightarrow$ Trả về JSON thông số | JSON object đã parse chuẩn |
| `POST /api/meetings/clean` | Nhận audio transcript thô $\rightarrow$ Trả về biên bản họp | Markdown: Discussion, Action Items, Open Questions |
| `POST /api/proposals/gaps` | Nhận ghi chú dự án $\rightarrow$ Trả về lỗ hổng & câu hỏi | Markdown: Missing Gaps, Questions |
| `POST /api/leads/qualify` | Chấm điểm BANT & đánh giá rủi ro thương vụ | Điểm số (0–100), Breakdown, Khuyến nghị |
| `POST /api/proposals/generate-sheets` | Kết hợp LLM + RAG để sinh nội dung 10 sheet | Dữ liệu cấu trúc để fill vào Excel |
| `GET /api/proposals/:id/export-excel` | Nhận dữ liệu đã sinh $\rightarrow$ Xuất file `.xlsx` 10 sheet | Tải trực tiếp file Excel hoàn chỉnh |

---

## 👥 4. Phân Công Công Việc Giữa Các Thành Viên Trong Nhóm

1. **Thành viên phụ trách AI & RAG:**
   * Triển khai Vector Database (ChromaDB / Qdrant).
   * Chuẩn bị dữ liệu tài liệu mẫu (Proposal templates, RateCard, Case studies) để embed vào Vector DB.
   * Viết pipeline kết nối: `Query -> Retrieve Context từ RAG -> Inject vào Prompt của AI Base V2 -> Generate Output`.
2. **Thành viên phụ trách Backend (FastAPI / NestJS):**
   * Quản lý database quan hệ (PostgreSQL) lưu thông tin Lead, Meeting, Proposal.
   * Dựng các REST API endpoints kết nối với AI Service.
   * Viết module xuất Excel 10 sheet bằng `openpyxl` (tham khảo code mẫu tại [`scripts/generate_all_10_leads_and_proposals.py`](file:///Users/khoi.nguyenhuu/enouvo/learning/pbl6/scripts/generate_all_10_leads_and_proposals.py)).
3. **Thành viên phụ trách Frontend (React / Next.js / Vue):**
   * Xây dựng giao diện tải lên RFP / nhập văn bản Lead.
   * Màn hình trực quan hóa kết quả trích xuất JSON (cho phép người dùng bấm chỉnh sửa nếu muốn).
   * Giao diện Meeting Workspace: hiển thị audio transcript, nút "Dọn dẹp bằng AI", và danh sách Action Items có checkbox tích hoàn thành.
   * Màn hình xem trước Proposal (Preview 10 sheets) trước khi bấm nút "Xuất file Excel".

---

## 📂 5. Tài Nguyên Cần Tham Khảo Trong Source Code

* **Trọng số LoRA Adapter V2:** Thư mục [`./qwen_presale_adapter_v2`](file:///Users/khoi.nguyenhuu/enouvo/learning/pbl6/qwen_presale_adapter_v2).
* **Script kiểm thử tự động 6 module:** [`scripts/run_presaleee_verification_suite.py`](file:///Users/khoi.nguyenhuu/enouvo/learning/pbl6/scripts/run_presaleee_verification_suite.py).
* **Code mẫu render 10 sheet Excel hoàn chỉnh:** [`scripts/generate_all_10_leads_and_proposals.py`](file:///Users/khoi.nguyenhuu/enouvo/learning/pbl6/scripts/generate_all_10_leads_and_proposals.py).
* **File Lead mẫu:** [`output/sample_leads_proposals/Lead_01_Retail_Omnichannel.xlsx`](file:///Users/khoi.nguyenhuu/enouvo/learning/pbl6/output/sample_leads_proposals/Lead_01_Retail_Omnichannel.xlsx).
* **File Proposal mẫu 10 sheet:** [`output/sample_leads_proposals/Proposal_01_Retail_Omnichannel.xlsx`](file:///Users/khoi.nguyenhuu/enouvo/learning/pbl6/output/sample_leads_proposals/Proposal_01_Retail_Omnichannel.xlsx).

