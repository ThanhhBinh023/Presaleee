import { Pool } from 'pg';
import {
  IMeetingRepository,
  CreateMeetingParams,
  UpdateMeetingParams
} from '../../../domain/repositories/IMeetingRepository.js';
import { Meeting } from '../../../domain/entities/Meeting.js';

export class PostgresMeetingRepository implements IMeetingRepository {
  constructor(private readonly pool: Pool) {}

  async create(params: CreateMeetingParams): Promise<Meeting> {
    // If meetingOrder not provided, find max order for this lead and add 1
    let order = params.meetingOrder;
    if (order === undefined || order === null) {
      const maxRes = await this.pool.query(
        'SELECT COALESCE(MAX(meeting_order), 0) + 1 AS next_order FROM meetings WHERE lead_id = $1;',
        [params.leadId]
      );
      order = maxRes.rows[0]?.next_order || 1;
    }

    const query = `
      INSERT INTO meetings (
        lead_id, created_by, title, meeting_order, meeting_date,
        status, source_tool, audio_record_url, raw_transcript
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;

    const values = [
      params.leadId,
      params.createdBy || null,
      params.title,
      order,
      params.meetingDate || new Date(),
      params.status || 'OPEN',
      params.sourceTool || 'MANUAL',
      params.audioRecordUrl || null,
      params.rawTranscript || null
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToMeeting(result.rows[0]);
  }

  async findById(id: string): Promise<Meeting | null> {
    const result = await this.pool.query('SELECT * FROM meetings WHERE id = $1;', [id]);
    if (result.rows.length === 0) return null;
    return this.mapRowToMeeting(result.rows[0]);
  }

  async listByLeadId(leadId: string): Promise<Meeting[]> {
    const result = await this.pool.query(
      'SELECT * FROM meetings WHERE lead_id = $1 ORDER BY meeting_order ASC, meeting_date ASC;',
      [leadId]
    );
    return result.rows.map(row => this.mapRowToMeeting(row));
  }

  async update(id: string, params: UpdateMeetingParams): Promise<Meeting> {
    const updates: string[] = ['updated_at = NOW()'];
    const values: any[] = [id];
    let paramIndex = 2;

    if (params.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(params.title);
    }

    if (params.meetingOrder !== undefined) {
      updates.push(`meeting_order = $${paramIndex++}`);
      values.push(params.meetingOrder);
    }

    if (params.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(params.status);
    }

    if (params.meetingDate !== undefined) {
      updates.push(`meeting_date = $${paramIndex++}`);
      values.push(params.meetingDate);
    }

    if (params.sourceTool !== undefined) {
      updates.push(`source_tool = $${paramIndex++}`);
      values.push(params.sourceTool);
    }

    if (params.audioRecordUrl !== undefined) {
      updates.push(`audio_record_url = $${paramIndex++}`);
      values.push(params.audioRecordUrl);
    }

    if (params.rawTranscript !== undefined) {
      updates.push(`raw_transcript = $${paramIndex++}`);
      values.push(params.rawTranscript);
    }

    if (params.cleanNotes !== undefined) {
      updates.push(`clean_notes = $${paramIndex++}`);
      values.push(params.cleanNotes);
    }

    if (params.keyDiscussionPoints !== undefined) {
      updates.push(`key_discussion_points = $${paramIndex++}`);
      values.push(JSON.stringify(params.keyDiscussionPoints));
    }

    if (params.clarifiedRequirements !== undefined) {
      updates.push(`clarified_requirements = $${paramIndex++}`);
      values.push(JSON.stringify(params.clarifiedRequirements));
    }

    if (params.actionItems !== undefined) {
      updates.push(`action_items = $${paramIndex++}`);
      values.push(JSON.stringify(params.actionItems));
    }

    if (params.suggestedFollowupQuestions !== undefined) {
      updates.push(`suggested_followup_questions = $${paramIndex++}`);
      values.push(JSON.stringify(params.suggestedFollowupQuestions));
    }

    if (params.discussionTopics !== undefined) {
      updates.push(`discussion_topics = $${paramIndex++}`);
      values.push(JSON.stringify(params.discussionTopics));
    }

    if (params.gapAnalysis !== undefined) {
      updates.push(`gap_analysis = $${paramIndex++}`);
      values.push(JSON.stringify(params.gapAnalysis));
    }

    const query = `
      UPDATE meetings
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING *;
    `;

    const result = await this.pool.query(query, values);
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
    if (!field) return fallback;
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
    return {
      id: row.id,
      leadId: row.lead_id,
      createdBy: row.created_by,
      title: row.title,
      meetingOrder: Number(row.meeting_order) || 1,
      meetingDate: row.meeting_date,
      status: row.status || 'OPEN',
      sourceTool: row.source_tool || 'MANUAL',
      audioRecordUrl: row.audio_record_url,
      rawTranscript: row.raw_transcript,
      cleanNotes: row.clean_notes,
      keyDiscussionPoints: this.parseJsonField<string[]>(row.key_discussion_points, []),
      clarifiedRequirements: this.parseJsonField<string[]>(row.clarified_requirements, []),
      actionItems: this.parseJsonField(row.action_items, []),
      suggestedFollowupQuestions: this.parseJsonField<string[]>(row.suggested_followup_questions, []),
      discussionTopics: this.parseJsonField<string[]>(row.discussion_topics, []),
      gapAnalysis: this.parseJsonField(row.gap_analysis, {
        missingParameters: [],
        proactiveQuestions: []
      }),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
