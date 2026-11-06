# G2 — Tích hợp API xác thực vào Frontend

Tài liệu ghi lại **những gì đã thêm/sửa trong mã nguồn** cho nhóm tính năng G2 (đăng ký, đăng nhập, phiên, quên/đặt lại mật khẩu, route guard). Không phải báo cáo kết quả test.

- Nằm trong commit `8901cac` trên nhánh `feat/frontend-auth` (PR #21).
- Chỉ thay đổi mã trong `frontend/`. **Không sửa backend, không thêm dependency npm nào.**

## 1. File tạo mới

| File | Nội dung |
|---|---|
| `frontend/src/types/auth.ts` | Kiểu dữ liệu cho toàn bộ hợp đồng auth: `UserRole`, `UserStatus`, `AuthUser`, `Organization`, `RegisterData`, `SessionData`, `ForgotPasswordData`, `MessageData`. |
| `frontend/src/services/apiClient.ts` | Lớp gọi HTTP dùng chung: `credentials: 'include'`, timeout `AbortController` 10 s, đọc envelope `{ success, data, error, statusCode, meta }` một cách chịu lỗi, và ném `ApiError(status, message)` khi `!ok` hoặc `success === false`. |
| `frontend/src/services/authService.ts` | Ánh xạ 7 endpoint auth dưới `AUTH_PREFIX = '/api/v1/auth'`: `register`, `login`, `refresh`, `logout`, `me`, `forgotPassword`, `resetPassword`. |
| `frontend/src/hooks/useAuth.tsx` | `AuthProvider` + hook `useAuth`. Trạng thái `AuthStatus = 'loading' \| 'authenticated' \| 'anonymous'`; lúc bootstrap gọi `me()`, **chỉ thử `refresh()` đúng một lần** khi `me()` trả 401; `login`/`register` cập nhật `user`; `logout` xoá state trong `finally`. |
| `frontend/src/components/common/RequireAuth.tsx` | Route guard: hiện spinner khi `loading`, điều hướng `window.location.hash = '#signin'` trong effect khi `anonymous`. |
| `frontend/src/components/ResetPassword.tsx` | Màn hình đặt lại mật khẩu, đọc token từ hash `#reset-password?token=…` bằng `URLSearchParams`, gọi `resetPassword(token, password)`, kiểm tra mật khẩu nhập lại, có trạng thái hoàn tất. |

## 2. File chỉnh sửa

| File | Thay đổi |
|---|---|
| `frontend/src/components/SignIn.tsx` | Viết lại toàn bộ (243 dòng): chuyển từ `alert()` sang gọi API thật. Ba chế độ `AuthMode = 'signin' \| 'register' \| 'forgot'`; banner lỗi/thông báo; form đăng ký thêm `fullName`, `organizationName`, `organizationDomain`; `minLength={12}` cho mật khẩu; nút Google và SAML chuyển sang `disabled` kèm nhãn "chưa hỗ trợ". |
| `frontend/src/App.tsx` | Router nhận thêm trang `reset-password`; `pageFromHash` tách phần `?query`; hàm `goTo(page)` thống nhất điều hướng; 4 trang workspace bọc trong `<RequireAuth>`; `handleLogout` là async; `App` xuất ra `<AuthProvider><AppShell/></AuthProvider>`. |
| `frontend/src/components/Navbar.tsx` | Nhận thêm props `onOpenWorkspace`, `userName`; helper `initials`; Desktop và mobile menu đổi giữa *Dashboard* / *Sign-in* theo phiên và hiện avatar khi đã đăng nhập. |
| `frontend/src/components/Overview.tsx` | Dùng `useAuth()` để hiển thị thẻ người dùng thật (tên, email) và breadcrumb theo `user.role` thay cho dữ liệu hardcode. |

## 3. Endpoint đã dùng ở frontend

`POST /api/v1/auth/register` · `POST /api/v1/auth/login` · `POST /api/v1/auth/refresh` · `POST /api/v1/auth/logout` · `GET /api/v1/auth/me` · `POST /api/v1/auth/forgot-password` · `POST /api/v1/auth/reset-password`

## 4. Điểm cần biết khi chạy

- **Nút "Open reset link" chỉ hiện khi backend chạy `NODE_ENV !== 'production'`**; link nằm trong banner xanh của chế độ `forgot`, mở ra `#reset-password?token=…`. Trang này cố ý không có mục nào trên thanh điều hướng.
- `FRONTEND_URL` trong `backend/.env` phải là `http://localhost:5173` khi dùng từ trình duyệt; đặt sang `:5000` (để Swagger gọi được) sẽ làm mọi request từ browser bị `403 Request origin is not allowed.`
- Cookie chia tách theo path trên `main`: access `path=/api/v1`, refresh `path=/api/v1/auth`.
- `tsconfig.app.json` bật `verbatimModuleSyntax` + `erasableSyntaxOnly` + `noUnusedLocals`, nên mọi import kiểu phải dùng `import type` và không được để khai báo unused.
