# Backend Coding Convention (Node.js + Express + TypeScript)

Thư mục này đóng vai trò **Nhạc trưởng (Orchestrator)** của hệ thống Presaleee, quản lý Database (PostgreSQL + `pgvector`), Authentication, RAG Pipeline và điều phối AI request.

---

## 1. Cấu Trúc Thư Mục Khuyến Nghị

```
backend/src/
├── controllers/     # Điều khiển request/response cho từng route
├── services/        # Nghiệp vụ cốt lõi: RAGService, ProposalService, AuthService
├── routes/          # Khai báo Express router
├── models/          # Database entities / schemas / migrations
├── clients/         # HTTP Client gọi AI Service (FastAPI /embed, /generate)
├── middlewares/     # Auth middleware, validation, error handler
├── types/           # Định nghĩa TypeScript interfaces (DTO, models)
├── utils/           # Utility functions (logger, chunking text,...)
└── index.ts         # Khởi tạo Express server
```

---

## 2. Quy Tắc Code & RAG Pipeline

1. **Chuẩn RESTful API Response**:
   Mọi endpoint trả về định dạng chuẩn:
   ```json
   {
     "success": true,
     "data": { ... },
     "message": "Optional descriptive message"
   }
   ```
   Khi có lỗi:
   ```json
   {
     "success": false,
     "error": "Chi tiết lỗi",
     "statusCode": 400
   }
   ```

2. **Quy tắc điều phối RAG**:
   - **Chunking**: Chia nhỏ tài liệu RFP / proposal cũ (khoảng 300–800 từ) trước khi gửi embedding.
   - **Gửi Embed**: Gọi sang AI Service `POST http://localhost:8000/embed` để nhận vector 1024-dim (`bge-m3`).
   - **Query pgvector**: Thực hiện truy vấn cosine similarity bằng toán tử `<=>`:
     ```sql
     SELECT id, title, content_chunk, 1 - (embedding <=> $1) AS similarity
     FROM document_embeddings
     WHERE project_id = $2
     ORDER BY embedding <=> $1
     LIMIT 5;
     ```
   - **Ghép Prompt**: Ghép các chunks liên quan vào prompt template trước khi gửi sang `POST http://localhost:8000/generate`.

3. **Database & Environment**:
   - Không commit thông tin nhạy cảm (DB password, API key). Luôn dùng file `.env` và cập nhật `.env.example`.

---

## 3. Lệnh Thường Dùng
- `npm run dev`: Chạy dev server bằng `tsx watch` (auto reload khi sửa file).
- `npm run build`: Compile TypeScript sang JavaScript trong thư mục `dist/`.
- `npm start`: Chạy production build.

