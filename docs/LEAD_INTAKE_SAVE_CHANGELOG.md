# Changelog — Tách AI Intake khỏi DB, Save lead là nơi ghi duy nhất

**Ngày thực hiện:** 08/11/2026 (frontend) · 09/11/2026 (backend + kiểm chứng)
**Phạm vi:** bước 1 của quy trình chính `AI Intake → Proposal`. Không đụng các bước sau.
**Branch:** `feature/AIIntake_pipeline`

---

## 1. Vấn đề

`POST /api/v1/leads/intake/analyze` vừa parse vừa **ghi DB luôn**, còn nút **Save lead** thì gọi
`POST /api/v1/leads` — một route **không tồn tại** nên trả `Cannot POST /api/v1/leads`.

Hệ quả cụ thể:

- Mỗi lần bấm *Run AI Intake* sinh thêm một dòng `leads` `status='NEW'`, kể cả khi người dùng parse thử nhiều lần rồi bỏ.
- Dòng đó được INSERT **trước khi** người dùng chọn Client/Owner, nên `client_id`/`assigned_to` luôn `NULL`. Muốn điền sau phải PATCH, mà `PATCH /api/v1/leads/:id` cũng chưa có route.
- Dữ liệu AI chưa được người duyệt trở thành source of truth cho bước sinh proposal.

Ba căn cứ khiến hướng sửa "analyze không ghi, Save mới ghi" là hướng đúng chứ không phải lựa chọn thẩm mỹ:

1. `docs/LEAD_INTAKE_API.md:7` đã ghi sẵn: *"It does not write to the database"* và `:62` ghi *"until a separate save endpoint is implemented"`. **Code lệch tài liệu, không phải tài liệu lệch code.**
2. `backend/api_test/g5_g6_pricing_and_leads.e2e.mjs:828` assert `expect(response.json.meta.persisted === false, 'the draft must be flagged as not persisted')`.
3. `application/use-cases/LeadUseCases.ts:118` — `CreateLeadUseCase` đã viết hoàn chỉnh (validate, cross-tenant guard, audit) nhưng chưa từng được khởi tạo trong `container.ts`, và không route nào gọi nó.

---

## 2. Thay đổi ở frontend — 08/11/2026

| File | Dòng | Trước | Sau | Mục đích |
|---|---|---|---|---|
| `frontend/src/services/leadService.ts` | 146 | `body: { rawRfpContent, source }` | `body: { rawRfpContent, source, persist: false }` | Tắt ghi DB khi parse, có tác dụng ngay mà không cần sửa backend (`persist` vốn đã được đọc từ body). Hard-code `false`, không để dạng tham số. |
| `frontend/src/components/RfpIntake.tsx` | 56-59 | *(mới)* | hàm `text(value: unknown, fallback: string)` | Đọc `metadata.target_sla` có type `unknown` (index signature `types/lead.ts:43`) mà không để `undefined` lọt vào payload. |
| `frontend/src/components/RfpIntake.tsx` | 138-140 | *(mới)* | `missing_information`, `target_sla`, `peak_workload` | compensate cho 3 khoá mà INSERT cũ tự thêm ở `LeadIntakeController.ts:30-32`; mất nó thì UI hiện `Chưa cấu hình` và proposal dùng constant giả. |

**Vì sao khoá snake_case là bắt buộc:** các nơi đọc `extracted_metadata` chỉ nhìn snake_case, không fallback:

- `frontend/src/components/AIWorkspace.tsx:144-145` (điền ô sửa), `:673` `:679` (hiển thị)
- `frontend/src/components/ProposalStudioTab.tsx:883` `:889` (hiển thị)
- `backend/src/application/use-cases/GenerateProposalFromLeadUseCase.ts:250` `:284` `:286`

**Giá trị fallback** lấy đúng mặc định của `AnalyzeLeadIntakeUseCase.ts:135` / `:138` (`'< 100ms'`, `'Cao tải theo thời gian thực'`), thay cho `'< 50ms Latency'` / `'40,000+ TPS'` mà controller cũ bịa ra.

**Không sửa:** `leadService.analyzeAndSaveLead()` (`:67-77`, vẫn `persist = true`) là code chết — grep toàn bộ `frontend/src` không có chỗ nào gọi.

---

## 3. Thay đổi ở backend — 09/11/2026

| File | Dòng | Nội dung |
|---|---|---|
| `backend/src/presentation/controllers/LeadIntakeController.ts` | 15 | constructor nhận thêm `private readonly createLeadUseCase: CreateLeadUseCase` (tham số bắt buộc) |
| || 18-27 | thêm `private leadScope(req)` — khuôn giống `ClientController.ts:34-42` |
| || 29-48 | thêm handler `createLead`, trả `201` + header `Location` |
| || 60 | `persist = true` → `persist = false` |
| `backend/src/presentation/routes/leadIntakeRoutes.ts` | 3 | import thêm `requireAuth`, `requireOrganization` |
| || 12 | `router.post('/', requireAuth, requireOrganization, controller.createLead)` |
| `backend/src/container.ts` | 172 | `new CreateLeadUseCase(leadRepository, referenceValidator, auditRepository)` |
| || 215 | truyền `createLeadUseCase` vào `LeadIntakeController` |

**Điểm bảo mật thay đổi:** `organizationId` và `created_by` giờ **chỉ lấy từ token đã verify** (`req.auth`). INSERT cũ còn nhận `x-organization-id` header và `body.organizationId`, tức client tự khai được tổ chức của mình.

`CSRF origin check` (`AuthController.ts:60-69`) chỉ áp dụng cho route auth, nên route mới không bị ảnh hưởng.

---

## 4. Hợp đồng `POST /api/v1/leads`

**Request** (6 field, toàn bộ từ payload của nút Save):

```json
{ "title": "...", "source": "MANUAL", "rawRfpContent": "...",
  "extractedMetadata": { "...": "...", "target_sla": "...", "peak_workload": "...", "missing_information": [] },
  "clientId": null, "assignedTo": null }
```

**Thành công:** `201` · `Location: /api/v1/leads/<id>` · `data.status = "NEW"` (`PostgresLeadRepository.ts:61`).

| Status | Khi nào | Nguồn |
|---|---|---|
| `401` | không có token | `requireAuth` |
| `403` | token không có `organization_id` | `requireOrganization` (`requireAuth.ts:7`) |
| `400` | `title` / `rawRfpContent` trống, `clientId` không phải UUID, `source` ngoài 5 giá trị | `LeadUseCases.ts:126-132` |
| `400` | `clientId`/`assignedTo` không thuộc tổ chức của người gọi | `ReferenceValidator.ts:18` `:24` |

---

## 5. Kiểm chứng (manual, 09/11/2026)

- [x] `POST /intake/analyze` trả `meta.persisted: false`, `data` không có `id`.
- [x] Số dòng bảng `leads` **không đổi** sau khi bấm *Run AI Intake*.
- [x] Payload Save lead đủ 6 field, `extractedMetadata` có `target_sla` / `peak_workload` / `missing_information` mang giá trị thật từ RFP.
- [x] `POST /api/v1/leads` trả `201`, `data.id` là UUID, `data.status = "NEW"`.
- [x] DB có dòng lead mới sau khi bấm Save.

**Chưa kiểm chứng riêng:**
- `target_sla` trong `extracted_metadata` của dòng vừa lưu phải là giá trị parse được, **không phải** `'< 100ms'` mặc định.
- `client_id`/`assigned_to` có giá trị thật khi chọn từ dropdown (hiện cả 2 dropdown đang trống — xem mục 6).

---

## 6. Ghi nợ — phát hiện trong lúc làm, **chưa sửa**

| # | Vấn đề | Vị trí |
|---|---|---|
| 1 | `PATCH /leads/:id/status` và `PATCH /leads/:id` chưa có route; frontend đã gọi (`updateStatus`, `updateLead`). **Chặn bước kế tiếp**: `CreateProposalFromLeadUseCase.ts:19` đòi `status ∈ {QUALIFIED, APPROVED, PROPOSAL_DRAFTING}`. | `leadIntakeRoutes.ts` |
| 2 | Frontend gọi `POST /leads/:id/qualifications`, backend đặt route tên `/qualify` — hai bên lệch nhau, và e2e test đứng về phía frontend. | `leadService.ts:169` vs `leadIntakeRoutes.ts:16` |
| 3 | `GET/PUT/DELETE /leads/:id` dùng `optionalAuth` và không lọc `organization_id` → đọc/xoá được lead của tổ chức khác. | `leadIntakeRoutes.ts:18-24` |
| 4 | `docs/LEAD_INTAKE_API.md:18` nói `source` mặc định `MANUAL`; code mặc định `INBOUND_EMAIL`. `meta.message` trong docs cũng khác string code trả về. | `LeadIntakeController.ts:60` |
| 5 | Dropdown Client/Owner **nuốt lỗi im lặng**: hook có `error` nhưng UI không render, nên "0 dòng" và "request thất bại" trông giống nhau. Client trống là do dữ liệu không thuộc `organization_id` của account đang login (`PostgresClientRepository.ts:59`), hoặc `clients.organization_id` NULL — cột này cho phép NULL (`001_initial_schema.sql:46`). | `RfpIntake.tsx:335-349` |
| 6 | `extracted_metadata` chứa song song `targetSla`/`peakWorkload`/`missingInformation` (camel, do draft của AI trả về) và bản snake_case. snake luôn thắng ở mọi reader nên vô hại, nhưng schema nên thống nhất một kiểu. | `AnalyzeLeadIntakeUseCase.ts:151-153` |
| 7 | Rows rác do auto-save cũ để lại trong `leads`: `status='NEW'`, `client_id NULL`, không xoá mà không có quyết định. | DB |
| 8 | `npm run build` backend đang đỏ (~117 lỗi `tsc`, có phần do DI `ProposalController` lệch tham số). `tsx watch` không type-check nên vẫn chạy — chưa nằm trong phạm vi bước này. | `container.ts:201-213` |

---

## 7. Bước kế tiếp theo thứ tự đã chốt

1. `PATCH /api/v1/leads/:id/status` + `PATCH /api/v1/leads/:id` (mục 6.1) — mở đường cho qualification và proposal.
2. Sửa DI `ProposalController` để `POST /proposals/:id/generate` hết 500.
3. Các bước còn lại của pipeline: Qualify → Create proposal from lead → Generate → Excel/PDF.
