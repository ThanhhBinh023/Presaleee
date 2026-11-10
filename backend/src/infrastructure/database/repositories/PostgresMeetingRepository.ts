import { Pool } from 'pg';
import {
  IMeetingRepository,
  CreateMeetingInput,
  MeetingScope
} from '../../../domain/repositories/IMeetingRepository.js';
import { Meeting, MeetingAnalysis, MeetingStatus } from '../../../domain/entities/Meeting.js';

/** Patch payload for callers that predate the transcript/analysis/lifecycle split. */
export interface UpdateMeetingParams {
  title?: string;
  status?: MeetingStatus;
  meetingDate?: string;
  rawTranscript?: string | null;
  cleanNotes?: string | null;
  analysis?: MeetingAnalysis;
}

/**
 * Tenant scoping always resolves through the owning lead: meetings.organization_id only
 * exists once migration 006 has run, while leads.organization_id is in the base schema.
 */
const MEETING_SELECT = `
  SELECT m.*, l.organization_id AS lead_organization_id
  FROM meetings m
  JOIN leads l ON l.id = m.lead_id`;

const MEETING_RETURNING = `RETURNING m.*, l.organization_id AS lead_organization_id`;

export class PostgresMeetingRepository implements IMeetingRepository {
  constructor(private readonly pool: Pool) {}

  async create(input: CreateMeetingInput): Promise<Meeting | null> {
    const result = await this.pool.query(
      `INSERT INTO meetings (
         lead_id, organization_id, created_by, title, meeting_date, attendees, status
       ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, 'OPEN')
       RETURNING *;`,
      [
        input.leadId,
        input.organizationId,
        input.createdBy || null,
        input.title,
        input.meetingDate || new Date().toISOString(),
        JSON.stringify(input.attendees || [])
      ]
    );
    return this.mapRowToMeeting(result.rows[0]);
  }

  async findById(meetingId: string, scope: MeetingScope): Promise<Meeting | null> {
    const result = await this.pool.query(
      `${MEETING_SELECT} WHERE m.id = $1 AND l.organization_id = $2 LIMIT 1;`,
      [meetingId, scope.organizationId]
    );
    return result.rows[0] ? this.mapRowToMeeting(result.rows[0]) : null;
  }

  async listByLead(leadId: string, scope: MeetingScope): Promise<Meeting[]> {
    const result = await this.pool.query(
      `${MEETING_SELECT} WHERE m.lead_id = $1 AND l.organization_id = $2
       ORDER BY m.meeting_date ASC, m.created_at ASC;`,
      [leadId, scope.organizationId]
    );
    return result.rows.map(row => this.mapRowToMeeting(row));
  }

  async saveTranscript(
    meetingId: string,
    scope: MeetingScope,
    transcript: string,
    append: boolean
  ): Promise<Meeting | null> {
    const result = await this.pool.query(
      `UPDATE meetings m
       SET raw_transcript = CASE
             WHEN $4 AND m.raw_transcript IS NOT NULL AND m.raw_transcript <> ''
               THEN m.raw_transcript || E'\n\n' || $3
             ELSE $3
           END,
           updated_at = NOW()
       FROM leads l
       WHERE m.id = $1 AND l.id = m.lead_id AND l.organization_id = $2 AND m.status = 'OPEN'
       ${MEETING_RETURNING};`,
      [meetingId, scope.organizationId, transcript, append]
    );
    return result.rows[0] ? this.mapRowToMeeting(result.rows[0]) : null;
  }

  async changeStatus(
    meetingId: string,
    scope: MeetingScope,
    status: MeetingStatus,
    allowedCurrent: MeetingStatus[]
  ): Promise<Meeting | null> {
    const result = await this.pool.query(
      `UPDATE meetings m
       SET status = $3, updated_at = NOW()
       FROM leads l
       WHERE m.id = $1 AND l.id = m.lead_id AND l.organization_id = $2 AND m.status = ANY($4::text[])
       ${MEETING_RETURNING};`,
      [meetingId, scope.organizationId, status, allowedCurrent]
    );
    return result.rows[0] ? this.mapRowToMeeting(result.rows[0]) : null;
  }

  /**
   * Analysis is the only write that promotes a meeting to INSPECTED, and clean_notes carries
   * the summary because proposal generation reads clean_notes, not the analysis blob.
   */
  async saveAnalysis(
    meetingId: string,
    scope: MeetingScope,
    analysis: MeetingAnalysis
  ): Promise<Meeting | null> {
    const result = await this.pool.query(
      `UPDATE meetings m
       SET analysis = $3::jsonb,
           decisions = $4::jsonb,
           action_items = $5::jsonb,
           open_questions = $6::jsonb,
           gap_analysis = $7::jsonb,
           clean_notes = COALESCE(NULLIF(BTRIM($8), ''), m.clean_notes),
           analyzed_at = NOW(),
           status = 'INSPECTED',
           updated_at = NOW()
       FROM leads l
       WHERE m.id = $1 AND l.id = m.lead_id AND l.organization_id = $2 AND m.status = 'OPEN'
       ${MEETING_RETURNING};`,
      [
        meetingId,
        scope.organizationId,
        JSON.stringify(analysis),
        JSON.stringify(analysis.decisions || []),
        JSON.stringify(analysis.actionItems || []),
        JSON.stringify(analysis.openQuestions || []),
        JSON.stringify(analysis.gapAnalysis || { risks: [], missingInformation: [], followUpQuestions: [] }),
        typeof analysis.summary === 'string' ? analysis.summary : ''
      ]
    );
    return result.rows[0] ? this.mapRowToMeeting(result.rows[0]) : null;
  }

  async listByLeadId(leadId: string): Promise<Meeting[]> {
    const result = await this.pool.query(
      `${MEETING_SELECT} WHERE m.lead_id = $1 ORDER BY m.meeting_date ASC, m.created_at ASC;`,
      [leadId]
    );
    return result.rows.map(row => this.mapRowToMeeting(row));
  }

  async update(id: string, params: UpdateMeetingParams): Promise<Meeting> {
    const updates: string[] = ['updated_at = NOW()'];
    const values: unknown[] = [id];
    let paramIndex = 2;

    const addField = (column: string, value: unknown) => {
      updates.push(`${column} = $${paramIndex++}`);
      values.push(value);
    };

    if (params.title !== undefined) addField('title', params.title);
    if (params.status !== undefined) addField('status', params.status);
    if (params.meetingDate !== undefined) addField('meeting_date', params.meetingDate);
    if (params.rawTranscript !== undefined) addField('raw_transcript', params.rawTranscript);
    if (params.cleanNotes !== undefined) addField('clean_notes', params.cleanNotes);
    if (params.analysis !== undefined) {
      addField('analysis', JSON.stringify(params.analysis));
      addField('decisions', JSON.stringify(params.analysis.decisions || []));
      addField('action_items', JSON.stringify(params.analysis.actionItems || []));
      addField('open_questions', JSON.stringify(params.analysis.openQuestions || []));
      addField('gap_analysis', JSON.stringify(params.analysis.gapAnalysis || { risks: [], missingInformation: [], followUpQuestions: [] }));
      addField('analyzed_at', new Date().toISOString());
    }

    const result = await this.pool.query(
      `UPDATE meetings SET ${updates.join(', ')} WHERE id = $1 RETURNING *;`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error(`Meeting with ID '${id}' not found.`);
    }
    return this.mapRowToMeeting(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM meetings WHERE id = $1;', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  private parseJsonField<T>(field: unknown, fallback: T): T {
    if (field === null || field === undefined || field === '') return fallback;
    if (typeof field === 'string') {
      try {
        return JSON.parse(field) as T;
      } catch {
        return fallback;
      }
    }
    return field as T;
  }

  private mapRowToMeeting(row: any): Meeting {
    const gapFallback = { risks: [], missingInformation: [], followUpQuestions: [] };
    return {
      id: row.id,
      leadId: row.lead_id,
      organizationId: row.lead_organization_id ?? row.organization_id ?? '',
      createdBy: row.created_by ?? null,
      title: row.title,
      meetingDate: row.meeting_date,
      attendees: this.parseJsonField<Meeting['attendees']>(row.attendees, []),
      status: row.status || 'OPEN',
      rawTranscript: row.raw_transcript ?? null,
      cleanNotes: row.clean_notes ?? null,
      decisions: this.parseJsonField<string[]>(row.decisions, []),
      actionItems: this.parseJsonField<Meeting['actionItems']>(row.action_items, []),
      openQuestions: this.parseJsonField<string[]>(row.open_questions, []),
      gapAnalysis: this.parseJsonField<Meeting['gapAnalysis']>(row.gap_analysis, gapFallback),
      analysis: this.parseJsonField<Meeting['analysis']>(row.analysis, {}),
      analyzedAt: row.analyzed_at ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
