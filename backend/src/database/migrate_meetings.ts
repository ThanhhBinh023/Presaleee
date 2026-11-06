import { dbPool } from '../infrastructure/database/connection.js';

export async function runMeetingMigration() {
  console.log('⏳ Running migration: Enhancing meetings table...');
  const client = await dbPool.connect();
  try {
    await client.query(`
      ALTER TABLE meetings ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'OPEN';
      ALTER TABLE meetings ADD COLUMN IF NOT EXISTS meeting_order INTEGER DEFAULT 1;
      ALTER TABLE meetings ADD COLUMN IF NOT EXISTS source_tool VARCHAR(100) DEFAULT 'MANUAL';
      ALTER TABLE meetings ADD COLUMN IF NOT EXISTS key_discussion_points JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE meetings ADD COLUMN IF NOT EXISTS clarified_requirements JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE meetings ADD COLUMN IF NOT EXISTS suggested_followup_questions JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE meetings ADD COLUMN IF NOT EXISTS discussion_topics JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE meetings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    `);
    console.log('✅ Meetings table enhanced successfully with lifecycle & AI analysis columns!');
  } finally {
    client.release();
  }
}

if (process.argv[1]?.includes('migrate_meetings')) {
  runMeetingMigration()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
