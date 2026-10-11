import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' || process.env.DATABASE_URL?.includes('supabase')
    ? { rejectUnauthorized: false }
    : false
});

dbPool.on('connect', () => {
  console.log('✅ Connected to Supabase PostgreSQL');
});

dbPool.on('error', (err) => {
  console.error('❌ Supabase PostgreSQL connection error:', err);
});
