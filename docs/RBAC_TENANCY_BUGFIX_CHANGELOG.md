# Changelog — Vá lỗi phân quyền (RBAC), multi-tenancy và hợp đồng AI task_mode

**Ngày thực hiện:** 15/11/2026
**Phạm vi:** các defect phát hiện khi thống kê role trên nhánh `feature/role` và khi soạn plan kiểm thử thủ công ADMIN / `PRESALE_LEAD`. Không đổi schema DB, không chạy lệnh nào ghi vào DB thật.
**Cơ sở kiểm chứng:** `npx tsc --noEmit` (đo **delta**, không đo số tuyệt đối) và đọc trực tiếp middleware / route / use case.

---

## 1. defect đã sửa

| Hiện tượng | Căn nguyên | Bằng chứng |
|---|---|---|
| `POST /proposals/generate-from-lead` đọc được RFP và biên bản họp của **tổ chức khác** nếu biết UUID lead | Use case nhận `leadId` không thôi, hai câu SQL raw (`SELECT * FROM leads WHERE id = $1`, `SELECT * FROM meetings WHERE lead_id = $1`) không có mệnh đề org; controller cũng không truyền org | `GenerateProposalFromLeadUseCase.ts:28,36` bản cũ; `findByLeadId(leadId)` một tham số trong `IProposalRepository.ts:43` |
| Cùng lỗ hổng ở nhánh fallback export | `exportExcel/exportPdf` dùng org mặc định hard-code `00000000-0000-0000-0000-000000000001` khi token không có org, rồi gọi generate | `ProposalController.ts:331,356` bản cũ |
| Bấm **Approve / Submit for Review** luôn nhận `400 Authenticated user and organization are required.` (defect 0.4) | `ProposalController.update` và `updateLifecycle` không truyền `organizationId/actorId/actorRole` vào `UpdateProposalUseCase`; kéo theo guard "chỉ ADMIN/PRESALE_LEAD được APPROVED" (`UpdateProposalUseCase.ts:66`) là code chết | `npx tsc --noEmit`: TS2345 thiếu 3 thuộc tính DTO; đã sửa ở bước trước, nay guard này **mới thật sự có hiệu lực** |
| `POST /proposals/:id/ui-brief` chết | gọi `getByIdUseCase.execute(id)` thiếu tham số org thứ hai | `GetProposalByIdUseCase.ts:9` khai báo 2 tham số |
| Chấm điểm BANT qua route cũ **không bao giờ** gọi được tier-1 FastAPI | `taskMode: LLMTaskMode.BANT_QUALIFICATION` — thành viên enum không tồn tại → `task_mode: undefined` → axios loại khỏi body → pydantic 422 → rơi xuống tier-2 Gemini với system prompt chung | `ILLMGateway.ts` bản cũ chỉ có 1/4/5; `ai/server.py` có 1..6 |
| AI họp bị ra lệnh bằng prompt… BANT | `MeetingUseCases.AnalyzeMeetingUseCase` truyền `taskMode: 4` (LEAD_QUALIFICATION) cho yêu cầu phân tích transcript | `MeetingUseCases.ts:128` bản cũ; mode đúng là `2` (`ai/server.py:194`) |
| `VIEWER` ghi được dữ liệu thật qua `POST /rate-cards/pricing/calculate` | Route chỉ có `readAccess`, nhưng use case mặc định `apply = true` khi có `proposalId` → sửa `proposals.total_cost`, ghi lại sheet 5 và sheet 6, viết audit log | `rateCardRoutes.ts:15` + `RateCardUseCases.ts:211` |
| Hai bản định nghĩa `requireNotViewer` | Định nghĩa trùng trong `requireRole.ts:25` trong khi mọi route import từ `requireAuth.ts` | `grep requireNotViewer` ra 5 route, tất cả import `../middlewares/requireAuth.js` |
| Client tự khai org của mình | `LeadIntakeController.analyze` lấy org theo thứ tự `req.auth → header x-organization-id → body.organizationId`; tương tự `userId` từ `body.userId` | `LeadIntakeController.ts:88-89` bản cũ |
| `POST /auth/dev-login` đăng nhập **không cần mật khẩu** theo email, mở ở mọi môi trường | Không có check `NODE_ENV`; chỉ có CSRF origin (mà CSRF bỏ qua request không có header `Origin`) | `authRoutes.ts:9`, `AuthController.devLogin` bản cũ |
| Nút **Approve Proposal** hiển thị cho `VIEWER` (bấm vào mới ăn 403) | Điều kiện render chỉ dựa `status`, không dựa role, dù component đã có sẵn `isViewer` | `ProposalStudioTab.tsx:505,515` bản cũ; `isViewer` đã khai báo tại `:264` nhưng chỉ dùng ở `:706,1102` |

---

## 2. Thay đổi backend

| File | Thay đổi | Lý do |
|---|---|---|
| `domain/repositories/ILLMGateway.ts` | Bổ sung `MEETING_ASSISTANT=2`, `GAP_ANALYSIS=3`, `TECH_ARCHITECTURE=6` | Enum phải khớp wire protocol `task_mode` 1..6 của `ai/server.py`; các giá trị là hợp đồng, không phải số thứ tự nội bộ |
| `infrastructure/ai/FastAPILMGateway.ts` | Gỡ 4 khoá `undefined` trong `SYSTEM_PROMPTS` (trùng khoá `[undefined]` đè nhau) và 2 nhánh so sánh `BANT_QUALIFICATION` → `LEAD_QUALIFICATION` | Trước sửa, tier-2 Gemini nhận system prompt chung cho mọi mode 2/3/4/6 |
| `application/use-cases/MeetingUseCases.ts:128` | `taskMode: 4` → `LLMTaskMode.MEETING_ASSISTANT` | Đúng vai "Meeting Assistant" thay vì "Commercial Presale Director" |
| `application/use-cases/GenerateProposalFromLeadUseCase.ts` | `GenerateProposalFromLeadInput` thêm `organizationId` (bắt buộc, có ValidationError); SQL leads lọc `AND organization_id = $2`; SQL meetings lấy org qua `JOIN leads` theo đúng convention `PostgresMeetingRepository.listByLead`; 5 call site repo truyền đủ org | Vá lỗ hổng chéo tenant + sửa 5 lỗi TS2554 |
| `domain/repositories/IProposalRepository.ts` + `PostgresProposalRepository.ts:109-113` | `findByLeadId(leadId, organizationId)` và SQL thêm `AND organization_id = $2` | Interface chỉ có 1 call site nên đổi an toàn |
| `presentation/controllers/ProposalController.ts` | `generateFromLead` dùng `authContext(req)` thay vì `(req as any).user?.id` (m always `undefined` → `created_by` luôn NULL); `ui-brief` truyền org; `exportExcel/exportPdf` bỏ org hard-code | Đồng nhất nguồn context: token là nguồn duy nhất |
| `presentation/controllers/LeadIntakeController.ts` | `leadScope(req: Pick<Request,'auth'|'socket'>)` (hết lỗi TS2345 với handler có generic body); `taskMode` → `LEAD_QUALIFICATION`; chuẩn hoá payload BANT; gỡ fallback org/user từ header-body khỏi type và code | Xem mục 3 |
| `application/use-cases/RateCardUseCases.ts:237` | Nhánh `apply` thêm guard `VIEWER` → 403; xem trước giá (`apply:false`) vẫn mở cho mọi role | Chặn đúng thao tác ghi, không đập cả chức năng preview |
| `presentation/middlewares/requireRole.ts` | Xoá bản `requireNotViewer` trùng lặp; sửa chú thích "15 minutes" → 24 giờ | Một định nghĩa duy nhất; chú thích phải khớp `ACCESS_TOKEN_TTL_SECONDS` |
| `presentation/controllers/AuthController.ts:89` | `devLogin` trả `403` khi `env.nodeEnv === 'production'` | Chặn đường đăng nhập không mật khẩu trên production |

## 3. Quy tắc chuẩn hoá BANT (route cũ `POST /leads/:id/qualify`)

Sau khi gọi được AI thật, hai schema xung đột nhau: system prompt mode 4 trả `{score, recommendation, criteria{budget,authority,need,timeline}, summary}` (bản `QualifyLeadUseCase`/`LeadsDirectory.tsx` dùng), còn controller và `AIWorkspace.tsx:309,846-859` cần `{qualification_score, readiness_level, breakdown[], project_brief}`. Controller nay **chuẩn hoá về shape cũ** khi phát hiện shape mới (`LeadIntakeController.ts:189-203`), nên UI không vỡ và dữ liệu hiển thị là điểm AI thật, không còn điểm 88 cố định của heuristic.

## 4. Thay đổi frontend

`components/ProposalStudioTab.tsx`: bọc `!isViewer` cho 4 thao tác ghi — Submit for Review (`:505`), Approve Proposal (`:515`), Sinh lại 10 sheets (`:582`), Tạo/Làm mới AI UI Brief (`:1094`). `npx tsc --noEmit` phía frontend: **0 lỗi**.

## 5. Đã kiểm chứng bằng cmd (không chạm DB)

- `npx tsc --noEmit` (backend): **47 → 34 lỗi**, tức **giảm 13, phát sinh mới 0**.
- 34 lỗi còn lại **100% nằm ngoài luồng sống**: `InspectMeetingUseCase.ts` (11), `scripts/testDiscoveryMeetingE2E.ts` (10), `CreateMeetingUseCase.ts` (5), `UpdateMeetingLifecycleUseCase.ts` (3), `dtos/MeetingDTOs.ts` (3), `ListMeetingsByLeadUseCase.ts` (1), `GetMeetingByIdUseCase.ts` (1). `container.ts:244-250` wire `MeetingController` bằng các use case trong `MeetingUseCases.js`, nên cả 7 file này không được import lúc chạy (`tsx` không type-check nên server vẫn sống).
- Quét toàn bộ raw SQL trên các bảng có org trong `application/` + `presentation/`: sau khi sửa, **không còn** câu SELECT/UPDATE/DELETE nào bỏ sót mệnh đề org trong luồng sống (`deleteLead` xoá con theo `lead_id` nhưng đã verify cha thuộc org ở `:393-400`).

## 6. Chưa làm — cần quyết định

| # | Việc | Vì sao để lại |
|---|---|---|
| 1 | `POST /portal/sessions` mở cho cả `VIEWER` và không cần Proposal `APPROVED` | `PortalUseCases.ts:39` ghi rõ "as requested" — đây là quyết định sản phẩm, không phải quên; siết lại sẽ đổi hành vi đang được mong đợi. Constant `APPROVED_PROPOSAL_SHARE_ROLES` (`:11`) hiện khai báo mà chưa dùng |
| 2 | Cluster A: 7 file meeting/e2e còn 34 lỗi biên dịch | hoặc viết lại theo `MeetingUseCases.ts`, hoặc xoá ~25 lỗi code chết; cả hai hướng đều vượt phạm vi "sửa bug" |
| 3 | `frontend/src/types/portal.ts:64,71` export hai danh sách role không component nào dùng | code chết, nhưng xoá là dọn dẹp riêng, chưa phải defect |
| 4 | Kiểm thử runtime 12 luồng vừa sửa | mỗi bước đều ghi/sửa DB thật (leads, proposals, sheets, portal tokens) → **chờ duyệt**; chưa chạy lệnh nào |
| 5 | `estimatedDays`/`rate_cards` trống ở org chưa có bảng đơn giá | defect dữ liệu, đã ghi ở changelog 09–10/11, không liên quan nhóm lỗi này |

## 7. Tài liệu đã cập nhật

- `docs/RBAC_ROLES_AND_PERMISSIONS_GUIDE.md` **v2.4 → v2.5**: sửa 11 dòng ma trận ghi quá mức giới hạn theo role (2.4, 2.6, 3.2, 3.3, 4.2, 4.3, 4.7, 5.2, 5.4 và 7.3/7.4), tách "xem thành viên" khỏi "mời/đổi role", thay dòng "ký duyệt chia sẻ Portal lần đầu" (không tồn tại trong API) bằng dòng thu hồi phiên/material, thêm dòng preview/apply giá, cập nhật mục 6 (TTL 24h, dev-login, CSRF, nguồn org).
- `backend/docs/USER_DIRECTORY_API.md:31`: bỏ tuyên bố token 15 phút, mô tả đúng TTL 24h và hệ quả thu hồi quyền.
