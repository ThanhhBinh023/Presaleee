-- 010_seed_system_admin.sql
-- Khởi tạo đặc quyền: Tài khoản quản trị cấp cao nhất (System Admin) được khởi tạo cứng qua code/seed.

DO $$
DECLARE
  v_default_org_id UUID;
  v_admin_email TEXT := 'admin@presaleee.io';
  v_admin_name TEXT := 'System Administrator';
  -- scrypt hash for 'AdminSecure2026!'
  v_admin_hash TEXT := 'scrypt$d01e8f97808c0b1faf534da79ed1ddb6$5efe60c23788c0e1630114bc14bbd9cfdd8aaf58378eec02a59d225f2a1c330c6a642aa071cd9341411e8d7a3314aff97e89afd5c47633ad7e1dc70516deeb14';
BEGIN
  -- Lấy hoặc tạo tổ chức gốc
  SELECT id INTO v_default_org_id FROM organizations ORDER BY created_at ASC LIMIT 1;
  
  IF v_default_org_id IS NULL THEN
    INSERT INTO organizations (name, domain, plan)
    VALUES ('Presaleee Enterprise HQ', 'presaleee.io', 'ENTERPRISE')
    RETURNING id INTO v_default_org_id;
  END IF;

  -- 1. Seed tài khoản System Admin chính thức: admin@presaleee.io
  IF NOT EXISTS (SELECT 1 FROM users WHERE email = v_admin_email) THEN
    INSERT INTO users (organization_id, email, full_name, role, status, password_hash)
    VALUES (v_default_org_id, v_admin_email, v_admin_name, 'ADMIN', 'ACTIVE', v_admin_hash);
  ELSE
    UPDATE users 
    SET role = 'ADMIN', status = 'ACTIVE' 
    WHERE email = v_admin_email;
  END IF;

  -- 2. Đảm bảo tài khoản ntbinh1@gmail.com vẫn là ADMIN
  UPDATE users 
  SET role = 'ADMIN', status = 'ACTIVE' 
  WHERE email = 'ntbinh1@gmail.com';

END $$;
