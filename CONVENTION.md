# Presaleee Monorepo Guidelines & Coding Conventions

Tài liệu này định nghĩa quy chuẩn code, kiến trúc thư mục, quy tắc commit và phong cách làm việc cho cả **con người** lẫn **AI coding assistants (Claude Code, Cursor, GitHub Copilot, Antigravity)**.

---

## 1. Kiến Trúc Tổng Thể & Trách Nhiệm Từng Phân Hệ

Dự án áp dụng mô hình **Decoupled Architecture (Tam giác AI - Backend - Frontend)**:

```
├── frontend/    # [Client Layer] React 19 + TypeScript + Vite + TailwindCSS
├── backend/     # [Core API & Orchestration] Node.js + Express + TypeScript + PostgreSQL (pgvector)
├── ai/          # [AI Model Engine] Python + Qwen1.5-4B LoRA + BAAI/bge-m3 Embedding
├── docs/        # Kiến trúc, tài liệu sản phẩm, hướng dẫn tích hợp AI
└── .github/     # CI/CD Workflows (Lint, Typecheck, Build)
```

### Nguyên tắc phân tách trách nhiệm (Separation of Concerns):
- **Frontend**: Chỉ đảm nhận UI/UX, state management người dùng, render dữ liệu, không chứa direct prompt template hay gọi thẳng sang AI service.
- **Backend**: Đóng vai trò **Nhạc trưởng (Orchestrator)**. Quản lý Auth, CRUD, DB, PostgreSQL + `pgvector`, Chunking tài liệu RAG, điều phối prompt và bảo mật nghiệp vụ.
- **AI Service**: Là **Inference Engine** tính toán thuần túy (Stateless). Chỉ nhận request embedding hoặc generation và trả kết quả tính toán, không truy cập trực tiếp DB nghiệp vụ.

---

## 2. Quy Chuẩn Git & Workflow

### 2.1. Quy tắc đặt tên Branch
- `feature/<module-name>`: Thêm tính năng mới (vd: `feature/rfp-intake`, `feature/rag-search`).
- `fix/<issue-name>`: Sửa lỗi (vd: `fix/proposal-sheet-export`).
- `refactor/<target>`: Tối ưu hoặc tái cấu trúc code.

### 2.2. Quy tắc Conventional Commits
Mọi commit phải tuân thủ chuẩn:
`<type>(<scope>): <short description>`

- **Types**:
  - `feat`: Tính năng mới
  - `fix`: Sửa lỗi
  - `docs`: Sửa tài liệu, README
  - `refactor`: Tái cấu trúc không thay đổi tính năng
  - `chore`: Cấu hình build, package, CI/CD
  - `test`: Viết unit/integration test
- **Scopes**:
  - `fe`: Frontend (`feat(fe): add proposal overview table`)
  - `be`: Backend (`feat(be): setup pgvector connection pool`)
  - `ai`: AI Engine (`feat(ai): optimize prompt template for task 4`)
  - `repo`: Toàn bộ repo (`chore(repo): update root package.json scripts`)

---

## 3. Quy Ước Cho Từng Thư Mục

Mỗi thư mục con đều có file `CONVENTION.md` hoặc `README.md` riêng:
- [Frontend Convention](frontend/CONVENTION.md): React components, Tailwind styling, naming convention, state handling.
- [Backend Convention](backend/CONVENTION.md): Express patterns, error handling, DB schema, RAG & pgvector practices.
- [AI Engine Convention](ai/CONVENTION.md): Model inference rules, prompt schemas, environment variables, notebook practices.

---

## 4. Hướng Dẫn Dành Cho AI Assistants (Cursor / Claude / Copilot)
Khi bạn là AI đang đọc repository này:
1. **Luôn giữ đúng boundaries**: Không đưa logic gọi OpenAI/PyTorch vào Frontend. Mọi tính năng AI phải đi qua Backend API.
2. **Không commit weights nặng**: Tuyệt đối không sinh code add các file `.safetensors`, `.bin`, `.pt`, `.h5` vào Git.
3. **Strict Typing**: Giữ 100% TypeScript strict mode cho cả `backend` và `frontend`. Không dùng kiểu `any` tùy tiện; hãy định nghĩa interfaces rõ ràng.
4. **Error Handling**: Mọi API endpoint phải có try/catch chuẩn và trả về mã lỗi HTTP đồng nhất (`{ success: false, message, error }`).

