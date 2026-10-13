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
});

dbPool.on('error', (err: Error) => {
  console.error('❌ PostgreSQL connection error:', err.message);
});
