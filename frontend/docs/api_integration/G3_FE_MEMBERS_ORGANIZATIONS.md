# G3 — Trang Quản lý Thành viên & Tổ chức trên Frontend

Tài liệu ghi lại **những gì đã thêm/sửa trong mã nguồn** cho nhóm tính năng G3 (Users & Organizations). Không phải báo cáo kết quả test.

- Branch làm việc: `feat/g3-users-orgs` (cắt từ `feat/frontend-auth`). **Toàn bộ thay đổi này chưa commit.**
- Chỉ thay đổi mã trong `frontend/`. Backend không sửa; không thêm dependency npm.

## 1. File tạo mới

| File | Nội dung |
|---|---|
| `frontend/src/types/user.ts` | Kiểu dữ liệu G3 khớp DTO backend: `UserAccount`, `MemberDirectoryEntry` (thêm `organizationName`), `OrganizationSummary` (thêm `memberCount`). |
| `frontend/src/services/userService.ts` | Ánh xạ 6 endpoint `/api/v1/users`: `listOrganizations`, `listMembers` (trả kèm `meta`), `getMember`, `addMember`, `updateMember`, `updateOwnProfile`. Có `toQueryString()` dùng `URLSearchParams` và `encodeURIComponent(id)` cho mọi path theo id. |
| `frontend/src/hooks/useOrganizations.ts` | Fetch danh sách tổ chức của người đang đăng nhập; trả `{ organizations, primary, isLoading, error, reload }`. |
| `frontend/src/hooks/useMemberDirectory.ts` | Fetch danh sách thành viên theo bộ lọc; **deps là từng primitive** (`page, limit, role, status, search, allOrganizations`) thay vì object để tránh vòng lặp render; có cờ `cancelled` để không ghi đè response cũ. |
| `frontend/src/components/MembersDirectory.tsx` | Trang `#members`: bảng thành viên, ô tìm kiếm có debounce 300 ms, lọc role/status, checkbox *All organizations* (chỉ `ADMIN`), phân trang, form tạo thành viên, panel *Details*, đổi role và activate/deactivate. |
| `frontend/src/components/Profile.tsx` | Trang `#profile`: sửa `fullName` + `avatarUrl`, đổi mật khẩu (cần `currentPassword`, xác nhận lần hai), khối *Account details* (`role`, `status`, `organization`, `createdAt`, `updatedAt`) và danh sách tổ chức kèm `memberCount`. |
| `frontend/src/components/workspace/WorkspacePill.tsx` | Pill tổ chức dùng chung: gọi `GET /users/me/organizations`, hiển thị tên + `plan`, có 4 trạng thái (có dữ liệu / đang tải / không có tổ chức / lỗi), bấm chuyển sang `#members`. |
| `frontend/src/components/workspace/UserCard.tsx` | Thẻ người dùng dùng chung dưới sidebar: avatar (ảnh nếu có `avatarUrl`, không thì initials), tên, dòng phụ chọn `email` hoặc `role`, bấm vào thẻ mở `#profile`, nút logout. |
| `frontend/src/navigation.ts` | `navigateTo(route)` — hợp đồng hash-router để widget điều hướng mà không cần truyền prop qua 4 trang. |
| `frontend/src/utils/format.ts` | `initialsOf(fullName)` và `formatDateTime(iso)` (`Intl` locale `en-GB`). |

## 2. File chỉnh sửa

| File | Thay đổi |
|---|---|
| `frontend/src/services/apiClient.ts` | Tách phần gọi thật vào hàm `send<T>()` nội bộ để giữ được `meta`; thêm `apiRequestWithMeta<T>()` cho endpoint phân trang; `ApiError` mang theo `status`. |
| `frontend/src/types/auth.ts` | Thêm `ListMeta { total, page, limit, totalPages }` và `ApiEnvelope<T>`. |
| `frontend/src/hooks/useAuth.tsx` | Thêm `syncUser(user)` vào context để cập nhật thông tin ngay sau khi sửa hồ sơ mà không gọi lại `/auth/me`. |
| `frontend/src/App.tsx` | Thêm route `members` và `profile` vào `Page`, `pageFromHash` và khối render (cả hai bọc `<RequireAuth>`); `goTo` chỉ cuộn lên đầu khi thực sự đổi trang. |
| `frontend/src/components/Overview.tsx` | Pill và thẻ người dùng chuyển sang `WorkspacePill` / `UserCard`; thêm mục điều hướng **Members** (icon `Users`) và prop `onNavigateMembers`; bỏ import `LogOut` và hook `useOrganizations` giờ không còn dùng ở đây. |
| `frontend/src/components/AIWorkspace.tsx` | Pill + thẻ người dùng dùng widget chung; **avatar stack** ở header chuyển từ `ES/MV/+3` hardcode sang thành viên thật (`GET /users` limit 5, hiện tối đa 4 + `+N`); bỏ import `LogOut`. |
| `frontend/src/components/RfpIntake.tsx` | Pill `DEMO WORKSPACE / PRO` và thẻ `SE Team Lead / sales-eng@org` chuyển sang widget dữ liệu thật; bỏ import `LogOut`. |
| `frontend/src/components/KnowledgeVault.tsx` | Tương tự RfpIntake (pill + thẻ người dùng), bỏ import `LogOut`. |

## 3. Endpoint đã nối và vị trí gọi

| Endpoint | Call site |
|---|---|
| `GET /api/v1/users/me/organizations` | `hooks/useOrganizations.ts:25` → `WorkspacePill`, khối *Your organizations* trong `Profile` |
| `GET /api/v1/users` | `hooks/useMemberDirectory.ts:30` → bảng `#members`, avatar stack ở `AIWorkspace` |
| `GET /api/v1/users/:id` | `components/MembersDirectory.tsx:45` (panel Details) · `components/Profile.tsx:34` (metadata của chính mình) |
| `POST /api/v1/users` | `components/MembersDirectory.tsx:91` |
| `PATCH /api/v1/users/:id` | `components/MembersDirectory.tsx:101` (role) · `:105` (status) |
| `PATCH /api/v1/users/me` | `components/Profile.tsx:51` (tên/avatar) · `:70` (mật khẩu) |

## 4. Quy tắc nghiệp vụ phản ánh trong UI

- Chỉ `ADMIN` và `PRESALE_LEAD` thấy nút tạo thành viên và các control sửa role/status (`ORGANIZATION_ADMIN_ROLES`).
- `allOrganizations=true` chỉ hiện với `ADMIN` (backend trả 403 nếu role khác).
- Dòng của chính người đang đăng nhập bị ẩn control đổi role/status vì backend trả 400; dòng có nhãn `YOU`.
- Mật khẩu thành viên mới tối thiểu 12 ký tự; form *Create account* disables tới khi hợp lệ.
- Đổi mật khẩu của mình làm backend thu hồi mọi phiên, UI báo bằng notice.
- Nút *Save profile* disabled khi không có thay đổi, vì backend báo `At least one editable field is required.` khi body rỗng.

## 5. Ngôn ngữ hiển thị

Toàn bộ nhãn của `#members`, `#profile` và hai widget dùng chung là **tiếng Anh**, kể cả chuỗi fallback trong hook và format ngày (`en-GB`).

## 6. Chưa làm

- Chữ ký `Alex Vance — Lead Architect` trong proposal mẫu (`AIWorkspace.tsx:1343`) và khối `BUYING COMMITTEE` vẫn là dữ liệu mẫu: đó là nhân sự **phía khách hàng**, thuộc domain RFQ, G3 không có API cho chúng.
- `G2_FE_AUTH_INTEGRATION.md` (cùng thư mục) và file này chưa được commit cùng phần mã.
