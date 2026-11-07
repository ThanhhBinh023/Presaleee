# G13 + G14 — Dashboard overview & Audit trail trên Frontend

Tài liệu ghi lại **những gì đã thêm/sửa** để nối API nhóm G13 (Dashboard) vào Overview và bổ sung G14 trên `#audit` (trang audit đã có từ G4).

- Chỉ thay đổi mã trong `frontend/` (không sửa backend).
- Pattern giống G2–G12: `types` → `services` → `hooks` → hash-router + `RequireAuth`.
- Backend E2E G13/G14 đã xanh 24/24, không phụ thuộc AI.

---

## 1. File tạo mới

| File | Nội dung |
|---|---|
| `frontend/src/types/dashboard.ts` | KPI, 9 pipeline stages, active lead, activity types. |
| `frontend/src/services/dashboardService.ts` | `GET /dashboard/overview`, `/leads`, `/activity`. |
| `frontend/src/hooks/useDashboard.ts` | Load overview (`leadLimit`) + activity (20). |
| `frontend/docs/api_integration/G13_G14_SEED_UI_TEST.sql` | Lead REJECTED + timestamp bump + 5 audit fixture. |
| `frontend/docs/api_integration/G13_G14_FE_DASHBOARD_AND_AUDIT.md` | File này. |

## 2. File chỉnh sửa

| File | Thay đổi |
|---|---|
| `frontend/src/components/Overview.tsx` | Bỏ mock pipeline/leads/asset hub. KPI, 9 stage, active leads, entity activity từ API. |
| `frontend/src/components/AuditLog.tsx` | Gợi ý action/entity G6–G10; ghi chú F5/F6; nút Dashboard. |

Route `#overview` / `#audit` **đã có sẵn**.

## 3. Endpoint đã nối

| Endpoint | Call site |
|---|---|
| `GET /dashboard/overview?leadLimit=` | `#overview` KPI + 9 stages + panel (default 8, max 50) |
| `GET /dashboard/activity?limit=20` | Cột phải — timestamp feed |
| `GET /dashboard/leads` | Service sẵn; Overview dùng panel trong overview |
| `GET /audit-logs` | `#audit` (G4) — filter đầy đủ |

## 4. Quy tắc trên UI

- KPI: `totalLeads`, `activeLeads` (không WON/LOST/REJECTED), `qualifiedLeads` (QUALIFIED/PROPOSAL_DRAFTING/APPROVED), `proposalsInProgress` (DRAFT/IN_REVIEW), `estimatedValueByCurrency` (bỏ REJECTED + null cost, **không cộng chéo currency**).
- Pipeline luôn 9 status kể cả count 0.
- `leadLimit` 8 / 20 / 50. `meta.total` trên `/dashboard/leads` = số row trả về, không phải tổng tenant (F4).
- Activity ≠ audit (F3): tối đa 2 row/entity từ `created_at`/`updated_at`.
- Dashboard: mọi role đã login + có org đều đọc (F7). Audit: ADMIN / PRESALE_LEAD.
- `from` > `to` → rỗng, không 400 (F8).
- `ip_address` không hiện trên UI.

## 5. Seed & test tay

Chạy `G13_G14_SEED_UI_TEST.sql` sau G4–G12. Đã apply: lead REJECTED, bump updated_at HealthFirst + Beta POS proposal, 5 audit row (có 1 FAILED fixture).

| Bước | Hash | Kỳ vọng |
|---|---|---|
| 1 | `#overview` admin | KPI khớp SQL; 9 stage; REJECTED = 1; panel ≤ leadLimit |
| 2 | Đổi leadLimit 8→20 | Panel dài hơn nếu active > 8 |
| 3 | Click lead | `#leads?id=` |
| 4 | Cột activity | Có `LEAD_UPDATED` / `PROPOSAL_UPDATED` sau bump |
| 5 | `viewer@presaleee.test` | Dashboard đọc được; `#audit` khoá, không gọi API |
| 6 | `#audit` admin, action `LEAD_STATUS_CHANGED` | Fixture e7…0002 |
| 7 | `resultStatus=FAILED` | 1 row fixture `LOGIN_REJECTED` |
| 8 | Filter `from` 2099 `to` 2020 | Rỗng |

## 6. Chưa làm

- Không sửa backend F3–F8.
- Overview sidebar vẫn marketing chrome; phần số liệu là API.
- `GET /dashboard/leads` chưa có trang riêng (panel overview đủ contract).
