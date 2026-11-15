# Changelog — Vá lỗi phân quyền (RBAC), multi-tenancy và hợp đồng AI task_mode

**Ngày thực hiện:** 15/11/2026 (đợt 1 + đợt 2)
**Phạm vi:** các defect phát hiện khi thống kê role trên nhánh `feature/role`, khi soạn plan kiểm thử thủ công ADMIN / `PRESALE_LEAD` (đợt 1) và khi soạn plan cho `PRESALE_CONSULTANT` (đợt 2). Không đổi schema DB, không chạy lệnh nào ghi vào DB thật.
**Cơ sở kiểm chứng:** `npx tsc --noEmit` (đo **delta**, không đo số tuyệt đối) và đọc trực tiếp middleware / route / use case.
**Đợt 1** đã commit `496ddc4`; **đợt 2** là toàn bộ phần sau mục 7.

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

---
---

# ĐỢT 2 — defect phát hiện khi khảo sát `PRESALE_CONSULTANT` (15/11/2026)

Bối cảnh: khi liệt kê quyền của `PRESALE_CONSULTANT`, câu hỏi đặt ra không phải "role này được gì" mà "**cùng lớp bug** đó có lặp lại ở các đường đi khác không". Kết quả: 11 defect — 5 backend, 6 frontend — trong đó 2 defect làm lộ/vượt dữ liệu chéo tổ chức, 3 defect là code chết hiển thị như chức năng thật.

## 8. Defect đã sửa

| # | Hiện tượng | Căn nguyên | Bằng chứng |
|---|---|---|---|
| B1 | Proposal sinh từ lead **nhúng được tài liệu của tổ chức khác** vào prompt | `GenerateProposalFromLeadUseCase` gọi `SearchHybridRAGUseCase` mà không truyền `organizationId`; SQL của `hybrid_search` là `(filter_organization_id IS NULL OR kd.organization_id = filter_organization_id)` → org NULL **tắt luôn** bộ lọc, không phải "không lọc cái gì" | `GenerateProposalFromLeadUseCase.ts:70-74` bản cũ; điều kiện NULL trong câu SQL RAG |
| B2 | Bấm "Sinh lại Proposal từ Lead" trên bản đã gửi khách **xoá sạch 10 sheet đang hiệu lực** và kéo về `DRAFT` | Nhánh `existingProposal` ghi đè trực tiếp bằng `updateSheet(..., true)`, không đi qua `UpdateProposalUseCase` nên state machine (`:69-76`) và guard role (`:66`) bị đi vòng qua hoàn toàn | `GenerateProposalFromLeadUseCase.ts:401-411` bản cũ |
| B3 | `GET /proposals?organizationId=<uuid>` liệt kê đề xuất của **tổ chức khác**; thiếu tham số thì rơi về org hard-code `00000000-…-001` | Controller ưu tiên query param hơn token — đúng cái bẫy "không nhận tenant từ client" đã gỡ ở đợt 1 nhưng sót route này | `ProposalController.ts:201-225` bản cũ |
| B4 | `VIEWER` tạo được meeting và proposal qua hai route con | `POST /leads/:leadId/meetings` và `POST /leads/:leadId/proposals` khai báo tay trong `routes/index.ts`, không nằm trong router nhóm cha nên **không** kế thừa `requireNotViewer` | `routes/index.ts:51-52` bản cũ, so với `leadIntakeRoutes.ts` / `meetingRoutes.ts` đều có guard |
| B5 | Bốn thao tác ghi Lead **không để lại dấu vết** trong `audit_log` | `analyze` (persist), `qualify`, `updateLead`, `deleteLead` viết raw SQL ngay trong controller, không đi qua use case — mà chỉ use case mới gọi `auditRepository.record` | `LeadIntakeController.ts` bản cũ: không có import `IAuditRepository`; `LeadUseCases.ts` thì có |
| F1 | Nút **Approve Proposal** vẫn sáng với `PRESALE_CONSULTANT`/`SOLUTION_ARCHITECT`/`SALES_REP` → ăn `403` | Đợt 1 mới chặn `VIEWER` (`!isViewer`), trong khi backend có **tầng thứ ba**: chỉ `ORGANIZATION_ADMIN_ROLES` được chuyển sang `APPROVED` | `UpdateProposalUseCase.ts:65-67`; fix front-end cùng pattern đã có ở `ProposalsStudio.tsx:53` |
| F2 | Nút "Nộp xét duyệt nội bộ" ở AI Workspace **chỉ bật toast**, không gọi API | Handler là `() => toast.info('Hồ sơ đề xuất đã gửi để xét duyệt nội bộ.')` — người dùng tin là proposal đã sang `IN_REVIEW` trong khi DB vẫn `DRAFT` | `AIWorkspace.tsx:507` bản cũ |
| F3 | Portal Desk hiển thị hai thông báo không bao giờ đúng | `shareable = Boolean(selected)` nên `!shareable` không thể xảy ra trong nhánh đã có proposal được chọn; `firstShareBlocked` hard-code `false` và không route nào có khái niệm "phiên đầu tiên" | `PortalDesk.tsx:183-186, 393-401` bản cũ |
| F4 | `PortalDesk` có `canManage = true` cố định — ghi role gì cũng được | Câu comment "Bỏ qua giới hạn role theo yêu cầu" che việc không còn ánh xạ nào tới guard thật | `PortalDesk.tsx:26-30` bản cũ |
| F5 | `MeetingsWorkspace`: cả 4 controls ghi mở cho `VIEWER` → 403 | Component đã import `useAuth` nhưng `user` chỉ dùng để cảnh báo thiếu org; không có `isViewer` | `MeetingsWorkspace.tsx:24` bản cũ; backend chặn ở `meetingRoutes.ts:9-11` + `routes/index.ts:51` |
| F6 | `RfpIntake`: "Run AI intake parser", "Skip AI", "Save lead" mở cho `VIEWER` → 403 | Component không import `useAuth` chút nào | `RfpIntake.tsx` bản cũ; backend chặn ở `leadIntakeRoutes.ts:12,15` |

## 9. Thay đổi backend

| File | Thay đổi | Dòng |
|---|---|---|
| `application/use-cases/GenerateProposalFromLeadUseCase.ts` | Truyền `organizationId: input.organizationId` vào RAG search | `:74` |
|  | Chặn ghi đè: `APPROVED`/`SENT_TO_CLIENT`/`ACCEPTED` → `409 Conflict` ("send it back to DRAFT before regenerating"), chỉ `DRAFT`/`IN_REVIEW`/`REJECTED` được sinh lại | `:406-411` |
| `presentation/controllers/ProposalController.ts` | `list` lấy org **duy nhất** từ token (`authContext(req)`), bỏ `?organizationId=` và bỏ luôn `res.status(200).json(...)` thứ hai ghi đè lên response đã gửi | `:204` |
| `presentation/routes/index.ts` | Thêm `requireNotViewer` cho `POST /leads/:leadId/meetings` và `POST /leads/:leadId/proposals` | `:51-52` |
| `presentation/controllers/LeadIntakeController.ts` | Inject `IAuditRepository` (tham số 6); helper `recordLeadAudit()` + 4 call site `LEAD_CREATED`/`LEAD_QUALIFIED`/`LEAD_UPDATED`/`LEAD_DELETED`; helper `routeParam()` chuẩn hoá `req.params.id` (kiểu `string \| string[]`) ở 3 handler | `:11-15`, `:27-43`, `:124`, `:268`, `:398`, `:448` |
| `container.ts` | Truyền `auditRepository` vào `LeadIntakeController` | `:221` |

## 10. Thay đổi frontend

| File | Thay đổi |
|---|---|
| `components/ProposalStudioTab.tsx` | Thêm `canPrivilege = ADMIN \|\| PRESALE_LEAD` (`:265`); nút Approve `disabled={!canPrivilege}` + tooltip giải thích (`:519-521`) — đồng nhất với `ProposalsStudio.tsx:53` |
| `components/AIWorkspace.tsx` | "Nộp xét duyệt" gọi thật `updateProposalLifecycle(realProposal.id, 'IN_REVIEW')` (`:514`), cập nhật state, có nhánh lỗi; nếu lead chưa có proposal thì báo rõ thay vì toast màu hồng |
| `components/PortalDesk.tsx` | `canManage = user?.role !== 'VIEWER'` (`:31`) áp cho **revoke session** (`:436`) và **thêm/xoá material** (`:451`, `:478`) — đúng ba chỗ backend enforce. Form **tạo phiên** cố ý *không* gate (`:396`) vì `POST /portal/sessions` không chặn role nào; thông báo `:289` viết lại cho khớp. Xoá `firstShareBlocked` và dòng "Only APPROVED, SENT_TO_CLIENT…" không thể render |
| `components/MeetingsWorkspace.tsx` | `isViewer` (`:25`) chặn: hiện form tạo meeting (`:230`), status transition (`:289`), textarea+Save transcript (qua `transcriptEditable` `:176`), Analyze (`:316`); thêm banner mô tả quyền (`:207`) |
| `components/RfpIntake.tsx` | Import `useAuth`, `isViewer` (`:65`) chặn Run AI intake (`:265-266`), Skip AI (`:272`) và thay nút Save lead bằng dòng giải thích 403 (`:408-414`) |

## 11. Đã kiểm chứng

- `npx tsc --noEmit` **backend**: **34 → 34** (phát sinh mới 0). Trong quá trình viết `recordLeadAudit` có tạm sinh 4 lỗi (TS2345 generic `Request` không khớp, và 3 chỗ `string \| string[]` → `string \| null`); đã sửa bằng `Pick<Request,'auth'|'socket'>` và `routeParam()`, số lỗi trở về đúng baseline.
- 34 lỗi còn lại vẫn **100% nằm ở cluster meeting cô lập** đã liệt kê ở đợt 1 (`InspectMeetingUseCase`, `CreateMeetingUseCase`, `UpdateMeetingLifecycleUseCase`, `MeetingDTOs`, `ListMeetingsByLeadUseCase`, `GetMeetingByIdUseCase`, `scripts/testDiscoveryMeetingE2E`).
- `npx tsc --noEmit` **frontend**: **0 → 0**.
- Không chạy lệnh nào ghi DB; mọi kết luận trên đọc source, chưa phải kết quả test runtime.

## 12. Phát hiện mới — **chưa sửa**, cần quyết định

`components/DiscoveryMeetingsTab.tsx` **đang sống** (nạp ở `AIWorkspace.tsx:39`, render tại `:992`) nhưng gọi 5 endpoint **không tồn tại** trong router backend:

| Lời gọi frontend | Endpoint | Thực tế backend |
|---|---|---|
| `fetchMeetingsByLead` | `GET /meetings/lead/:leadId` | không có route 2 phân đoạn dưới `/meetings` → 404, và hàm **nuốt lỗi trả `[]`** (`meetingService.ts:52-59`) → tab luôn hiện "no meetings" mà không báo lỗi |
| `createMeeting` | `POST /meetings` | route thật là `POST /leads/:leadId/meetings` (`routes/index.ts:51`) |
| `inspectMeeting` | `POST /meetings/:id/inspect` | route thật là `POST /meetings/:id/analyze` |
| `updateMeetingLifecycle` | `PATCH /meetings/:id/lifecycle` | route thật là `PATCH /meetings/:id/status` |
| `updateMeeting` | `PUT /meetings/:id` | không có route PUT nào |

Kèm theo đó là **hai `MeetingStatus` song song** phía frontend: `services/meetingService.ts:21` định nghĩa `OPEN/LOCKED/INSPECTED/REOPENED` (thế hệ cũ, DiscoveryMeetingsTab dùng), còn `types/lead.ts:115` + `types/meeting.ts:5-12` là thế hệ khớp backend (`MEETING_STATUSES = ['OPEN','LOCKED','INSPECTED']`, `domain/entities/Meeting.ts:1`). `MeetingsWorkspace` (tab đang dùng bản đúng) vì vậy không bao giờ gửi `REOPENED`, còn Discovery tab thì có. Đây đúng là triệu chứng của cluster 34 lỗi biên dịch ở trên: **hai thế hệ API meeting song song**, tab cũ bị nối điện vào thế hệ đã mất. Sửa là viết lại cả tab hoặc xoá tab, vượt phạm vi "sửa bug phân quyền" → chờ quyết định.

## 13. Còn tồn (kế từ đợt 1, chưa đổi)

| # | Việc | Ghi chú |
|---|---|---|
| 1 | `POST /portal/sessions` mở cho cả `VIEWER` và không cần Proposal `APPROVED` | Đợt 2 chỉ làm UI **đừng giả vờ** chặn; muốn siết thật phải sửa backend (`portalRoutes.ts:15`), đổi hành vi sản phẩm đã ghi trong `PortalUseCases.ts:39` |
| 2 | Cluster meeting cô lập (34 lỗi tsc + mục 12) | quyết định "viết lại" hay "xoá" vẫn mở |
| 3 | Test runtime 11 luồng vừa sửa | mỗi bước ghi DB thật → **chờ duyệt** |
| 4 | `rate_cards` trống ở org chưa có bảng đơn giá | defect dữ liệu, không liên quan nhóm này |

## 14. Tài liệu đã cập nhật (đợt 2)

- `docs/RBAC_ROLES_AND_PERMISSIONS_GUIDE.md` **v2.5 → v2.6**: thêm dòng ma trận **3.4 Tạo mới Cuộc họp cho Lead** (VIEWER ❌), bổ sung mục 6 các điểm: RAG org scope (`:217-220`), gỡ `?organizationId=` khỏi `GET /proposals`, mục 7 (2 route con thiếu guard), mục 8 (cửa sau state machine → 409), mục 9 (audit cho luồng lead raw SQL), và ghi rõ **vì sao** tạo phiên portal không gate ở UI nhưng revoke/material thì có.

---
---

# ĐỢT 3 — defect phát hiện khi khảo sát `SOLUTION_ARCHITECT` (15/11/2026)

Bối cảnh: vẫn câu hỏi cũ — "*cùng lớp bug* đó có lặp lại ở role này không". Câu trả lời ngắn cho phần phân quyền: **không có gì để sửa**, vì `SOLUTION_ARCHITECT` không có gate riêng; delta thật so với `ADMIN`/`PRESALE_LEAD` chỉ là 6 nhóm (client CRUD, rate-card CRUD, mời/đổi role thành viên, đọc audit log, 4 chuyển trạng thái đề xuất đặc quyền, duyệt thư mục chéo tổ chức). Nhưng quá trình chứng minh điều đó lôi ra 9 defect **không liên quan tới role**, nằm ở tầng repository và ở hợp đồng với service AI — trong đó N1–N3 là một đường **lộ dữ liệu chéo tổ chức** đi qua hàm được dùng nhiều nhất của proposal repository.

## 15. Defect đã sửa

| # | Hiện tượng | Căn nguyên | Bằng chứng |
|---|---|---|---|
| N1 | Đọc `GET /proposals/:id` (và mọi đường đi qua `findById`) **trả về hồ sơ của tổ chức khác** khi id/leadId không khớp org hiện tại | `findById` chạy câu query có lọc org, nếu rỗng thì **thử lại lần hai bỏ hẳn điều kiện tổ chức**, rồi load luôn 10 sheet của bản vừa tìm được | `PostgresProposalRepository.ts:71-90` bản cũ (nhánh `if (proposalRes.rows.length === 0 && params.length > 1)` nằm ở `:82-87`). `findById` có **24 call site** — đây là đường đọc proposal phổ biến nhất |
| N2 | Tổ chức mang UUID sentinel `00000000-0000-0000-0000-000000000001` **vô hiệu hoá hoàn toàn** bộ lọc đa tenant | `if (organizationId && organizationId !== '00000000-…-0001')` — đúng tổ chức đó thì không nối `AND organization_id` vào SQL | hàng điều kiện trong `findById` bản cũ. Đo trên DB thật: **0/156** proposal mang org sentinel → không có ai cần nhánh này |
| N3 | Proposal có `organization_id IS NULL` đọc được từ **mọi** tổ chức | `AND (organization_id = $2 OR organization_id IS NULL)` | DB thật: **4/156** hồ sơ NULL org (tất cả `DRAFT`, không list query nào lộ ra) — dữ liệu vẫn còn, chỉ còn đường đọc chéo |
| N4 | `POST /proposals/:id/ui-brief` trả về **template hard-code** nhưng message ghi "AI UI Design Brief generated successfully" | Controller không hề gọi `llmGateway`; nếu sheet `Overview` thiếu `uiDesignBrief` thì dựng 5 trường văn mẫu cố định. Hệ quả kéo theo: `LLMTaskMode.TECH_ARCHITECTURE` (mode 6) **không có ai gọi** | `ProposalController.ts:139-156` bản cũ; `ai/server.py:229-231` định nghĩa mode 6 nhưng backend chưa từng gửi 6 |
| N5 | `AskKnowledgeUseCase` gửi **mode 5** ("Lead Proposal Architect… synthesize a comprehensive executive overview") cho một câu hỏi cần **trả lời kèm trích dẫn [1]** | Hệ thống prompt của mode 5 đối ngược yêu cầu của use case; ngoài ra các call site đều truyền `taskMode` bằng **số thô** nên không ai đọc ra chỗ nào lệch | `AskKnowledgeUseCase.ts:50`; `ai/server.py:226-228` |
| N6 | Thêm / xoá material của Client Portal **không để lại dấu vết** trong `audit_logs` | `createMaterial` không ghi audit; `deleteMaterial` trả `boolean` rồi bỏ, và use case còn **không nhận** `actorId` nên muốn ghi cũng không có user. Các hành động portal khác đều ghi (`CLIENT_PORTAL_SESSION_CREATED/REVOKED`, `PROPOSAL_SHARED_WITH_CLIENT`) | `PostgresPortalRepository.ts:143-174` bản cũ; bảng `audit_logs` không có CHECK nào trên `action`/`entity_type` (`001_initial_schema.sql:216-229`) nên thêm action mới không cần migration |
| N7 | **UI nói sai với mọi role** — 5 điểm: (a) `ClientPortalModal` seed sẵn 1 "câu hỏi khách hàng" + 1 "góp ý của CTO", trả lời câu hỏi bằng template JS, toast "Đã gửi phản hồi thành công", footer "Đang ghi nhận tín hiệu tương tác thời gian thực"; (b) `AIWorkspace` "Sync to Proposal Builder" chỉ `setActiveSubnav` + toast thành công, trong khi 6 khối Technical Summary là văn bản cứng; (c) `DiscoveryMeetingsTab` có 6 control ghi không chặn `VIEWER`; (d) `PortalDesk.shareable = Boolean(selected)` luôn đúng trong nhánh đã chọn proposal; (e) badge "Toàn quyền chỉnh sửa" cấp cho cả `SOLUTION_ARCHITECT` dù role này mất Approve và toàn bộ CRUD rate card | UI là chỗ duy nhất người dùng đọc được quyền của mình, và nó đang mô tả **sản phẩm mẫu**, không phải hệ thống đang chạy | xem mục 17 |
| N8 | `frontend/src/types/portal.ts` export `PORTAL_MANAGER_ROLES` + `PORTAL_FIRST_SHARE_ROLES` không component nào import | kế từ tồn #3 mục 13 đợt 2; hằng số backend cùng tên thì **có** thật và đang enforce (`PortalUseCases.ts:151,162,187`) | `grep` frontend sau khi xoá: 0 kết quả |
| N9 | `CreatePortalSessionUseCase` nhận `role: UserRole` rồi bỏ đó; comment trong use case ghi "Allow sharing **any proposal status** without strict role limitation" | Không có cửa nào "theo yêu cầu": cửa **trạng thái** có thật và nằm ở repository (`PostgresPortalRepository.createSession:27`) — comment phủ nhận một ràng buộc đang chạy, là nguồn trực tiếp khiến đợt 2 ghi sai tài liệu | `PortalUseCases.ts:36-39` bản cũ |

## 16. Thay đổi backend

| File | Thay đổi | Dòng |
|---|---|---|
| `infrastructure/database/repositories/PostgresProposalRepository.ts` | `findById(id, organizationId)` bỏ `?` thành **tham số bắt buộc**; một câu SQL duy nhất `AND organization_id = $2`; xoá nhánh retry chéo tổ chức, xoá sentinel bypass, xoá `OR organization_id IS NULL` | `:71-79` |
| `application/use-cases/GenerateUIDesignBriefUseCase.ts` | **File mới.** Đọc proposal theo org; nếu sheet `Overview` đã có `uiDesignBrief` đúng schema thì trả `source: 'sheet'`; ngược lại gọi `llmGateway.generate({ taskMode: TECH_ARCHITECTURE })`, `parseJsonObject` + `isBrief` kiểm tra hình; AI trả rác → `ConflictError` nói rõ "Nothing was generated", **không** âm thầm dựng mẫu | `:51-74` |
| `presentation/controllers/ProposalController.ts` | Bỏ nguyên khối template hard-code; `generateUIDesignBrief` dùng use case mới, trả thêm `meta.source` và message phụ thuộc nguồn ("generated by the AI service" / "read from the proposal Overview sheet"); chưa wire thì `501` | `:140-158` |
| `container.ts` | `new GenerateUIDesignBriefUseCase(proposalRepository, llmGateway)` + truyền vào `ProposalController` (tham số 13) | `:208`, `:223` |
| `application/use-cases/AskKnowledgeUseCase.ts` | `taskMode: 5` → `LLMTaskMode.TECH_ARCHITECTURE` (6) | `:50` |
| `application/use-cases/GenerateProposalSheetsUseCase.ts` | `taskMode: 5` → `LLMTaskMode.PROPOSAL_BUILDER` — **cùng giá trị 5**, chỉ đổi số thô thành tên enum | `:137` |
| `application/use-cases/PortalUseCases.ts` | `AskPortalProposalUseCase`: `5` → `PROPOSAL_BUILDER` (không đổi hành vi). Xoá `APPROVED_PROPOSAL_SHARE_ROLES` (khai báo, không dùng). Bỏ `role` khỏi input `CreatePortalSessionUseCase`. Comment mới nêu đúng: không giới hạn role **là chủ đích**, còn cửa trạng thái thì có thật và nằm ở repository | `:10`, `:17-19`, `:38-39`, `:90` |
| `application/use-cases/PortalUseCases.ts` (`DeletePortalMaterialUseCase`) | Nhận thêm `actorId` và chặn nếu thiếu | `:186-190` |
| `domain/repositories/IPortalRepository.ts` | `deleteMaterial(proposalId, materialId, organizationId, actorId)` | `:22` |
| `infrastructure/database/repositories/PostgresPortalRepository.ts` | Ghi `CLIENT_PORTAL_MATERIAL_ADDED` / `CLIENT_PORTAL_MATERIAL_DELETED` (`entity_type = 'portal_material'`, payload `{proposalId,title,fileName,isShared}`); `createMaterial` trả `null` ngay khi INSERT không có dòng để không audit một material không tồn tại | `:156-168`, `:170-181` |
| `presentation/controllers/PortalController.ts` | `createSession` không gửi `role`; `deleteMaterial` yêu cầu `req.auth?.sub` và truyền `actorId` | `:45-50`, `:76-84` |

## 17. Thay đổi frontend

| File | Thay đổi |
|---|---|
| `components/ClientPortalModal.tsx` | Bỏ seed `aiAnswers`/`comments` (`:46-47`) → 2 danh sách khởi tạo rỗng kèm dòng giải thích (`:462`, `:504`); câu trả lời "AI" gắn nhãn `[Xem thử]` và nói rõ khách thật phải hỏi qua đường dẫn portal (`:60`); nút gửi góp ý đổi `toast.success('Đã gửi phản hồi thành công…')` → `toast.info('Bản xem thử: … chưa được gửi về đội Presale')` (`:69-71`); footer "Presaleee Telemetry: Đang ghi nhận tín hiệu…" → "Bản xem thử Client Portal — không ghi nhận telemetry, không lưu câu hỏi/góp ý vào hệ thống" (`:539`) |
| `components/AIWorkspace.tsx` | (b) 6 khối Technical Summary tự nhận là "dữ liệu demo dựng sẵn trong trình duyệt"; nút "Sync to Proposal Builder" → **"Mở Proposal Builder"** + `toast.info` nói không có dữ liệu nào được đồng bộ (`:1025-1041`). (e) thêm `isOrganizationAdmin` (`:87`), badge chia **3 tầng** theo đúng enforcement thay vì 2 ("Toàn quyền trong tổ chức" / "Chỉnh sửa nghiệp vụ — không có quyền quản trị tổ chức" / "Chỉ đọc"), và viết lại cả 6 dòng mô tả role theo **ma trận thật**: thừa nhận `PRESALE_LEAD` ≡ `ADMIN`, `SOLUTION_ARCHITECT`/`SALES_REP` ≡ `PRESALE_CONSULTANT` (`:461-486`) |
| `components/DiscoveryMeetingsTab.tsx` | (c) `isViewer` chặn đủ **6 control ghi**: toggle action item (`:492`, kèm `disabled` trên checkbox `:504`), 4 nút lifecycle (`:591`, `:603`, `:615`, `:627`), Run AI Inspect (`:638`) — mỗi chỗ có `title` giải thích 403. Chặn thêm nút mở modal "tạo meeting kế thừa" (`:558`) dù nó chỉ mở form, cho khỏi hở đường vào `handleCreateMeeting`. **Thêm** (`:220-226`) một cảnh báo ngay trong tab: 5 endpoint nó gọi không tồn tại, backend chỉ có 4 route khác tên, "mọi nút ở đây hiện trả về 404 và danh sách luôn trống" — thay vì để tab im lặng hiển thị "chưa có cuộc họp" |
| `components/PortalDesk.tsx` | (d) `shareable` suy ra từ **trạng thái thật của proposal** (`APPROVED`/`SENT_TO_CLIENT`/`ACCEPTED`) thay vì `Boolean(selected)` (`:188`); khi không đủ điều kiện thì hiển thị lý do ngay trong card thay vì ẩn mờ form (`:410`); comment `:29-31` viết lại đúng bản chất gate thật (`PORTAL_MANAGER_ROLES` = mọi role trừ VIEWER, chỉ áp cho revoke + material; `POST /portal/sessions` không gate) |
| `types/portal.ts` | Xoá `PORTAL_MANAGER_ROLES` + `PORTAL_FIRST_SHARE_ROLES` (N8) |

## 18. Đính chính tài liệu đợt 1 & 2 (trước đó mình ghi sai)

Không im lặng sửa — đây là 3 chỗ **tài liệu do mình viết đang cãi nhau với code**:

1. **Mục 13 đợt 2, dòng 1** và **mục 7 đợt 1, dòng 1** ghi "`POST /portal/sessions` mở cho cả `VIEWER` **và không cần Proposal `APPROVED`**". Vế đầu đúng, **vế sau sai**: `PostgresPortalRepository.createSession:27` từ chối `INSERT` nếu trạng thái không thuộc `APPROVED/SENT_TO_CLIENT/ACCEPTED`, và `:31-32` tự đổi `APPROVED → SENT_TO_CLIENT` + ghi `PROPOSAL_SHARED_WITH_CLIENT`. `CreatePortalSessionUseCase` không kiểm tra trạng thái **vì repository đã kiểm tra**, không phải vì không có cửa nào. Nguồn gốc sai lầm: đọc mỗi use case rồi tin comment "any proposal status as requested" (N9) thay vì đọc SQL.
2. **Mục 10 đợt 2, dòng `PortalDesk`** ghi "Xoá `firstShareBlocked` và dòng 'Only APPROVED, SENT_TO_CLIENT…' không thể render". Lập luận "không thể render" đúng ở thời điểm đó (cờ `shareable` giả), nhưng hệ quả là mình **xoá luôn một thông báo đúng nội dung**. Đợt 3 giữ nguyên việc xoá `firstShareBlocked` nhưng dựng lại thông báo trạng thái trên một cờ thật.
3. **Mục 10 đợt 2** cũng ghi "Form tạo phiên cố ý không gate (`:396`)". Sau đợt 3 thì form tạo phiên **có** gate — nhưng gate theo **trạng thái hồ sơ** (thứ backend thật sự chặn), không gate theo role (thứ backend thật sự không chặn). Hai loại gate khác nhau, tài liệu cũ gộp chung một câu nên dễ hiểu thành "đợt 2 để hở".

Ngoài ra `docs/RBAC_ROLES_AND_PERMISSIONS_GUIDE.md` mục portal cần nói rõ `PORTAL_MANAGER_ROLES` **liệt kê cả 5 role không phải VIEWER**, tức nó tương đương `requireNotViewer` chứ không phải một tầng quản trị riêng.

## 19. Đã kiểm chứng

- `npx tsc --noEmit` **backend**: **34 → 34** (phát sinh mới 0). 34 lỗi vẫn **100%** nằm ở cluster meeting cô lập (`InspectMeetingUseCase` 11, `testDiscoveryMeetingE2E` 10, `CreateMeetingUseCase` 5, `UpdateMeetingLifecycleUseCase` 3, `MeetingDTOs` 3, `ListMeetingsByLeadUseCase` 1, `GetMeetingByIdUseCase` 1) — không file nào touched đợt này.
- `npx tsc --noEmit` **frontend**: **0 → 0**.
- `grep -rn "taskMode: [0-9]" backend/src` → **rỗng**: mọi call site đã dùng enum.
- `grep -rn "PORTAL_MANAGER_ROLES|PORTAL_FIRST_SHARE_ROLES|APPROVED_PROPOSAL_SHARE_ROLES" frontend/src` → chỉ còn 1 **comment** ở `PortalDesk.tsx:29` (không còn code tham chiếu).
- `git diff --stat` phần code (không tính 2 file docs): **14 file đã sửa, +129/−101**, cộng **1 file mới** `GenerateUIDesignBriefUseCase.ts` (76 dòng, chưa được git theo dõi tại thời điểm đo). **Chưa chạy bất kỳ lệnh nào ghi DB**, chưa test runtime — toàn bộ kết luận trên là đọc source + biên dịch.

## 20. Phát hiện mới — **chưa sửa**, cần quyết định

| # | Phát hiện | Bằng chứng | Vì sao chưa sửa |
|---|---|---|---|
| N10 | `GET /portal/proposals/:id/comments` phía khách hàng trả **toàn bộ** comment của hồ sơ, không lọc theo `portal_session_id` → khách A (token còn hiệu lực) đọc được góp ý của khách B trên cùng proposal, kể cả khi CTO của B ghi điều nhạy cảm | `PortalUseCases.ts:105-109` → `PostgresPortalRepository.listComments:93-101` chỉ `WHERE proposal_id AND organization_id` | đây là thay đổi **hành vi sản phẩm** (ẩn/hiện bình luận chéo khách), không phải bug phân quyền nội bộ |
| N11 | `findActiveSession:64` chấp nhận `p.status IN ('DRAFT','IN_REVIEW',…)` → kéo hồ sơ về `DRAFT` **không vô hiệu** session đã cấp. `getProposal`/`ask`/`exportPdf` vẫn tự chặn (`SENT_TO_CLIENT/ACCEPTED`) nên nội dung không lộ, nhưng `listComments` + `listMaterials` thì không chặn trạng thái | đối chiếu `PostgresPortalRepository.ts:59-67` với `PortalUseCases.ts:65,83,131-135` và `createComment:118` (nơi **có** chốt trạng thái) | nên sửa cả cụm N10+N11 một lần, chờ duyệt phạm vi |
| N12 | 4/156 proposal vẫn `organization_id IS NULL`. Sau N1–N3 thì **không route nào đọc được** chúng nữa (kể cả org chủ) — đã đổi "lộ chéo" thành "mồ côi" | probe read-only trên DB thật | backfill là **ghi DB**, cần duyệt + cần biết 4 hồ sơ đó thuộc org nào |
| N13 | `ClientPortalModal` vẫn dựng nội dung hard-code: "5 phân hệ cốt lõi", "Độ trễ < 150ms", và `compliance` mặc định `SOC-2 Type II, ISO 27001` khi lead thiếu metadata (`:43`) | `ClientPortalModal.tsx:265-437` | đã gắn nhãn "Bản xem thử" ở footer nhưng **thân trang** vẫn trình bày như hồ sơ thật; sửa tới nơi là viết lại cả preview, vượt phạm vi N7 |

## 21. Còn tồn (kế + mới)

| # | Việc | Ghi chú |
|---|---|---|
| 1 | `POST /portal/sessions` mở cho `VIEWER` | **đính chính**: vẫn mở thật, nhưng chỉ với hồ sơ đã `APPROVED/SENT_TO_CLIENT/ACCEPTED` (xem mục 18.1). Muốn siết role phải sửa `portalRoutes.ts:15` — quyết định sản phẩm, chưa được trả lời |
| 2 | Cluster meeting cô lập (34 lỗi tsc + mục 12) | `DiscoveryMeetingsTab` đã có cảnh báo tự nhận trong UI; vẫn chờ "viết lại" hay "xoá" |
| 3 | Test runtime các luồng đã sửa (đợt 2 + đợt 3) | mỗi bước ghi DB thật → **chờ duyệt** |
| 4 | N10/N11/N12/N13 (mục 20) | chờ duyệt phạm vi |
| 5 | `rate_cards` trống ở org chưa có bảng đơn giá | defect dữ liệu, ngoài nhóm này |

## 22. Tài liệu đã cập nhật (đợt 3)

- File này: thêm `# ĐỢT 3` (mục 15 bảng defect N1–N9, 16 thay đổi backend, 17 thay đổi frontend, 18 đính chính đợt 1–2, 19 kiểm chứng, 20 phát hiện mới N10–N13, 21 còn tồn, 22 mục này).
- `docs/RBAC_ROLES_AND_PERMISSIONS_GUIDE.md` **v2.6 → v2.7**:
  - Mục 3.4 (`SOLUTION_ARCHITECT`): thêm cảnh báo "không có gate nào nhắc riêng tới role này — về API giống hệt `PRESALE_CONSULTANT`/`SALES_REP`, kém `ADMIN`/`PRESALE_LEAD` đúng 6 nhóm", và viết lại gạch đầu dòng **UI Prototype Brief** (từ đợt 3 mới thật sự gọi AI).
  - Mục 4 ghi chú ma trận: **sửa phát biểu sai** "POST /portal/sessions không kiểm tra trạng thái Proposal" → có kiểm tra, ở repository; cập nhật nhật tử role portal đã xoá.
  - Mục 6.3 (đa tenant): thêm bullet `findById` retry-cross-tenant (N1–N3) + hệ quả 4 hồ sơ NULL org thành "mồ côi"; sửa câu "vá hai chỗ lọt lưới" thành 5 chỗ.
  - Mục 6.6: nói rõ `PORTAL_MANAGER_ROLES` = mọi role trừ VIEWER (tương đương `requireNotViewer`, không phải tầng quản trị riêng) và phân biệt gate **trạng thái** với gate **role** ở `PortalDesk`.
  - Mục 6: thêm **10** (audit material portal), **11** (bảng đối chiếu `task_mode` cũ/mới, ghi rõ chỗ nào đổi hành vi và chỗ nào chỉ đổi số thô thành enum), **12** (`ui-brief` từng không gọi AI).

---

# ĐỢT 4 — defect phát hiện khi khảo sát `SALES_REP` (15/11/2026)

Phạm vi đợt này: **N14, N15, N16** theo yêu cầu. Không đụng N10–N13, N19, không ghi DB.

## 23. Bảng defect

| # | Defect | Bằng chứng **trước** khi sửa | Sau khi sửa |
|---|---|---|---|
| **N14** | UI gọi `PATCH /leads/:id` và `PATCH /leads/:id/status`, backend chỉ khai báo `PUT '/:id'` và **không có route `/status` nào** ⇒ "Save fields" và mọi nút "Status machine" trả 404 (text thô của Express, không phải thông báo nghiệp vụ) | `leadService.ts:169-173` ↔ `leadIntakeRoutes.ts:27` (cũ); call site `LeadsDirectory.tsx:146`/`:162`; `UpdateLeadUseCase`/`UpdateLeadStatusUseCase` import ở `container.ts:47-48` (cũ) nhưng **không bao giờ được khởi tạo** | `leadIntakeRoutes.ts:31` (`PATCH /:id`), `:35` (`PATCH /:id/status`), `:27` (`GET /:id/qualifications/latest`) đã mount; `container.ts:172-177` khởi tạo đủ 6 use case |
| **N15** | State machine lead **chỉ chạy ở frontend**, trong khi `PUT /leads/:id` nhận `status` từ body và ghi thẳng — **không kiểm tra bước chuyển, không kiểm tra BANT** ⇒ dòng chữ "APPROVED requires a stored BANT score" là rule không tồn tại | `LeadIntakeController.ts:362,381,392` (cũ) vs `frontend/src/types/lead.ts:17-28`; **và** `AIWorkspace.tsx:273` (cũ) đang gửi `status` qua chính cửa sau đó | `PUT`/`PATCH /:id` chỉ còn một delegate `UpdateLeadUseCase`, nó **throw 400** khi body có `status` (`LeadUseCases.ts:195`); đổi trạng thái buộc đi `UpdateLeadStatusUseCase` (`:210-242`, bảng transition nội bộ + `updateStatusWithQualificationCheck`) mà SQL chốt `($3 <> 'APPROVED' OR bant_score IS NOT NULL)` **và** `status = ANY(allowedCurrentStatuses)` (`PostgresLeadRepository.ts:128-138`) ⇒ kiểm tra và ghi trong **cùng một câu UPDATE**, không có window đua |
| **N16** | `listLeads` bỏ qua **cả 7** query param, hard-code `LIMIT 50`, không trả `meta`; `SELECT` thiếu `assigned_to`/`updated_at`/`bant_score`/`client_id` | `LeadIntakeController.ts:300-303` (cũ) trong khi `useLeadDirectory.ts:20` và `leadService.ts:139-147` gửi đủ 7 tham số | `ListLeadsUseCase` (`LeadUseCases.ts:149-170`, validate `page>=1`, `limit 1..100`) + `PostgresLeadRepository.list:69-94` (COUNT thật, filter status/source/assignedTo/clientId, `ILIKE` search **có escape `%_\`**, `ORDER BY updated_at, created_at DESC`, LIMIT/OFFSET); controller trả `meta {total,page,limit,totalPages}` (`LeadIntakeController.ts:332-336`) |
| **N16-b** *(phát sinh trong lúc sửa N16)* | **Hai client đọc hai shape khác nhau trên cùng một endpoint.** `AIWorkspace`/`ProposalStudioTab`/`ClientPortalModal` đọc `raw_rfp_content`, `extracted_metadata` (khớp raw-SQL cũ ⇒ chạy được); `LeadsDirectory` khai `LeadRecord`/`LeadListItem` **camelCase** ⇒ mọi field camel đều `undefined` lúc chạy: ô RFP trống (`:101`), so sánh `detail.rawRfpContent` sai (`:137`), panel "Extracted metadata" luôn "—" (`:535-538`), cột BANT luôn "—" (`:450`), cột ngày luôn rỗng (`:451`), `qualificationFromLead` luôn `null` (`:31`). Đây là lý do thật khiến N14/N15 không ai phát hiện sớm: trang dùng được một nửa nên lỗi 404 bị coi là chuyện nhỏ | `leadService.ts:52-66` (cũ, snake) ↔ `:160-185` (camel); không có hàm chuyển đổi nào trong `apiClient.ts` | API lead giờ **chỉ còn một shape camelCase** (do `mapLead` của repository sinh ra). `LeadItem` đổi sang camel (`leadService.ts:52-70`), 31 reference ở `AIWorkspace` (27 `extracted_metadata` + 4 `raw_rfp_content`), 5 ở `ProposalStudioTab`, 1 ở `ClientPortalModal` đổi theo. `tsc --noEmit` frontend **0 lỗi** chính là bằng chứng không còn chỗ nào đọc tên cũ |

## 24. Thay đổi backend

- `container.ts:172-177`: khởi tạo 6 use case lead trước đó chỉ nằm trong `import` (`:44-52`); `:231-244` truyền vào `LeadIntakeController` theo thứ tự 12 tham số — `dbPool/llmGateway/auditRepository` vẫn ở cuối vì `analyze` và `qualify` legacy còn dùng.
- `LeadIntakeController.ts`: `listLeads:326`, `getLeadById:343`, `updateLead:354`, `changeStatus:379`, `latestQualification:397`, `deleteLead:410` — **xoá toàn bộ SQL thô** của 5 handler (−~120 dòng raw query). Thêm `leadListFilters:27-46`: đọc **từng key một** thay vì spread `req.query`, nên query-string không có đường nào ghi đè `organizationId` (scope luôn spread trước, filters luôn spread sau).
- `leadIntakeRoutes.ts`: `PUT /:id` giữ nguyên nhưng trỏ đúng một handler với `PATCH /:id` (`:31-32`) — hai verb, một triển khai, không phải shim tương thích ngược.
- `qualify` (`POST /:id/qualify`, legacy heuristic): field `lead` trong response giờ lấy qua `GetLeadUseCase` nên camelCase; **không** động vào logic AI/fallback 88 bên trong.

## 25. Thay đổi frontend

- `leadService.ts`: `LeadItem` camelCase + thêm `updatedAt`/`bantScore`/`clientId`/`assignedTo`; `updateLead` → `PATCH` (`:117-122`); thêm `updateLeadStatus` (`:124-129`); `LeadFieldUpdate` (`:113-115`) **loại `status` khỏi kiểu tham số** để không UI nào vô tình gửi trạng thái qua route trường.
- `AIWorkspace.tsx:257-296`: tách lưu **2 bước** — trường trước, trạng thái sau. Nếu backend chặn bước chuyển: nội dung đã lưu vẫn được giữ, modal **không đóng**, toast nêu lý do 409 và trạng thái cũ (`"Nội dung đã lưu — trạng thái vẫn là …"`).
- `AIWorkspace.tsx:1706-1716`: select trạng thái bỏ 5 option hard-code, sinh từ `LEAD_TRANSITIONS` + trạng thái hiện tại ⇒ UI không còn mời gọi bước mà API sẽ chặn; kèm dòng chú "APPROVED cần điểm BANT đã lưu".
- `LeadsDirectory.tsx:384`: "Tất cả" dùng `meta?.total ?? leads.length` (tổng thật của cả org); `:417-419`: chú thích hai nhãn còn lại chỉ đếm trong trang hiện tại.
- `ProposalStudioTab.tsx`, `ClientPortalModal.tsx`: chỉ đổi tên field sang camel, không đổi logic hiển thị.

## 26. Hệ quả hành vi — cần biết trước khi test

1. **Xoá lead không còn xoá proposal.** Handler cũ chạy `DELETE FROM proposals WHERE lead_id = $1`; `DeleteLeadUseCase` (`LeadUseCases.ts:250-255`) chỉ xoá lead và để FK tự xử: `proposals.lead_id ON DELETE SET NULL` (`001_initial_schema.sql:167`) ⇒ **proposal sống sót, mất liên kết lead** (vẫn còn `organization_id` nên vẫn liệt kê/dashboard bình thường); `meetings.lead_id ON DELETE CASCADE` (`:89`) vẫn bị xoá như trước. Đây là hành vi do **schema** khai báo, handler cũ đang ghi đè nó.
2. **`PUT /leads/:id` nghiêm khắc hơn trước**: có `status` trong body ⇒ `400`; `clientId`/`assignedTo` đi qua `ReferenceValidator` ⇒ UUID trỏ user/client không thuộc org bị chặn (trước đây raw SQL ghi thẳng, không kiểm tra).
3. **Hợp đồng API lead đổi case** với mọi consumer bên ngoài (Postman, script, tài liệu cũ): `raw_rfp_content` → `rawRfpContent`, `extracted_metadata` → `extractedMetadata`, thêm `updatedAt`/`bantScore`/`organizationId`, và `GET /leads` có `meta`.
4. **`GET /leads` mặc định 20 dòng/trang** (UI gửi `PAGE_SIZE = 20`), trần 100 — không còn "50 dòng mới nhất vô điều kiện".

## 27. Đã kiểm chứng

- `npx tsc --noEmit` **backend**: **34 → 34**. Trung gian từng phát sinh **1** lỗi mới (`Request<unknown, …>` làm `params` mất kiểu ở `LeadIntakeController.ts:355`) và đã sửa; chạy lại: `grep "error TS" | grep -vi meeting | grep -v testDiscovery` → **rỗng**, tức 34 lỗi còn lại 100% nằm ngoài file touched (cluster meeting cô lập).
- `npx tsc --noEmit` **frontend**: **0 → 0** (exit code 0 xác nhận bằng lệnh riêng, không suy từ output rỗng).
- `git diff --stat`: **8 file, +214/−182**; `git status --porcelain` → **không file mới, không untracked**.
- **Chưa** test runtime: chưa gọi API thật, chưa đăng nhập, chưa đọc/ghi DB. Toàn bộ kết luận trên là **đọc source + biên dịch**. Riêng N14/N15/N16 muốn kết luận "đã chạy đúng" phải test tay (mục 29, cần duyệt vì mỗi bước ghi DB thật).

## 28. Phát hiện mới — **chưa sửa**, cần quyết định

| # | Phát hiện | Bằng chứng | Vì sao chưa sửa |
|---|---|---|---|
| **N20** | State machine vẫn bị **đi vòng** bởi chính luồng BANT: hai endpoint qualify tự ý ghi `status = 'QUALIFIED'` không kiểm tra bước chuyển, trong khi bảng chỉ cho `QUALIFYING → QUALIFIED` — tức từ `NEW` vẫn nhảy thẳng lên `QUALIFIED` được | `PostgresLeadRepository.saveQualification:150` và `LeadIntakeController.qualify:294` | đóng lại phải chọn 1 trong 2: (a) qualify chỉ chấm điểm, không đổi trạng thái; (b) nới bảng transition. Cả hai đều là **quyết định hành vi sản phẩm**, ngoài phạm vi N14–N16 |
| **N21** | 5 field `organization`, `client_name`, `requirements_summary`, `client_request_raw`, `qualification_status` **không endpoint lead nào trả** ⇒ UI luôn rơi vào fallback hard-code ('DUT', 'Chưa phân loại', …) | kiểm kê `AIWorkspace.tsx:1170/1232/1462/1604/1608`, `ClientPortalModal.tsx:38`; `LeadRow` của repository không có column nào tương ứng | cùng họ N13/N19 (nội dung dựng sẵn). Mình **giữ nguyên** để không lan phạm vi, chỉ đánh dấu trong type (`leadService.ts:62`) |

## 29. Còn tồn (kế + mới)

| # | Việc | Ghi chú |
|---|---|---|
| 1 | Test runtime N14/N15/N16 (kế hoạch 6 bước: Save fields → đổi status hợp lệ → đổi status trái phép → APPROVED khi chưa có BANT → search/filter → phân trang) | **ghi DB thật → chờ duyệt** |
| 2 | N20, N21 (mục 28) | chờ quyết định hành vi |
| 3 | N10, N11, N12, N13(+N18), N19 (đợt 3 + khảo sát SALES_REP) | chờ duyệt phạm vi |
| 4 | `POST /portal/sessions` mở cho `VIEWER` | quyết định sản phẩm, chưa được trả lời |
| 5 | Cluster meeting cô lập (34 lỗi tsc) | chờ "viết lại" hay "xoá" |
| 6 | `rate_cards` trống ở org chưa có bảng đơn giá | defect dữ liệu, ngoài nhóm này |

## 30. Tài liệu đã cập nhật (đợt 4)

- File này: thêm `# ĐỢT 4` (23 bảng defect N14–N16 + N16-b, 24 backend, 25 frontend, 26 hệ quả hành vi, 27 kiểm chứng, 28 N20–N21, 29 còn tồn, 30 mục này).
- `docs/RBAC_ROLES_AND_PERMISSIONS_GUIDE.md` **v2.7 → v2.8**:
  - Mục 3.5 (`SALES_REP`): viết lại 4 gạch đầu dòng theo **enforcement thật** — thêm/tách duty Pipeline giờ đã chạy thật, ghi rõ duty "nhập thông tin liên hệ" vẫn bất khả (N17), `.txt` vẫn mock (N18/N13), Telemetry chỉ là một timestamp ghi đè (N19).
  - Mục 6 thêm **13**: state machine lead nay enforce ở đâu (use case + SQL một câu), `PUT`/`PATCH` từ chối `status`, và **N20** (qualify còn đi vòng) ghi rõ là lỗ chưa đóng.
  - Mục 6 thêm **14**: hợp đồng API lead một shape camelCase + `meta`; danh sách field UI đọc mà không endpoint nào trả (N21).

---

# ĐỢT 5 — đóng N20/N21/N18/N13/N19/N12 + **test runtime lần đầu** (15/11/2026)

Phạm vi: toàn bộ hàng đợi còn lại, và **được phép ghi DB thật** ("cứ sửa giúp mình, thoải mái ghi db"). Đây là đợt đầu tiên backend chạy được trong workspace này — xem mục 34 về `pdfmake`.

## 31. Bảng defect

| # | Defect | Bằng chứng **trước** khi sửa | Sau khi sửa |
|---|---|---|---|
| **N20** | Hai đường qualify **tự ý ghi `status='QUALIFIED'` vô điều kiện** và **hai đường ghi hai chỗ khác nhau**: `POST /:id/qualify` (legacy) viết `extracted_metadata.qualification` bằng raw SQL, **không bao giờ chạm `bant_score`**; `PostgresLeadRepository.saveQualification` cũng đổi status bất kể lead đang ở đâu | `LeadIntakeController.ts:294` (cũ, raw `UPDATE leads SET status='QUALIFIED', extracted_metadata = jsonb_set(...)`), `PostgresLeadRepository.ts:150` (cũ). Hệ quả dây chuyền: rule "APPROVED cần điểm BANT đã lưu" kiểm `bant_score` trong khi UI chỉ ghi `extracted_metadata` ⇒ **rule không bao giờ thoả được từ UI** | Một use case duy nhất `SaveQualificationUseCase` (`LeadUseCases.ts:278-306`) là cửa ghi BANT; cả hai endpoint đi qua nó (`LeadIntakeController.ts:295`, `LeadUseCases.ts:336`). Status chỉ đổi trong phạm vi bảng: `statusesThatCanReach('QUALIFIED')` truyền xuống `saveQualification:148-160`, đóng trong **cùng một câu UPDATE** với `CASE WHEN status = ANY($5::varchar[]) THEN 'QUALIFIED' ELSE status END` ⇒ **đã proof bằng API**: re-qualify một lead `WON` trả 200 nhưng status vẫn `WON` (mục 33, case H3) |
| **N20-b** | Bảng transition **không có đường nào vào `QUALIFIED` từ `NEW`/`IN_REVIEW`** (chỉ `QUALIFYING → QUALIFIED`), nên nếu đóng N20 nghiêm khắc thì nút "Qualify" trên UI thành dead button với mọi lead mới | `frontend/src/types/lead.ts:17-28` (cũ) vs luồng thật: AIWorkspace bấm Qualify ngay ở `NEW` | Cộng thêm `NEW/IN_REVIEW → QUALIFIED` vào bảng **một lần, ở backend** (`LeadUseCases.ts:18-30`) — `LEAD_TRANSITIONS` giờ là source of truth duy nhất; frontend chỉ còn bản copy có chú thích trỏ về file backend. Bù lại, vào `QUALIFIED` **bắt buộc có điểm đã lưu** (`QUALIFICATION_REQUIRED_STATUSES:38`), nên fast-path không còn là cửa sau |
| **N21** | `LeadItem` khai 6 field **không endpoint nào trả** ⇒ UI rơi vào fallback bịa sẵn ('DUT', 'Chưa phân loại', …) | `leadService.ts:52-66` (cũ) vs `mapLead` của repository; field thật duy nhất còn thiếu là `bantDetails` | Bỏ `qualification_score`, `qualification_status`, `organization`, `client_name`, `requirements_summary`, `client_request_raw`; thêm `bantDetails` (`leadService.ts:64`). `LeadListItem` đổi thành `Omit<Lead,'rawRfpContent'>` (`Lead.ts:24`) và repository **không cắt `bant_details` khỏi list nữa** ⇒ UI đọc đúng một nguồn. **Đã proof**: `GET /leads` trả đúng 14 key camelCase, 0 key snake (mục 33, case B2/B3/B4) |
| **N18/N13** | Modal Portal khách hàng + nút tải "Executive Overview" `.txt`: **toàn bộ nội dung là hằng hard-code** (SLA 99.999%, 5 module, 20 tuần, 4 mốc thanh toán, "đã ký duyệt bởi Solution Architect"). Root cause thật: `AIWorkspace` **không truyền prop `proposal`** nên modal không có số liệu để hiển thị, và tab 2 tự nhận "10 Sheets Tiêu Chuẩn … đã kiểm duyệt" kể cả khi chưa có sheet nào | call site `AIWorkspace.tsx:344-350` (cũ, thiếu `proposal`); `ClientPortalModal.tsx` (cũ) không có accessor sheet nào | Truyền `proposal={realProposal}` (`AIWorkspace.tsx:348`). Modal đọc **thật 10 sheet** qua `overviewSheet/scopeSheet/architectureSheet/timelineSheet/pricingSheet/slaSheet`, sinh KPI, module list, phân đoạn thanh toán, `x/10 sheets đã tạo`, status/version thật; hằng số bịa thay bằng `MISSING_FACT = 'chưa có trong hồ sơ'` (`ClientPortalModal.tsx:22`); câu "ký duyệt bởi Solution Architect" **bị xoá** (proposal thật đang `DRAFT`); `.txt` tải về dựng từ sheet + footer ghi rõ nguồn; có amber notice khi chưa có sheet |
| **N19** | 4 card "Portal Telemetry" quảng cáo "lượt xem", "tài liệu đã tải", "lịch sử truy cập" — **schema chỉ lưu một timestamp bị ghi đè** | `portal_sessions` không có cột view-count/history nào; handler truy cập chỉ `UPDATE … last_accessed_at = NOW()` | Đổi tiêu đề thành "Dữ liệu Tương tác Thực tế từ Portal" + một dòng nói thẳng mỗi phiên chỉ lưu **một timestamp ghi đè**, không có lượt xem, không có lịch sử; số liệu suy ra từ field có thật, fallback nêu rõ "chưa phát sinh lượt truy cập" |
| **N12** | `proposals.organization_id` NULL ở **4/156 dòng** ⇒ proposal **vô hình** với mọi truy vấn list/dashboard (đều scope `organization_id = $1`) và không tenant nào đọc được | probe: `ed84f7b4…`, `8b89987a…` có `lead_id` và lead của chúng thuộc org `fb5e76e1…` (DUT); `1d38de4e…`, `9975f068…` **không lead, không `created_by`** | 2 dòng đầu **đã sửa và commit**: `UPDATE … SET organization_id = l.organization_id FROM leads l WHERE pr.id = <id> AND l.id = pr.lead_id AND pr.organization_id IS NULL` — lấy theo lead của chính nó, không hard-code org. 2 dòng orphan **không đoán**, báo ở mục 35 |

## 32. Thay đổi backend

- `LeadUseCases.ts`: thêm `LEAD_TRANSITIONS:18` + `statusesThatCanReach:31` + `QUALIFICATION_REQUIRED_STATUSES:38` (trước đây bảng transition **không tồn tại ở backend**); thêm `SaveQualificationUseCase:278`; `QualifyLeadUseCase` nhận use case đó ở tham số 3 (`:314`) và kết thúc bằng `saveQualification.execute` (`:336`) thay vì tự ghi; `UpdateLeadStatusUseCase:232-262` dùng bảng chung và phân biệt 2 thông báo 409 (bước trái phép vs thiếu điểm).
- `PostgresLeadRepository.ts`: `updateStatusWithQualificationCheck:128` nhận thêm `requiresQualification` và guard thành `AND ($5 = FALSE OR bant_score IS NOT NULL)`; `saveQualification:148` là UPDATE nguyên tử mới (điểm + details + `CASE` status, không đọc-sửa-ghi 2 bước).
- `ILeadRepository.ts`: `StoredQualification:32` + 2 chữ ký mới (`:38`, `:44`).
- `LeadIntakeController.ts`: **xoá raw SQL** trong `qualify`, thay bằng `saveQualificationUseCase.execute:295`; constructor thành 13 tham số (`:54`).
- `container.ts:172-173`: khởi tạo + nối `SaveQualificationUseCase`; `leadIntakeRoutes.ts:17-21`: comment mô tả lại đúng enforcement thật.

## 33. Kiểm chứng — **lần đầu có runtime**

Backend chạy thật trên `:5000`, đăng nhập `POST /auth/dev-login`, gọi API bằng `harness.mjs` (cookie jar) của suite e2e có sẵn. **22/22 case PASS**, lead test tạo ra đã `DELETE` sạch:

| Nhóm | Case | Kết quả đo được |
|---|---|---|
| Hợp đồng list | B1–B4 | `meta {total:2,page:1,limit:3,totalPages:1}`; 14 key camelCase, **0** key snake; `bantDetails` có mặt |
| State machine | D1 | `NEW → QUALIFIED` khi chưa có điểm ⇒ **409** `"QUALIFIED requires a stored BANT score — run qualification first."` |
| | D2 | `NEW → APPROVED` ⇒ **409** `"Lead cannot transition from NEW to APPROVED."` |
| | D3 | `status:'DONE'` ⇒ **400** kèm danh sách enum hợp lệ |
| | D4 | `NEW → IN_REVIEW` ⇒ 200 |
| Cửa sau | F1 | `PATCH /leads/:id` có `status` ⇒ **400** `"Change the lead status through PATCH /leads/:id/status…"` |
| | F2 | Cùng route không có `status` ⇒ 200, vẫn sửa được field |
| Một nguồn BANT | G1–G4 | `POST /:id/qualify` ⇒ 200; đọc lại: `bantScore=90`, `bantDetails` có 5 key, status `IN_REVIEW → QUALIFIED` |
| | G5 | `GET /:id/qualifications/latest` ⇒ 200, đúng bản đã lưu |
| Không tụt hạng | H1 | Có điểm rồi ⇒ `QUALIFIED → APPROVED` 200 (**trước đợt này bước này bất khả từ UI**) |
| | H2–H4 | `APPROVED → WON` 200; **re-qualify lead `WON` → status vẫn `WON`**; `WON → NEW` 409 `"Lead cannot transition from WON to NEW."` |
| Dữ liệu N12 | I1 | Lead `3cd4f3da…` sau backfill: `bantScore=85` + `bantDetails` 4 key, `/qualifications/latest` đọc được |

**Tĩnh**: `tsc --noEmit` backend **34 → 34** (100% cluster meeting cô lập: `InspectMeetingUseCase` 11, `testDiscoveryMeetingE2E` 10, `CreateMeetingUseCase` 5, `UpdateMeetingLifecycleUseCase` 3, `MeetingDTOs` 3, `ListMeetingsByLeadUseCase` 1, `GetMeetingByIdUseCase` 1 — không file nào thuộc nhóm sửa); frontend **0 → 0**. `git diff --stat`: 11 file, **+331/−155**, không untracked.

**DB đã ghi** (transaction có assert số dòng, sai là rollback): 2 proposal `organization_id` (`ed84f7b4…`, `8b89987a…` ← `fb5e76e1…`); 1 lead `3cd4f3da…` (`bant_score=85`, `bant_details` = nguyên `extracted_metadata.qualification` đã lưu từ trước — **chép dữ liệu thật đang nằm sai cột**, không bịa số). Số liệu chưa có bằng chứng thì **để nguyên NULL**: `138d902c…` (`QUALIFIED`, chưa từng có payload qualify).

## 34. Môi trường — `pdfmake` khai mà không cài

`npm run dev` **chết ngay** ở `PdfProposalExporterService.ts:5` với `Cannot find module 'pdfmake'`, dù `backend/package.json:30` khai `"pdfmake": "^0.3.14"` và `package-lock.json` đã pin 0.3.14 — package **không có trong `node_modules` gốc** (workspace lồng nhau). Mình chữa cục bộ bằng `npm install pdfmake@0.3.14 --no-save` để chạy được verification; **không đổi** `package.json`/lock. Nghĩa là: backend chưa từng boot được trong workspace này trước hôm nay, và máy khác `npm ci` xong vẫn có thể thiếu.

## 35. Phát hiện mới — N22 **chưa sửa** (cần quyết định), N23 **đã sửa ngay sau đó** (mục 38)
| # | Phát hiện | Bằng chứng **đo được hôm nay** | Vì sao chưa sửa |
|---|---|---|---|
| **N22** | **Một cột `bant_details`, ba schema khác nhau.** `POST /:id/qualify` lưu shape snake_case `{qualification_score, readiness_level, breakdown, project_brief, project_title}`; `POST /:id/qualifications` khai shape camelCase `LeadQualification {score, criteria:{budget,authority,need,timeline}, risks, nextSteps}`; `GET /:id/qualifications/latest` **đọc camelCase** (`LeadUseCases.ts:346-347` cast `bantDetails as LeadQualification`). Hệ quả thật: (a) `latest` trả 200 nhưng body là shape khác với type khai; (b) `LeadsDirectory.tsx:31` chặn bằng `isLeadQualification` (`types/lead.ts:137-141`: cần `score` **và** `criteria`) ⇒ **panel chi tiết BANT** (`:102`) vẫn trống với lead do `/qualify` ghi (cột BANT `:453`/`:502` đọc thẳng `bantScore` nên đã hiện bình thường) | Case G3/G5: `latest` 200 với `detailsKeys=breakdown,project_brief,project_title,readiness_level,qualification_score`. **Và đường camelCase đang chết hẳn**: `POST /:id/qualifications` ⇒ **409 `"Qualification service returned invalid criteria."`** trên AI service thật (Gemini trả shape cũ), để lại `bantScore=null`, `bantDetails={}`, `latest` 404 | Đây chính là gap schema đã ghi nhận từ trước ("3 incompatible BANT shapes"), nằm **ngoài** 6 defect của đợt này. Đóng nó phải chọn nguồn đúng: hoặc gateway map sang `criteria`, hoặc `latest`/UI chỉ nhận snake. Cả hai đều đổi hợp đồng API đang có 3 consumer |
| **N23** | `GET /proposals/lead/:leadId` **không lọc theo lead**: controller gọi `listUseCase.execute({leadId,…,limit:1})` (`ProposalController.ts:99`) nhưng `PostgresProposalRepository.findAll:121-140` **không có nhánh `filter.leadId` nào** trong `conditions` ⇒ luôn lấy proposal `updated_at DESC` **của cả org**, rồi `findById` của nó | Probe 2 lead khác nhau (`3cd4f3da…` và `138d902c…`) **cùng trả về một proposal `8b89987a…`**, dù `3cd4f3da…` có proposal riêng là `ed84f7b4…`. Repository **đã có** `findByLeadId:96-98` viết đúng (`WHERE lead_id = $1 AND organization_id = $2`) nhưng controller không dùng | **Đã sửa ngay cùng ngày 15/11 — xem mục 38.** Không đổi delegate mà sửa đúng nguồn gốc: `findAll` nay honour `filter.leadId` nên **cả hai** endpoint cùng đúng |

## 36. Còn tồn (kế + mới)

| # | Việc | Ghi chú |
|---|---|---|
| 1 | **N22** (mục 35) — ba schema trên một cột `bant_details` | chờ quyết định; **N23 đã sửa xong, xem mục 38** |
| 2 | **N17**: `SALES_REP` vẫn không vào được danh bạ khách hàng/liên hệ | quyết định sản phẩm, chưa được trả lời từ đợt 4 |
| 3 | `POST /portal/sessions` mở cho `VIEWER` | quyết định sản phẩm, chưa được trả lời |
| 4 | **N10, N11** | chưa được giao phạm vi |
| 5 | Cluster meeting cô lập (34 lỗi tsc) | chờ "viết lại" hay "xoá" |
| 6 | 2 proposal orphan `1d38de4e…` (script `testProposalSprint1` để lại — script **có** truyền `organizationId`, chứng tỏ INSERT cũ âm thầm bỏ), `9975f068…` | không lead, không `created_by` ⇒ **không có căn cứ** gán org nào; cần bạn nói gán về DUT hay xoá |
| 7 | 3 lead thật chưa có điểm: `138d902c…` (`QUALIFIED`, không có bằng chứng), `d1000000…0007` (`NEW`), `d1000000…0009` (`QUALIFYING`) | 2 lead `NEW/QUALIFYING` chưa cần điểm là **đúng**; riêng `138d902c…` muốn lên `APPROVED` thì phải bấm Qualify lại để có số liệu thật |
| 8 | ~90 dòng `E2E …` / `Probe lead …` vẫn nằm trong DB | data test tích tụ từ các suite; muốn dọn thì nói, mình không tự xoá |
| 9 | **Chưa bấm thử UI**: N18/N13/N19 mới chắc về **data contract** (`GET /proposals/lead/:id` trả đủ 10 sheet với key thật) và `tsc` 0 lỗi; chưa mở browser xem modal + file `.txt` tải về | `pdfmake` chỉ `--no-save`; `npm ci` máy khác vẫn có thể thiếu |
| 10 | `rate_cards` trống ở org chưa có bảng đơn giá | defect dữ liệu, chưa nằm trong đợt nào |

## 37. N23 — `leadId` bị `findAll` âm thầm bỏ rơi (sửa ngay sau khi báo cáo, 15/11/2026)

**Root cause không nằm ở controller.** `ListProposalsUseCase` **khai báo và validate** filter `leadId` rồi đóng vào `ProposalFilterParams` (`IProposalRepository.ts:33`), nhưng `PostgresProposalRepository.findAll` dựng `conditions` từ đúng 3 nhánh (`organization_id`, `status`, `search`) — **không có nhánh `leadId`**, nên tham số bị bỏ mà không ai báo lỗi. Vì vậy sửa một dòng trong `findAll` là **cả hai** endpoint cùng đúng, thay vì chỉ đổi delegate cho `getByLeadId`.

**Hai endpoint bị ảnh hưởng** (đều đi qua `ListProposalsUseCase`):

| Endpoint | Consumer thật | Trước | Sau |
|---|---|---|---|
| `GET /proposals/lead/:leadId` | `AIWorkspace.tsx:206` (modal Portal — chính chỗ N18 vừa nối), `ProposalStudioTab.tsx:297` | trả proposal `updated_at DESC` **của cả org** ⇒ lead `3cd4f3da…` nhận proposal của lead `138d902c…` | mỗi lead nhận đúng proposal của nó, vẫn kèm đủ 10 sheet |
| `GET /proposals?leadId=…` | `ProposalController.list:203-212` forward query param này | bộ lọc **không có tác dụng**: total vẫn bằng tổng của cả org | total đúng theo lead |

**Thay đổi:**
- `PostgresProposalRepository.findAll`: thêm nhánh `if (filter.leadId) { conditions.push('lead_id = $n'); values.push(filter.leadId); }` — **tham số hoá**, và vì `conditions`/`values` được dựng **trước** khi push `limit`/`offset` nên cả `COUNT(*)` lẫn `SELECT` danh sách cùng nhận filter (không lệch phân trang).
- `ListProposalsUseCase`: `leadId` qua `optionalUuid(dto.leadId,'leadId') ?? undefined`. Cần thiết vì chính nhánh SQL mới biến `?leadId=rac` thành **500** (pg `22P02` invalid input syntax for uuid); này trả `400 "leadId must be a valid UUID or null.""`, và `?leadId=` rỗng/ngoại lệ `null` được coi là **không lọc** thay vì 400 — khớp cách `optionalUuid` định nghĩa.
- **Không** đổi `getByLeadId` sang `findByLeadId`: sẽ phải thêm use case mới và sửa chuỗi 10 tham số vị trí của `ProposalController`; đường hiện tại đã đúng sau fix `findAll` (2 query thay vì 1 — chên lệch không đáng để đổi).

**Kiểm chứng runtime — 13/13 PASS** (`dev-login` = ADMIN org DUT, `ntbinh1@gmail.com`):

| Case | Kết quả đo được |
|---|---|
| T1–T3 | lead `3cd4f3da…` → `ed84f7b4…`; lead `138d902c…` → `8b89987a…`; **hai id khác nhau** (trước khi sửa: cả hai cùng trả `8b89987a…`) |
| T4 | payload vẫn đủ `sheets.length === 10` cho cả hai lead |
| T5 | lead của org khác (`990e44f4…`, org 'Thanh Hoa', có 3 proposal) ⇒ `200` với `data: null` — **không rò proposal cross-tenant** |
| T6 | lead id không tồn tại ⇒ `data: null` |
| T7 | `GET /proposals?leadId=<A>` ⇒ `meta.total = 1`, đúng dòng `ed84f7b4` |
| T8 | `GET /proposals` không filter ⇒ `total = 2` (toàn org, hành vi cũ giữ nguyên) |
| T9 | `?leadId=<uuid không có proposal>` ⇒ `total = 0` (trước khi sửa sẽ ra 2) |
| T10 | `?leadId=` rỗng ⇒ 200, `total = 2` (coi như không lọc, không phải 400) |
| T11–T12 | `?leadId=not-a-uuid` và path `/proposals/lead/not-a-uuid` ⇒ **400** `"leadId must be a valid UUID or null."` |

**Tĩnh**: `tsc --noEmit` backend **34 → 34**, `grep "error TS" | grep -i proposal` → **rỗng** (2 file sửa không sinh lỗi). Không ghi DB nào trong phần này.

**Chưa làm (không tự ý)**: `proposals.lead_id` **không có index** — kiểm kê `src/database/migrations/` chỉ có `idx_meetings_lead_date` (`006_discovery_meetings.sql:18`), không có index nào trên `proposals` liên quan lead. Với 156 dòng thì seq scan không đáng kể nên mình **không thêm migration**; nếu bảng lớn lên thì đó là một `CREATE INDEX idx_proposals_lead ON proposals (organization_id, lead_id, updated_at DESC)`.

## 38. Tài liệu đã cập nhật (đợt 5 + N23)

- File này: thêm `# ĐỢT 5` (31 bảng defect, 32 backend, 33 kiểm chứng runtime 22 case, 34 `pdfmake`, 35 N22–N23, 36 còn tồn, **37 N23 đã sửa + 13 case runtime**, 38 mục này).
- `docs/RBAC_ROLES_AND_PERMISSIONS_GUIDE.md` **v2.8 → v2.9**:
  - Mục 3.5 (`SALES_REP`): bỏ 3 chữ "still mock/still hard-coded" đã thành thật — `.txt` và modal giờ đọc sheet thật (N18/N13), telemetry đã đổi nhãn đúng schema (N19); duty "nhập thông tin liên hệ" vẫn bất khả (N17).
  - Mục 6 **13**: cập nhật N20 đã đóng (một cửa `SaveQualificationUseCase`, `CASE` guard, bằng chứng H3) và bỏ ghi chú "lỗ chưa đóng"; thêm N20-b (lý do cộng `NEW/IN_REVIEW → QUALIFIED` và điều kiện bắt buộc có điểm).
  - Mục 6 **14**: `bantDetails` đã vào list, 6 field bịa đã xoá (N21), kèm số đo 14 key / 0 key snake.
- `docs/RBAC_ROLES_AND_PERMISSIONS_GUIDE.md` **v2.9 → v2.10** (riêng mục này tăng do N23):
  - Mục 6 **15** giữ cho **N22** (ba schema trên một cột `bant_details`, `POST /qualifications` 409 với AI thật) — vẫn **chưa sửa**.
  - Mục 6 thêm **16**: N23 đã đóng — `leadId` là filter khai báo nhưng chưa từng được thi hành, cách sửa một nhánh SQL cho cả hai endpoint, `optionalUuid` để không biến 500 pg thành 500, 13 case runtime, và ghi chú `proposals.lead_id` **chưa có index**.
  - Mục "Ma trận quyền theo endpoint": lead `PATCH /:id` từ chối `status`, `PATCH /:id/status` + `POST /:id/qualify` + `POST /:id/qualifications` giờ enforce state machine; `GET /leads` có `meta` và camelCase.


