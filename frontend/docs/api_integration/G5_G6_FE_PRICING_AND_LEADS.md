# G5 + G6 — Rate cards, pricing, lead intake trên Frontend

Tài liệu ghi lại **những gì đã thêm/sửa trong mã nguồn** để nối API nhóm G5 (Rate Cards & Pricing) và G6 (Leads / RFP Intake) vào giao diện, kèm dữ liệu seed để test tay.

- Chỉ thay đổi mã trong `frontend/` (không sửa backend, không thêm npm dependency).
- Pattern giống G2–G4: `types` → `services` → `hooks` → trang hash-router bọc `RequireAuth`.
- Cookie `credentials: 'include'` đi qua `apiClient.ts` như các nhóm trước.

---

## 1. File tạo mới

| File | Nội dung |
|---|---|
| `frontend/src/types/lead.ts` | `LeadRecord`, `LeadListItem`, `LeadIntakeDraft`, `LeadQualification`, `LeadMeeting`, hằng `LEAD_SOURCES` / `LEAD_STATUSES` / `LEAD_TRANSITIONS`, helper `isLeadQualification`. |
| `frontend/src/types/rateCard.ts` | `RateCardRecord`, `PricingInputLine` / `PricingCalculationResult` / `PricingResponse`, `ProposalSummary`, `RATE_CARD_LEVELS`. |
| `frontend/src/services/leadService.ts` | 12 endpoint dưới `/api/v1/leads`: analyze (timeout 90s), CRUD, status, qualify, latest qualification, meetings, create proposal from lead. |
| `frontend/src/services/rateCardService.ts` | CRUD `/api/v1/rate-cards` + `POST /rate-cards/pricing/calculate`. Query list dùng `roleName`, `level`, `currency`, `includeInactive` (đúng contract backend, **không** dùng `search`/`active` của doc cũ). |
| `frontend/src/services/proposalService.ts` | `GET /api/v1/proposals` — chỉ để dropdown Apply quotation. |
| `frontend/src/hooks/useLeadDirectory.ts` | List leads, deps từng primitive, cờ `cancelled`. |
| `frontend/src/hooks/useRateCards.ts` | List rate cards tương tự. |
| `frontend/src/components/LeadsDirectory.tsx` | Trang `#leads`: filter + bảng + panel chi tiết (sửa field, state machine, BANT, meetings, tạo proposal, xóa). |
| `frontend/src/components/RateCardsDirectory.tsx` | Trang `#rate-cards`: CRUD (ADMIN / PRESALE_LEAD), Pin vào sheet, máy tính giá, Apply vào proposal. |
| `frontend/docs/api_integration/G5_G6_SEED_UI_TEST.sql` | Seed rate cards, 3 lead thêm, 2 meeting, 1 proposal. |
| `frontend/docs/api_integration/G5_G6_FE_PRICING_AND_LEADS.md` | File này. |

## 2. File chỉnh sửa

| File | Thay đổi |
|---|---|
| `frontend/src/services/apiClient.ts` | Thêm `timeoutMs` trên request. Analyze / qualify dùng 90s vì AI thường > 10s. |
| `frontend/src/utils/format.ts` | `formatMoney(amount, currency)`. |
| `frontend/src/navigation.ts` | Thêm route `leads`, `rfps`, `rate-cards`, `ai-workspace`, `vault`; `navigateTo(route, query?)`; `readHashQuery()`. |
| `frontend/src/types/client.ts` | `LEAD_STATUSES` / `LeadStatus` re-export từ `lead.ts`. |
| `frontend/src/App.tsx` | Route `#leads`, `#rate-cards`; render hai trang mới trong `RequireAuth`. |
| `frontend/src/components/Overview.tsx` | Sidebar: **Leads**, **Rate cards** (thay *Plan & Quota*). |
| `frontend/src/components/RfpIntake.tsx` | Bỏ mock `setTimeout`. Gọi `POST /leads/intake/analyze`, cho sửa metadata, `POST /leads`. Nút Skip AI khi service AI tắt. |
| `frontend/src/components/ClientsDirectory.tsx` | Click một lead mở `#leads?id=…`. |
| `frontend/src/components/AIWorkspace.tsx` | Sidebar trỏ Leads / Rate cards. |

## 3. Endpoint đã nối

### G5

| Endpoint | Call site |
|---|---|
| `GET /api/v1/rate-cards` | `useRateCards` → bảng `#rate-cards` |
| `POST /api/v1/rate-cards` | form Add |
| `PATCH /api/v1/rate-cards/:id` | form Edit (chỉ field đổi) |
| `DELETE /api/v1/rate-cards/:id` | Delete confirm |
| `POST /api/v1/rate-cards/pricing/calculate` | Calculate / Apply |

### G6

| Endpoint | Call site |
|---|---|
| `POST /api/v1/leads/intake/analyze` | `#rfps` Run AI intake |
| `POST /api/v1/leads` | `#rfps` Save lead |
| `GET /api/v1/leads` | `#leads` bảng |
| `GET /api/v1/leads/:id` | panel chi tiết |
| `PATCH /api/v1/leads/:id` | Save fields (không gửi `status`) |
| `PATCH /api/v1/leads/:id/status` | nút transition |
| `DELETE /api/v1/leads/:id` | Delete lead |
| `POST /api/v1/leads/:id/qualifications` | Run BANT |
| `GET /api/v1/leads/:leadId/meetings` | list meetings |
| `POST /api/v1/leads/:leadId/meetings` | Add meeting |
| `POST /api/v1/leads/:leadId/proposals` | Create proposal |
| `GET /api/v1/clients` / `GET /api/v1/users` | dropdown client / assignee |

`GET /qualifications/latest` được service export; panel đọc BANT từ `GET /leads/:id` (`bantDetails`) vì list không trả field này.

## 4. Quy tắc nghiệp vụ trên UI

- **Tenancy:** mọi request lấy org từ JWT. UI cảnh báo khi `organizationId` null.
- **Rate card writes:** chỉ `ADMIN` và `PRESALE_LEAD`. VIEWER / SALES_REP / SOLUTION_ARCHITECT vẫn list + calculate.
- **Pricing:** monthly thắng; không thì daily × 21; không thì hourly × 8 × 21. Override → `MANUAL_OVERRIDE`. `apply: false` là preview; Apply cần chọn proposal (seed `Beta POS staffing quotation v1`).
- **Lead status:** nút chỉ hiện transition hợp lệ. `APPROVED` cần `bant_score`. `WON` là terminal.
- **Qualify:** backend **ghi status = QUALIFIED** khi chấm điểm thành công.
- **Create proposal:** enable khi status ∈ `QUALIFIED` / `APPROVED` / `PROPOSAL_DRAFTING`.
- **Delete lead:** 204; proposal sống, `lead_id` SET NULL — UI cảnh báo trước confirm.
- **AI offline:** analyze/qualify báo 502 + gợi ý bật port 8000. Intake có **Skip AI** để vẫn `POST /leads` bằng tay.

## 5. Seed & test tay

1. Chạy `G4_SEED_UI_TEST.sql` (nếu chưa có org Northwind).
2. Chạy `frontend/docs/api_integration/G5_G6_SEED_UI_TEST.sql`.
3. Đăng nhập tài khoản G4, ví dụ `admin@presaleee.test` (cùng mật khẩu đã dùng khi seed G4). Role `viewer@presaleee.test` để kiểm tra ẩn nút ghi rate card.
4. Frontend `npm run dev` → `#overview`.

Checklist:

| Bước | Hash | Kỳ vọng |
|---|---|---|
| 1 | `#rate-cards` | ≥ 8 card org A, gồm inactive + EUR |
| 2 | Pin *Senior Backend Developer*, man-months 6, Calculate | Total deterministic từ monthly 9240 × 6 |
| 3 | Chọn proposal Beta POS, tick Apply | `totalCost` cập nhật trên dropdown |
| 4 | Pin *EU Solution Architect* vào quotation USD | 400 `MIXED_CURRENCY` |
| 5 | `#rfps` Skip AI → Save | Lead `NEW` trên `#leads` |
| 6 | Mở *HealthFirst offline clinic suite* | BANT 78, Create proposal được |
| 7 | Mở *Mekong yard control tower* | QUALIFYING; Run BANT cần AI; không thì chuyển IN_REVIEW bằng nút status |
| 8 | Add meeting | 201, hiện trong list |
| 9 | `#clients` → Acme Fintech → click lead | nhảy `#leads?id=…` |

## 6. Chưa làm (ngoài G5/G6)

- Upload PDF/DOCX: backend chưa có parser (roadmap 2.5); UI ghi chú rõ.
- Lịch sử BANT: schema chỉ giữ bản mới nhất.
- Proposal Studio 10 sheet / export Excel: nhóm G7/G8, chưa nối.
- AI Workspace Discovery Meetings vẫn là mock (list/create meeting thật nằm trên `#leads`).

## 7. Ngôn ngữ

Nhãn thao tác trên `#leads`, `#rate-cards`, `#rfps` (sau khi nối API) là **tiếng Anh**, ngày giờ `en-GB`, tiền tệ `en-US`.
