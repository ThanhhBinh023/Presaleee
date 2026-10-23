import { Pool } from 'pg';
import { ConflictError } from '../../../domain/errors/AppError.js';
import { RateCard, RateCardLevel } from '../../../domain/entities/RateCard.js';
import { IRateCardRepository, ListRateCardFilters, RateCardInput, UpdateRateCardInput } from '../../../domain/repositories/IRateCardRepository.js';

interface RateCardRow {
  id: string;
  organization_id: string;
  role_name: string;
  level: RateCardLevel;
  hourly_rate_usd: string | number;
  daily_rate_usd: string | number;
  monthly_rate_usd: string | number | null;
  currency: string | null;
  is_active: boolean | null;
  created_at: Date | string;
  updated_at: Date | string;
}

const FULL_RATE_CARD_COLUMNS = `id, organization_id, role_name, level, hourly_rate_usd, daily_rate_usd,
  monthly_rate_usd, currency, is_active, created_at, updated_at`;

function toAmount(value: string | number | null): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapRateCard(row: RateCardRow): RateCard {
  return {
    id: row.id,
    organizationId: row.organization_id,
    roleName: row.role_name,
    level: row.level,
    hourlyRateUsd: Number(toAmount(row.hourly_rate_usd) ?? 0),
    dailyRateUsd: Number(toAmount(row.daily_rate_usd) ?? 0),
    monthlyRateUsd: toAmount(row.monthly_rate_usd),
    currency: row.currency || 'USD',
    isActive: row.is_active !== false,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

export class PostgresRateCardRepository implements IRateCardRepository {
  constructor(private readonly pool: Pool) {}

  async create(input: RateCardInput): Promise<RateCard> {
    try {
      const result = await this.pool.query<RateCardRow>(
        `INSERT INTO rate_cards (organization_id, role_name, level, hourly_rate_usd, daily_rate_usd, monthly_rate_usd, currency, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING ${FULL_RATE_CARD_COLUMNS};`,
        [input.organizationId, input.roleName, input.level, input.hourlyRateUsd, input.dailyRateUsd,
          input.monthlyRateUsd, input.currency, input.isActive]
      );
      return mapRateCard(result.rows[0]);
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictError(`An active rate card for "${input.roleName}" (${input.level}, ${input.currency}) already exists.`);
      }
      throw error;
    }
  }

  async list(filters: ListRateCardFilters): Promise<{ rateCards: RateCard[]; total: number }> {
    const conditions = ['organization_id = $1'];
    const values: unknown[] = [filters.organizationId];
    if (!filters.includeInactive) conditions.push('is_active = TRUE');
    if (filters.level) { values.push(filters.level); conditions.push(`level = $${values.length}`); }
    if (filters.currency) { values.push(filters.currency); conditions.push(`currency = $${values.length}`); }
    if (filters.roleName) {
      values.push(`%${filters.roleName.replace(/[\\%_]/g, '\\$&')}%`);
      conditions.push(`role_name ILIKE $${values.length} ESCAPE '\\'`);
    }
    const where = conditions.join(' AND ');
    const count = await this.pool.query<{ count: string }>(`SELECT COUNT(*) AS count FROM rate_cards WHERE ${where};`, values);
    const total = Number.parseInt(count.rows[0]?.count || '0', 10);
    const pageValues = [...values, filters.limit, (filters.page - 1) * filters.limit];
    const result = await this.pool.query<RateCardRow>(
      `SELECT ${FULL_RATE_CARD_COLUMNS} FROM rate_cards WHERE ${where}
       ORDER BY level DESC, role_name ASC LIMIT $${pageValues.length - 1} OFFSET $${pageValues.length};`,
      pageValues
    );
    return { rateCards: result.rows.map(mapRateCard), total };
  }

  async findById(id: string, scope: { organizationId: string }): Promise<RateCard | null> {
    const result = await this.pool.query<RateCardRow>(
      `SELECT ${FULL_RATE_CARD_COLUMNS} FROM rate_cards WHERE id = $1 AND organization_id = $2 LIMIT 1;`,
      [id, scope.organizationId]
    );
    return result.rows[0] ? mapRateCard(result.rows[0]) : null;
  }

  async update(id: string, scope: { organizationId: string }, input: UpdateRateCardInput): Promise<RateCard | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    const addField = (column: string, value: unknown) => {
      values.push(value);
      fields.push(`${column} = $${values.length}`);
    };
    if (input.roleName !== undefined) addField('role_name', input.roleName);
    if (input.level !== undefined) addField('level', input.level);
    if (input.hourlyRateUsd !== undefined) addField('hourly_rate_usd', input.hourlyRateUsd);
    if (input.dailyRateUsd !== undefined) addField('daily_rate_usd', input.dailyRateUsd);
    if (input.monthlyRateUsd !== undefined) addField('monthly_rate_usd', input.monthlyRateUsd);
    if (input.currency !== undefined) addField('currency', input.currency);
    if (input.isActive !== undefined) addField('is_active', input.isActive);
    if (fields.length === 0) return this.findById(id, scope);
    fields.push('updated_at = NOW()');
    values.push(id, scope.organizationId);
    try {
      const result = await this.pool.query<RateCardRow>(
        `UPDATE rate_cards SET ${fields.join(', ')} WHERE id = $${values.length - 1} AND organization_id = $${values.length}
         RETURNING ${FULL_RATE_CARD_COLUMNS};`,
        values
      );
      return result.rows[0] ? mapRateCard(result.rows[0]) : null;
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictError('Another rate card already covers that role, level, and currency.');
      }
      throw error;
    }
  }

  async delete(id: string, scope: { organizationId: string }): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM rate_cards WHERE id = $1 AND organization_id = $2 RETURNING id;`,
      [id, scope.organizationId]
    );
    return (result.rowCount || 0) > 0;
  }

  async listActive(organizationId: string, currency?: string): Promise<RateCard[]> {
    const values: unknown[] = [organizationId];
    const conditions = ['organization_id = $1', 'is_active = TRUE'];
    if (currency) { values.push(currency); conditions.push(`currency = $${values.length}`); }
    const result = await this.pool.query<RateCardRow>(
      `SELECT ${FULL_RATE_CARD_COLUMNS} FROM rate_cards WHERE ${conditions.join(' AND ')} ORDER BY role_name ASC;`,
      values
    );
    return result.rows.map(mapRateCard);
  }
}
