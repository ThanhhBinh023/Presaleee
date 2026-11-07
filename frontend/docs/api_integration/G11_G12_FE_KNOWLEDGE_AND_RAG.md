# G11 + G12 — Knowledge vault & Hybrid RAG trên Frontend

Tài liệu ghi lại **những gì đã thêm/sửa** để nối API nhóm G11 (Knowledge Vault) và G12 (Hybrid RAG) vào giao diện, kèm seed để test tay.

- Chỉ thay đổi mã trong `frontend/` (không sửa backend).
- Pattern giống G2–G10: `types` → `services` → `hooks` → hash-router + `RequireAuth` (`#vault`).
- Backend E2E G11/G12 đã xanh 28/28 (ask/generate success path skip khi port 8000 tắt). Embeddings E2E dùng Gemini thật.

---

## 1. File tạo mới

| File | Nội dung |
|---|---|
| `frontend/src/types/knowledge.ts` | Document, ingest result, citations, RAG chunk, generate overview. |
| `frontend/src/services/knowledgeService.ts` | `GET/POST/DELETE /knowledge/documents`, `POST /knowledge/ask`, `POST /rag/search|ingest|generate-proposal`. |
| `frontend/src/hooks/useKnowledgeDirectory.ts` | List + filter + pagination. |
| `frontend/docs/api_integration/G11_G12_SEED_UI_TEST.sql` | 4 doc org A + 1 doc Omega, chunks vector(768) zero + FTS token. |
| `frontend/docs/api_integration/G11_G12_FE_KNOWLEDGE_AND_RAG.md` | File này. |

## 2. File chỉnh sửa

| File | Thay đổi |
|---|---|
| `frontend/src/components/KnowledgeVault.tsx` | Viết lại: ingest, list/filter, detail, delete, hybrid search, ask, generate overview. Bỏ mock marketing. |

Route `#vault` và sidebar Overview / AI Workspace / RFP **đã có sẵn** — không đổi `App.tsx` / `navigation.ts`.

## 3. Endpoint đã nối

| Endpoint | Call site |
|---|---|
| `POST /knowledge/documents` | Ingest (120s, Gemini embeddings) |
| `POST /rag/ingest` | Checkbox alias cùng DTO |
| `GET /knowledge/documents` | List `category`, `domain`, `search` title, page, limit |
| `GET /knowledge/documents/:id` | Detail metadata + `totalChunks` (không có raw content — F2) |
| `DELETE /knowledge/documents/:id` | 204, chunks cascade |
| `POST /rag/search` | Hybrid RRF chunks, topK 1–20 |
| `POST /knowledge/ask` | Answer + citations, topK 1–10, 90s |
| `POST /rag/generate-proposal` | Overview + sources, retrieval topK cố định 3 |

## 4. Quy tắc trên UI

- `category` / `domain` **omit** khi trống → backend `GENERAL`. Không gửi `""` (F5 → 400).
- Không có upload file; chỉ plain text. `knowledge_docs` không lưu `content`.
- Ingest trùng nội dung tạo **hai** document (F4).
- VIEWER ingest/xóa/search/ask được (F1).
- Search `chunkIndex` luôn 0 vì RPC không select cột đó (F3).
- Search/ask cần embedding cho **câu query** (Gemini). Ask/generate cần thêm LLM `:8000`; không thì 502.
- Domain filter thu hẹp corpus, có thể ít hơn topK (F6).

## 5. Seed & test tay

Chạy `G11_G12_SEED_UI_TEST.sql` sau G4. Đã apply lên DB dev: 4 document Northwind + 1 Omega (isolation). Vector seed = 0; FTS token: `healthfhirzxq`, `bankingsoc2zxq`, `retailposzxq`, `ratecardzxq`.

| Bước | Hash | Kỳ vọng |
|---|---|---|
| 1 | `#vault` | 4 title org A, không có *Omega isolation ledger spec* |
| 2 | Filter `TECH_SPEC` / domain `HEALTHCARE` | *HealthFirst FHIR clinic architecture*, 2 chunks |
| 3 | Mở detail | Có category/domain/chunks; không có full text |
| 4 | Ingest title + content (bỏ category) | 201, category GENERAL, `totalChunks` ≥ 1 |
| 5 | Ingest cùng content lần nữa | Document thứ hai, không dedupe |
| 6 | Hybrid search `healthfhirzxq` (Gemini bật) | Chunk HealthFirst; `omegaisolationzxq` không về |
| 7 | Ask / Generate | LLM bật → prose + citations/sources; tắt → 502 |
| 8 | Delete | 204, row biến khỏi list |
| 9 | `viewer@presaleee.test` | Ingest vẫn 201 |

## 6. Chưa làm

- Upload PDF/Docx (backend chưa parse file).
- Highlight window thật trong tài liệu dài (F3).
- Không sửa defect F1–F8 phía backend.
- Tab Knowledge trên AI Workspace marketing **không** được nối lại.
