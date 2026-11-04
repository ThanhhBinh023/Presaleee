// Read-only migration state probe. Writes nothing.
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { Pool } = require('pg');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envText = fs.readFileSync(path.join(root, '.env'), 'utf8');
const databaseUrl = envText.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim();
if (!databaseUrl) throw new Error('DATABASE_URL missing');

const pool = new Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

async function scalar(sql, params = []) {
  try {
    const result = await pool.query(sql, params);
    return result.rows[0] ? Object.values(result.rows[0])[0] : null;
  } catch (error) {
    return `query failed: ${error.message}`;
  }
}

const checks = {
  'schema_migrations table': await scalar(`SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='schema_migrations'`),
  'users.password_hash column': await scalar(`SELECT COUNT(*) FROM information_schema.columns WHERE table_name='users' AND column_name='password_hash'`),
  'auth_refresh_tokens table': await scalar(`SELECT COUNT(*) FROM information_schema.tables WHERE table_name='auth_refresh_tokens'`),
  'auth_password_reset_tokens table': await scalar(`SELECT COUNT(*) FROM information_schema.tables WHERE table_name='auth_password_reset_tokens'`),
  'meetings table': await scalar(`SELECT COUNT(*) FROM information_schema.tables WHERE table_name='meetings'`),
  'portal_sessions table': await scalar(`SELECT COUNT(*) FROM information_schema.tables WHERE table_name='portal_sessions'`),
  'rate_cards.monthly_rate_usd column': await scalar(`SELECT COUNT(*) FROM information_schema.columns WHERE table_name='rate_cards' AND column_name='monthly_rate_usd'`),
  'audit_logs table': await scalar(`SELECT COUNT(*) FROM information_schema.tables WHERE table_name='audit_logs'`),
  'uq_clients_org_company index': await scalar(`SELECT COUNT(*) FROM pg_indexes WHERE indexname='uq_clients_org_company'`),
  'knowledge_documents.embedding dim': await scalar(`SELECT NULL::text`),
  'organizations rows': await scalar(`SELECT COUNT(*) FROM organizations`),
  'users rows': await scalar(`SELECT COUNT(*) FROM users`)
};

for (const [label, value] of Object.entries(checks)) console.log(`${label.padEnd(38)} ${value}`);
const recorded = await pool.query(`SELECT version FROM schema_migrations ORDER BY version`).catch(() => ({ rows: [] }));
console.log('schema_migrations versions:', recorded.rows.map(row => row.version).join(', ') || '(none)');
await pool.end();
