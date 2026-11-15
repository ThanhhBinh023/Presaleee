# TÀI LIỆU HỆ THỐNG PHÂN QUYỀN (RBAC) & VẬN HÀNH CÁC ROLE TRONG DỰ ÁN PRESALEEE

> **Tài liệu đặc tả kiến trúc:** Role-Based Access Control (RBAC) & Multi-Tenant Data Isolation  
> **Dự án:** Presaleee Platform (AI-Powered Presale & Proposal Engineering)  
> **Ngày cập nhật:** 15/11/2026  
> **Phiên bản tài liệu:** v2.12 *(đợt 7 — đóng **N22** và **N17** theo hướng đã chốt, không bật heuristic offline. **N22:** một đường qualify duy nhất (`/qualify` và `/qualifications` cùng trỏ về `QualifyLeadUseCase`), một envelope `{qualification, lead}`, `requireLiveModel` ⇒ AI offline trả **502 sạch** chứ không bịa `qualification_score: 88`; `GET …/latest` map row legacy sang đúng hợp đồng camelCase mà **không bịa số per-pillar** và **không bỏ rơi** text cũ; frontend bỏ hẳn type snake_case. **N17:** `PATCH /clients/:id/contact` — tier ghi thứ ba đầu tiên của hệ thống (mọi role trừ `VIEWER`, chỉ 3 field liên hệ, khoá khác 400 nêu tên, org khác 404, audit `CLIENT_CONTACT_UPDATED`); thêm dòng **7.2b** trong ma trận và ghi chú cho **2.4**. Hai điểm cũ của đợt 6 vẫn còn: `G9-04` (flip `APPROVED→SENT_TO_CLIENT` đi vòng guard) và residual 24h của `V2`. Chi tiết trong `RBAC_TENANCY_BUGFIX_CHANGELOG.md` mục 48–54)*  
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
  - **Cấu hình Bảng đơn giá & Khách hàng:** `POST/PATCH/DELETE /rate-cards` và `POST/PATCH/DELETE /clients` dùng `requireRole(...ORGANIZATION_ADMIN_ROLES)`. Ngoại lệ duy nhất: `PATCH /clients/:id/contact` (3 field liên hệ) chỉ gate `requireNotViewer` nên 3 role nghiệp vụ cũng ghi được — dòng **7.2b**, đợt 7.
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
* **Bản chất phân quyền:** **không** có gate nào nhắc riêng tới `SALES_REP`. Về mặt API, role này **giống hệt** `PRESALE_CONSULTANT` và `SOLUTION_ARCHITECT`; kém `ADMIN`/`PRESALE_LEAD` đúng 4 nhóm: Rate Cards, **ghi** Clients (riêng 3 field liên hệ thì **bằng** — `PATCH /clients/:id/contact`, dòng **7.2b**), thành viên tổ chức, và Approve/DONE của Proposal. Đọc vẫn mở (`GET /clients`, `GET /users` không gate role).
* **Quyền hạn & Thao tác (theo enforcement thật, cập nhật đợt 4):**
  - **Quản lý Lead ban đầu:** tạo Lead (`POST /leads`) ✅; sửa trường Lead và chuyển trạng thái ✅ **từ đợt 4** — trước đó hai route UI gọi (`PATCH /leads/:id`, `PATCH /leads/:id/status`) **chưa từng tồn tại** nên mọi nút "Save fields"/"Status machine" trả 404 (N14). ❌ **Không nhập được thông tin liên hệ khách hàng**: không có bảng `contacts`, contact nằm trên `clients` và `POST/PATCH /clients` là tầng admin (N17 — chưa xử lý, cần quyết định sản phẩm).
  - **Theo dõi đường ống (`Presale Pipeline`):** ✅ **từ đợt 4** — `GET /leads` nay thật sự phân trang và áp bộ lọc status/source/search; trước đó backend bỏ qua cả 7 query param, hard `LIMIT 50` và không trả `meta` ⇒ ô Search/Status/Source là control chết, cột BANT và cột ngày luôn rỗng vì `SELECT` thiếu cột (N16). Lưu ý: hai nhãn "Đang xử lý"/"Đã hoàn thành" vẫn chỉ đếm **trong trang hiện tại**.
  - **Client Portal:**
    - Tạo link chia sẻ sau khi Proposal được duyệt ✅ — route không gate role (`SALES_REP` nằm trong `PORTAL_MANAGER_ROLES` = mọi role trừ `VIEWER`), cửa **trạng thái** ở `PostgresPortalRepository.createSession:27`.
    - "Tín hiệu thời gian thực" chỉ là **một** `last_accessed_at` bị ghi đè mỗi lần khách mở (`PostgresPortalRepository.findActiveSession:61-63`) — không có lịch sử lượt xem, không biết khách xem mục nào. **Từ đợt 5 UI đã nói đúng điều này** (N19): tiêu đề đổi thành "Dữ liệu Tương tác Thực tế từ Portal" và có dòng ghi rõ mỗi phiên chỉ lưu một timestamp ghi đè, không có lượt xem/lịch sử; các fallback nêu "chưa phát sinh lượt truy cập" thay vì bịa số.
    - Đọc phản hồi/câu hỏi của khách ✅ (`GET /portal/proposals/:id/comments` — còn lỗ N10 chưa duyệt: endpoint này không lọc theo phiên nên khách A đọc được bình luận của khách B trên cùng hồ sơ).
  - **Xuất tóm tắt điều hành:** PDF ✅ thật (`GET /proposals/:id/export-pdf`, pdfmake). ✅ **`.txt` Executive Overview đã bỏ mock từ đợt 5** (N18/N13): `AIWorkspace.tsx:348` truyền `proposal={realProposal}` và `ClientPortalModal.tsx` dựng nội dung từ đúng 6 sheet thật (`overviewSheet/scopeSheet/architectureSheet/timelineSheet/pricingSheet/slaSheet`) — KPI, danh sách module, phân đoạn thanh toán, `x/10 sheets đã tạo`, status/version thật; số liệu chưa có thì in `chưa có trong hồ sơ` (`ClientPortalModal.tsx:22`), **không** thay bằng mặc định; câu "đã kiểm duyệt và ký duyệt bởi Solution Architect" đã bị xoá vì proposal thật đang ở `DRAFT`. **Chưa kiểm chứng bằng cách bấm thật trên browser** — mới chắc data contract (`GET /proposals/lead/:id` trả đủ 10 sheet) và `tsc` 0 lỗi.

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
    - ❌ **Không** tạo được link chia sẻ (`POST /portal/sessions`) — **đã siết ở đợt 6**: guard `PORTAL_MANAGER_ROLES` ngay đầu `CreatePortalSessionUseCase` (`PortalUseCases.ts:22`, đặt **trước** mọi validate để `VIEWER` không dò được 400/404 như oracle) cộng `requireNotViewer` ở route (`portalRoutes.ts:16`). Đo thật: 403 `"VIEWER role is read-only. This operation is not permitted."`
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
| 6.1 | Tạo phiên làm việc Portal (Tạo Link) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| 6.2 | Thu hồi phiên Portal / Quản lý materials | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| 6.3 | Khách hàng xem Overview & 10 Sheets | ✅ (Client) | ✅ (Client) | ✅ (Client) | ✅ (Client) | ✅ (Client) | ❌ |
| 6.4 | Khách hàng bình luận & Chat với AI | ✅ (Client) | ✅ (Client) | ✅ (Client) | ✅ (Client) | ✅ (Client) | ❌ |
| **7** | **Cấu hình Doanh nghiệp & Kiểm toán** | | | | | | |
| 7.1 | Xem bảng giá Rate Cards & Khách hàng | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 7.2 | Sửa / Xóa Rate Cards & Khách hàng | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 7.2b | Cập nhật 3 trường liên hệ của Khách hàng (`PATCH /clients/:id/contact`) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| 7.3 | Xem Danh sách Thành viên (`GET /users`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 7.4 | Mời / Đổi role / Vô hiệu hóa Thành viên | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 7.5 | Xem Nhật ký Kiểm toán (`Audit Log`) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 7.6 | Xem trước kết quả tính giá (`apply:false`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 7.7 | Áp kết quả tính giá vào Proposal DRAFT | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |

**Ghi chú ma trận (đối chiếu code, 15/11/2026):**
- Cột `❌` ở các dòng 2.x–5.x, 6.2, 7.7 là do `requireNotViewer` (middleware) hoặc guard trong use case; **không có dòng nào** phân biệt `PRESALE_CONSULTANT` / `SOLUTION_ARCHITECT` / `SALES_REP`.
- Dòng **7.2b** (đợt 7) là chỗ **duy nhất** một role không-admin ghi được dữ liệu danh bạ: route chỉ gate `requireNotViewer`, còn `UpdateClientContactUseCase` (`ClientUseCases.ts:145-181`) từ chối **mọi khoá ngoài 3 field liên hệ** bằng 400 nêu tên field, nên 7.2 (sửa/xoá cả bản ghi) vẫn nguyên `ADMIN, PRESALE_LEAD`. `VIEWER` nhận 403 `"VIEWER role is read-only."`, org khác nhận 404.
- Dòng **2.4** (chấm BANT): từ đợt 7 cả hai đường `POST /:id/qualify` và `POST /:id/qualifications` đi qua **cùng một** use case và bật `requireLiveModel` — nghĩa là ✅ ở đây là "được phép gọi", còn **gọi có ra điểm hay không** phụ thuộc model sống: AI offline thì **502 sạch**, và `QUALIFIED`/`APPROVED` bị chặn ở `PATCH /:id/status` vì chưa có điểm (`LeadUseCases.ts:38`). Không còn nhánh nào tự sinh điểm placeholder.
- Dòng 6.1: `POST /portal/sessions` **đã kiểm tra role từ đợt 6** (`PortalUseCases.ts:22` + `requireNotViewer` ở route) nên `VIEWER` nhận 403 — ý đồ "VIEWER chỉ đọc" không còn bị rò ở đây. Cửa **trạng thái** vẫn nằm ở tầng repository: `PostgresPortalRepository.createSession` chỉ nhận `APPROVED` / `SENT_TO_CLIENT` / `ACCEPTED` và **tự đổi `APPROVED → SENT_TO_CLIENT`** kèm audit `PROPOSAL_SHARED_WITH_CLIENT`. ⚠️ **Hệ quả chưa đóng (`G9-04`)**: vì flip đó nằm trong câu SQL của INSERT, nó **đi vòng** guard "4 transition đặc quyền chỉ ADMIN/PRESALE_LEAD" ở `UpdateProposalUseCase.ts:65-66`; suite e2e mong `SALES_REP` bị 403 khi là phiên đầu tiên trên hồ sơ `APPROVED`, thực tế nhận 201. ba hướng xử lý ghi ở changelog mục 43.1 — chưa tự sửa vì đây là quyết định phân quyền.
- Không còn hằng số role "ký duyệt chia sẻ lần đầu" nào: `PORTAL_FIRST_SHARE_ROLES` và `PORTAL_MANAGER_ROLES` bản frontend (`types/portal.ts`) đã **xoá** vì không component nào tham chiếu; `APPROVED_PROPOSAL_SHARE_ROLES` backend (`PortalUseCases.ts:11` bản cũ) cũng đã xoá vì khai báo mà không dùng.
- `GET /users` (dòng 7.3) mở cho mọi thành viên đã đăng nhập; chỉ riêng tra cứu **cross-organization** mới giới hạn `ADMIN` (`UserUseCases.ts:108`).
- Dòng 4.5–4.6 (xuất Excel/PDF): vẫn ✅ cho mọi role kể cả `VIEWER` vì bản chất là **đọc**, nhưng từ đợt 6 hai endpoint này không còn nhánh "không thấy proposal thì sinh tạm một cái" — `proposalId` rác hoặc thuộc org khác trả `404` thay vì ghi DB (`ProposalController.ts:326,338`).
- Dòng 6.3–6.4: nội dung khách nhìn thấy không còn là nguyên văn 10 sheet. Toàn bộ đi qua `ClientPortalProjection` (`ClientPortalProjection.ts:22-33`) cắt 18 khoá chi phí nội bộ + chặn mẫu "giá … USD" trong text tự do; cùng projection đó áp cho `GET /portal/proposals/:id`, ngữ cảnh AI và `export-pdf` của khách.

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
   - Nhánh fallback của `GET /proposals/:id/export-excel|export-pdf` không còn dùng org mặc định hard-code `00000000-…-001`, mà lấy từ token (`ProposalController.exportExcel/exportPdf`). **Đợt 6 (15/11/2026) xoá luôn nhánh fallback đó**: một `proposalId` không tồn tại trong org trả `404` thay vì âm thầm sinh proposal mới từ lead; hai handler giờ chỉ còn một `try/catch` (`ProposalController.ts:326,338`).
   - `GenerateProposalFromLeadUseCase` gọi RAG **không truyền org**. Câu SQL trong `hybrid_search` là `(filter_organization_id IS NULL OR kd.organization_id = filter_organization_id)`, tức tham số org NULL **tắt luôn bộ lọc**, nên tài liệu (RFP, hợp đồng đã ký) của tổ chức khác lọt vào context prompt. Nay truyền `organizationId: input.organizationId` (đợt 2, 15/11/2026).
   - `PostgresProposalRepository.findById` — **đường đọc proposal phổ biến nhất (24 call site)** — có nhánh retry *bỏ hẳn* điều kiện tổ chức khi query đầu tiên trả rỗng, cộng thêm `OR organization_id IS NULL` và bypass cho org sentinel `00000000-…-001`. Ai biết một UUID/leadId của tổ chức khác là đọc được nguyên hồ sơ **kèm cả 10 sheet**. Đợt 3 (15/11/2026) ép `organizationId` thành tham số bắt buộc và chỉ còn đúng một câu SQL `AND organization_id = $2` (`PostgresProposalRepository.ts:71-79`). Hệ quả đã đo: 4/156 proposal `organization_id IS NULL` giờ **không route nào đọc được**, kể cả org chủ — cần backfill (chưa làm, chờ duyệt vì là ghi DB).
4. **Không nhận tenant từ phía client:**
   Bản cũ cho phép `x-organization-id` hoặc `body.organizationId` làm giá trị dự phòng khi token không có org. Cả hai đường này đã bị gỡ tại `LeadIntakeController.analyze`; `organizationId`/`userId` bây giờ **chỉ** đến từ `req.auth`.
   Đợt 2 (15/11/2026) gỡ thêm đường cuối cùng còn sót: `GET /proposals?organizationId=<uuid>` cho phép liệt kê đề xuất của tổ chức khác (`ProposalController.list` bản cũ), cùng giá trị mặc định `00000000-…-001` khi tham số trống.
5. **Gate theo mode môi trường:**
   `POST /auth/dev-login` (đăng nhập không cần mật khẩu theo email) trả `403 Forbidden` khi `NODE_ENV=production`; trước 15/11/2026 endpoint này mở ở mọi môi trường.
6. **Đồng bộ phân quyền Portal (`PORTAL_MANAGER_ROLES`):**
   Danh sách `['ADMIN', 'PRESALE_LEAD', 'SALES_REP', 'PRESALE_CONSULTANT', 'SOLUTION_ARCHITECT']` được khai báo ở `PortalUseCases.ts:10` và **chỉ enforce ở backend** cho: **tạo phiên** (`:22`, thêm từ đợt 6), thu hồi phiên (`:169`), tạo material (`:180`), xóa material (`:205`). Lưu ý bản chất: danh sách này là **mọi role trừ `VIEWER`**, nên nó tương đương `requireNotViewer` chứ không phải một tầng "quản trị portal" riêng. Bản sao trong `frontend/src/types/portal.ts` đã xoá ở đợt 3 vì không component nào tham chiếu.
   `POST /portal/sessions` **từ đợt 6 có cả hai lớp**: `requireNotViewer` ở route (`portalRoutes.ts:16`) và guard use case ở dòng đầu tiên của `CreatePortalSessionUseCase` — guard đặt **trước** toàn bộ validate để một role bị từ chối không dùng 400/404 làm oracle dò hợp đồng. Hai route nội bộ `POST|DELETE /proposals/:id/portal-materials` cũng được thêm `requireNotViewer` (`routes/index.ts:56-57`) để đủ lớp, dù use case đã gate. Cửa **trạng thái** vẫn nằm ở `PostgresPortalRepository.createSession` (`APPROVED`/`SENT_TO_CLIENT`/`ACCEPTED`, kèm flip `APPROVED → SENT_TO_CLIENT`). Vì vậy `PortalDesk` gate form tạo phiên theo **trạng thái hồ sơ** (`shareable`, `:188`) — gate trạng thái và gate role là hai việc khác nhau, đừng nhầm.
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
13. **State machine của Lead nay enforce ở backend (đợt 4):**
    Trước đợt 4, bảng chuyển trạng thái **chỉ tồn tại ở frontend** (`frontend/src/types/lead.ts:17-28`), còn `PUT /leads/:id` nhận `status` từ body và ghi thẳng không kiểm tra gì (`LeadIntakeController.ts:362,381,392` bản cũ) — kể cả `APPROVED` khi lead chưa có điểm BANT, tức dòng "APPROVED requires a stored BANT score" trong UI là rule không có thật. Nay:
    - `UpdateLeadUseCase.ts:195` **throw 400** nếu body update có `status`, và `PUT` lẫn `PATCH /:id` cùng delegate một handler (`leadIntakeRoutes.ts:31-32`) ⇒ không còn cửa sau.
    - Đổi trạng thái chỉ đi qua `PATCH /:id/status` → `UpdateLeadStatusUseCase` (`:210-242`), và kiểm tra + ghi nằm trong **cùng một câu UPDATE** (`PostgresLeadRepository.ts:128-138`): `($3 <> 'APPROVED' OR bant_score IS NOT NULL) AND status = ANY(allowedCurrentStatuses)` — nên không có window đua hai request cùng nhảy trạng thái.
    - UI không còn mời bước sai: `AIWorkspace` sinh option từ `LEAD_TRANSITIONS` (`:1706-1716`) và tách lưu trường / đổi trạng thái thành 2 bước, 409 được báo rõ mà không mất nội dung đã lưu (`:257-296`).
    - **Lỗ N20 đã đóng ở đợt 5:** bảng chuyển trạng thái giờ là một hằng số backend duy nhất — `LEAD_TRANSITIONS` + `statusesThatCanReach()` trong `LeadUseCases.ts:18-36`, `frontend/src/types/lead.ts` chỉ còn bản copy có chú thích trỏ về file đó. Cả hai đường qualify đi qua **một** `SaveQualificationUseCase` (`LeadUseCases.ts:278-306`; call site `LeadIntakeController.ts:295` và `LeadUseCases.ts:336`), và status chỉ đổi trong `CASE WHEN status = ANY($5::varchar[]) THEN 'QUALIFIED' ELSE status END` của `saveQualification:148-160` ⇒ qualify **không còn kéo tụt** một lead đã chốt. Đã đo: re-qualify lead `WON` trả 200 và status vẫn `WON`; `WON → NEW` trả 409.
    - **Đổi hành vi có chủ đích (N20-b):** `QUALIFIED` nay vào được thẳng từ `NEW`/`IN_REVIEW` (khớp nút "Qualify" trên UI, nếu không thì fast-path thành dead button), **nhưng** đổi sang `QUALIFIED` *hoặc* `APPROVED` bắt buộc có điểm đã lưu (`QUALIFICATION_REQUIRED_STATUSES:38` → SQL `($5 = FALSE OR bant_score IS NOT NULL)`). Đo thật: `NEW → QUALIFIED` khi chưa có điểm ⇒ `409 "QUALIFIED requires a stored BANT score — run qualification first."`; cũng bước đó sau khi qualify ⇒ 200.
14. **Hợp đồng API của phân hệ Leads: một shape duy nhất (đợt 4):**
    `GET /leads` và `GET /leads/:id` từng trả **raw column snake_case** (`raw_rfp_content`, `extracted_metadata`) vì handler viết SQL thô, trong khi `LeadsDirectory` khai type `LeadRecord`/`LeadListItem` **camelCase** và không có layer chuyển đổi nào trong `apiClient.ts` ⇒ mọi field camel `undefined` lúc chạy (ô RFP trống, panel metadata toàn "—", cột BANT luôn "—", cột ngày luôn rỗng) — đây là lý do lỗi 404 của N14 bị coi nhẹ: trang vẫn hiển thị được một nửa. Nay toàn bộ read/write lead đi qua `PostgresLeadRepository` nên **chỉ còn camelCase**, `GET /leads` kèm `meta {total,page,limit,totalPages}` như các list endpoint khác (`ClientController.ts:58`). Hai hệ quả phải biết khi test tay: (a) xoá lead **không còn xoá proposal** kèm theo — FK `proposals.lead_id ON DELETE SET NULL` (`001_initial_schema.sql:167`) giữ proposal và cắt liên kết, chỉ `meetings` là CASCADE (`:89`); (b) `PUT /leads/:id` nghiêm khắc hơn (từ chối `status`, kiểm tra `clientId`/`assignedTo` qua `ReferenceValidator`). Nay **N21 đã đóng (đợt 5)**: 6 field không endpoint nào trả bị xoá khỏi `LeadItem` (`qualification_score`, `qualification_status`, `organization`, `client_name`, `requirements_summary`, `client_request_raw`), `LeadListItem` đổi thành `Omit<Lead,'rawRfpContent'>` (`Lead.ts:24`) và repository **không cắt `bant_details` khỏi list nữa** ⇒ `bantDetails` là nguồn thật duy nhất cho panel đánh giá (`AIWorkspace.tsx:139`). Đo thật: `GET /leads` trả đúng 14 key camelCase, **0** key snake_case.

15. **Đã đóng (đợt 7) — ba schema trên một cột `bant_details` (N22):**
    *Di sản (đợt 6):* từng có **hai producer** — `POST /:id/qualifications` đi qua `QualifyLeadUseCase` + normaliser chặt và lưu **camelCase**, còn `POST /:id/qualify` là khối inline 131 dòng trong controller với prompt tiếng Việt riêng, tự map sang `{qualification_score, readiness_level, breakdown[], project_brief}` và **bịa** `qualification_score: 88` khi AI fail; `GET …/latest` chỉ `return lead.bantDetails as unknown as LeadQualification` — cast, không map. Phân tích đầy đủ: changelog mục 44.
    - **Cách đóng (hướng (a), không bật heuristic offline):** khối legacy bị **xoá**; `LeadIntakeController.qualify:116` là handler duy nhất và `leadIntakeRoutes.ts:19-20` gắn **cả hai route** vào đó ⇒ một lead không thể nhận hai shape. Envelope thống nhất `data:{qualification, lead}`. `QualifyLeadUseCase` bật `requireLiveModel: true` (`LeadUseCases.ts:380`) ⇒ AI offline là **502 sạch**, không còn 200 với 88 bịa (chính sách heuristic cho route staff giữ nguyên — 43.4).
    - **Lớp đọc:** `GetLatestQualificationUseCase:387-396` có hai nhánh — row canonical trả nguyên trạng, row legacy đi qua `legacyQualification():136`. Quy tắc: pillar `score = 0` (row cũ **chưa từng có** số per-pillar, map sang là bịa), tổng lấy từ cột `bant_score`, `readiness_level` high/medium/low → QUALIFY/REVIEW/DISQUALIFY; chỗ đứng của từng note do **chính nhãn `type` trong row cũ** quyết định (pillar → `criteria[pillar].assessment`, `warning|risk` → `risks[]`, còn lại → `summary`) nên **không rơi mất chữ nào**. Đã thử map bằng keyword trong text và **bỏ** vì đo thật: "Giám sát **thời gian** thực" bị gán vào Timeline.
    - **Consumer:** `QualificationData` snake_case bị xoá khỏi frontend; `QualifyResult` (`leadService.ts:19`) là hợp đồng duy nhất; `AIWorkspace.tsx:59,142,887-901` render 4 pillar + risks; `isLeadQualification` (`types/lead.ts:137`) đúng với **mọi** row đã lưu vì `latest` luôn camelCase. File seed `G4_SEED_UI_TEST.sql` / `G13_G14_SEED_UI_TEST.sql` viết lại payload canonical (7 literal, đã validate `score == Σ pillar`); **chưa chạy vào DB**.
    - **Bằng chứng runtime (probe + suite):** hai route trả 502 **giống nhau từng byte**, không lộ `Automated Presale Analysis`/`88`/chi tiết provider; `latest` trên row legacy → 200 với 7 khoá camelCase, `score=85` từ cột, pillar `[0,0,0,0]`, `QUALIFY`, 1 risk + 2 note trong summary, và **không ghi ngược** vào cột. Census `139 {}` / `4 canonical` / `1 legacy` **trước = sau** (probe tự dọn).
    - **Còn lại:** 139 dòng `bant_details = {}` và 12 dòng có `bant_score` mà details rỗng **không migrate** (đợt này chỉ sửa đường đọc + file seed); 3 suite `G6-08/09/10/15`, `G7/G8-00`, `G13/G14-00` vẫn cần model sống mới đi qua được `QUALIFIED` — nay báo **skip kèm lý do** thay vì fail giả.

16. **Đã đóng (bổ sung đợt 5) — N23: `leadId` là filter khai báo nhưng chưa từng được thi hành (đợt 5):**
    `ListProposalsDTO.leadId` → `ProposalFilterParams.leadId` (`IProposalRepository.ts:33`) được use case dựng và truyền xuống `PostgresProposalRepository.findAll`, nhưng `findAll` chỉ đẩy 3 nhánh điều kiện (`organization_id`, `status`, `search`) — **không có nhánh `leadId`** ⇒ tham số bị bỏ âm thầm, không lỗi, không log. Hai endpoint cùng hỏng qua một root cause: `GET /proposals/lead/:leadId` (dùng bởi `AIWorkspace.tsx:206` cho modal Portal và `ProposalStudioTab.tsx:297`) trả proposal `updated_at DESC` **của cả org**, và `GET /proposals?leadId=…` có filter không tác dụng.
    - **Cách sửa:** thêm nhánh `lead_id = $n` vào `findAll` (tham số hoá; `conditions`/`values` dựng trước khi push `limit`/`offset` nên `COUNT(*)` và `SELECT` cùng nhận filter, phân trang không lệch) — một chỗ, **cả hai endpoint** cùng đúng. `ListProposalsUseCase` validation `leadId` bằng `optionalUuid`: cần thiết vì chính nhánh SQL mới biến `?leadId=rac` thành 500 pg `22P02`; nay là `400 "leadId must be a valid UUID or null."`, còn `?leadId=` rỗng coi như **không lọc**.
    - **Bằng chứng runtime 13/13:** lead `3cd4f3da…` → `ed84f7b4…` và lead `138d902c…` → `8b89987a…` (**trước khi sửa: hai lead cùng trả `8b89987a…`**), payload vẫn đủ 10 sheet; lead của org khác (`990e44f4…`) → `data: null` nên **không có rò cross-tenant**; `?leadId=` đúng lead cho `total=1`, lead không có proposal cho `total=0`, không filter vẫn `total=2`.
    - **Chưa làm, cần duyệt:** `proposals.lead_id` **không có index** nào (`006_discovery_meetings.sql:18` chỉ có `idx_meetings_lead_date`). 156 dòng thì seq scan không đáng kể; nếu bảng lớn thì thêm `CREATE INDEX idx_proposals_lead ON proposals (organization_id, lead_id, updated_at DESC)`.

17. **Đã đóng (đợt 7) — N17: `SALES_REP` được mô tả là "quản lý quan hệ khách hàng" nhưng không ghi được dữ liệu khách hàng:**
    *Di sản:* `clientRoutes.ts:9` dựng `writeAccess = [requireAuth, requireOrganization, requireRole(...ORGANIZATION_ADMIN_ROLES)]` (`['ADMIN','PRESALE_LEAD']`) cho `POST /clients`, `PATCH /clients/:id`, `DELETE /clients/:id`; `contactPerson` chỉ có **một** cửa ghi (`clientRepository.create` có đúng một call-site) nên contact info của SALES_REP kẹt vĩnh viễn trong blob của lead. Phân tích đầy đủ: changelog mục 45.
    - **Cách đóng (hướng (a)):** `PATCH /api/v1/clients/:id/contact` (`clientRoutes.ts:18`) gate `requireAuth, requireOrganization, requireNotViewer` → **tier ghi thứ ba** đầu tiên của hệ thống: 4 role nghiệp vụ ghi được contact, `VIEWER` vẫn 403, `ADMIN/PRESALE_LEAD` không đổi gì. `POST`/`PATCH /:id`/`DELETE` **vẫn** admin (`writeAccess` không đụng tới).
    - **Hẹp ở tầng use case, không phải ở UI:** `UpdateClientContactUseCase` (`ClientUseCases.ts:145-181`) chỉ nhận `contactPerson`/`contactEmail`/`contactPhone`; **khoá khác bị 400 nêu đúng tên field** (kiểm tra trước cả "body rỗng" để `{companyName}` không bị báo nhầm), không âm thầm bỏ; `organizationId` luôn nằm trong `WHERE` của `findById`/`update` ⇒ org khác nhận **404**; audit `CLIENT_CONTACT_UPDATED` với `payload.changedFields` (`audit_logs` không có CHECK trên `action` ⇒ **không cần migration**).
    - **Frontend thành thật theo hợp đồng mới:** nút **Contact** (`ClientsDirectory.tsx:456`) chỉ hiện khi `role !== 'VIEWER'` và không phải admin (`:82`), ở chế độ đó 3 field admin-only bị **disabled xám** (`:310,316,351`) chứ không render rồi nhận 403; `clientService.updateClientContact` (`:69`) + type `ClientContactInput` (`:32`) chỉ đúng 3 khoá.
    - **Bằng chứng runtime:** `G4-13` trong `g3_g4_directory` — **30 pass / 0 fail / 0 skip**: SALES_REP ghi 200 và **persist thật** (GET lại thấy, `companyName`/`industry`/`country` không đổi); 4 field ngoài contact → 400 nêu tên; `{}` → 400; phone 120 ký tự → 400; SALES_REP `PATCH /clients/:id`/`POST`/`DELETE` → 403 `"…roles: ADMIN, PRESALE_LEAD"`; VIEWER → 403 `"VIEWER role is read-only."`; anonymous → 401; org B → 404 **và row không đổi**; đúng **1** dòng audit cho đúng client đó.
    - **Lưu ý khi đối chiếu ma trận:** dòng **7.2** vẫn đúng ("Sửa / Xóa Rate Cards & Khách hàng" = admin), vì nay có thêm dòng **7.2b** riêng cho contact. Đây là chỗ duy nhất trong toàn hệ thống một role không-admin ghi được dữ liệu danh bạ.

18. **Đóng nhóm C — những gì link portal cho khách thấy và làm được (đợt 6):**
    Trước đợt 6, một link portal trả về **nguyên văn** `sheetData` bên trong proposal, nên 18 khoá chi phí nội bộ (`monthlyRate`, `teamCost`, `infrastructureCost`, `contingencyBuffer`, `marginPct`, `internalNotes`, …) hiện ra trên 4 đường: `GET /portal/proposals/:id`, ngữ cảnh AI của `POST /questions` (kể cả `citations[].excerpt`), PDF khách tải, và text sinh từ `RateCardUseCases`. Nay một mô-đun duy nhất `ClientPortalProjection.ts` (`REDACTED_KEYS:8`, `project:22-33`, `projectSheetsForClient:34`, `projectProposalForClient:38`) cắt **đệ quy** và nối vào cả 4 đường (`PortalUseCases.ts:72, 87, 151`); nguồn sinh text sửa tại gốc (`RateCardUseCases.ts:342` bỏ rate khỏi `description`). Phân biệt quan trọng: `data.totalCost` **là giá chào khách**, giữ nguyên (đo: 55440 vẫn hiển thị) — chỉ cắt trong subtree `sheets`.
    - **Cách ly thread:** `listComments` thêm `AND portal_session_id = $3` (`PostgresPortalRepository.ts:104`) — khách A không còn đọc nguyên thread của khách B trên cùng hồ sơ; staff vẫn thấy **tổng** mọi thread (`commentCount` giữ nguyên hợp đồng).
    - **Khách không còn tự ký tên người khác:** `authorName` bỏ hẳn khỏi body (`CreatePortalCommentUseCase`), attribution lấy 100% từ session; 4 variant forged authorName đều 201 và đều mang tên khách của session (`G10-04`).
    - **Cửa phiên thống nhất:** `findActiveSession:61-65` SELECT kèm `AND p.status IN ('SENT_TO_CLIENT','ACCEPTED')` ⇒ link đã thu hồi / hết hạn / hồ sơ bị rút trả **cùng một** 401 trên cả 6 endpoint client (trước đây lẫn 401 và 404 tuỳ route); `last_accessed_at` chỉ ghi tối đa 1 lần/phút.
    - **Giới hạn tốc độ:** `limitPortalRequests.ts` mới, fixed window 60s theo `portalSession.id`, **300 request/phút** chung và **20/phút** riêng cho 2 route tốn compute (`POST /questions`, `GET /export-pdf`) → 429. Đây là budget cho **link đã có token**; traffic không có token chưa có limiter riêng.
    - **Khách không bao giờ nhận blob heuristic:** `ILLMGateway.requireLiveModel` (cờ mới, chỉ route client bật) khiến `FastAPILMGateway.ts:99` ném `ExternalServiceError` **trước** step fallback ⇒ AI offline là 502 sạch, không phải `"Automated Presale Analysis"` trả lời thay. Route staff vẫn giữ heuristic (chờ quyết định 43.4).
    - **Hành động của khách vào audit:** `CLIENT_PORTAL_COMMENT_ADDED` (`user_id NULL` — cột nullable FK, payload chỉ `{commentId, sessionId, authorEmail, bodyLength}`, **không lưu nguyên văn**) và `CLIENT_PORTAL_PDF_EXPORTED`.
    - **`VIEWER` bị đóng ở `POST /portal/sessions`** (đã mô tả ở mục 6). **V1:** hai route export của staff không còn nhánh "id lạ thì sinh proposal tạm" — `ProposalController.ts:326,338` còn một try/catch, id rác/lead-id trả 400/404 thay vì 500. **V2:** `PATCH /users/:id` đổi role cũng revoke refresh chain (`UserUseCases.ts:211`); residual còn lại là access token cũ sống tới hết TTL 24h vì `requireAuth.ts:53` tin claim trong JWT (đo ở `G3-13b`, xem 43.2).

---
*Presaleee Enterprise Solutions Platform — Tài liệu kỹ thuật lưu hành nội bộ.*
