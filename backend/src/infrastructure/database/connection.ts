import { Pool } from 'pg';
import { env } from '../config/env.js';

export const dbPool = new Pool({
  connectionString: env.databaseUrl,
  ssl: env.nodeEnv === 'production' || env.databaseUrl.includes('supabase')
    ? { rejectUnauthorized: false }
    : false
});

dbPool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
  dbPool.query(`
    UPDATE users 
    SET role = 'PRESALE_LEAD' 
    WHERE role = 'VIEWER' 
      AND (
        id IN (SELECT user_id FROM project_memberships WHERE project_role = 'PRESALE_LEAD')
        OR id IN (SELECT created_by FROM leads WHERE created_by IS NOT NULL)
        OR email ILIKE '%nva%'
      );
  `).catch(err => console.error('[DB] Auto-sync presale lead roles error:', err));
});

dbPool.on('error', (err: Error) => {
  console.error('❌ PostgreSQL connection error:', err.message);
});

