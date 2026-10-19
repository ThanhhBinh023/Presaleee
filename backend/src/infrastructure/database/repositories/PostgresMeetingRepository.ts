import { Pool } from 'pg';
import { IMeetingRepository, CreateMeetingInput, MeetingScope } from '../../../domain/repositories/IMeetingRepository.js';
import { Meeting, MeetingAnalysis, MeetingStatus } from '../../../domain/entities/Meeting.js';

const SELECT_MEETING = `m.id, m.lead_id, l.organization_id, m.created_by, m.title, m.meeting_date,
  m.attendees, m.status, m.raw_transcript, m.clean_notes, m.decisions, m.action_items,
  m.open_questions, m.gap_analysis, m.analysis, m.analyzed_at, m.created_at, m.updated_at`;

function parseJson(value: unknown, fallback: any): any {
  if (typeof value !== 'string') return value ?? fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

function mapMeeting(row: any): Meeting {
  return {
    id: row.id,
    leadId: row.lead_id,
    organizationId: row.organization_id,
    createdBy: row.created_by,
    title: row.title,
    meetingDate: new Date(row.meeting_date).toISOString(),
    attendees: parseJson(row.attendees, []),
    status: row.status,
    rawTranscript: row.raw_transcript,
    cleanNotes: row.clean_notes,
    decisions: parseJson(row.decisions, []),
    actionItems: parseJson(row.action_items, []),
    openQuestions: parseJson(row.open_questions, []),
    gapAnalysis: parseJson(row.gap_analysis, { risks: [], missingInformation: [], followUpQuestions: [] }),
    analysis: parseJson(row.analysis, {}),
    analyzedAt: row.analyzed_at ? new Date(row.analyzed_at).toISOString() : null,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

export class PostgresMeetingRepository implements IMeetingRepository {
  constructor(private readonly pool: Pool) {}

  async create(input: CreateMeetingInput): Promise<Meeting | null> {
    const result = await this.pool.query(
      `INSERT INTO meetings (lead_id, organization_id, created_by, title, meeting_date, attendees)
       SELECT l.id, l.organization_id, $3, $4, $5::timestamptz, $6::jsonb
       FROM leads l WHERE l.id = $1 AND l.organization_id = $2
       RETURNING id;`,
      [input.leadId, input.organizationId, input.createdBy, input.title, input.meetingDate, JSON.stringify(input.attendees)]
    );
    return result.rows[0] ? this.findById(result.rows[0].id, { organizationId: input.organizationId }) : null;
  }

  async listByLead(leadId: string, scope: MeetingScope): Promise<Meeting[]> {
    const result = await this.pool.query(
      `SELECT ${SELECT_MEETING} FROM meetings m JOIN leads l ON l.id = m.lead_id
       WHERE m.lead_id = $1 AND l.organization_id = $2 ORDER BY m.meeting_date DESC, m.created_at DESC;`,
      [leadId, scope.organizationId]
    );
    return result.rows.map(mapMeeting);
  }

  async findById(meetingId: string, scope: MeetingScope): Promise<Meeting | null> {
    const result = await this.pool.query(
      `SELECT ${SELECT_MEETING} FROM meetings m JOIN leads l ON l.id = m.lead_id
       WHERE m.id = $1 AND l.organization_id = $2;`,
      [meetingId, scope.organizationId]
    );
    return result.rows[0] ? mapMeeting(result.rows[0]) : null;
  }

  async saveTranscript(meetingId: string, scope: MeetingScope, transcript: string, append: boolean): Promise<Meeting | null> {
    const result = await this.pool.query(
      `UPDATE meetings m SET raw_transcript = CASE
          WHEN $3::boolean AND NULLIF(m.raw_transcript, '') IS NOT NULL THEN m.raw_transcript || E'\\n\\n' || $4
          ELSE $4 END,
          clean_notes = NULL, decisions = '[]'::jsonb, action_items = '[]'::jsonb,
          open_questions = '[]'::jsonb, gap_analysis = '{}'::jsonb, analysis = '{}'::jsonb,
          analyzed_at = NULL, updated_at = NOW()
       FROM leads l WHERE m.lead_id = l.id AND m.id = $1 AND l.organization_id = $2 AND m.status = 'OPEN'
       RETURNING m.id;`,
      [meetingId, scope.organizationId, append, transcript]
    );
    return result.rows[0] ? this.findById(meetingId, scope) : null;
  }

  async changeStatus(meetingId: string, scope: MeetingScope, status: MeetingStatus, allowedCurrent: MeetingStatus[]): Promise<Meeting | null> {
    const result = await this.pool.query(
      `UPDATE meetings m SET status = $3, updated_at = NOW()
       FROM leads l WHERE m.lead_id = l.id AND m.id = $1 AND l.organization_id = $2
         AND m.status = ANY($4::varchar[]) RETURNING m.id;`,
      [meetingId, scope.organizationId, status, allowedCurrent]
    );
    return result.rows[0] ? this.findById(meetingId, scope) : null;
  }

  async saveAnalysis(meetingId: string, scope: MeetingScope, analysis: MeetingAnalysis): Promise<Meeting | null> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const current = await client.query(
        `SELECT m.id, m.lead_id, m.title, m.meeting_date FROM meetings m JOIN leads l ON l.id = m.lead_id
         WHERE m.id = $1 AND l.organization_id = $2 AND m.raw_transcript IS NOT NULL FOR UPDATE OF m;`,
        [meetingId, scope.organizationId]
      );
      if (!current.rows[0]) { await client.query('ROLLBACK'); return null; }
      const meeting = current.rows[0];
      await client.query(
        `UPDATE meetings SET clean_notes = $3, decisions = $4::jsonb, action_items = $5::jsonb,
          open_questions = $6::jsonb, gap_analysis = $7::jsonb, analysis = $8::jsonb,
          analyzed_at = NOW(), status = 'INSPECTED', updated_at = NOW() WHERE id = $1 AND organization_id = $2;`,
        [meetingId, scope.organizationId, analysis.summary, JSON.stringify(analysis.decisions),
          JSON.stringify(analysis.actionItems), JSON.stringify(analysis.openQuestions),
          JSON.stringify(analysis.gapAnalysis), JSON.stringify(analysis)]
      );
      const insight = {
        meetingId,
        title: meeting.title,
        meetingDate: new Date(meeting.meeting_date).toISOString(),
        summary: analysis.summary,
        technicalSummary: analysis.technicalSummary,
        decisions: analysis.decisions,
        actionItems: analysis.actionItems,
        openQuestions: analysis.openQuestions
      };
      await client.query(
        `UPDATE leads SET extracted_metadata = jsonb_set(
          COALESCE(extracted_metadata, '{}'::jsonb), '{discoveryInsights}',
          (SELECT COALESCE(jsonb_agg(entry.value), '[]'::jsonb) || jsonb_build_array($3::jsonb)
           FROM jsonb_array_elements(CASE WHEN jsonb_typeof(extracted_metadata->'discoveryInsights') = 'array'
             THEN extracted_metadata->'discoveryInsights' ELSE '[]'::jsonb END) AS entry(value)
           WHERE COALESCE(entry.value->>'meetingId', '') <> $4), true
         ), updated_at = NOW() WHERE id = $1 AND organization_id = $2;`,
        [meeting.lead_id, scope.organizationId, JSON.stringify(insight), meetingId]
      );
      await client.query('COMMIT');
      return this.findById(meetingId, scope);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }
}
