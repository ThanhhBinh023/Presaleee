# TÀI LIỆU HỆ THỐNG PHÂN QUYỀN (RBAC) & VẬN HÀNH CÁC ROLE TRONG DỰ ÁN PRESALEEE

> **Tài liệu đặc tả kiến trúc:** Role-Based Access Control (RBAC) & Multi-Tenant Data Isolation  
> **Dự án:** Presaleee Platform (AI-Powered Presale & Proposal Engineering)  
> **Ngày cập nhật:** 15/11/2026  
> **Phiên bản tài liệu:** v2.7 *(đợt 3 — khảo sát `SOLUTION_ARCHITECT`: thêm mục 10–12 của phần 6 về audit material Portal, hợp đồng `task_mode` và `ui-brief`; vá danh sách lỗ hổng đa tenant bằng `findById`; đính chính phát biểu "tạo phiên Portal không cần Proposal APPROVED" — xem `RBAC_TENANCY_BUGFIX_CHANGELOG.md` mục 18)*  
> **Quy tắc đọc bảng ma trận:** một quyền chỉ được ghi là giới hạn theo role khi code **thực sự enforce** giới hạn đó (middleware hoặc use case). Ngoài `VIEWER` và `ORGANIZATION_ADMIN_ROLES = ['ADMIN','PRESALE_LEAD']`, hệ thống **không có** giới hạn nào khác giữa 4 role nghiệp vụ còn lại.

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
  - **Phê duyệt Vòng đời Hồ sơ (`Proposal Lifecycle`):** Chỉ `ADMIN` và `PRESALE_LEAD` được chuyển trạng thái sang `APPROVED`, `REJECTED`, `SENT_TO_CLIENT`, `ACCEPTED` (`UpdateProposalUseCase.ts:66`).
  - **Cấu hình Bảng đơn giá & Khách hàng:** `POST/PATCH/DELETE /rate-cards` và `POST/PATCH/DELETE /clients` dùng `requireRole(...ORGANIZATION_ADMIN_ROLES)`.
  - **Quản trị Thành viên:** Mời thành viên (`POST /users`), đổi role / vô hiệu hóa (`PATCH /users/:id`) — dùng chung `ORGANIZATION_ADMIN_ROLES`.
  - **Nhật ký Kiểm toán:** `GET /audit-logs` chỉ mở cho `ADMIN` và `PRESALE_LEAD`.
  - **Quản lý Leads:** Xóa, chỉnh sửa, tái phân bổ quyền phụ trách Lead cho các chuyên viên tư vấn.
  - **Lưu ý:** các thao tác nghiệp vụ thông thường (Intake, BANT, Meetings, Proposal Studio, Ingest, Portal) **không** phân biệt `PRESALE_LEAD` với 3 role nghiệp vụ còn lại — `ADMIN` và `PRESALE_LEAD` chỉ hơn ở 4 nhóm quyền vừa liệt kê.

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
  - **UI Prototype Brief:** Sinh bản tóm tắt giao diện (`POST /proposals/:id/ui-brief`) phục vụ dựng mô hình Sandbox tương tác trên Client Portal. Từ đợt 3 endpoint này **mới thật sự gọi AI** (mode 6); trước đó nó trả văn mẫu hard-code nhưng vẫn báo "generated successfully". Nếu sheet `Overview` đã có `uiDesignBrief` hợp lệ thì đọc lại, không gọi model — `meta.source` cho biết nguồn nào.
  - **Tương tác Portal:** Trả lời trực tiếp các câu hỏi kỹ thuật chuyên sâu của khách hàng trên Portal.
  - ⚠️ **Chiếu theo code (đợt 3, 15/11/2026):** 4 gạch đầu dòng trên là **mô tả nghiệp vụ**, không phải giới hạn kỹ thuật. Không có một middleware hay guard nào nhắc riêng tới `SOLUTION_ARCHITECT`; hệ thống chỉ có 2 tầng enforce (`requireNotViewer` và `ORGANIZATION_ADMIN_ROLES`). Vì vậy về mặt API, `SOLUTION_ARCHITECT` **giống hệt** `PRESALE_CONSULTANT` và `SALES_REP`, và **kém** `ADMIN`/`PRESALE_LEAD` đúng 6 nhóm: CRUD khách hàng, CRUD rate card, mời/đổi role thành viên, đọc audit log, 4 chuyển trạng thái đề xuất đặc quyền, và duyệt thư mục chéo tổ chức.

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
    - ❌ Không được tạo mới, cập nhật hay xóa bất kỳ Lead nào (`POST/PUT/DELETE /leads`), kể cả chạy AI Intake và chấm điểm BANT.
    - ❌ Không được sửa, sinh lại hay xóa Proposal (`DELETE /proposals/:id`, `PATCH /proposals/:id`, `POST /proposals/:id/generate`, `POST /proposals/:id/ui-brief`).
    - ❌ Không được nạp thêm (`Ingest`) hoặc xóa tài liệu khỏi Knowledge Vault (`DELETE /knowledge/documents/:id`).
    - ❌ Không được phê duyệt đề xuất, không được **áp** kết quả tính giá vào Proposal (`apply:true` — chặn tại `RateCardUseCases.ts:237`), không được nạp/chỉnh sửa transcript họp.
    - ❌ Không được quản lý Rate Cards, Client Profiles, thành viên, Audit Log, hay thu hồi phiên Portal.
    - ⚠️ **Ngoại lệ chưa siết:** `POST /portal/sessions` (tạo link chia sẻ) vẫn mở cho `VIEWER`, dù chỉ với Proposal đã `APPROVED`/`SENT_TO_CLIENT`/`ACCEPTED` — xem ghi chú ma trận mục 4.
    - ✅ Giao diện Frontend tự động ẩn các nút ghi: **Delete**, **Confirm Delete**, **Ingest**, **Chạy AI Intake**, và từ 15/11/2026 bổ sung **Submit for Review**, **Approve Proposal**, **Sinh lại 10 Sheets**, **Tạo/Làm mới AI UI Brief**.

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
| 2.4 | Chấm điểm Thẩm định BANT | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| 2.5 | Cập nhật thông tin Lead | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| 2.6 | Xóa Lead | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **3** | **Cuộc họp Kỹ thuật (Meetings)** | | | | | | |
| 3.1 | Xem danh sách & Biên bản họp | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 3.2 | Nạp Transcript & Ghi chú họp | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| 3.3 | Chạy AI trích xuất Decisions & Gaps | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| 3.4 | Tạo mới Cuộc họp cho Lead (`POST /leads/:leadId/meetings`) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **4** | **Soạn thảo Đề xuất (10 Sheets Proposal)** | | | | | | |
| 4.1 | Xem chi tiết 10 Sheets đề xuất | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 4.2 | Sinh Proposal bằng AI RAG tự động | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| 4.3 | Chỉnh sửa nội dung các Sheet | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| 4.4 | Phê duyệt đề xuất (`APPROVED`) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 4.5 | Xuất file Excel (`.xlsx`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 4.6 | Xuất file PDF Chuẩn in ấn (`.pdf`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 4.7 | Xóa Proposal | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **5** | **Kho Tri thức (Knowledge Vault)** | | | | | | |
| 5.1 | Xem danh sách tài liệu & Thống kê | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 5.2 | Nạp tài liệu (`Ingest & Embeddings`) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| 5.3 | Tìm kiếm Hybrid & Hỏi đáp AI (`Ask`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 5.4 | Xóa tài liệu khỏi Vault | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **6** | **Cổng Khách hàng (Client Portal)** | | | | | | |
| 6.1 | Tạo phiên làm việc Portal (Tạo Link) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 6.2 | Thu hồi phiên Portal / Quản lý materials | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| 6.3 | Khách hàng xem Overview & 10 Sheets | ✅ (Client) | ✅ (Client) | ✅ (Client) | ✅ (Client) | ✅ (Client) | ❌ |
| 6.4 | Khách hàng bình luận & Chat với AI | ✅ (Client) | ✅ (Client) | ✅ (Client) | ✅ (Client) | ✅ (Client) | ❌ |
| **7** | **Cấu hình Doanh nghiệp & Kiểm toán** | | | | | | |
| 7.1 | Xem bảng giá Rate Cards & Khách hàng | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 7.2 | Sửa / Xóa Rate Cards & Khách hàng | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 7.3 | Xem Danh sách Thành viên (`GET /users`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 7.4 | Mời / Đổi role / Vô hiệu hóa Thành viên | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 7.5 | Xem Nhật ký Kiểm toán (`Audit Log`) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 7.6 | Xem trước kết quả tính giá (`apply:false`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 7.7 | Áp kết quả tính giá vào Proposal DRAFT | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |

**Ghi chú ma trận (đối chiếu code, 15/11/2026):**
- Cột `❌` ở các dòng 2.x–5.x, 6.2, 7.7 là do `requireNotViewer` (middleware) hoặc guard trong use case; **không có dòng nào** phân biệt `PRESALE_CONSULTANT` / `SOLUTION_ARCHITECT` / `SALES_REP`.
- Dòng 6.1: `POST /portal/sessions` **không** kiểm tra role, nên `VIEWER` vẫn tạo được link — đây là điểm **rò rỉ ý đồ "VIEWER chỉ đọc"**, cần quyết định có siết lại hay không. **Nhưng nó có kiểm tra trạng thái Proposal**, ở tầng repository: `PostgresPortalRepository.createSession:27` chỉ nhận `APPROVED` / `SENT_TO_CLIENT` / `ACCEPTED` (và `:31-32` tự đổi `APPROVED → SENT_TO_CLIENT` kèm audit `PROPOSAL_SHARED_WITH_CLIENT`). Bản in trước của tài liệu này ghi "không kiểm tra trạng thái" là **sai** — đã đính chính 15/11/2026, xem `RBAC_TENANCY_BUGFIX_CHANGELOG.md` mục 18.1.
- Không còn hằng số role "ký duyệt chia sẻ lần đầu" nào: `PORTAL_FIRST_SHARE_ROLES` và `PORTAL_MANAGER_ROLES` bản frontend (`types/portal.ts`) đã **xoá** vì không component nào tham chiếu; `APPROVED_PROPOSAL_SHARE_ROLES` backend (`PortalUseCases.ts:11` bản cũ) cũng đã xoá vì khai báo mà không dùng.
- `GET /users` (dòng 7.3) mở cho mọi thành viên đã đăng nhập; chỉ riêng tra cứu **cross-organization** mới giới hạn `ADMIN` (`UserUseCases.ts:108`).

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
   Mọi route xử lý nghiệp vụ đều bắt buộc phải vượt qua việc xác thực chữ ký số JWT và kiểm tra sự tồn tại của `organizationId`. Token truy vấn có **TTL 24 giờ** (`AuthTokenService.ts:8`), refresh token 30 ngày; **không có** hiệu lực 15 phút như mô tả bản cũ — role gắn với token nên thu hồi quyền phải chờ token hết hạn hoặc logout.
2. **Middleware `requireNotViewer`:**
   Đặt tại toàn bộ các endpoint ghi/sửa/xóa (`POST`, `PUT`, `PATCH`, `DELETE`). Khi yêu cầu có `req.auth.role === 'VIEWER'`, middleware lập tức trả về lỗi:
   ```json
   {
     "success": false,
     "error": "VIEWER role is read-only. This operation is not permitted.",
     "statusCode": 403
   }
   ```
   Bản cũ định nghĩa hàm này **hai lần** (`requireAuth.ts` và `requireRole.ts`); từ 15/11/2026 chỉ còn bản trong `requireAuth.ts`, vì toàn bộ route import từ đó.
3. **Multi-Tenant Scoping tại tầng Cơ sở dữ liệu (PostgreSQL):**
   Mọi câu lệnh truy vấn đều kèm mệnh đề `AND organization_id = $x`. Ví dụ:
   ```sql
   SELECT * FROM leads WHERE id = $1 AND organization_id = $2;
   UPDATE leads SET ... WHERE id = $6 AND organization_id = $7;
   DELETE FROM leads WHERE id = $1 AND organization_id = $2;
   ```
   Điều này đảm bảo ngăn chặn hoàn toàn việc người dùng can thiệp dữ liệu chéo tổ chức.
   Đã kiểm chứng lại 15/11/2026 (đợt 1–2) và vá 4 chỗ lọt lưới, đợt 3 vá thêm chỗ thứ 5:
   - `POST /proposals/generate-from-lead`: `SELECT` lead + meetings **không** có mệnh đề org → đọc được RFP và biên bản họp của tổ chức khác nếu biết UUID. Nay dùng `GenerateProposalFromLeadInput.organizationId` (bắt buộc) và scope meetings qua `JOIN leads`.
   - `IProposalRepository.findByLeadId(leadId, organizationId)` bổ sung tham số org, `PostgresProposalRepository.ts:111` thêm `AND organization_id = $2`.
   - Nhánh fallback của `GET /proposals/:id/export-excel|export-pdf` không còn dùng org mặc định hard-code `00000000-…-001`, mà lấy từ token (`ProposalController.exportExcel/exportPdf`).
   - `GenerateProposalFromLeadUseCase` gọi RAG **không truyền org**. Câu SQL trong `hybrid_search` là `(filter_organization_id IS NULL OR kd.organization_id = filter_organization_id)`, tức tham số org NULL **tắt luôn bộ lọc**, nên tài liệu (RFP, hợp đồng đã ký) của tổ chức khác lọt vào context prompt. Nay truyền `organizationId: input.organizationId` (đợt 2, 15/11/2026).
   - `PostgresProposalRepository.findById` — **đường đọc proposal phổ biến nhất (24 call site)** — có nhánh retry *bỏ hẳn* điều kiện tổ chức khi query đầu tiên trả rỗng, cộng thêm `OR organization_id IS NULL` và bypass cho org sentinel `00000000-…-001`. Ai biết một UUID/leadId của tổ chức khác là đọc được nguyên hồ sơ **kèm cả 10 sheet**. Đợt 3 (15/11/2026) ép `organizationId` thành tham số bắt buộc và chỉ còn đúng một câu SQL `AND organization_id = $2` (`PostgresProposalRepository.ts:71-79`). Hệ quả đã đo: 4/156 proposal `organization_id IS NULL` giờ **không route nào đọc được**, kể cả org chủ — cần backfill (chưa làm, chờ duyệt vì là ghi DB).
4. **Không nhận tenant từ phía client:**
   Bản cũ cho phép `x-organization-id` hoặc `body.organizationId` làm giá trị dự phòng khi token không có org. Cả hai đường này đã bị gỡ tại `LeadIntakeController.analyze`; `organizationId`/`userId` bây giờ **chỉ** đến từ `req.auth`.
   Đợt 2 (15/11/2026) gỡ thêm đường cuối cùng còn sót: `GET /proposals?organizationId=<uuid>` cho phép liệt kê đề xuất của tổ chức khác (`ProposalController.list` bản cũ), cùng giá trị mặc định `00000000-…-001` khi tham số trống.
5. **Gate theo mode môi trường:**
   `POST /auth/dev-login` (đăng nhập không cần mật khẩu theo email) trả `403 Forbidden` khi `NODE_ENV=production`; trước 15/11/2026 endpoint này mở ở mọi môi trường.
6. **Đồng bộ phân quyền Portal (`PORTAL_MANAGER_ROLES`):**
   Danh sách `['ADMIN', 'PRESALE_LEAD', 'SALES_REP', 'PRESALE_CONSULTANT', 'SOLUTION_ARCHITECT']` được khai báo ở `PortalUseCases.ts:10` và **chỉ enforce ở backend** cho: thu hồi phiên (`:151`), tạo material (`:162`), xóa material (`:187`). Lưu ý bản chất: danh sách này là **mọi role trừ `VIEWER`**, nên nó tương đương `requireNotViewer` chứ không phải một tầng "quản trị portal" riêng. Bản sao trong `frontend/src/types/portal.ts` đã xoá ở đợt 3 vì không component nào tham chiếu.
   `POST /portal/sessions` (phát hành token truy cập portal cho khách) **không** có `requireNotViewer` và cũng không kiểm tra role — đây là quyết định sản phẩm, không phải chỗ quên. Cửa **trạng thái** thì có thật, nằm ở `PostgresPortalRepository.createSession:27` (`APPROVED`/`SENT_TO_CLIENT`/`ACCEPTED`, và tự đổi `APPROVED → SENT_TO_CLIENT`). Vì vậy `PortalDesk` gate form tạo phiên theo **trạng thái hồ sơ** (`shareable`, `:188`) chứ không gate theo role — hai loại gate khác nhau, đừng nhầm.
7. **Hai route con bị quên middleware (đợt 2):**
   `POST /leads/:leadId/meetings` và `POST /leads/:leadId/proposals` (`routes/index.ts:51-52`) trước đây chỉ có `requireAuth + requireOrganization`, trong khi mọi route ghi khác cùng nhóm đều có `requireNotViewer` → `VIEWER` tạo được meeting và proposal. Đã bổ sung `requireNotViewer`.
8. **Vòng đời Proposal không còn cửa sau (đợt 2):**
   `POST /proposals/generate-from-lead` trước đây vô điều kiện ghi đè tiêu đề, `total_cost`, timeline và **toàn bộ 10 sheet** rồi kéo Proposal về `DRAFT`, kể cả bản đã `APPROVED`/`SENT_TO_CLIENT`/`ACCEPTED` — tức đi vòng qua state machine trong `UpdateProposalUseCase.ts:69-76`. Nay ba trạng thái khoá đó trả `409 Conflict`, yêu cầu đưa về `DRAFT` bằng PATCH chuẩn (có kiểm tra role) trước khi sinh lại.
9. **Audit log của luồng Lead trực tiếp (đợt 2):**
   Bốn handler viết raw SQL trong `LeadIntakeController` (analyze-persist, qualify, update, delete) không ghi `audit_log` dù đi ngược lại quy ước của các use case. Nay ghi `LEAD_CREATED / LEAD_QUALIFIED / LEAD_UPDATED / LEAD_DELETED` qua `recordLeadAudit()`; `container.ts:221` truyền `auditRepository` vào controller.
10. **Audit log của Material Portal (đợt 3):**
    Thêm/xoá material trước đó **không** lưu dấu vết nào, dù mọi hành động portal khác đều có (`CLIENT_PORTAL_SESSION_CREATED/REVOKED`, `PROPOSAL_SHARED_WITH_CLIENT`). Nay ghi `CLIENT_PORTAL_MATERIAL_ADDED` / `CLIENT_PORTAL_MATERIAL_DELETED` với `entity_type='portal_material'` (`PostgresPortalRepository.ts:156-181`). `DeletePortalMaterialUseCase` phải nhận thêm `actorId` thì mới truy vết được ai xoá — chuỗi tham số đã xuyên suốt từ `PortalController.deleteMaterial:79` xuống repository. `audit_logs` không có CHECK trên `action`/`entity_type` (`001_initial_schema.sql:216-229`) nên không cần migration.
11. **Hợp đồng `task_mode` với service AI (đợt 3):**
    `ai/server.py:173-235` định nghĩa 6 system prompt theo khoá 1..6, và `.get(req.task_mode, default)` (`:237`) **âm thầm** rơi về "helpful IT Presale Assistant" nếu gửi số ngoài phạm vi. Backend trước đây truyền **số thô** nên không ai phát hiện chỗ lệch. Nay mọi call site dùng `LLMTaskMode`:
    | Nơi gọi | Cũ | Mới | Đổi hành vi? |
    |---|---|---|---|
    | `AskKnowledgeUseCase.ts:50` | `5` = "synthesize executive overview" — đối ngược yêu cầu "trả lời kèm trích dẫn [1]" | `TECH_ARCHITECTURE` (6) | **Có** |
    | `GenerateProposalSheetsUseCase.ts:137` | `5` | `PROPOSAL_BUILDER` (cũng 5) | Không, chỉ bỏ số thô |
    | `PortalUseCases.ts:90` (khách hỏi proposal) | `5` | `PROPOSAL_BUILDER` (cũng 5) | Không |
    | `GenerateUIDesignBriefUseCase.ts:68` (mới) | — | `TECH_ARCHITECTURE` (6) | Lần đầu tiên mode 6 có caller |
12. **`POST /proposals/:id/ui-brief` trước đây không gọi AI (đợt 3):**
    Bản cũ dựng sẵn 5 trường văn mẫu tiếng Việt (`title`, `target_users`, `key_screens`, `ui_style_guide`, `interaction_flow`) khi sheet `Overview` thiếu `uiDesignBrief`, rồi trả `message: 'AI UI Design Brief generated successfully.'` — **mọi role** đều nhận thông báo sai, và `LLMTaskMode.TECH_ARCHITECTURE` vì thế không có ai gọi. Nay use case riêng (`GenerateUIDesignBriefUseCase`) đọc sheet theo org, gọi AI mode 6, **kiểm tra hình JSON** rồi mới nhận; AI trả rác thì `409` "Nothing was generated" chứ không âm thầm dựng mẫu. Response có thêm `meta.source` = `'sheet'` hay `'ai'` để UI nói đúng nguồn.

---
*Presaleee Enterprise Solutions Platform — Tài liệu kỹ thuật lưu hành nội bộ.*
