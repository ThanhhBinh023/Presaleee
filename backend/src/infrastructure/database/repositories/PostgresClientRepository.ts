import { Pool } from 'pg';
import { ConflictError } from '../../../domain/errors/AppError.js';
import { Client } from '../../../domain/entities/Client.js';
import { ClientInput, IClientRepository, ListClientFilters, UpdateClientInput } from '../../../domain/repositories/IClientRepository.js';

interface ClientRow {
  id: string;
  organization_id: string;
  company_name: string;
  industry: string | null;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  country: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

const FULL_CLIENT_COLUMNS = `id, organization_id, company_name, industry, contact_person, contact_email,
  contact_phone, country, created_at, updated_at`;

function mapClient(row: ClientRow): Client {
  return {
    id: row.id,
    organizationId: row.organization_id,
    companyName: row.company_name,
    industry: row.industry,
    contactPerson: row.contact_person,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    country: row.country || 'Vietnam',
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

export class PostgresClientRepository implements IClientRepository {
  constructor(private readonly pool: Pool) {}

  async create(input: ClientInput): Promise<Client> {
    try {
      const result = await this.pool.query<ClientRow>(
        `INSERT INTO clients (organization_id, company_name, industry, contact_person, contact_email, contact_phone, country)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING ${FULL_CLIENT_COLUMNS};`,
        [input.organizationId, input.companyName, input.industry, input.contactPerson,
          input.contactEmail, input.contactPhone, input.country]
      );
      return mapClient(result.rows[0]);
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictError(`A client named "${input.companyName}" already exists in this organization.`);
      }
      throw error;
    }
  }

  async list(filters: ListClientFilters): Promise<{ clients: Client[]; total: number }> {
    const conditions = ['organization_id = $1'];
    const values: unknown[] = [filters.organizationId];
    if (filters.industry) { values.push(filters.industry); conditions.push(`industry = $${values.length}`); }
    if (filters.search) {
      values.push(`%${filters.search.replace(/[\\%_]/g, '\\$&')}%`);
      conditions.push(`(company_name ILIKE $${values.length} ESCAPE '\\' OR contact_person ILIKE $${values.length} ESCAPE '\\'
        OR contact_email ILIKE $${values.length} ESCAPE '\\')`);
    }
    const where = conditions.join(' AND ');
    const count = await this.pool.query<{ count: string }>(`SELECT COUNT(*) AS count FROM clients WHERE ${where};`, values);
    const total = Number.parseInt(count.rows[0]?.count || '0', 10);
    const pageValues = [...values, filters.limit, (filters.page - 1) * filters.limit];
    const result = await this.pool.query<ClientRow>(
      `SELECT ${FULL_CLIENT_COLUMNS} FROM clients WHERE ${where}
       ORDER BY updated_at DESC, created_at DESC LIMIT $${pageValues.length - 1} OFFSET $${pageValues.length};`,
      pageValues
    );
    return { clients: result.rows.map(mapClient), total };
  }

  async findById(id: string, scope: { organizationId: string }): Promise<Client | null> {
    const result = await this.pool.query<ClientRow>(
      `SELECT ${FULL_CLIENT_COLUMNS} FROM clients WHERE id = $1 AND organization_id = $2 LIMIT 1;`,
      [id, scope.organizationId]
    );
    return result.rows[0] ? mapClient(result.rows[0]) : null;
  }

  async update(id: string, scope: { organizationId: string }, input: UpdateClientInput): Promise<Client | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    const addField = (column: string, value: unknown) => {
      values.push(value);
      fields.push(`${column} = $${values.length}`);
    };
    if (input.companyName !== undefined) addField('company_name', input.companyName);
    if (input.industry !== undefined) addField('industry', input.industry);
    if (input.contactPerson !== undefined) addField('contact_person', input.contactPerson);
    if (input.contactEmail !== undefined) addField('contact_email', input.contactEmail);
    if (input.contactPhone !== undefined) addField('contact_phone', input.contactPhone);
    if (input.country !== undefined) addField('country', input.country);
    if (fields.length === 0) return this.findById(id, scope);
    fields.push('updated_at = NOW()');
    values.push(id, scope.organizationId);
    try {
      const result = await this.pool.query<ClientRow>(
        `UPDATE clients SET ${fields.join(', ')} WHERE id = $${values.length - 1} AND organization_id = $${values.length}
         RETURNING ${FULL_CLIENT_COLUMNS};`,
        values
      );
      return result.rows[0] ? mapClient(result.rows[0]) : null;
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictError('Another client in this organization already uses that company name.');
      }
      throw error;
    }
  }

  async delete(id: string, scope: { organizationId: string }): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM clients WHERE id = $1 AND organization_id = $2 RETURNING id;`,
      [id, scope.organizationId]
    );
    return (result.rowCount || 0) > 0;
  }

  async countLeads(clientId: string, scope: { organizationId: string }): Promise<number> {
    const result = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM leads WHERE client_id = $1 AND organization_id = $2;`,
      [clientId, scope.organizationId]
    );
    return Number.parseInt(result.rows[0]?.count || '0', 10);
  }
}
