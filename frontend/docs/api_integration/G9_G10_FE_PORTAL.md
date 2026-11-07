# G9 + G10 — Staff portal desk & Client portal trên Frontend

Tài liệu ghi lại **những gì đã thêm/sửa** để nối API nhóm G9 (Staff Portal Management) và G10 (Client Portal) vào giao diện, kèm seed để test tay.

- Chỉ thay đổi mã trong `frontend/` (không sửa backend).
- Pattern giống G2–G8: `types` → `services` → hash-router. Staff `#portal` bọc `RequireAuth`. Client `#client-portal` **không** đăng nhập staff.
- G10 gửi `Authorization: Bearer <opaque>` và `credentials: 'omit'` để cookie staff không đi kèm.
- Backend E2E G9/G10 đã xanh 19/19 (AI Q&A success path skip khi port 8000 tắt).

---

## 1. File tạo mới

| File | Nội dung |
|---|---|
| `frontend/src/types/portal.ts` | Session / material / comment / client view. `PORTAL_MANAGER_ROLES`, `PORTAL_FIRST_SHARE_ROLES`. |
| `frontend/src/services/portalService.ts` | `portalStaffService` (cookie) + `portalClientService` (Bearer). |
| `frontend/src/components/PortalDesk.tsx` | Trang `#portal`. |
| `frontend/src/components/ClientPortalPage.tsx` | Trang `#client-portal`. Token query được cất vào `sessionStorage` rồi xóa khỏi hash. |
| `frontend/docs/api_integration/G9_G10_SEED_UI_TEST.sql` | APPROVED + SENT_TO_CLIENT, session đã hash, 2 material. |
| `frontend/docs/api_integration/G9_G10_FE_PORTAL.md` | File này. |

## 2. File chỉnh sửa

| File | Thay đổi |
|---|---|
| `frontend/src/services/apiClient.ts` | `bearerToken` + `credentials: 'omit'`. `apiDownload` nhận Bearer. |
| `frontend/src/navigation.ts` | Route `portal`, `client-portal`. |
| `frontend/src/App.tsx` | `#portal` + `RequireAuth`; `#client-portal` public. |
| `frontend/src/components/Overview.tsx` | Sidebar Client portal. |
| `frontend/src/components/ProposalsStudio.tsx` | Nút Share in client portal khi APPROVED / SENT_TO_CLIENT / ACCEPTED. |
| `frontend/src/components/AIWorkspace.tsx` | Sidebar Client portal. Tab marketing Client Portal **vẫn mock**. |

## 3. Endpoint đã nối

### G9 (cookie staff)

| Endpoint | Call site |
|---|---|
| `POST /portal/sessions` | Create session — token hiện **một lần** |
| `DELETE /portal/sessions/:sessionId` | Revoke |
| `GET /proposals/:id/portal-sessions` | List sessions (VIEWER đọc được — F1) |
| `GET /proposals/:id/portal-materials` | List materials |
| `POST /proposals/:id/portal-materials` | Create; `fileUrl` HTTPS; `isShared` default false; 201 không trả `isShared` (F3) |
| `DELETE /proposals/:id/portal-materials/:materialId` | Delete |

### G10 (Bearer, không cookie)

| Endpoint | Call site |
|---|---|
| `GET /portal/proposals/:id` | View — **10 sheet** kể cả sheet nội bộ (F2) |
| `GET /portal/proposals/:id/comments` | List oldest-first |
| `POST /portal/proposals/:id/comments` | Author lấy từ session |
| `GET /portal/proposals/:id/materials` | Chỉ `isShared=true` |
| `POST /portal/proposals/:id/questions` | 90s timeout; 502 khi AI tắt |
| `GET /portal/proposals/:id/export-pdf` | Binary `%PDF` |

## 4. Quy tắc trên UI

- Chỉ `APPROVED` / `SENT_TO_CLIENT` / `ACCEPTED` mới tạo session hoặc material. Khác → 409.
- Session đầu trên `APPROVED`: ADMIN / PRESALE_LEAD. Status → `SENT_TO_CLIENT`. SALES_REP / SOLUTION_ARCHITECT bị 403 nếu chưa share.
- Sau khi đã `SENT_TO_CLIENT`, PORTAL_MANAGER (`ADMIN`, `PRESALE_LEAD`, `SALES_REP`, `SOLUTION_ARCHITECT`) tạo thêm session được.
- VIEWER: list 200, write 403.
- Token opaque không bao giờ xuất hiện lại trên list. Seed G10 dùng token đã hash.
- Client JWT staff replay → 401. Rejected proposal cắt access ngay (F4).

## 5. Seed & test tay

Chạy `G9_G10_SEED_UI_TEST.sql` sau G4 + G5/G6 + G7/G8. Đã apply lên DB dev: org A có proposal APPROVED (first-share) + SENT_TO_CLIENT kèm session hash, 1 comment, 3 materials (1 shared).

Token client (plaintext, chỉ để test UI): `g10-ui-client-token-northwind`  
Proposal đã share: `e3000000-0000-4000-8000-000000000005` (*Acme evidence portal sent to client*)  
Proposal chờ first-share: `e3000000-0000-4000-8000-000000000004` (*HealthFirst clinic suite approved*)

| Bước | Hash | Kỳ vọng |
|---|---|---|
| 1 | `#portal` chọn *Acme evidence portal sent to client* | 1 session CIO, commentCount ≥ 1, 2 materials (1 SHARED) |
| 2 | `#client-portal?proposalId=e3000…0005&token=g10-ui-client-token-northwind` | Token biến mất khỏi URL; 10 sheet; 1 material shared; comment CIO |
| 3 | Post comment / Download PDF | 201 / file `%PDF` |
| 4 | Ask | Có AI → answer + citations; không AI → 502 |
| 5 | `#portal` chọn *HealthFirst clinic suite approved* với `admin@presaleee.test` | Create session → token một lần, status SENT_TO_CLIENT |
| 6 | Cùng proposal với `rep@presaleee.test` **trước** bước 5 | 403 first-share |
| 7 | `viewer@presaleee.test` | List sessions/materials được; Create/Revoke 403 |
| 8 | fileUrl `http://…` | 400 HTTPS-only |
| 9 | Revoke session seed | Client GET ngay 401 |

## 6. Chưa làm

- AI Workspace Client Portal modal vẫn mock marketing.
- Không expose token hash trên UI.
- Không sửa defect backend F1 (VIEWER đọc email), F2 (10 sheet), F3 (201 thiếu isShared), F5 (`PRESALE_CONSULTANT` không thuộc `USER_ROLES`).
