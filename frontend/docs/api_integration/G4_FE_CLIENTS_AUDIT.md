# G4 — Trang Quản lý Khách hàng & Audit Trail trên Frontend

Tài liệu ghi lại **những gì đã thêm/sửa trong mã nguồn** cho nhóm tính năng G4 (Clients & Audit Log). Không phải báo cáo kết quả test.

- Branch làm việc: `feat/g4-clients-audit` (cắt từ `feat/g3-users-orgs`).
- Chỉ thay đổi mã trong `frontend/`. Backend không sửa; không thêm dependency npm.

## 1. File tạo mới

| File | Nội dung |
|---|---|
| `frontend/src/types/client.ts` | `ClientRecord` khớp entity `Client` của backend (`industry` để kiểu `string \| null` vì row cũ có thể là giá trị free-form), `ClientLeadSummary` (không có `rawRfpContent`/`bantDetails` vì endpoint list không trả), hằng `CLIENT_INDUSTRIES` (10 giá trị taxonomy) và `LEAD_STATUSES` (9 giá trị). |
| `frontend/src/types/audit.ts` | `AuditEntry` + `AUDIT_RESULT_STATUSES` (`SUCCESS`/`FAILED`). Không có `ip_address` vì API không trả field này. |
| `frontend/src/services/clientService.ts` | Ánh xạ 6 endpoint `/api/v1/clients`: `listClients` (kèm `meta`), `getClient`, `createClient`, `updateClient`, `deleteClient` (kiểu `Promise<void>` vì 204 rỗng), `listClientLeads`. Hai hàm build query riêng (`clientQueryToString`, `leadQueryToString`) để không phải cast union. |
| `frontend/src/services/auditService.ts` | `listEntries()` cho `GET /api/v1/audit-logs` (chú ý: backend mount router tại `audit-logs`, không phải `audits` — xem `backend/src/presentation/routes/index.ts:62`) với 9 tham số lọc (`page, limit, action, entityType, entityId, actorId, resultStatus, from, to`), chỉ set tham số có giá trị. |
| `frontend/src/hooks/useClientDirectory.ts` | Fetch khách hàng theo bộ lọc; deps là từng primitive; cờ `cancelled`; trả `{ clients, meta, isLoading, error, reload }`. |
| `frontend/src/hooks/useClientLeads.ts` | Nhận `clientId: string \| null`; khi `null` thì **không gọi API** và reset state (đây là lý do `isLoading` khởi tạo `false`), khi có id thì fetch theo `page/limit/status`. |
| `frontend/src/hooks/useAuditLog.ts` | Giống hai hook trên, thêm tham số `enabled` (mặc định `true`): khi `false` không gọi request nào, để trang `#audit` không nhận 403 cho role bị cấm. |
| `frontend/src/components/ClientsDirectory.tsx` | Trang `#clients`: bảng khách hàng, tìm kiếm debounce 300 ms, lọc `industry`, phân trang 20/item, form thêm–sửa (6 field), xoá có 2 bước confirm, panel *Client details* gọi `GET /clients/:id` và bảng *Leads for this client* có lọc status + phân trang 10/item. |
| `frontend/src/components/AuditLog.tsx` | Trang `#audit`: 8 ô lọc (action/entity type qua `datalist`, entity id, actor id, result, from/to `datetime-local`, page size 20–200), debounce 400 ms, bảng 6 cột, `payload` mở bằng `<details>` + `<pre>` JSON, phân trang; **không có control ghi** nào vì API chỉ đọc. |

## 2. File chỉnh sửa

| File | Thay đổi |
|---|---|
| `frontend/src/navigation.ts` | `RouteName` thêm `'clients' \| 'audit'` để widget điều hướng bằng `navigateTo(...)`. |
| `frontend/src/App.tsx` | Thêm `clients`, `audit` vào `Page`, vào `pageFromHash` và vào khối render (cả hai bọc `<RequireAuth>`); thêm `navigateToClients`, `navigateToAudit`; import hai component mới. |
| `frontend/src/components/Overview.tsx` | Sidebar thêm **Clients** (icon `Building2`) và **Audit trail** (icon `ShieldCheck`), kèm prop `onNavigateClients` / `onNavigateAudit`. |

## 3. Endpoint đã nối và vị trí gọi

| Endpoint | Call site |
|---|---|
| `GET /api/v1/clients` | `hooks/useClientDirectory.ts:30` → bảng `#clients` |
| `GET /api/v1/clients/:id` | `components/ClientsDirectory.tsx:130` (panel Details) |
| `POST /api/v1/clients` | `components/ClientsDirectory.tsx:180` |
| `PATCH /api/v1/clients/:id` | `components/ClientsDirectory.tsx:176` |
| `DELETE /api/v1/clients/:id` | `components/ClientsDirectory.tsx:203` |
| `GET /api/v1/clients/:id/leads` | `hooks/useClientLeads.ts:39` → bảng leads trong panel |
| `GET /api/v1/audit-logs` | `hooks/useAuditLog.ts:38` → bảng `#audit` |

## 4. Quy tắc nghiệp vụ phản ánh trong UI

- **Phân quyền ghi**: `POST/PATCH/DELETE /clients` chỉ dùng được bởi `ADMIN` và `PRESALE_LEAD`. UI ẩn hẳn nút *Add client*, *Edit*, *Delete* với role khác (`canManage`), nhưng vẫn cho đọc vì backend chỉ đòi `requireAuth + requireOrganization` cho các GET.
- **Tổ chức là bắt buộc**: tài khoản có `organizationId = null` bị middleware chặn bằng 403 `An organization is required for this operation.` UI báo trước bằng cảnh báo vàng ở đầu trang `#clients` thay vì để người dùng đoán nguyên nhân.
- **`#audit` chỉ đọc được bởi `ADMIN`/`PRESALE_LEAD`**; với role khác trang render thông báo bị khoá và hook không phát request nào.
- **PATCH gửi diff, không gửi cả form**: `buildPatch()` chỉ đưa vào body những field thực sự đổi, nhờ đó audit log ghi `changedFields` đúng. Nếu không đổi gì, nút *Save changes* vẫn bật nhưng báo `Nothing to save — change at least one field.` (backend sẽ trả 400 `At least one editable field is required.`).
- **Industry legacy**: khi đang sửa một row có `industry` ngoài taxonomy, `industryOptions` chèn tạm giá trị đó vào `<select>` để thao tác sửa không âm thanh ghi đè thành rỗng.
- **Giới hạn độ dài theo backend**: `companyName` 255, `contactPerson/contactEmail` 255, `contactPhone` 50, `country` 100, `action/entityType` 100, uuid 36. Để trống `country` thì backend tự đặt `Vietnam`; để trống `industry/contactPerson/contactEmail/contactPhone` thì backend lưu `null` (giá trị này chỉ có tác dụng khi thật sự thay đổi so với bản ghi).
- **Xoá không replay được**: 204 không có body nên UI không hiển thị dữ liệu trả về, chỉ reload danh sách; nếu khách hàng còn lead thì backend trả 409 `Reassign the N lead(s) attached to this client before deleting it.` và UI hiện nguyên văn trong banner đỏ.
- **Lọc audit là so khớp tuyệt đối**: `action` và `entityType` trong SQL dùng dấu `=`, không ILIKE, nên hai ô này gợi ý giá trị bằng `datalist`. Kết quả luôn sắp xếp `created_at DESC`.
- `from/to` là `datetime-local` (naive) → UI chuyển sang ISO-8601 bằng `new Date(value).toISOString()` trước khi gửi; giá trị không hợp lệ bị bỏ qua chứ không gửi rỗng.

## 5. Ngôn ngữ hiển thị

Toàn bộ nhãn, placeholder, thông báo thành công/thất bại và chuỗi fallback của `#clients`, `#audit` và ba hook mới là **tiếng Anh**; ngày tháng dùng `formatDateTime` với locale `en-GB`.

## 6. Chưa làm

- **Tạo lead**: `GET /clients/:id/leads` chỉ đọc. Muốn thêm lead cho khách hàng cần UI của nhóm RFP/Leads (`POST /api/v1/leads`), ngoài phạm vi G4.
- **Gán lead ↔ client**: không có control `PATCH /leads/:id` trên trang này, nên không kiểm thử được nhánh 409 khi xoá khách hàng có lead (chỉ xoá được client chưa có lead).
- **`entityId`/`actorId`**: người dùng phải dán UUID thủ công. Trang `#members`/`#clients` chưa có nút "copy id".
- **`resultStatus=FAILED`**: chưa use case nào ghi `FAILED` (mặc định `SUCCESS`), nên lọc này luôn trả rỗng — chỉ dùng để chứng minh bộ lọc xuống tới SQL.
- Phần code G4 chưa commit.
