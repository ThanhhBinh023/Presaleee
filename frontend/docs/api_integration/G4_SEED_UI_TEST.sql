-- ==============================================================================
-- G4 UI TEST SEED — Clients & Audit trail (kèm dữ liệu G3/G2 để test phân quyền)
-- Dán nguyên file vào Supabase SQL Editor rồi chạy MỘT lần.
-- Script chỉ INSERT, không UPDATE/DELETE. Chạy lại an toàn: mọi INSERT có ON CONFLICT DO NOTHING.
--
-- UUID chọn tay để dễ nhận diện và dễ dọn dẹp:
--   a1...0001 = org chính (Northwind Presales)  a1...0002 = org phụ (Omega Delta)
--   b1...     = users      c1... = clients org A   c2... = clients org B
--   d1...     = leads      e1... = audit_logs
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. ORGANIZATIONS (2 org để kiểm tra cách ly dữ liệu theo tenant)
-- ------------------------------------------------------------------------------
INSERT INTO organizations (id, name, domain, plan) VALUES
  ('a1000000-0000-4000-8000-000000000001', 'Northwind Presales', 'northwind.example', 'PRO'),
  ('a1000000-0000-4000-8000-000000000002', 'Omega Delta', 'omega-delta.example', 'FREE')
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------------------------
-- 2. USERS — org A: 8 người (đủ 5 role, đủ 3 status); org B: 2 người.
--    password_hash đúng định dạng backend: scrypt$<32 hex salt>$<128 hex key>.
--    Đăng nhập chỉ nhận status = ACTIVE; INVITED và DEACTIVATED cố ý không vào được.
-- ------------------------------------------------------------------------------
INSERT INTO users (id, organization_id, email, full_name, avatar_url, role, status, password_hash) VALUES
  ('b1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'admin@presaleee.test',       'Nguyen Tenant Admin',  NULL, 'ADMIN',              'ACTIVE',      'scrypt$4a42ac8115b4ab372c12a090e99c245c$7d6af843af8bbe291e6d77f237bbcfbf776ebf8507eb912110d7e51c1ec2f096c208c63e4e6ee815350413256011dd1e8f0f92ba499a16c408495965082781cb'),
  ('b1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 'admin2@presaleee.test',      'Tran Second Admin',    'https://i.pravatar.cc/96?u=presaleee-admin2', 'ADMIN',      'ACTIVE',      'scrypt$2d06426767627d87d3a0d91cc586fff3$67296a3b1da4bc61fdc9a01f80a2d51e7e51bcb7ea3c8aab1c1fa5d9992115e2bbac5c0c74babfa7f95b06ff925ca9aad4610e94714c5c93ff19cfce8b09d09c'),
  ('b1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000001', 'lead@presaleee.test',        'Le Presale Lead',      NULL, 'PRESALE_LEAD',       'ACTIVE',      'scrypt$45adf9f4ac420512e857cd97a26a6205$30523d33eac264488a83e85b66b917dad6b32e87dd0586f3b2af2a3c007106ed1c76d6f0a0ed039254c3ceb74e7a1287a714de0d2f8dfa4e4937f509581f3613'),
  ('b1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000001', 'architect@presaleee.test',   'Pham Solution Arch',   NULL, 'SOLUTION_ARCHITECT', 'ACTIVE',      'scrypt$1d3b2100bb652bcbc04c7e35afd0e3a8$6868c57161222f59ca9773d95bc2c3e61b9d42de44825f2d3c62194154f6b2296db1fc4dc365465f030e4fa2abb7f5c5cc7bce39a4b82232dd20a7687377e73d'),
  ('b1000000-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-000000000001', 'rep@presaleee.test',         'Hoang Sales Rep',      NULL, 'SALES_REP',          'ACTIVE',      'scrypt$f456a1f008d901399b996000f8abb3f8$55492fe58e1dcd86aab3f710ae558c0afaa9cccfedb4911a83ad64e72fc3937a768482d848862727ec8e449800481b18f49bf4ac22f77dfe6464c4f304e28aa0'),
  ('b1000000-0000-4000-8000-000000000006', 'a1000000-0000-4000-8000-000000000001', 'viewer@presaleee.test',      'Do Viewer Only',       NULL, 'VIEWER',             'ACTIVE',      'scrypt$60d42f4c85b3bbff8bc7d86330bbc45d$f439e1e9b38e0731c62b2741130f0fe753ac77995b2ca497660ac351133eb6f8bdc274b8415eb3ecd70d2439c417ae225178d9ef113dea9dc209efa59f49c3e5'),
  ('b1000000-0000-4000-8000-000000000007', 'a1000000-0000-4000-8000-000000000001', 'invited@presaleee.test',     'Vu Invited Rep',       NULL, 'SALES_REP',          'INVITED',     'scrypt$263a0c9f6103f1c0055c056b42d33609$7d10c770ad672fa5543b2755e09506966c3b4c0e53bf7897fd5e7ba46270e0d1b57ae1be35310e1d869d7b4c4be1a5a68421450af2a605132964f67bb0e0f6ae'),
  ('b1000000-0000-4000-8000-000000000008', 'a1000000-0000-4000-8000-000000000001', 'deactivated@presaleee.test', 'Bui Deactivated Arch', NULL, 'SOLUTION_ARCHITECT', 'DEACTIVATED', 'scrypt$e3afc806efaa2bfb91dffe13735ec08e$e1f3c826a1508900c2b8d5493d4d7f707a2afa71601f7511862ab7945e051a7a151a11eeba5660cc313c9bc6e5862610c797ace6c6f4bbeaaa05efaa23e176b3'),
  ('b1000000-0000-4000-8000-000000000101', 'a1000000-0000-4000-8000-000000000002', 'omega.admin@presaleee.test', 'Omega Org Admin',      NULL, 'ADMIN',              'ACTIVE',      'scrypt$11bcbc936c9a416ded1e206b0f13c2dc$88ec009f012404bb74f8414129838883e83690fedeed2bb39f407a96c74baed42cf73ba8406af2668e0f65ae9f190deafb2216243c512dccb9f458cb10c8993b'),
  ('b1000000-0000-4000-8000-000000000102', 'a1000000-0000-4000-8000-000000000002', 'omega.lead@presaleee.test',  'Omega Presale Lead',   NULL, 'PRESALE_LEAD',       'ACTIVE',      'scrypt$627c601f84e6ea500c8d92b3d9c0973e$1861689f18fb0889d17f29809e1a14ccab3e6f30a5227ac2088376a7223cc1e7ab6abfe8a16ec1a7e460bd54010bb29c9d4a073a57dc24b9c2facd5c97921c37')
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------------------------
-- 3. CLIENTS — org A: 24 khách hàng (>20 để bảng #clients có trang 2)
--    Có 1 row industry ngoài taxonomy ('Banking') và 1 row toàn bộ contact NULL.
-- ------------------------------------------------------------------------------
INSERT INTO clients (id, organization_id, company_name, industry, contact_person, contact_email, contact_phone, country) VALUES
  ('c1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'Acme Fintech Group',       'Fintech',       'Tran Minh Quan',  'quan.tran@acmefintech.example.vn', '+84 901 000 001', 'Vietnam'),
  ('c1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 'Beta Retail Holdings',     'Retail',        'Le Thi Ha',       'ha.le@beta-retail.example.vn',       '+84 902 000 002', 'Vietnam'),
  ('c1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000001', 'HealthFirst Systems',      'Healthcare',    'Pham Van Sung',   'sung@healthfirst.example.io',        '+84 903 000 003', 'Vietnam'),
  ('c1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000001', 'Mekong Logistics Co',      'Logistics',     'Nguyen Huynh Dai','dai@mekonglog.example.vn',           '+84 904 000 004', 'Vietnam'),
  ('c1000000-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-000000000001', 'Delta Manufacturing JSC',  'Manufacturing', 'Kim Jiwoo',       'jiwoo.kim@deltamfg.example.kr',      '+82 10 1234 5678', 'South Korea'),
  ('c1000000-0000-4000-8000-000000000006', 'a1000000-0000-4000-8000-000000000001', 'EduBridge Vietnam',        'Education',     'Do Thi Ngoc',     'ngoc.do@edubridge.example.edu.vn',   '+84 906 000 006', 'Vietnam'),
  ('c1000000-0000-4000-8000-000000000007', 'a1000000-0000-4000-8000-000000000001', 'Sunrise Real Estate',      'Real Estate',   'Hoang Anh Tuan',  'tuan@sunrise-re.example.vn',           '+84 907 000 007', 'Vietnam'),
  ('c1000000-0000-4000-8000-000000000008', 'a1000000-0000-4000-8000-000000000001', 'Hanoi Public Sector IT',   'Government',    'Vu Van Thanh',    'thanh@it.hanoi.example.gov.vn',      '+84 908 000 008', 'Vietnam'),
  ('c1000000-0000-4000-8000-000000000009', 'a1000000-0000-4000-8000-000000000001', 'VietTel Telecom Partners', 'Telecom',       'Dang Khoa',       'khoa@vtpartners.example.vn',           '+84 909 000 009', 'Vietnam'),
  ('c1000000-0000-4000-8000-000000000010', 'a1000000-0000-4000-8000-000000000001', 'Misc Projects One',        'Other',         NULL,              'desk@miscpartner.example',             NULL,             'Singapore'),
  ('c1000000-0000-4000-8000-000000000011', 'a1000000-0000-4000-8000-000000000001', 'Northwind Legacy Row',     'Banking',       'Legacy Contact',  'legacy@northwind.example',             '+84 911 000 011', 'Vietnam'),
  ('c1000000-0000-4000-8000-000000000012', 'a1000000-0000-4000-8000-000000000001', 'Null Contact Corp',        NULL,            NULL,              NULL,                                 NULL,             NULL),
  ('c1000000-0000-4000-8000-000000000024', 'a1000000-0000-4000-8000-000000000001', 'Delete Me Temp Retail',    'Retail',        'Temp Contact',    'temp@delete-me.example',               '+84 924 000 024', 'Vietnam')
ON CONFLICT DO NOTHING;

-- 11 khách hàng tiếp theo (thứ tự 13..23) để tổng org A vượt 20 dòng.
INSERT INTO clients (id, organization_id, company_name, industry, contact_person, contact_email, contact_phone, country)
SELECT
  ('c1000000-0000-4000-8000-' || lpad(g.n::text, 12, '0'))::uuid,
  'a1000000-0000-4000-8000-000000000001',
  'Bulk Test Client ' || g.n,
  (ARRAY['Retail','Fintech','Healthcare','Logistics','Manufacturing','Education','Real Estate','Government','Telecom','Other']::text[])[((g.n - 13) % 10) + 1],
  'Bulk Contact ' || g.n,
  'bulk' || g.n || '@bulktest.example',
  '+84 90' || lpad(g.n::text, 8, '0'),
  'Vietnam'
FROM generate_series(13, 23) AS g(n)
ON CONFLICT DO NOTHING;

-- org B: 2 cái TRÙNG TÊN với khách hàng của org A.
-- Unique index là uq_clients_org_company (organization_id, lower(company_name)) nên không xung đột,
-- và mỗi org chỉ thấy đúng bản ghi của mình.
INSERT INTO clients (id, organization_id, company_name, industry, contact_person, contact_email, contact_phone, country) VALUES
  ('c2000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000002', 'Acme Fintech Group',   'Fintech', 'Omega Owner', 'acme@omega-delta.example', '+84 980 000 001', 'Vietnam'),
  ('c2000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000002', 'Beta Retail Holdings', 'Retail',  'Omega Rep',   'beta@omega-delta.example', '+84 980 000 002', 'Japan'),
  ('c2000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000002', 'Omega Only Client',    'Telecom', 'Omega Lead',  'only@omega-delta.example', '+84 980 000 003', 'Vietnam')
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------------------------
-- 4. LEADS — để panel "Leads for this client" có dữ liệu và test được nhánh 409 khi xoá.
--    Acme Fintech Group (c1...0001) có 5 lead ở 5 status khác nhau -> xoá client này sẽ 409.
--    'Delete Me Temp Retail' (c1...0024) không có lead -> xoá sẽ thành công (204).
-- ------------------------------------------------------------------------------
INSERT INTO leads (id, organization_id, client_id, created_by, assigned_to, title, source, status, raw_rfp_content, extracted_metadata, bant_score) VALUES
  ('d1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000004', 'Acme core banking replatform',    'INBOUND_EMAIL', 'NEW',                'We need to move our core banking stack to a managed cloud before Q3. Budget approval pending.', '{"budget_usd":400000,"timeline_weeks":18}'::jsonb, 45),
  ('d1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000003', 'b1000000-0000-4000-8000-000000000004', 'Acme disaster recovery add-on',   'REFERRAL',      'QUALIFYING',         'Referral from our audit partner: multi-region DR with a 15 minute RTO.',                          '{"budget_usd":120000,"timeline_weeks":8}'::jsonb,  62),
  ('d1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000003', 'b1000000-0000-4000-8000-000000000005', 'Acme mobile wallet expansion',    'MEETING',       'WON',                'Signed scope from the board meeting: wallet feature parity across iOS and Android.',                  '{"budget_usd":500000,"timeline_weeks":24}'::jsonb, 92),
  ('d1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000006', 'Acme legacy datacenter exit',     'WEBSITE',       'LOST',               'Inbound form: pricing to retire the on-prem datacenter.',                                                                 '{"budget_usd":80000,"timeline_weeks":6}'::jsonb,  21),
  ('d1000000-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000003', 'b1000000-0000-4000-8000-000000000004', 'Acme compliance evidence portal', 'MANUAL',        'APPROVED',           'Manual entry after the compliance workshop: portal for audit evidence.',                                                  '{"budget_usd":150000,"timeline_weeks":10}'::jsonb, 88),
  ('d1000000-0000-4000-8000-000000000006', 'a1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000003', 'b1000000-0000-4000-8000-000000000005', 'Beta POS modernization',          'INBOUND_EMAIL', 'IN_REVIEW',          'Store POS upgrade across 120 outlets, offline first.',                                                                    '{"budget_usd":300000,"timeline_weeks":14}'::jsonb, 55),
  ('d1000000-0000-4000-8000-000000000007', 'a1000000-0000-4000-8000-000000000001', NULL,                                'b1000000-0000-4000-8000-000000000001', NULL,                                'Unassigned website lead',             'WEBSITE',       'NEW',                'Inbound from the marketing site, no client linked yet.',                                                                  '{}'::jsonb, NULL)
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------------------------
-- 5. AUDIT_LOGS — 30 dòng lịch sử cho org A + 3 dòng cho org B.
--    Dùng để test bộ lọc action / entity type / entity id / result status / khoảng thời gian + phân trang.
--    Mọi payload có 'seeded': true để phân biệt với log do UI sinh ra.
--    Thời gian trải đều 6h..180h trước hiện tại (mới nhất cách 6 tiếng).
-- ------------------------------------------------------------------------------
INSERT INTO audit_logs (id, organization_id, user_id, action, entity_type, entity_id, payload, result_status, ip_address, created_at)
SELECT
  ('e1000000-0000-4000-8000-' || lpad((1000 + g.n)::text, 12, '0'))::uuid,
  'a1000000-0000-4000-8000-000000000001',
  (ARRAY[
    'b1000000-0000-4000-8000-000000000001',
    'b1000000-0000-4000-8000-000000000003',
    'b1000000-0000-4000-8000-000000000004',
    'b1000000-0000-4000-8000-000000000005'
  ]::uuid[])[((g.n - 1) % 4) + 1],
  a.act,
  CASE WHEN a.act LIKE 'CLIENT%' THEN 'client' ELSE 'user' END,
  CASE WHEN a.act LIKE 'CLIENT%'
       THEN (ARRAY[
               'c1000000-0000-4000-8000-000000000001',
               'c1000000-0000-4000-8000-000000000002',
               'c1000000-0000-4000-8000-000000000003'
             ]::uuid[])[((g.n - 1) % 3) + 1]
       ELSE NULL END,
  jsonb_build_object(
    'seeded', true,
    'batch', 'g4-ui-test',
    'note', 'Seeded history for filter testing, not produced by the UI.'
  ),
  -- đúng 2 dòng FAILED (n = 11 và n = 22) để bộ lọc resultStatus = FAILED không trả về rỗng
  CASE WHEN g.n IN (11, 22) THEN 'FAILED' ELSE 'SUCCESS' END,
  '203.0.113.' || (10 + (g.n % 40))::text,
  NOW() - ((g.n * 6) || ' hours')::interval
FROM generate_series(1, 30) AS g(n)
CROSS JOIN LATERAL (
  SELECT (ARRAY[
    'CLIENT_CREATED', 'USER_UPDATED', 'CLIENT_UPDATED',
    'USER_CREATED', 'CLIENT_DELETED', 'USER_PROFILE_UPDATED'
  ]::text[])[((g.n - 1) % 6) + 1] AS act
) a
ON CONFLICT DO NOTHING;

INSERT INTO audit_logs (id, organization_id, user_id, action, entity_type, entity_id, payload, result_status, ip_address, created_at) VALUES
  ('e1000000-0000-4000-8000-000000002001', 'a1000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000101', 'CLIENT_CREATED',  'client', 'c2000000-0000-4000-8000-000000000001', '{"seeded":true,"companyName":"Acme Fintech Group"}'::jsonb,  'SUCCESS', '203.0.113.201', NOW() - INTERVAL '2 days'),
  ('e1000000-0000-4000-8000-000000002002', 'a1000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000102', 'CLIENT_UPDATED',  'client', 'c2000000-0000-4000-8000-000000000002', '{"seeded":true,"changedFields":["country"]}'::jsonb,      'SUCCESS', '203.0.113.202', NOW() - INTERVAL '3 days'),
  ('e1000000-0000-4000-8000-000000002003', 'a1000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000101', 'USER_REGISTERED', 'user',   'b1000000-0000-4000-8000-000000000101', '{"seeded":true,"organizationName":"Omega Delta"}'::jsonb,   'SUCCESS', '203.0.113.203', NOW() - INTERVAL '4 days')
ON CONFLICT DO NOTHING;

COMMIT;

-- ------------------------------------------------------------------------------
-- 6. KIỂM TRA SAU KHI IMPORT (chạy tiếp trong cùng editor)
-- ------------------------------------------------------------------------------
SELECT 'organizations (A+B)' AS tbl, COUNT(*) AS row_count FROM organizations WHERE id IN ('a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000002')
UNION ALL SELECT 'users (org A)',      COUNT(*) FROM users      WHERE organization_id = 'a1000000-0000-4000-8000-000000000001'
UNION ALL SELECT 'users (org B)',      COUNT(*) FROM users      WHERE organization_id = 'a1000000-0000-4000-8000-000000000002'
UNION ALL SELECT 'clients (org A)',    COUNT(*) FROM clients    WHERE organization_id = 'a1000000-0000-4000-8000-000000000001'
UNION ALL SELECT 'clients (org B)',    COUNT(*) FROM clients    WHERE organization_id = 'a1000000-0000-4000-8000-000000000002'
UNION ALL SELECT 'leads (org A)',      COUNT(*) FROM leads      WHERE organization_id = 'a1000000-0000-4000-8000-000000000001'
UNION ALL SELECT 'audit (org A)',      COUNT(*) FROM audit_logs WHERE organization_id = 'a1000000-0000-4000-8000-000000000001'
UNION ALL SELECT 'audit FAILED (B)',   COUNT(*) FROM audit_logs WHERE organization_id = 'a1000000-0000-4000-8000-000000000002'
UNION ALL SELECT 'audit FAILED (all)', COUNT(*) FROM audit_logs WHERE result_status = 'FAILED';
-- Kỳ vọng: 2 | 8 | 2 | 24 | 3 | 7 | 30 | 3 | 2

-- ------------------------------------------------------------------------------
-- 7. DỌN DẸP — ĐÂY LÀ SQL XOÁ DỮ LIỆU THẬT, NÊN CỐ Ý ĐỂ TRONG COMMENT.
--    Chỉ bỏ comment khi bạn chắc chắn muốn xoá toàn bộ dữ liệu test này.
--    order: leads -> clients -> audit_logs -> users -> organizations
-- ------------------------------------------------------------------------------
-- DELETE FROM leads       WHERE id::text LIKE 'd1%';
-- DELETE FROM clients     WHERE id::text LIKE 'c1%' OR id::text LIKE 'c2%';
-- DELETE FROM audit_logs  WHERE id::text LIKE 'e1%';
-- DELETE FROM users       WHERE id::text LIKE 'b1%';
-- DELETE FROM organizations WHERE id::text LIKE 'a1%';
--
-- Thu hồi mọi phiên đăng nhập đang mở của tài khoản test (optional):
-- DELETE FROM auth_refresh_tokens WHERE user_id::text LIKE 'b1%';
