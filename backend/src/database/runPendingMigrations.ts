import fs from 'node:fs';
import path from 'node:path';
import { dbPool } from '../infrastructure/database/connection.js';

async function runPendingMigrations(): Promise<void> {
  const migrationsDir = path.join(__dirname, 'migrations');
  const versions = fs
    .readdirSync(migrationsDir)
    .filter(name => name.endsWith('.sql'))
    .sort()
    .map(name => ({ version: name.replace(/\.sql$/, ''), sql: fs.readFileSync(path.join(migrationsDir, name), 'utf8') }));

  const client = await dbPool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    const applied = await client.query<{ version: string }>('SELECT version FROM schema_migrations;');
    const appliedVersions = new Set(applied.rows.map(row => row.version));

    let ran = 0;
    for (const migration of versions) {
      if (appliedVersions.has(migration.version)) {
        console.log(`   - skipped ${migration.version} (already applied)`);
        continue;
      }
      await client.query('BEGIN');
      try {
        await client.query(migration.sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1);', [migration.version]);
        await client.query('COMMIT');
        console.log(`   - applied ${migration.version}`);
        ran += 1;
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${migration.version} failed: ${(error as Error).message}`);
      }
    }
    console.log(ran === 0 ? 'All migrations are already applied.' : `${ran} migration(s) applied successfully.`);
  } finally {
    client.release();
    await dbPool.end();
  }
}

runPendingMigrations().catch(error => {
  console.error('Failed to run pending migrations.');
  console.error(error);
  process.exitCode = 1;
});
