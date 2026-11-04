# Backend Coding Convention (Clean Architecture + TypeScript)

Thư mục này đóng vai trò **Nhạc trưởng (Orchestrator)** của hệ thống Presaleee, được thiết kế tuân thủ nghiêm ngặt **Kiến trúc sạch (Clean Architecture / Hexagonal Architecture)** nhằm phân tách rõ ràng trách nhiệm giữa Domain, Application, Infrastructure và Presentation layers.

---

## 1. Cấu Trúc Thư Mục Clean Architecture

```
backend/src/
├── domain/                      # [Enterprise Business Rules] - Thực thể & hợp đồng nghiệp vụ độc lập
│   ├── entities/                # Thực thể cốt lõi (DocumentChunk, KnowledgeDocument, Proposal,...)
│   ├── repositories/            # Interfaces hợp đồng (IKnowledgeRepository, IEmbeddingGateway, ILLMGateway)
│   └── errors/                  # Lớp lỗi Domain tùy chỉnh (AppError, ValidationError, NotFoundError,...)
│
├── application/                 # [Application Business Rules] - Luồng nghiệp vụ cụ thể (Use Cases & DTOs)
│   ├── use-cases/               # Use cases thực thi (SearchHybridRAGUseCase, IngestDocumentUseCase,...)
│   ├── dtos/                    # Input / Output Data Transfer Objects
│   ├── services/                # Tiện ích nghiệp vụ nội bộ (TextSplitterService)
│   └── prompts/                 # Cấu hình prompt/schema tách khỏi use case (LeadQualificationPrompt)
│
├── infrastructure/              # [Frameworks & Drivers] - Triển khai thực tế công nghệ & dịch vụ bên ngoài
│   ├── config/                  # Quản lý biến môi trường strongly-typed (env.ts)
│   ├── database/
│   │   ├── connection.ts        # Supabase PostgreSQL Connection Pool
│   │   ├── migrations/          # DDL migrations cho PostgreSQL + pgvector
│   │   └── repositories/        # Cài đặt cụ thể các repositories (PostgresKnowledgeRepository)
│   └── ai/                      # Gateways tích hợp AI Cloud & Inference
│       ├── GeminiEmbeddingGateway.ts  # Tích hợp Gemini Cloud API (gemini-embedding-001, 768 dims)
│       └── FastAPILMGateway.ts        # Tích hợp HTTP client gọi Inference Engine Qwen
│
├── presentation/                # [Interface Adapters] - Xử lý giao tiếp HTTP / REST API
│   ├── controllers/             # Điều hướng request/response (RAGController)
│   ├── routes/                  # Định nghĩa Express Router (/api/v1/rag)
│   └── middlewares/             # Middleware xác thực, validate, bắt lỗi tập trung (errorHandler)
│
├── types/                       # Khai báo TypeScript tập trung (express.d.ts mở rộng Express.Request)
│
├── container.ts                 # IoC / Dependency Injection Container liên kết toàn bộ hệ thống
└── index.ts                     # Entry point khởi tạo vòng đời Express Server
```

---

## 2. Quy Tắc Phụ Thuộc (The Dependency Rule)

1. **Nguyên tắc dòng chảy phụ thuộc (Inward Dependency)**:
   - Các layer bên ngoài chỉ được phép phụ thuộc vào layer bên trong.
   - **Domain Layer** là hạt nhân trung tâm, TUYỆT ĐỐI KHÔNG import bất kỳ thư viện bên ngoài nào (`express`, `pg`, `@google/genai`, `axios`).
   - **Application Layer** chỉ phụ thuộc vào **Domain Layer**.
   - **Infrastructure Layer** và **Presentation Layer** phụ thuộc vào **Application** và **Domain**.
2. **Nguyên tắc Đảo ngược Phụ thuộc (Dependency Inversion Principle - DIP)**:
   - Các Use Case trong Application Layer chỉ giao tiếp với Repository và Gateway thông qua Interface (`IKnowledgeRepository`, `IEmbeddingGateway`, `ILLMGateway`).
   - Mọi thể hiện cụ thể (concrete instances) được cấu hình và tiêm vào (inject) thông qua file `container.ts`.

---

## 3. Quy Chuẩn RESTful API & Error Handling

1. **Chuẩn RESTful API Response**:
   Mọi endpoint trả về định dạng JSON nhất quán:
   ```json
   {
     "success": true,
     "data": { ... },
     "meta": { "total": 10 }
   }
   ```
   Khi có lỗi xảy ra:
   ```json
   {
     "success": false,
     "error": "Descriptive error message",
     "statusCode": 400
   }
   ```

2. **Xử lý ngoại lệ tập trung (Centralized Error Handler)**:
   - Ném ngoại lệ kế thừa từ `AppError` (`ValidationError`, `NotFoundError`, `ExternalServiceError`).
   - Middleware `errorHandler.ts` bắt mọi ngoại lệ và định dạng lại response mã HTTP phù hợp (400, 404, 502, 500).

---

## 4. Quy Chuẩn RAG Pipeline trong Clean Architecture

1. **Cloud Embedding Contract**:
   - Sử dụng model `gemini-embedding-001` qua `GeminiEmbeddingGateway`.
   - Luôn sử dụng dimensionality reduction 768 dimensions để khớp với schema `vector(768)` và HNSW index trong Supabase.
2. **Hybrid Search Execution**:
   - Không query thủ công SQL thô rải rác; mọi truy vấn Hybrid Search phải thông qua `IKnowledgeRepository.searchHybrid()`, gọi hàm RPC `hybrid_search_chunks` (kết hợp Cosine Similarity + Full-Text Search qua Reciprocal Rank Fusion / RRF).

---

## 5. Lệnh Thường Dùng
- `npm run dev`: Chạy backend ở chế độ development với auto-reload.
- `npm run build`: Kiểm tra typecheck và build dự án ra thư mục `dist/`.
- `npm start`: Chạy production build từ `dist/index.js`.
