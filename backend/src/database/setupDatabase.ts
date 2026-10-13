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
    console.error('❌ ERROR: DATABASE_URL is not configured or still contains placeholder!');
    console.error('👉 Please configure your Supabase connection string in backend/.env.');
    console.error('Example: DATABASE_URL=postgresql://postgres.xxx:mypassword@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres\n');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('⏳ 1. Verifying connection to Supabase PostgreSQL...');
    const client = await pool.connect();
    console.log('✅ Connected successfully to Supabase PostgreSQL!\n');

    console.log('⏳ 2. Reading schema migration: 001_initial_schema.sql...');
    const migrationPath = path.join(__dirname, 'migrations', '001_initial_schema.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('⏳ 3. Executing migrations (creating extensions, tables, indices, and functions)...');
    await client.query(sql);
    console.log('✅ Migration succeeded! Database schema and pgvector are ready.\n');

    console.log('⏳ 4. Seeding default initial workspace data...');
    
    // Seed default organization
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

    // Seed default rate cards
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
    console.log('✅ Rate card seed data inserted successfully!\n');

    // Inspect created database tables
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log('📋 Initialized database tables in Supabase:');
    tablesRes.rows.forEach(r => console.log(`   - 📦 ${r.table_name}`));

    console.log('\n🎉 SUCCESS! DATABASE IS CONFIGURED AND READY FOR USE!');
    client.release();
    await pool.end();
  } catch (error: any) {
    console.error('\n❌ Database setup failed:', error.message);
    process.exit(1);
  }
}

runDatabaseSetup();
