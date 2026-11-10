# Changelog — Sinh proposal + nối giá trị rate card vào proposal

**Ngày thực hiện:** 09/11/2026 (BANT route B, Proposal DI, meeting repo) · 10/11/2026 (nối giá trị rate card, prompt effort)
**Phạm vi:** bước 2–3 của quy trình chính `AI Intake → BANT → Proposal → Excel/PDF`. Không đổi schema DB.
**Branch:** `feature/AIIntake_pipeline`

---

## 1. ba lỗi chặn chức năng

| Hiện tượng | Căn nguyên | Bằng chứng |
|---|---|---|
| Bấm *Thẩm định BANT* log AI báo `422` nhưng vẫn có điểm | `LeadIntakeController.qualify` dùng `LLMTaskMode.BANT_QUALIFICATION` — enum **không tồn tại** → `task_mode` bị axios loại khỏi body → pydantic 422. Điểm hiện ra là do tier-2 Gemini trả, không phải FastAPI. | `tsc`: `Property 'BANT_QUALIFICATION' does not exist`; schema 4 trong `ai/server.py` là schema 2 (không khớp `normalizeQualification`) |
| 5 endpoint proposal chết | `ProposalController` nhận thiếu/thừa tham số so với `container.ts` truyền vào; `getByLeadId` gọi `getByIdUseCase.execute(id)` thiếu `organizationId` | `tsc` TS2554/TS2551 tại `ProposalController.ts`; bắt đầu lại DI làm sống lại cả nhánh chết |
| `TypeError: this.meetingRepository.listByLead is not a function` khi generate | `IMeetingRepository` khai báo `listByLead(leadId, scope)`, `PostgresMeetingRepository` chỉ có `listByLeadId(leadId)` — interface/impl lệch nhau, `tsx` không type-check lúc chạy nên chỉ vỡ lúc gọi | backend log stack tại `GenerateProposalSheetsUseCase.ts:76` |
| Studio hiện 10 sheet nhưng chỉ có tên dự án | `Scope of Work.modules[].estimatedDays` trả `null` theo đúng chính sách chống bịa số (`GenerateProposalSheetsUseCase.ts:103-104`); và **không luồng nào** nối `rate_cards` → sheet `Pricing & Quotation` | A/B probe: thêm instruction thủ công → `estimatedDays: 25/40/20`; `CalculateQuotationPricingUseCase` chỉ ghi `proposals.total_cost`, không ghi sheet nào |

---

## 2. Thay đổi backend

| File | Thay đổi | Lý do |
|---|---|---|
| `presentation/controllers/LeadIntakeController.ts` | `qualifyBant` mới (:53-63) gọi `QualifyLeadUseCase`; thứ tự ctor đổi thành `(analyze, createLead, qualifyLead, dbPool?, llmGateway?)` | Đi qua use case đã validate + audit + scope tổ chức, thay vì raw UPDATE |
| `presentation/routes/leadIntakeRoutes.ts:21` | `POST /:id/qualifications` + `requireAuth, requireOrganization` | Route B là đường sống; route A cũ để nguyên, chờ quyết định (mục 5) |
| `container.ts:173, :216` | Khởi tạo `QualifyLeadUseCase`, truyền đúng thứ tự cho controller | Trước đó use case exists nhưng không bao giờ được new |
| `presentation/controllers/ProposalController.ts` | ctor 11 tham số bắt buộc + `generateFromLeadUseCase?` khớp đúng 11 args của container; `getByLeadId` dùng `authContext` + `listUseCase` + `getByIdUseCase.execute(id, organizationId)`; khôi phục 4 import bị paste đè | Làm sống `generate`, `sheets/:name/generate`, `sections/:name/regenerate`, `submit-review`, `export-pdf`, `lead/:leadId` |
| `infrastructure/database/repositories/PostgresMeetingRepository.ts` | Thêm `listByLead(leadId, scope)` với `JOIN leads` lấy `l.organization_id` | Bảng `meetings` không có cột org trong INSERT của repo; lọc `m.organization_id` sẽ trả rỗng mãi mãi |
| `domain/repositories/IProposalRepository.ts` | `findById/update/delete` bổ sung `organizationId`, `update` trả `Proposal \| null`, thêm `updateStatus`/`submitForReview`, khai báo đúng 6 tham số của `updateSheet` | Interface mô tả sai chính impl duy nhất của nó; sửa xong **giảm 38 lỗi biên dịch** |
| `application/use-cases/GenerateProposalSheetsUseCase.ts` | Thêm ctor param `rateCardRepository`; `EFFORT_SHEET_NAMES = {Scope of Work, Timeline & Milestones}` được nạp thêm rule "số giờ công là bắt buộc, tiền để rate card quyết"; `Team & Rate Cards` nhận catalogue role của tổ chức và buộc đúng shape `{role, level, manMonths}` | Sheet 2/4 có số; sheet 5 sinh ra đúng khoá mà `ExcelProposalExporterService.buildTeamSheet` đọc (`r.role`, không phải `r.roleName`) và đúng input của `calculatePricing` |
| `application/use-cases/RateCardUseCases.ts` | Nhánh `apply` giờ kiểm tra DRAFT, ghi lại **sheet 5** (roles + `monthlyRate`/`totalCost`/`totalTeamCost`) và **sheet 6** (`items`/`subtotal`/`taxPercentage`/`taxAmount`/`grandTotal`) rồi đọc lại proposal | Tiền chỉ đến từ `calculatePricing`; model chỉ đề xuất effort |
| `container.ts:192-194` | Truyền `rateCardRepository` vào `GenerateProposalSheetsUseCase` | Không truyền thì generate sheet 5 vỡ y hệt lỗi meeting |

**Quy tắc số của sheet 6 (`buildPaymentSchedule`):** giữ nguyên milestone/trigger đang có trên sheet, chỉ tính lại `amount = totalCost × weight ÷ Σweight` (weight = `%` sẵn có, hoặc `line.totalCost` khi schedule còn trống), dòng cuối hứng phần lẻ để `Σ amount ≡ totalCost`. VAT 10% hard-code vì exporter Excel đã hard-code `*0.1`.

## 3. Thay đổi frontend

`frontend/src/components/ProposalsStudio.tsx`: thêm `toPricingLines()` đọc `roles[]` của sheet 5 (chấp nhận cả `role` lẫn `roleName`, bỏ level ngoài enum `RATE_CARD_LEVELS`) và nút **Apply rate-card pricing** gọi `rateCardService.calculatePricing({ proposalId, apply: true, lines })` rồi reload proposal.

## 4. Đã kiểm chứng bằng cmd (không chạm DB)

- `backend`: `npx tsc --noEmit` → **73 lỗi**, giảm từ 111. Không còn lỗi nào trong 6 file đã sửa.
- `frontend`: `npx tsc --noEmit` → **0 lỗi**.
- Script tạm (đã xoá) với repository giả: `apply=true` cho `3 man-month × 4000 + 2 × 2500` → `totalCost 17000`, sheet 5 roles có `monthlyRate/totalCost`, sheet 6 `Σ amount = 17000` trong cả 3 tình huống (có schedule 30/70, schedule trống, `%` chỉ cộng dồn 50).
- Script tạm (đã xoá) bắt prompt gửi xuống gateway: sheet 5 nhận catalogue + ràng buộc `manMonths 0.5–12`, sheet 2 nhận band ngày công, không lọt lẫn nhau.
- Boot backend cổng 5055, probe không token: 6 route (`GET /proposals`, `GET /proposals/:id`, `POST /:id/generate`, `POST /:id/sheets/:name/generate`, `GET /rate-cards`, `POST /rate-cards/pricing/calculate`) đều **401**, không 404/500; log server sạch. Đã tắt process sau khi probe.

## 5. Việc còn lại cần làm thủ công (kết quả vòng 1 ghi ở mục 7)

1. Bật `npm run dev` backend (cổng 5000) — hiện chưa chạy.
2. Đăng nhập, mở **Proposal studio**, kiểm tra `rate_cards` của tổ chức đã có dòng `is_active = TRUE` chưa (không có thì nút pricing sẽ báo `UNKNOWN_ROLE` kèm danh sách role khả dụng).
3. *AI generate this sheet* cho **Team & Rate Cards**, rồi **Scope of Work** / **Timeline & Milestones** → xem có số.
4. Bấm **Apply rate-card pricing** → sheet 5 + 6 phải đầy tiền, cột COST đổi.
5. *Generate all 10* → *Export Excel* / *Export PDF* → so tab 05, 06 và dòng Subtotal/VAT/Grand total.

## 6. Điểm mở (chưa tự sửa)

- **`proposals.total_cost` thành giá TRƯỚC thuế → SAU thuế.** `PostgresProposalRepository.updateSheet:295` có sẵn luật `grandTotal → total_cost`, nên sau khi apply ô COST hiển thị `18 700` trong khi engine báo `17 000` net. Chọn một: để nguyên (giá client phải trả) hay bỏ `grandTotal` khỏi sheet Data (PDF mất dòng tổng).
- 43/73 lỗi biên dịch còn lại nằm ở module Meeting (`IMeetingRepository` thiếu `saveTranscript`/`changeStatus`/`saveAnalysis`, `findById` bỏ qua scope) — **đã đóng một phần ngày 11/11 (mục 8)**: repository giờ fulfil đủ interface nên nhánh được DI chạy được; 35 lỗi còn lại nằm trong 7 file hệ thống cũ (`CreateMeetingUseCase.ts`, `GetMeetingByIdUseCase.ts`, `ListMeetingsByLeadUseCase.ts`, `InspectMeetingUseCase.ts`, `UpdateMeetingLifecycleUseCase.ts`, `MeetingDTOs.ts`, `scripts/testDiscoveryMeetingE2E.ts`) — **không file nào được `container.ts` khởi tạo**, tức code chết, chưa quyết định xóa hay nâng cấp.
- 6 lỗi `FastAPILMGateway` tham chiếu `MEETING_ASSISTANT`/`GAP_ANALYSIS`/`BANT_QUALIFICATION`/`TECH_ARCHITECTURE` — cùng căn nguyên 422; route A (`POST /:id/qualify`) vẫn dùng mode hỏng và ghi DB không scope.
- `generateFromLead` (`POST /proposals/generate-from-lead`) vẫn trả 501 có chủ đích: UC chưa từng được khởi tạo, `leadRepository.list()` không lọc tổ chức, `req.user?.id` không tồn tại.
- `PATCH /proposals/:id` và `/lifecycle` vẫn 400 do controller thiếu `organizationId`/`actorId` trong DTO (`ProposalController.ts:114, :131, :232`); `POST /:id/ui-brief` (:131) gọi UC thiếu tổ chức.
- `package-lock.json` đổi 11 dòng, chỉ là cờ `"peer": true` bị npm gỡ — **không nằm trong commit này**.
- Exporter tự bịa số khi model không trả đúng khoá: `ExcelProposalExporterService.ts:479` `r.score || 9` (cả 4 dòng RAID đều ra Risk Score 9 dù Probability/Impact khác nhau) và `:274` `data.totalWeeks || 16`. Hai số này chui thẳng vào file gửi client.

---

## 7. Vòng test thủ công 10/11 — đo trên `proposal (1).xlsx` do Studio export

**Kết luận: chuỗi `lead QUALIFIED → tạo proposal → generate 10 sheet → export` chạy hết, không crash.** Chính file export là bằng chứng cho từng mắt nối:

| Tab | Quan sát trong file | Chẩn đoán |
|---|---|---|
| 01 Overview | Project Title đúng theo proposal | ✔ (`Valued Client` là placeholder của exporter, không phải AI) |
| 02 Scope of Work | Est. Man-Days = **65 / 45 / 30**, đủ 6 cột | ✔ rule effort mới đã live (trước đây `null`) |
| 03 Architecture | layer + tech vào được, cột còn lại trống | một phần |
| 04 Timeline | chỉ `durationWeeks` (6/12/6) sống; mất Phase, Milestone Name, Start/End Week, Deliverables | model đặt khoá cấp *dòng* khác khoá exporter đọc |
| 05 Team & Rate Cards | **0 dòng role** (`=SUM(D6:D5)` — tổng trên tập rỗng) | org có **0 rate card**, prompt đã dặn "leave roles empty" |
| 06 Pricing | 4 milestone tiếng Việt có thật, nhưng `percentage = 0`, `amount = 0` | chưa Apply + cùng lỗi khoá như tab 04 |
| 07 Assumptions | ASM-1..4 đủ nội dung | ✔ |
| 08 RAID | có id/probability/impact, **mất Risk Description và Mitigation**, score 9 cả 4 dòng | lỗi khoá cấp dòng + `r.score \|\| 9` |
| 09 SLA | nội dung + response time vào được, mất cột severity | lỗi khoá cấp dòng |
| 10 Case Studies | trống | ✔ đúng chủ đích — cấm bịa case study, knowledge base đang trống |

**Vì sao vì vậy tab 05 trống nên nút *Apply rate-card pricing* "không làm gì":** `toPricingLines()` trả `[]` → handler return sớm **trước khi gọi API**, chỉ hiện banner đỏ; backend log im lặng là hệ quả đúng, không phải request lỗi.

**Hệ quả còn treo:** vì tab 06 (order 6) có nội dung nên vòng generate đã đi qua sheet 5 mà không ném lỗi ⇒ `rateCardRepository` được nối đúng và `listActive()` trả mảng rỗng. Nghĩa là **nhánh `apply` chưa từng chạy thật trong app** — mới chỉ có proof bằng repository giả (mục 4). Mở khoá bằng cách: tạo ≥ 2 rate card (role `ADMIN`/`PRESALE_LEAD`; `setupDatabase.ts:52` gắn 7 card seed vào `SELECT id FROM organizations LIMIT 1`, tức org của người khác nên org mình vẫn trống), rồi **generate lại riêng sheet 5**, rồi Apply.

**Tally theo phạm vi "sinh proposal":** 4/10 sheet vào workbook nguyên vẹn · 4/10 rơi một số cột (để sửa vòng sau) · 1/10 chặn vì thiếu dữ liệu rate card (không phải lỗi code) · 1/10 trống có chủ đích.

---

## 8. Vòng 2 — 11/11: nối các nguồn thông tin bổ sung cho proposal (P0 + P1)

Phạm vi theo đúng hai mục P0/P1 đã chốt; P2 (knowledge data, BANT vào prompt) và P3 (VAT, fallback `16`/`9`, `total_cost` net/gross, `proposal_collaborators`) **chưa đụng vào**.

### 8.1. Meeting — module hết chết ngay cú ghi đầu tiên

`PostgresMeetingRepository.ts` viết lại theo interface thật (`IMeetingRepository.ts:13-20`), chỉ dùng cột mà migration **001 + 006** bảo vệ (bỏ hẳn dependency vào `migrate_meetings.ts` — script này không có trong `package.json` nên không ai chắc DB nào có `meeting_order`/`source_tool`).

| Method | Nội dung | Guard |
|---|---|---|
| `saveTranscript` | `UPDATE … FROM leads`, append bằng `raw_transcript \|\| E'\n\n' \|\| $3` khi `append=true` | `status = 'OPEN'` |
| `changeStatus` | `m.status = ANY($4::text[])` — chuyển trạng thái có điều kiện hiện trạng | chống ghi đè song song |
| `saveAnalysis` | ghi `analysis` + 4 cột denormalize (`decisions`/`action_items`/`open_questions`/`gap_analysis`), set `status='INSPECTED'`, `analyzed_at=NOW()` | `status = 'OPEN'` |
| `mapRowToMeeting` | nay trả đúng shape `Meeting` (`organizationId`, `attendees`, `decisions`, `openQuestions`, `analysis`, `analyzedAt`) | `analysis` mặc định `{}` |

Ba quyết định cần nêu rõ vì chúng không hiển nhiên:

1. **Scope luôn resolve qua `JOIN leads`**, không qua `meetings.organization_id`: probe đọc `organization_id IS NULL` cho 1 trong 2 meeting INSPECTED đang tồn tại (row cũ do `INSERT` cũ tạo), nên dựa vào cột denormalize sẽ làm mất dữ liệu đó.
2. **`saveAnalysis` ghi luôn `clean_notes` từ `analysis.summary`**: `GenerateProposalSheetsUseCase.ts:80` lọc `status === 'INSPECTED' && meeting.cleanNotes` — nếu không có dòng này thì meeting INSPECTED vẫn không bao giờ vào proposal.
3. **`MeetingController.createForLead` gọi `parseCreateMeetingInput`** (trước đây truyền `input.attendees` kiểu `unknown` thẳng vào JSONB); đây là đường ghi duy nhất tạo meeting, nằm trong chuỗi P0 đang sửa.

Hậu quả đo được: **6 lỗi `container.ts` "PostgresMeetingRepository is not assignable to IMeetingRepository" hết** — tức `GenerateProposalSheetsUseCase.ts:82` (`'technicalSummary' in meeting.analysis`) không còn là súng lên cò;DB đang có **2 meeting INSPECTED**, chỉ cần proposal link đúng lead là generate sập 500 với code cũ.

### 8.2. Tên khách hàng — hết "Valued Client"

`clients.company_name` đã có trong DB (52 client, 24 lead đã gắn `client_id`) nhưng không đường nào tới proposal. Sửa 3 điểm trong `GenerateProposalSheetsUseCase.ts`:

- constructor thêm `clientRepository: IClientRepository` (arg thứ 7), `container.ts:192` truyền `clientRepository`;
- prompt mọi sheet nay có `Client company name (use this exact spelling wherever a client name is required): …` — xoá thế bí "cấm bịa sự thật khách hàng" vs "điền clientName";
- **stamp deterministic** `if (name === 'Overview' && client) sheetData.clientName = client.companyName;` — cùng nguyên tắc "LLM chỉ đề xuất effort, số tiền và sự thật do backend quyết".

Không đổi chữ ký `IExcelExporterService` (sẽ kéo theo PDF exporter + 2 use case export + container); exporter vẫn giữ fallback `data.clientName || 'Valued Client'` (`ExcelProposalExporterService.ts:133`) cho proposal không link lead.

### 8.3. Rate card theo đúng tiền tệ + khoá cấp dòng sheet 10

- `listActive(input.organizationId, proposal.currency || undefined)` — catalogue đưa vào prompt sheet 5 giờ chỉ còn role đúng đồng tiền của proposal. Luật lọc kiểm chứng bằng repository giả (PASS "catalogue chỉ USD"); dữ liệu thật có đất thử vì Northwind có 6 card USD và 1 card EUR (`EU Solution Architect`). `CalculateQuotationPricingUseCase.ts:222` **giữ nguyên không lọc**, vì comment `:221` giải thích cố ý: engine cần phân biệt "không có card cho role này" và "card tồn tại ở tiền tệ khác".
- Thêm rule khoá cấp phần tử cho `Appendices & Case Studies`, khớp chính xác `ExcelProposalExporterService.ts:541-549`: `caseStudies` phải là mảng `{client, domain, stack, outcome}`, chỉ dùng tổ chức có tên trong knowledge reference, rỗng nếu không có.

### 8.4. Đã kiểm chứng bằng cmd (không ghi dòng nào xuống DB)

| Bước kiểm tra | Kết quả |
|---|---|
| `npx tsc --noEmit` | **73 → 57** lỗi. `comm` đối chiếu tập lỗi: **0 lỗi mới**; 2 dòng `Duplicate identifier` ở `container.ts:78,79` chỉ là đổi số dòng của lỗi có sẵn (đã xoá import trùng ở dòng 61) |
| Probe `information_schema` | `meetings` có đủ 24 cột → cả migration 006 lẫn `migrate_meetings.ts` đều đã chạy trên DB này |
| `PREPARE`/`DEALLOCATE` cho 7 câu SQL mới | **PARSE_OK cả 7** (kể cả suy kiểu `boolean` cho `$4` của nhánh append) — PREPARE parse và phân tích kiểu nhưng không thực thi, nên không ghi dữ liệu |
| Script repository giả (16 assertion) | **16/16 PASS**: client name có trong cả 3 prompt · `Overview.clientName` vẫn đúng khi LLM trả `null` · meeting INSPECTED vào prompt, meeting OPEN bị loại · meeting không có `analysis` không crash · catalogue chỉ USD · rule sheet 10 chỉ áp dụng cho sheet 10 |
| Data đo được của tenant fixture `Northwind Presales` | 7 rate card active (6 USD + 1 EUR) · 4 knowledge doc / 7 chunk `vector(768)`, trong đó 1 `CASE_STUDY` · 25 client · lead `d1000000-…-05` “Acme compliance evidence portal” (client *Acme Fintech Group*) có 1 meeting INSPECTED kèm `analysis.technicalSummary` → **một lead duy nhất kích hoạt cả 4 nguồn bổ sung cùng lúc** |

`package-lock.json` lại đổi 11 dòng cờ `"peer": true` do `npx` tự resolve — **không staged, không nằm trong commit này**.
