import fs from 'node:fs';
import path from 'node:path';
import { dbPool } from '../infrastructure/database/connection.js';

async function runAuthMigration(): Promise<void> {
  const client = await dbPool.connect();
  try {
    const migrationPath = path.join(__dirname, 'migrations', '005_auth_sessions_and_credentials.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    const alreadyApplied = await client.query(
      'SELECT 1 FROM schema_migrations WHERE version = $1;',
      ['005_auth_sessions_and_credentials']
    );
    if (alreadyApplied.rowCount === 0) {
      await client.query(migrationSql);
      await client.query(
        'INSERT INTO schema_migrations (version) VALUES ($1);',
        ['005_auth_sessions_and_credentials']
      );
    }
    await client.query('COMMIT');
    console.log('Authentication migration 005 applied successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to apply authentication migration 005.');
    throw error;
  } finally {
    client.release();
    await dbPool.end();
  }
}

runAuthMigration().catch(() => {
  process.exitCode = 1;
});
