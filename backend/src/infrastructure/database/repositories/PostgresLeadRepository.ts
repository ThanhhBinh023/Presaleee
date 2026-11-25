import { Pool } from 'pg';
import { Lead, LeadListItem, LeadSource, LeadStatus } from '../../../domain/entities/Lead.js';
import { CreateLeadInput, ILeadRepository, ListLeadFilters, StoredQualification, UpdateLeadInput, LeadScope } from '../../../domain/repositories/ILeadRepository.js';

interface LeadRow {
  id: string;
  organization_id: string;
  client_id: string | null;
  created_by: string | null;
  assigned_to: string | null;
  title: string;
  source: LeadSource;
  status: LeadStatus;
  raw_rfp_content: string;
  extracted_metadata: Record<string, unknown> | string | null;
  bant_score: number | null;
  bant_details: Record<string, unknown> | string | null;
  client_name?: string | null;
  industry?: string | null;
  description?: string | null;
  is_archived?: boolean;
  archive_outcome?: string | null;
  archived_at?: Date | string | null;
  project_settings?: Record<string, unknown> | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

function parseJson(value: Record<string, unknown> | string | null): Record<string, unknown> {
  if (!value) return {};
  if (typeof value !== 'string') return value;
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function mapLead(row: LeadRow): Lead {
  return {
    id: row.id,
    organizationId: row.organization_id,
    clientId: row.client_id,
    createdBy: row.created_by,
    assignedTo: row.assigned_to,
    title: row.title,
    source: row.source,
    status: row.status,
    rawRfpContent: row.raw_rfp_content,
    extractedMetadata: parseJson(row.extracted_metadata),
    bantScore: row.bant_score,
    bantDetails: parseJson(row.bant_details),
    clientName: row.client_name ?? null,
    industry: row.industry ?? null,
    description: row.description ?? null,
    isArchived: Boolean(row.is_archived),
    archiveOutcome: row.archive_outcome ?? null,
    archivedAt: row.archived_at ? new Date(row.archived_at).toISOString() : null,
    projectSettings: parseJson(row.project_settings ?? null),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

const FULL_LEAD_COLUMNS = `id, organization_id, client_id, created_by, assigned_to, title, source, status,
  raw_rfp_content, extracted_metadata, bant_score, bant_details, client_name, industry, description,
  is_archived, archive_outcome, archived_at, project_settings, created_at, updated_at`;

export class PostgresLeadRepository implements ILeadRepository {
  constructor(private readonly pool: Pool) {}

  async create(input: CreateLeadInput): Promise<Lead> {
    const result = await this.pool.query<LeadRow>(
      `INSERT INTO leads (organization_id, client_id, created_by, assigned_to, title, source, status, raw_rfp_content, extracted_metadata)
       VALUES ($1, $2, $3, $4, $5, $6, 'NEW', $7, $8::jsonb)
       RETURNING ${FULL_LEAD_COLUMNS};`,
      [input.organizationId, input.clientId || null, input.createdBy, input.assignedTo || null,
        input.title, input.source, input.rawRfpContent, JSON.stringify(input.extractedMetadata)]
    );
    return mapLead(result.rows[0]);
  }

  async list(filters: ListLeadFilters): Promise<{ leads: LeadListItem[]; total: number }> {
    const conditions = ['organization_id = $1'];
    const values: unknown[] = [filters.organizationId];
    if (filters.status) { values.push(filters.status); conditions.push(`status = $${values.length}`); }
    if (filters.source) { values.push(filters.source); conditions.push(`source = $${values.length}`); }
    if (filters.assignedTo) { values.push(filters.assignedTo); conditions.push(`assigned_to = $${values.length}`); }
    if (filters.clientId) { values.push(filters.clientId); conditions.push(`client_id = $${values.length}`); }
    if (filters.search) {
      values.push(`%${filters.search.replace(/[\\%_]/g, '\\$&')}%`);
      conditions.push(`(title ILIKE $${values.length} ESCAPE '\\' OR raw_rfp_content ILIKE $${values.length} ESCAPE '\\')`);
    }
    const where = conditions.join(' AND ');
    const count = await this.pool.query<{ count: string }>(`SELECT COUNT(*) AS count FROM leads WHERE ${where};`, values);
    const total = Number.parseInt(count.rows[0]?.count || '0', 10);
    const pageValues = [...values, filters.limit, (filters.page - 1) * filters.limit];
    const result = await this.pool.query<LeadRow>(
      `SELECT ${FULL_LEAD_COLUMNS} FROM leads WHERE ${where}
       ORDER BY updated_at DESC, created_at DESC LIMIT $${pageValues.length - 1} OFFSET $${pageValues.length};`,
      pageValues
    );
    const leads = result.rows.map(row => mapLead(row));
    return { leads, total };
  }

  async findById(id: string, scope: LeadScope): Promise<Lead | null> {
    const result = await this.pool.query<LeadRow>(
      `SELECT ${FULL_LEAD_COLUMNS} FROM leads WHERE id = $1 AND organization_id = $2 LIMIT 1;`,
      [id, scope.organizationId]
    );
    return result.rows[0] ? mapLead(result.rows[0]) : null;
  }

  async update(id: string, scope: LeadScope, input: UpdateLeadInput): Promise<Lead | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    const addField = (column: string, value: unknown, cast = '') => {
      values.push(value);
      fields.push(`${column} = $${values.length}${cast}`);
    };
    if (input.title !== undefined) addField('title', input.title);
    if (input.clientId !== undefined) addField('client_id', input.clientId);
    if (input.assignedTo !== undefined) addField('assigned_to', input.assignedTo);
    if (input.source !== undefined) addField('source', input.source);
    if (input.rawRfpContent !== undefined) addField('raw_rfp_content', input.rawRfpContent);
    if (input.extractedMetadata !== undefined) addField('extracted_metadata', JSON.stringify(input.extractedMetadata), '::jsonb');
    if (fields.length === 0) return this.findById(id, scope);
    fields.push('updated_at = NOW()');
    values.push(id, scope.organizationId);
    const result = await this.pool.query<LeadRow>(
      `UPDATE leads SET ${fields.join(', ')} WHERE id = $${values.length - 1} AND organization_id = $${values.length}
       RETURNING ${FULL_LEAD_COLUMNS};`,
      values
    );
    return result.rows[0] ? mapLead(result.rows[0]) : null;
  }

  async updateStatusWithQualificationCheck(id: string, scope: LeadScope, status: LeadStatus, allowedCurrentStatuses: LeadStatus[], requiresQualification: boolean): Promise<Lead | null> {
    const result = await this.pool.query<LeadRow>(
      `UPDATE leads SET status = $3, updated_at = NOW()
       WHERE id = $1 AND organization_id = $2
         AND ($5 = FALSE OR bant_score IS NOT NULL)
         AND status = ANY($4::varchar[])
       RETURNING ${FULL_LEAD_COLUMNS};`,
      [id, scope.organizationId, status, allowedCurrentStatuses, requiresQualification]
    );
    return result.rows[0] ? mapLead(result.rows[0]) : null;
  }

  async delete(id: string, scope: LeadScope): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM leads WHERE id = $1 AND organization_id = $2 RETURNING id;`,
      [id, scope.organizationId]
    );
    return (result.rowCount || 0) > 0;
  }

  async saveQualification(id: string, scope: LeadScope, qualification: StoredQualification, qualifyFrom: LeadStatus[]): Promise<Lead | null> {
    const result = await this.pool.query<LeadRow>(
      `UPDATE leads
          SET bant_score = $3,
              bant_details = $4::jsonb,
              status = CASE WHEN status = ANY($5::varchar[]) THEN 'QUALIFIED' ELSE status END,
              updated_at = NOW()
        WHERE id = $1 AND organization_id = $2
        RETURNING ${FULL_LEAD_COLUMNS};`,
      [id, scope.organizationId, qualification.score, JSON.stringify(qualification.details), qualifyFrom]
    );
    return result.rows[0] ? mapLead(result.rows[0]) : null;
  }
}
