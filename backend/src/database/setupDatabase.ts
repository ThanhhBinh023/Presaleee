import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function runDatabaseSetup() {
  const dbUrl = process.env.DATABASE_URL;

  console.log('====================================================');
  console.log('🚀 PRESALEEE SUPABASE DATABASE SETUP & VERIFICATION');
  console.log('====================================================\n');

  if (!dbUrl || dbUrl.includes('[YOUR-PASSWORD]')) {
    console.error('❌ LỖI: DATABASE_URL chưa được cấu hình hoặc còn chứa placeholder!');
    console.error('👉 Vui lòng mở file backend/.env và điền connection string thực tế của Supabase.');
    console.error('Ví dụ: DATABASE_URL=postgresql://postgres.xxx:mypassword@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres\n');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('⏳ 1. Đang kiểm tra kết nối tới Supabase PostgreSQL...');
    const client = await pool.connect();
    console.log('✅ Kết nối thành công tới Supabase!\n');

    console.log('⏳ 2. Đang đọc file schema migration: 001_initial_schema.sql...');
    const migrationPath = path.join(__dirname, 'migrations', '001_initial_schema.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('⏳ 3. Đang thực thi migration (tạo extension pgvector, 10 bảng, HNSW index, RPC function)...');
    await client.query(sql);
    console.log('✅ Migration thành công! Tất cả bảng và pgvector đã sẵn sàng.\n');

    console.log('⏳ 4. Đang chèn dữ liệu khởi tạo mặc định (Seed data)...');
    
    // Tạo 1 Organization mặc định
    const orgRes = await client.query(`
      INSERT INTO organizations (name, domain, plan)
      VALUES ('Presaleee Default Workspace', 'presaleee.ai', 'ENTERPRISE')
      ON CONFLICT DO NOTHING
      RETURNING id;
    `);
    
    let orgId = orgRes.rows[0]?.id;
    if (!orgId) {
      const existingOrg = await client.query(`SELECT id FROM organizations LIMIT 1;`);
      orgId = existingOrg.rows[0].id;
    }

    // Tạo Default Rate Cards cho các vị trí
    await client.query(`
      INSERT INTO rate_cards (organization_id, role_name, level, hourly_rate_usd, daily_rate_usd)
      VALUES 
        ($1, 'Project Manager', 'SENIOR', 50.00, 400.00),
        ($1, 'Solution Architect', 'LEAD', 75.00, 600.00),
        ($1, 'Senior Backend Developer', 'SENIOR', 45.00, 360.00),
        ($1, 'Senior Frontend Developer', 'SENIOR', 40.00, 320.00),
        ($1, 'AI / ML Engineer', 'SENIOR', 60.00, 480.00),
        ($1, 'QA / QC Engineer', 'MID', 30.00, 240.00),
        ($1, 'DevOps Engineer', 'SENIOR', 50.00, 400.00)
      ON CONFLICT DO NOTHING;
    `, [orgId]);
    console.log('✅ Seed dữ liệu Rate Card thành công!\n');

    // Kiểm tra danh sách bảng đã tạo
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log('📋 Danh sách các bảng đã được khởi tạo trên Supabase:');
    tablesRes.rows.forEach(r => console.log(`   - 📦 ${r.table_name}`));

    console.log('\n🎉 CHÚC MỪNG! HỆ THỐNG DATABASE ĐÃ SẴN SÀNG CHO CẢ TEAM SỬ DỤNG!');
    client.release();
    await pool.end();
  } catch (error: any) {
    console.error('\n❌ Thất bại trong quá trình cài đặt DB:', error.message);
    process.exit(1);
  }
}

runDatabaseSetup();

