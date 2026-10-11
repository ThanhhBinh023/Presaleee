# AI Service Convention (Python / Qwen1.5-4B LoRA / bge-m3)

Thư mục này quản lý toàn bộ mô hình ngôn ngữ lớn (LLM), embedding engine, dataset huấn luyện và các script xử lý AI cho nền tảng Presaleee.

---

## 1. Cấu Trúc Thư Mục

```
ai/
├── data_v2/                 # Multi-task training & validation datasets (JSONL format)
├── qwen_presale_adapter_v2/ # LoRA Adapter weights & tokenizer configs
├── kaggle_kernel/           # Notebooks huấn luyện trên Kaggle GPU (T4 / P100)
├── scripts/                 # Bộ script thực thi:
│   ├── chat_interactive.py             # CLI tương tác trực tiếp 6 tasks
│   ├── run_presaleee_verification_suite.py # Bộ test tự động kiểm thử model
│   └── build_full_10_dataset.py        # Generator sinh 10 bộ Lead & Proposal mẫu
├── requirements.txt         # Thư viện Python chính xác
├── README.md                # Tài liệu chi tiết về 6 Module nghiệp vụ AI
└── CONVENTION.md            # Tài liệu quy ước kỹ thuật AI
```

---

## 2. Quy Tắc Triển Khai & Phục Vụ (Serving API)

1. **Stateless Service**:
   - AI service chỉ đóng vai trò là Worker / Inference Engine tính toán.
   - Không kết nối trực tiếp đến PostgreSQL nghiệp vụ của Backend.
2. **2 API Cốt Lõi Dự Kiến**:
   - `POST /embed`:
     - Input: `{ "texts": ["câu 1", "câu 2"] }`
     - Output: `{ "embeddings": [[... 1024 floats ...]], "dimension": 1024 }`
     - Model: `BAAI/bge-m3` (chạy qua PyTorch hoặc ONNX fastembed).
   - `POST /generate`:
     - Input: `{ "task_mode": 1, "prompt": "...", "temperature": 0.2 }`
     - Output: `{ "output": "...", "usage": { ... } }`
     - Model: `Qwen1.5-4B-Chat` + `qwen_presale_adapter_v2`.
3. **Format Prompt & JSON Schema**:
   - Khi chạy Task 1 (Lead Extraction), luôn đặt `temperature <= 0.2` để model sinh **Strict JSON hợp lệ**.
   - Giữ nguyên system prompts định nghĩa trong `docs/AI_INTEGRATION_GUIDE_FOR_TEAM.md`.
4. **Không đưa model weights lớn lên Git**:
   - Các file có đuôi `.safetensors`, `.bin`, `.pt`, `.pth` phải được giữ trong local hoặc tải về qua script từ Hugging Face / Kaggle / Cloud Storage.

---

## 3. Lệnh Thường Dùng
- `source .venv/bin/activate`: Kích hoạt môi trường ảo Python.
- `pip install -r requirements.txt`: Cài đặt thư viện.
- `python scripts/chat_interactive.py`: Chạy giao diện dòng lệnh test model trực tiếp.
- `python scripts/run_presaleee_verification_suite.py`: Chạy bộ kiểm thử 6 nghiệp vụ.
