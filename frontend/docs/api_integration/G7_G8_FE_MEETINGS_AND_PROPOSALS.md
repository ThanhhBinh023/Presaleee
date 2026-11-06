# G7 + G8 — Discovery meetings & Proposal studio trên Frontend

Tài liệu ghi lại **những gì đã thêm/sửa** để nối API nhóm G7 (Discovery Meetings) và G8 (Proposals) vào giao diện, kèm seed để test tay.

- Chỉ thay đổi mã trong `frontend/` (không sửa backend).
- Pattern giống G2–G6: `types` → `services` → `hooks` → hash-router + `RequireAuth`.
- Backend E2E G7/G8 đã xanh 26/26 (AI success path skip khi port 8000 tắt).

---

## 1. File tạo mới

| File | Nội dung |
|---|---|
| `frontend/src/types/meeting.ts` | `MeetingRecord`, analysis/gap types, `MEETING_TRANSITIONS`. |
| `frontend/src/types/proposal.ts` | `ProposalRecord` / `ProposalWithSheets`, 10 sheet names, status machine, privileged statuses. |
| `frontend/src/services/meetingService.ts` | `GET /meetings/:id`, transcript, analyze (90s), status. List/create vẫn qua `leadService`. |
| `frontend/src/services/proposalService.ts` | Viết lại: list/filter, CRUD, sheet PUT, generate, submit-review, export Excel/PDF. |
| `frontend/src/hooks/useProposalDirectory.ts` | List proposals, deps primitive. |
| `frontend/src/components/MeetingsWorkspace.tsx` | Trang `#meetings`. |
| `frontend/src/components/ProposalsStudio.tsx` | Trang `#proposals` (list + 10-sheet editor). |
| `frontend/docs/api_integration/G7_G8_SEED_UI_TEST.sql` | Meetings thêm + 3 proposal kèm sheets. |
| `frontend/docs/api_integration/G7_G8_FE_MEETINGS_AND_PROPOSALS.md` | File này. |

## 2. File chỉnh sửa

| File | Thay đổi |
|---|---|
| `frontend/src/services/apiClient.ts` | `apiDownload()` cho binary Excel/PDF (`Content-Disposition`). |
| `frontend/src/navigation.ts` | Route `meetings`, `proposals`. |
| `frontend/src/App.tsx` | `#meetings`, `#proposals` bọc `RequireAuth`. |
| `frontend/src/components/Overview.tsx` | Sidebar Meetings / Proposals. |
| `frontend/src/components/LeadsDirectory.tsx` | Click meeting → `#meetings?leadId&id`; Create proposal → `#proposals?id`. |
| `frontend/src/components/AIWorkspace.tsx` | Sidebar Meetings / Proposals. Tab Discovery Meetings trong AI Workspace **vẫn mock** — workspace thật là `#meetings`. |

## 3. Endpoint đã nối

### G7

| Endpoint | Call site |
|---|---|
| `GET /leads/:leadId/meetings` | `#meetings` list |
| `POST /leads/:leadId/meetings` | Create OPEN meeting |
| `GET /meetings/:meetingId` | Detail + analysis |
| `POST /meetings/:meetingId/transcript` | Save replace/append |
| `PATCH /meetings/:meetingId/status` | Lock / Reopen |
| `POST /meetings/:meetingId/analyze` | AI inspect → INSPECTED |

### G8

| Endpoint | Call site |
|---|---|
| `GET /proposals` | list + status/search/page |
| `POST /proposals` | Create DRAFT 10 sheets |
| `GET /proposals/:id` | Studio |
| `PATCH /proposals/:id` | Metadata **hoặc** status (tách request) |
| `POST /proposals/:id/submit-review` | DRAFT → IN_REVIEW |
| `PUT /proposals/:id/sheets/:sheetName` | Save JSON sheet |
| `POST /proposals/:id/generate` | Generate all |
| `POST /proposals/:id/sheets/:sheetName/generate` | Generate current sheet |
| `GET /proposals/:id/export-excel` | Download `.xlsx` |
| `GET /proposals/:id/export-pdf` | Download `.pdf` |
| `DELETE /proposals/:id` | Cascade sheets |
| `POST /leads/:leadId/proposals` | Vẫn từ `#leads` |

## 4. Quy tắc trên UI

- Meetings: transcript chỉ khi `OPEN`; `INSPECTED` không set tay; analyze cần transcript; 502 khi AI tắt.
- Proposals: sửa metadata/sheet/generate chỉ `DRAFT`; `IN_REVIEW` save → 409 (seed *Acme evidence portal in review*).
- Status privileged (`APPROVED`, `REJECTED`, `SENT_TO_CLIENT`, `ACCEPTED`) cần ADMIN / PRESALE_LEAD.
- DRAFT → IN_REVIEW đi qua `submit-review` (có audit), không PATCH status thuần.
- Sheet name có `&` được `encodeURIComponent`.

## 5. Seed & test tay

Chạy `G7_G8_SEED_UI_TEST.sql` sau G4 + G5/G6. Đã apply lên DB dev: org A có thêm meeting OPEN/LOCKED, proposal DRAFT có 10 sheet, proposal IN_REVIEW khóa edit.

| Bước | Hash | Kỳ vọng |
|---|---|---|
| 1 | `#meetings` chọn *HealthFirst offline clinic suite* | Có discovery + HIS workshop OPEN |
| 2 | Mở HIS workshop, sửa transcript, Save | 200, analysis cũ bị xóa |
| 3 | Lock / Reopen | OPEN ↔ LOCKED |
| 4 | Analyze | Cần AI; không thì 502, status không đổi |
| 5 | `#proposals` mở *Beta POS staffing quotation v1* | 10 sheet, JSON Team & Rate Cards có 6 MM |
| 6 | Export Excel / PDF | File tải về, 10 tab / %PDF |
| 7 | *HealthFirst clinic suite draft* | Save Overview JSON, Generate (502 nếu AI tắt) |
| 8 | *Acme evidence portal in review* | Save sheet → 409 |
| 9 | Submit for review trên một DRAFT | IN_REVIEW + audit `PROPOSAL_SUBMITTED_FOR_REVIEW` |
| 10 | `#leads` Create proposal | Nhảy `#proposals?id=` với Overview/WBS từ metadata |

## 6. Chưa làm

- AI Workspace tab Discovery Meetings / Proposal Builder v2.4 vẫn là mock marketing.
- Excel VAT 10% / sheet 5 không recompute (defect backend F1/F2, không sửa trong FE).
- Upload audio họp: backend chưa có STT.
