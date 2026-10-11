# Frontend Coding Convention (React 19 + TypeScript + Vite)

Thư mục này quản lý toàn bộ giao diện người dùng của ứng dụng **Presaleee**.

---

## 1. Cấu Trúc Thư Mục Khuyến Nghị

```
frontend/src/
├── assets/          # Static assets (images, svg, logos)
├── components/      # UI components tái sử dụng (Button, Modal, Table, Header,...)
│   ├── common/      # Components dùng chung toàn hệ thống
│   └── modules/     # Components theo từng module (RfpIntake, ProposalBuilder,...)
├── pages/           # Các trang router chính
├── services/        # Các hàm gọi API về Backend (Axios / Fetch)
├── hooks/           # Custom React hooks (useRAGSearch, useProposal,...)
├── types/           # Định nghĩa TypeScript interfaces & types
└── utils/           # Helper functions thuần túy
```

---

## 2. Quy Tắc Code & TypeScript

1. **Naming Conventions**:
   - **Components**: PascalCase (ví dụ: `ProposalTable.tsx`, `RfpIntakeModal.tsx`).
   - **Hooks**: camelCase bắt đầu bằng `use` (ví dụ: `useProposalData.ts`).
   - **Utils / Services**: camelCase (ví dụ: `apiClient.ts`, `formatCurrency.ts`).
   - **Types / Interfaces**: PascalCase (ví dụ: `ProposalOverview`, `RfpExtractResult`).
2. **Không dùng `any`**:
   - Mọi dữ liệu nhận từ backend phải có Interface tương ứng trong `src/types/`.
3. **Styling**:
   - Sử dụng **TailwindCSS** utility classes.
   - Tránh viết file `.css` inline rải rác ngoại trừ global layout css.
4. **Giao tiếp API**:
   - Tất cả request API đều gửi về `Backend` (Port 5000), **KHÔNG gọi trực tiếp sang port 8000 của AI**.
   - Dùng biến môi trường `VITE_API_BASE_URL` (mặc định: `http://localhost:5000`).

---

## 3. Lệnh Thường Dùng
- `npm run dev`: Chạy dev server tại `http://localhost:5173`.
- `npm run lint`: Chạy oxlint kiểm tra cú pháp và code quality.
- `npm run build`: Type-check với TypeScript (`tsc -b`) và đóng gói Vite.

