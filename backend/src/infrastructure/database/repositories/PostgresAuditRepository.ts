import { Pool } from 'pg';
import { AuditLogEntry, AuditResultStatus } from '../../../domain/entities/AuditLog.js';
import { IAuditRepository, ListAuditFilters, RecordAuditInput } from '../../../domain/repositories/IAuditRepository.js';

interface AuditRow {
  id: string;
  organization_id: string;
  user_id: string | null;
  actor_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  payload: Record<string, unknown> | string | null;
  result_status: AuditResultStatus | null;
  created_at: Date | string;
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

export class PostgresAuditRepository implements IAuditRepository {
  constructor(private readonly pool: Pool) {}

  async record(input: RecordAuditInput): Promise<void> {
    await this.pool.query(
      `INSERT INTO audit_logs (organization_id, user_id, action, entity_type, entity_id, payload, result_status, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8);`,
      [input.organizationId, input.actorId, input.action, input.entityType, input.entityId || null,
        JSON.stringify(input.payload || {}), input.resultStatus || 'SUCCESS', input.ipAddress || null]
    );
  }

  async list(filters: ListAuditFilters): Promise<{ entries: AuditLogEntry[]; total: number }> {
    const conditions = ['a.organization_id = $1'];
    const values: unknown[] = [filters.organizationId];
    if (filters.action) { values.push(filters.action); conditions.push(`a.action = $${values.length}`); }
    if (filters.entityType) { values.push(filters.entityType); conditions.push(`a.entity_type = $${values.length}`); }
    if (filters.entityId) { values.push(filters.entityId); conditions.push(`a.entity_id = $${values.length}`); }
    if (filters.actorId) { values.push(filters.actorId); conditions.push(`a.user_id = $${values.length}`); }
    if (filters.resultStatus) { values.push(filters.resultStatus); conditions.push(`a.result_status = $${values.length}`); }
    if (filters.from) { values.push(filters.from); conditions.push(`a.created_at >= $${values.length}::timestamptz`); }
    if (filters.to) { values.push(filters.to); conditions.push(`a.created_at <= $${values.length}::timestamptz`); }
    const where = conditions.join(' AND ');

    const count = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM audit_logs a WHERE ${where};`,
      values
    );
    const total = Number.parseInt(count.rows[0]?.count || '0', 10);
    const pageValues = [...values, filters.limit, (filters.page - 1) * filters.limit];
    const result = await this.pool.query<AuditRow>(
      `SELECT a.id, a.organization_id, a.user_id, a.action, a.entity_type, a.entity_id, a.payload,
              a.result_status, a.created_at, u.full_name AS actor_name
       FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id
       WHERE ${where}
       ORDER BY a.created_at DESC LIMIT $${pageValues.length - 1} OFFSET $${pageValues.length};`,
      pageValues
    );
    const entries = result.rows.map(row => ({
      id: row.id,
      organizationId: row.organization_id,
      userId: row.user_id,
      actorName: row.actor_name,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      payload: parseJson(row.payload),
      resultStatus: row.result_status || 'SUCCESS',
      createdAt: new Date(row.created_at).toISOString()
    }));
    return { entries, total };
  }
}
