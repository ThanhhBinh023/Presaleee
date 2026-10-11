# Presaleee AI Core - Fine-Tuned LLM Foundation

Hệ thống AI Core cho dự án **Presaleee** (PBL6) sử dụng mô hình nền tảng **Qwen1.5-4B-Chat** kết hợp **QLoRA (Quantized Low-Rank Adaptation)** được tinh chỉnh chuyên biệt cho 6 module nghiệp vụ presale trọng yếu.

---

## 📌 Tổng Quan Kiến Trúc & 6 Module Nghiệp Vụ

Model V2 được huấn luyện multi-task để giải quyết bài toán cốt lõi (chiếm ~60% tính năng AI trong Presaleee):

| Module | Nghiệp Vụ | Input | Output Kỳ Vọng | System Prompt Mode |
|---|---|---|---|---|
| **1. AI Intake** | Trích xuất thông số Lead sang cấu trúc chuẩn | Email / Inquiry / RFP thô của khách hàng | **Strict JSON** (project_name, modules, budget, timeline, compliance, tech stack) | Mode `1` (`task1_lead_json`) |
| **2. Meeting Management** | Dọn dẹp transcript cuộc họp | Raw audio transcript có từ đệm (um, ah, stutter) | Clean Notes, Clarified Requirements, Action Items & Ownership | Mode `2` (`task2_clean_transcript`) |
| **3. Proposal Gap Analysis** | Phân tích lỗ hổng thông tin & gợi ý câu hỏi | Yêu cầu dự án sơ bộ | Danh sách thông tin còn thiếu + Câu hỏi gợi mở sắc bén cho khách hàng | Mode `3` (`task3_gap_analysis`) |
| **4. Qualification Engine** | Chấm điểm Lead theo BANT | Hồ sơ & ghi chú trao đổi với khách hàng | Điểm số BANT (0–100), Phân tích rủi ro, Khuyến nghị chốt deal | Mode `4` (`task4_bant_qualification`) |
| **5. Proposal Builder** | Điền nội dung các sheet Proposal | Nhu cầu khách hàng + Thông số giải pháp | Bản tổng hợp "Why This Solution", Phân rã Scope, Timeline & Pricing Model | Mode `5` (`task5_proposal_builder`) |
| **6. Tech Architecture** | Phân tích kiến trúc kỹ thuật | Yêu cầu phi chức năng & tải hệ thống | Đề xuất Tech Stack, Quyết định kiến trúc (ADR), Rủi ro & Giả định | Mode `6` (`task6_tech_architecture`) |

---

## 🚀 Hướng Dẫn Cài Đặt Cho Thành Viên Nhóm

### 1. Yêu Cầu Môi Trường
- **Python**: 3.10 - 3.12 (khuyến nghị 3.11 hoặc 3.12)
- **Hỗ trợ phần cứng**:
  - macOS: Hỗ trợ tăng tốc **Apple Silicon GPU (Metal / MPS)** tự động.
  - Linux / Windows: Hỗ trợ **NVIDIA GPU (CUDA)** hoặc **CPU**.

### 2. Cài Đặt Thư Viện

```bash
# Tạo môi trường ảo
python3 -m venv .venv
source .venv/bin/activate   # Trên Windows: .venv\Scripts\activate

# Cài đặt các thư viện cần thiết
pip install torch transformers peft accelerate datasets
```

---

## 💻 Hướng Dẫn Sử Dụng

### Cách 1: Chạy CLI Test Tương Tác Trực Tiếp (Interactive Mode)

Script hỗ trợ streaming token theo thời gian thực và chuyển đổi linh hoạt giữa 6 chế độ:

```bash
python scripts/chat_interactive.py
```

Khi chạy, bạn có thể:
- Gõ `1`, `2`, `3`, `4`, `5`, hoặc `6` để chọn chế độ nghiệp vụ tương ứng.
- Paste đoạn email RFP hoặc transcript cuộc họp để model xử lý ngay lập tức.
- Gõ `exit` để thoát.

**Chạy thử nghiệm một câu lệnh nhanh (One-shot CLI):**
```bash
python scripts/chat_interactive.py --mode 1 --prompt "We need an Uber-like delivery app with React Native and Node.js for 50 drivers, launching in 8 weeks with a $35,000 budget."
```

### Cách 2: Chạy Bộ Test Đánh Giá Tự Động (Automated Evaluation Suite)

Chạy kiểm thử toàn diện trên tất cả các test case thực tế (bao gồm RFP Coastal Stay Hotel):

```bash
python scripts/evaluate_v2_model.py
```

Script sẽ:
- Chạy lần lượt 6 task.
- Tự động parse và validate tính hợp lệ của JSON ở Task 1 (Lead Extraction).
- In kết quả đối chuẩn trực quan trên terminal.

---

## 🔌 Tích Hợp Vào Backend / API Service (FastAPI / NestJS / Celery)

Dưới đây là đoạn code Python mẫu để tích hợp model vào backend service:

```python
import json
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel

BASE_MODEL = "Qwen/Qwen1.5-4B-Chat"
ADAPTER_PATH = "./qwen_presale_adapter_v2"

# 1. Khởi tạo Device & Model
device = "mps" if torch.backends.mps.is_available() else ("cuda" if torch.cuda.is_available() else "cpu")
dtype = torch.float16 if device in ["cuda", "mps"] else torch.float32

tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL, trust_remote_code=True)
base_model = AutoModelForCausalLM.from_pretrained(
    BASE_MODEL,
    torch_dtype=dtype,
    low_cpu_mem_usage=True,
    trust_remote_code=True
).to(device)

model = PeftModel.from_pretrained(base_model, ADAPTER_PATH)
model.eval()

# 2. Hàm xử lý trích xuất Lead sang JSON
def extract_lead_to_json(rfp_text: str) -> dict:
    system_prompt = (
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
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": rfp_text}
    ]
    prompt = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = tokenizer(prompt, return_tensors="pt").to(device)
    
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=600,
            temperature=0.1,
            do_sample=False
        )
    
    response = tokenizer.decode(outputs[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True).strip()
    return json.loads(response)
```

---

## 📂 Cấu Trúc Thư Mục Dự Án

```
pbl6/
├── qwen_presale_adapter_v2/             # Trọng số LoRA Adapter V2 (sau khi huấn luyện)
│   ├── adapter_config.json
│   ├── adapter_model.safetensors
│   └── README.md
├── scripts/
│   ├── prepare_presaleee_v2_dataset.py  # Sinh tập dataset đa nhiệm V2 (1,920 train, 480 val)
│   ├── build_v2_notebook.py             # Đóng gói Jupyter Notebook huấn luyện Kaggle
│   ├── evaluate_v2_model.py             # Script benchmark & kiểm thử tự động 6 task
│   └── chat_interactive.py              # CLI test tương tác streaming
├── data/
│   ├── presaleee_v2_train.jsonl         # Dữ liệu huấn luyện chuẩn format ChatML
│   └── presaleee_v2_val.jsonl           # Dữ liệu validation
├── kaggle_kernel/                       # File cấu hình & notebook đẩy lên Kaggle GPU
│   ├── kernel-metadata.json
│   └── presaleee_v2_qwen4b_training.ipynb
└── README.md
```

