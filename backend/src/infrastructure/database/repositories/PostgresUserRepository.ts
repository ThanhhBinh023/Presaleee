import { Pool } from 'pg';
import { ConflictError } from '../../../domain/errors/AppError.js';
import { MemberDirectoryEntry, Organization, OrganizationSummary, UserAccount, UserRole, UserStatus } from '../../../domain/entities/User.js';
import { CreateUserInput, IUserRepository, ListMemberFilters, RegisterOrganizationInput, UpdateUserInput } from '../../../domain/repositories/IUserRepository.js';

interface UserRow {
  id: string;
  organization_id: string | null;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  status: UserStatus;
  created_at: Date | string;
  updated_at: Date | string;
  organization_name?: string | null;
}

interface OrganizationRow {
  id: string;
  name: string;
  domain: string | null;
  plan: string | null;
  created_at: Date | string;
  member_count?: string | number;
}

const USER_COLUMNS = `id, organization_id, email, full_name, avatar_url, role, status, created_at, updated_at`;

function mapUser(row: UserRow): UserAccount {
  return {
    id: row.id,
    organizationId: row.organization_id,
    email: row.email,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    role: row.role,
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

function mapOrganization(row: OrganizationRow): Organization {
  return {
    id: row.id,
    name: row.name,
    domain: row.domain,
    plan: row.plan || 'FREE',
    createdAt: new Date(row.created_at).toISOString()
  };
}

export class PostgresUserRepository implements IUserRepository {
  constructor(private readonly pool: Pool) {}

  async registerOrganization(input: RegisterOrganizationInput): Promise<{ user: UserAccount; organization: Organization } | null> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const organizationResult = await client.query<OrganizationRow>(
        `INSERT INTO organizations (name, domain, plan) VALUES ($1, $2, 'FREE')
         RETURNING id, name, domain, plan, created_at;`,
        [input.organizationName, input.organizationDomain]
      );
      const organization = mapOrganization(organizationResult.rows[0]);
      const userResult = await client.query<UserRow>(
        `INSERT INTO users (organization_id, email, full_name, role, status, password_hash)
         VALUES ($1, $2, $3, 'ADMIN', 'ACTIVE', $4)
         RETURNING ${USER_COLUMNS};`,
        [organization.id, input.email, input.fullName, input.passwordHash]
      );
      await client.query('COMMIT');
      return { user: mapUser(userResult.rows[0]), organization };
    } catch (error) {
      await client.query('ROLLBACK');
      if ((error as { code?: string }).code === '23505') return null;
      throw error;
    } finally {
      client.release();
    }
  }

  async listOrganizationsForUser(userId: string): Promise<OrganizationSummary[]> {
    const result = await this.pool.query<OrganizationRow & { member_count: string | number }>(
      `SELECT o.id, o.name, o.domain, o.plan, o.created_at,
              (SELECT COUNT(*) FROM users m WHERE m.organization_id = o.id) AS member_count
       FROM organizations o
       WHERE o.id = ANY(ARRAY(SELECT organization_id FROM users WHERE id = $1))
       ORDER BY o.created_at ASC;`,
      [userId]
    );
    return result.rows.map(row => ({ ...mapOrganization(row), memberCount: Number(row.member_count || 0) }));
  }

  async listMembers(filters: ListMemberFilters): Promise<{ members: MemberDirectoryEntry[]; total: number }> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    values.push(filters.organizationIds); conditions.push(`u.organization_id = ANY($${values.length}::uuid[])`);
    if (filters.role) { values.push(filters.role); conditions.push(`u.role = $${values.length}`); }
    if (filters.status) { values.push(filters.status); conditions.push(`u.status = $${values.length}`); }
    if (filters.search) {
      values.push(`%${filters.search.replace(/[\\%_]/g, '\\$&')}%`);
      conditions.push(`(u.full_name ILIKE $${values.length} ESCAPE '\\' OR u.email ILIKE $${values.length} ESCAPE '\\')`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const count = await this.pool.query<{ count: string }>(`SELECT COUNT(*) AS count FROM users u ${where};`, values);
    const total = Number.parseInt(count.rows[0]?.count || '0', 10);
    const pageValues = [...values, filters.limit, (filters.page - 1) * filters.limit];
    const result = await this.pool.query<UserRow>(
      `SELECT u.${USER_COLUMNS.split(', ').join(', u.')}, o.name AS organization_name
       FROM users u LEFT JOIN organizations o ON o.id = u.organization_id
       ${where}
       ORDER BY u.full_name ASC LIMIT $${pageValues.length - 1} OFFSET $${pageValues.length};`,
      pageValues
    );
    const members = result.rows.map(row => ({ ...mapUser(row), organizationName: row.organization_name ?? null }));
    return { members, total };
  }

  async findById(id: string): Promise<UserAccount | null> {
    const result = await this.pool.query<UserRow>(
      `SELECT ${USER_COLUMNS} FROM users WHERE id = $1 LIMIT 1;`,
      [id]
    );
    return result.rows[0] ? mapUser(result.rows[0]) : null;
  }

  async create(input: CreateUserInput): Promise<UserAccount | null> {
    try {
      const result = await this.pool.query<UserRow>(
        `INSERT INTO users (organization_id, email, full_name, role, status, password_hash)
         VALUES ($1, $2, $3, $4, 'ACTIVE', $5)
         RETURNING ${USER_COLUMNS};`,
        [input.organizationId, input.email, input.fullName, input.role, input.passwordHash]
      );
      return mapUser(result.rows[0]);
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictError('That email is already registered.');
      }
      throw error;
    }
  }

  async update(id: string, input: UpdateUserInput): Promise<UserAccount | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    const addField = (column: string, value: unknown) => {
      values.push(value);
      fields.push(`${column} = $${values.length}`);
    };
    if (input.fullName !== undefined) addField('full_name', input.fullName);
    if (input.avatarUrl !== undefined) addField('avatar_url', input.avatarUrl);
    if (input.role !== undefined) addField('role', input.role);
    if (input.status !== undefined) addField('status', input.status);
    if (input.passwordHash !== undefined) addField('password_hash', input.passwordHash);
    if (fields.length === 0) return this.findById(id);
    fields.push('updated_at = NOW()');
    values.push(id);
    const result = await this.pool.query<UserRow>(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${values.length}
       RETURNING ${USER_COLUMNS};`,
      values
    );
    return result.rows[0] ? mapUser(result.rows[0]) : null;
  }

  async revokeSessions(userId: string): Promise<void> {
    await this.pool.query(
      `UPDATE auth_refresh_tokens SET revoked_at = COALESCE(revoked_at, NOW()) WHERE user_id = $1 AND revoked_at IS NULL;`,
      [userId]
    );
  }
}
