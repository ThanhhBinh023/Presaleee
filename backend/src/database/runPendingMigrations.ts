import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

/**
 * `schema_migrations` only tracks what this runner applied. Earlier migrations were
 * executed by `setupDatabase.ts` / `runAuthMigration.ts`, so pending files are also
 * probed against live schema state before being replayed — 003 rewrites the embedding
 * column type and must not run again once the vector is already 768-dimensional.
 */
const APPLIED_PROBES: Record<string, string> = {
  '001_initial_schema': `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organizations') AS applied`,
  '002_hybrid_search': `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_chunks' AND column_name = 'fts') AS applied`,
  '003_update_dim_768': `SELECT EXISTS (SELECT 1 FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid WHERE c.relname = 'document_chunks' AND a.attname = 'embedding' AND format_type(a.atttypid, a.atttypmod) = 'vector(768)') AS applied`,
  '004_optimize_hybrid_search': `SELECT FALSE AS applied`,
  '005_auth_sessions_and_credentials': `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_hash') AS applied`,
  '006_discovery_meetings': `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meetings' AND column_name = 'organization_id') AS applied`,
  '007_client_portal': `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'portal_sessions') AS applied`,
  '008_reference_data_and_audit_indexes': `SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'uq_clients_org_company') AS applied`
};

async function runPendingMigrations(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || databaseUrl.includes('[YOUR-PASSWORD]')) {
    throw new Error('DATABASE_URL is not configured. Set it in backend/.env before migrating.');
  }

  const pool = new Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  const migrationsDir = path.join(__dirname, 'migrations');
  const migrations = fs.readdirSync(migrationsDir)
    .filter(name => name.endsWith('.sql'))
    .sort()
    .map(name => ({ version: name.replace(/\.sql$/, ''), sql: fs.readFileSync(path.join(migrationsDir, name), 'utf8') }));

  const client = await pool.connect();
  let applied = 0;
  let baselined = 0;
  let skipped = 0;

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    const recorded = await client.query<{ version: string }>('SELECT version FROM schema_migrations;');
    const ledger = new Set(recorded.rows.map(row => row.version));

    for (const migration of migrations) {
      if (ledger.has(migration.version)) {
        console.log(`   - skipped  ${migration.version} (in schema_migrations)`);
        skipped += 1;
        continue;
      }

      const probe = APPLIED_PROBES[migration.version];
      if (probe) {
        const result = await client.query<{ applied: boolean | string }>(probe);
        if (result.rows[0]?.applied === true || result.rows[0]?.applied === 't') {
          await client.query('INSERT INTO schema_migrations (version) VALUES ($1);', [migration.version]);
          console.log(`   - detected ${migration.version} (objects already present, recorded without replay)`);
          baselined += 1;
          continue;
        }
      }

      await client.query('BEGIN');
      try {
        await client.query(migration.sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1);', [migration.version]);
        await client.query('COMMIT');
        console.log(`   - applied  ${migration.version}`);
        applied += 1;
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${migration.version} failed: ${(error as Error).message}`);
      }
    }

    console.log(`\n${applied} applied, ${baselined} detected as already present, ${skipped} already recorded.`);
  } finally {
    client.release();
    await pool.end();
  }
}

runPendingMigrations().catch(error => {
  console.error((error as Error).message);
  process.exitCode = 1;
});
