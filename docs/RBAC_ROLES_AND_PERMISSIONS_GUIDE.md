# TÀI LIỆU HỆ THỐNG PHÂN QUYỀN (RBAC) & VẬN HÀNH CÁC ROLE TRONG DỰ ÁN PRESALEEE

> **Tài liệu đặc tả kiến trúc:** Role-Based Access Control (RBAC) & Multi-Tenant Data Isolation  
> **Dự án:** Presaleee Platform (AI-Powered Presale & Proposal Engineering)  
> **Ngày cập nhật:** 14/11/2026  
> **Phiên bản tài liệu:** v2.4

---

## 1. TỔNG QUAN KIẾN TRÚC PHÂN QUYỀN (RBAC & MULTI-TENANCY)

Hệ thống **Presaleee** được xây dựng nhằm tự động hóa toàn diện quy trình Presale từ khâu tiếp nhận yêu cầu (RFP/Specs), thẩm định cơ hội (BANT Qualification), phân tích cuộc họp kỹ thuật (Discovery Meetings), tự động sinh đề xuất 10 Sheets (Proposal Builder bằng AI RAG) đến chia sẻ và cộng tác với khách hàng qua Client Portal.

Hệ thống bảo vệ tài nguyên dựa trên 2 tầng kiểm soát đồng thời:
1. **Multi-Tenant Isolation (Tầng tổ chức):** Mọi tài nguyên (`Leads`, `Proposals`, `Meetings`, `Knowledge Documents`, `Clients`, `Rate Cards`) đều gắn liền với một `organization_id`. Người dùng thuộc tổ chức này tuyệt đối không thể đọc, sửa hoặc xóa dữ liệu của tổ chức khác dù biết chính xác mã định danh UUID.
2. **Role-Based Access Control - RBAC (Tầng vai trò):** Xác định quyền hạn cụ thể của từng người dùng trong phạm vi tổ chức của họ, dựa trên Role được gán trong JWT Token.

---

## 2. DANH SÁCH 6 ROLE TRONG HỆ THỐNG

| STT | Tên Role | Mã định danh hệ thống | Trách nhiệm chính |
| :---: | :--- | :--- | :--- |
| 1 | **Quản trị viên** | `ADMIN` | Quản trị Workspace, cấu hình tổ chức, phân quyền thành viên và kiểm toán hệ thống. |
| 2 | **Trưởng nhóm Presale** | `PRESALE_LEAD` | Phê duyệt đề xuất, quản lý deal, cấu hình bảng đơn giá (Rate Cards) và quản lý khách hàng. |
| 3 | **Chuyên viên Tư vấn Presale** | `PRESALE_CONSULTANT` | Vận hành AI Pipeline, phân tích RFP, tổ chức Discovery Meetings và dựng hồ sơ đề xuất 10 Sheets. |
| 4 | **Kiến trúc sư Giải pháp** | `SOLUTION_ARCHITECT` | Chịu trách nhiệm kiến trúc kỹ thuật, phi chức năng, rà soát rủi ro RAID và nạp tri thức vào Vault. |
| 5 | **Đại diện Kinh doanh** | `SALES_REP` | Quản lý quan hệ khách hàng, đường ống Leads, tạo link chia sẻ Client Portal và chốt hợp đồng. |
| 6 | **Người quan sát** | `VIEWER` | Xem dữ liệu, tra cứu tri thức, tải/in báo cáo. **Hoàn toàn chỉ đọc (Read-Only)**. |

---

## 3. CHI TIẾT NỘI DUNG, THAO TÁC & PHẠM VI HOẠT ĐỘNG TỪNG ROLE

### 3.1. Role `ADMIN` (Quản trị viên Tổ chức)
* **Mục tiêu:** Đảm bảo hệ thống hoạt động ổn định, bảo mật và tuân thủ quy chuẩn nội bộ.
* **Quyền hạn & Thao tác:**
  - **Quản lý Thành viên (`Members Directory`):** Mời người dùng mới vào tổ chức qua email, thay đổi Role cho thành viên, kích hoạt hoặc vô hiệu hóa tài khoản (`ACTIVE` / `DEACTIVATED`).
  - **Nhật ký Kiểm toán (`Audit Trail`):** Xem lịch sử toàn bộ các hành động trong tổ chức (ai tạo lead, ai sửa proposal, ai export file, ai xóa tài liệu) kèm IP Address và User-Agent.
  - **Quản lý Bảng giá & Đối tác:** Toàn quyền tạo, cập nhật, xóa Rate Cards và Client Profiles.
  - **Kế thừa toàn quyền:** Có đầy đủ quyền hạn của tất cả các role bên dưới (Intake, Meetings, Proposals, Knowledge Vault, Client Portal).

### 3.2. Role `PRESALE_LEAD` (Trưởng nhóm Presale)
* **Mục tiêu:** Kiểm soát chất lượng chuyên môn, tiến độ phê duyệt và các chỉ số thương mại của dự án.
* **Quyền hạn & Thao tác:**
  - **Phê duyệt Vòng đời Hồ sơ (`Proposal Lifecycle`):** Chỉ có `ADMIN` và `PRESALE_LEAD` mới có quyền chuyển trạng thái Proposal lên `APPROVED` và `SENT_TO_CLIENT`.
  - **Cấu hình Bảng đơn giá (`Rate Cards`):** Quản lý định mức chi phí theo giờ/ngày cho từng vai trò nhân sự (Project Manager, Solution Architect, Senior Dev, DevOps, QA...) làm cơ sở tính giá cho Sheet 5 & Sheet 6.
  - **Phê duyệt chia sẻ Portal lần đầu (`PORTAL_FIRST_SHARE_ROLES`):** Cấp phép phát hành liên kết Client Portal chính thức ra bên ngoài cho khách hàng.
  - **Quản lý Leads:** Xóa, chỉnh sửa, tái phân bổ quyền phụ trách Lead cho các chuyên viên tư vấn.

### 3.3. Role `PRESALE_CONSULTANT` (Chuyên viên Tư vấn Presale)
* **Mục tiêu:** Trực tiếp chuyển hóa yêu cầu của khách hàng thành bản đề xuất giải pháp kỹ thuật hoàn chỉnh.
* **Quyền hạn & Thao tác:**
  - **AI Intake Pipeline:** Nhập brief RFP/Spec chưa có cấu trúc, chạy AI Intake Parser để trích xuất ngân sách, thời hạn, tech stack và yêu cầu tuân thủ.
  - **BANT Qualification:** Chạy đánh giá AI chấm điểm 4 tiêu chí BANT (Budget, Authority, Need, Timeline).
  - **Discovery Meetings:** Nhập ghi chú hoặc transcript cuộc họp kỹ thuật, yêu cầu AI trích xuất quyết định, việc cần làm (`Action Items`) và phân tích khoảng trống yêu cầu (`Gap Analysis`).
  - **Proposal Studio (10 Sheets):**
    - Nhấn nút **"Tạo Hồ sơ Đề xuất Bằng AI RAG"** để AI tổng hợp tri thức từ Lead + Biên bản họp + Knowledge Vault sinh 10 sheets chuẩn.
    - Trực tiếp chỉnh sửa các sheet: Phạm vi công việc (WBS), Tiến độ (Milestones), Nhân sự & Đơn giá, SLA & Bảo trì.
    - Xuất hồ sơ ra tệp Excel (`.xlsx`) hoặc PDF (`.pdf`) vector đa trang có đầy đủ bìa, mục lục, bảng biểu.
  - **Cộng tác Client Portal:** Tạo phiên Portal, theo dõi phản hồi và bình luận từ phía khách hàng.

### 3.4. Role `SOLUTION_ARCHITECT` (Kiến trúc sư Giải pháp)
* **Mục tiêu:** Chịu trách nhiệm về tính khả thi kỹ thuật, độ tin cậy hệ thống và chuẩn an toàn thông tin.
* **Quyền hạn & Thao tác:**
  - **Kiến trúc & Công nghệ:** Trực tiếp hoàn thiện Sheet 3 (`Architecture, Non-FR & Tech Stack`) và Sheet 8 (`Risk Management - RAID Log`).
  - **Kho tri thức (`Knowledge Vault`):** Nạp tài liệu giải pháp mẫu, kiến trúc hạ tầng (`POST /knowledge/documents` & `/rag/ingest`). Hệ thống tự động phân đoạn (chunking) và vector hóa dữ liệu bằng mô hình embedding.
  - **UI Prototype Brief:** Sinh bản tóm tắt giao diện (AI UI Design Brief) phục vụ dựng mô hình Sandbox tương tác trên Client Portal.
  - **Tương tác Portal:** Trả lời trực tiếp các câu hỏi kỹ thuật chuyên sâu của khách hàng trên Portal.

### 3.5. Role `SALES_REP` (Đại diện Kinh doanh / Account Executive)
* **Mục tiêu:** Theo dõi và thúc đẩy cơ hội kinh doanh, duy trì kết nối với khách hàng.
* **Quyền hạn & Thao tác:**
  - **Quản lý Lead ban đầu:** Nhập thông tin liên hệ của khách hàng, tạo mới Lead cơ hội.
  - **Theo dõi đường ống (`Presale Pipeline`):** Quan sát tỷ lệ chuyển đổi, trạng thái các deal (Đang thẩm định, Đang họp, Đang soạn Proposal, Đã gửi).
  - **Client Portal:**
    - Tạo link chia sẻ Client Portal gửi khách hàng sau khi Proposal đã được phê duyệt.
    - Quan sát tín hiệu thời gian thực (`Telemetry Signals`) khi khách hàng mở xem Proposal.
    - Đọc phản hồi, câu hỏi và đề xuất chỉnh sửa của khách hàng.
  - **Xuất tóm tắt điều hành:** Xuất bản Executive Overview (`.txt`/PDF) để trình bày nhanh cho Ban Giám đốc khách hàng.

### 3.6. Role `VIEWER` (Khách quan sát - Read-Only)
* **Mục tiêu:** Đảm bảo tính minh bạch thông tin cho kiểm toán, thành viên mới hoặc đối tác theo dõi tiến độ, tuyệt đối không làm sai lệch hay phá vỡ tính toàn vẹn của dữ liệu.
* **Quyền hạn & Thao tác:**
  - **ĐƯỢC PHÉP (Chỉ đọc):**
    - Xem Dashboard tổng quan KPI, tiến độ các Lead, Meetings và Proposals.
    - Đọc chi tiết toàn bộ nội dung 10 Sheets trong Proposal Studio.
    - Xuất / Tải xuống tệp Excel (`.xlsx`) và PDF (`.pdf`) của Proposal.
    - Sử dụng tính năng tra cứu tri thức nâng cao: Tìm kiếm Hybrid (`Hybrid Search`) và trò chuyện với trợ lý tri thức (`Ask Vault`).
  - **BỊ CHẶN HOÀN TOÀN (Trả mã lỗi `403 Forbidden`):**
    - ❌ Không được tạo mới, cập nhật hay xóa bất kỳ Lead nào (`POST/PUT/DELETE /leads`).
    - ❌ Không được sửa, sinh lại hay xóa Proposal (`DELETE /proposals/:id`, `PATCH /proposals/:id`).
    - ❌ Không được nạp thêm (`Ingest`) hoặc xóa tài liệu khỏi Knowledge Vault (`DELETE /knowledge/documents/:id`).
    - ❌ Không được phê duyệt đề xuất hoặc can thiệp bảng đơn giá Rate Cards.
    - ❌ Giao diện Frontend tự động ẩn hoặc vô hiệu hóa các nút chức năng: **Delete**, **Confirm Delete**, **Ingest**, **Chạy AI Intake**.

---

## 4. BẢNG MA TRẬN PHÂN QUYỀN THAO TÁC (RBAC MATRIX)

| STT | Phân hệ / Thao tác chức năng | ADMIN | PRESALE_LEAD | PRESALE_CONSULTANT | SOLUTION_ARCHITECT | SALES_REP | VIEWER |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **1** | **Tổng quan & Dashboard** | | | | | | |
| 1.1 | Xem Dashboard KPIs, tiến độ Pipeline | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **2** | **Quản lý Yêu cầu & Leads** | | | | | | |
| 2.1 | Xem danh sách & Chi tiết Lead | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2.2 | Phân tích AI Intake Parser từ RFP | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| 2.3 | Tạo mới Lead từ bản nháp Intake | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| 2.4 | Chấm điểm Thẩm định BANT | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| 2.5 | Cập nhật thông tin Lead | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| 2.6 | Xóa Lead | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **3** | **Cuộc họp Kỹ thuật (Meetings)** | | | | | | |
| 3.1 | Xem danh sách & Biên bản họp | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 3.2 | Nạp Transcript & Ghi chú họp | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| 3.3 | Chạy AI trích xuất Decisions & Gaps | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **4** | **Soạn thảo Đề xuất (10 Sheets Proposal)** | | | | | | |
| 4.1 | Xem chi tiết 10 Sheets đề xuất | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 4.2 | Sinh Proposal bằng AI RAG tự động | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| 4.3 | Chỉnh sửa nội dung các Sheet | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| 4.4 | Phê duyệt đề xuất (`APPROVED`) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 4.5 | Xuất file Excel (`.xlsx`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 4.6 | Xuất file PDF Chuẩn in ấn (`.pdf`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 4.7 | Xóa Proposal | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **5** | **Kho Tri thức (Knowledge Vault)** | | | | | | |
| 5.1 | Xem danh sách tài liệu & Thống kê | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 5.2 | Nạp tài liệu (`Ingest & Embeddings`) | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| 5.3 | Tìm kiếm Hybrid & Hỏi đáp AI (`Ask`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 5.4 | Xóa tài liệu khỏi Vault | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **6** | **Cổng Khách hàng (Client Portal)** | | | | | | |
| 6.1 | Tạo phiên làm việc Portal (Tạo Link) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| 6.2 | Ký duyệt cấp link Portal lần đầu | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 6.3 | Khách hàng xem Overview & 10 Sheets | ✅ (Client) | ✅ (Client) | ✅ (Client) | ✅ (Client) | ✅ (Client) | ❌ |
| 6.4 | Khách hàng bình luận & Chat với AI | ✅ (Client) | ✅ (Client) | ✅ (Client) | ✅ (Client) | ✅ (Client) | ❌ |
| **7** | **Cấu hình Doanh nghiệp & Kiểm toán** | | | | | | |
| 7.1 | Xem bảng giá Rate Cards & Khách hàng | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 7.2 | Sửa / Xóa Rate Cards & Khách hàng | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 7.3 | Quản trị Thành viên (`Members`) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 7.4 | Xem Nhật ký Kiểm toán (`Audit Log`) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 5. QUY TRÌNH VẬN HÀNH THỰC TẾ GIỮA CÁC ROLE (END-TO-END PIPELINE)

```
       [SALES_REP / PRESALE_CONSULTANT]
                      │
                      ▼
            1. Tiếp nhận RFP / Yêu cầu
                      │
                      ▼
            2. Chạy AI Intake & BANT Qualification
                      │
                      ▼
         [SOLUTION_ARCHITECT & CONSULTANT]
                      │
                      ▼
            3. Họp kỹ thuật (Discovery Meetings) & Nạp Transcript
                      │
                      ▼
            4. Khởi tạo 10 Sheets Proposal bằng AI RAG
                      │
                      ▼
                 [PRESALE_LEAD]
                      │
                      ▼
            5. Thẩm định, Ký duyệt (`APPROVED`)
                      │
                      ▼
            6. Mở Client Portal & Gửi Khách hàng
                      │
                      ▼
             [KHÁCH HÀNG / CLIENT]
                      │
                      ▼
            7. Khách hàng Review, Góp ý, Nghiệm thu Proposal
```

---

## 6. CƠ CHẾ KỸ THUẬT BẢO ĐẢM AN TOÀN TRONG SOURCE CODE

1. **Middleware `requireAuth` & `requireOrganization`:**
   Mọi route xử lý nghiệp vụ đều bắt buộc phải vượt qua việc xác thực chữ ký số JWT và kiểm tra sự tồn tại của `organizationId`.
2. **Middleware `requireNotViewer`:**
   Đặt tại toàn bộ các endpoint ghi/sửa/xóa (`POST`, `PUT`, `PATCH`, `DELETE`). Khi yêu cầu có `req.auth.role === 'VIEWER'`, middleware lập tức trả về lỗi:
   ```json
   {
     "success": false,
     "error": "VIEWER role is read-only. This operation is not permitted.",
     "statusCode": 403
   }
   ```
3. **Multi-Tenant Scoping tại tầng Cơ sở dữ liệu (PostgreSQL):**
   Mọi câu lệnh truy vấn đều kèm mệnh đề `AND organization_id = $x`. Ví dụ:
   ```sql
   SELECT * FROM leads WHERE id = $1 AND organization_id = $2;
   UPDATE leads SET ... WHERE id = $6 AND organization_id = $7;
   DELETE FROM leads WHERE id = $1 AND organization_id = $2;
   ```
   Điều này đảm bảo ngăn chặn hoàn toàn việc người dùng can thiệp dữ liệu chéo tổ chức.
4. **Đồng bộ phân quyền Portal (`PORTAL_MANAGER_ROLES`):**
   Thống nhất danh sách role được phép tạo phiên làm việc Client Portal giữa Backend (`PortalUseCases.ts`) và Frontend (`types/portal.ts`):
   `['ADMIN', 'PRESALE_LEAD', 'SALES_REP', 'PRESALE_CONSULTANT', 'SOLUTION_ARCHITECT']`.

---
*Presaleee Enterprise Solutions Platform — Tài liệu kỹ thuật lưu hành nội bộ.*
