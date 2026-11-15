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
