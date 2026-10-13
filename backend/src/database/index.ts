import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

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

