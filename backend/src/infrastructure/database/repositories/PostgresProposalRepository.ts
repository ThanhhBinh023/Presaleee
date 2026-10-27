import { Pool } from 'pg';
import { IProposalRepository, CreateProposalParams, UpdateProposalParams, ProposalFilterParams } from '../../../domain/repositories/IProposalRepository.js';
import { Proposal, ProposalSheet, ProposalWithSheets } from '../../../domain/entities/Proposal.js';

export class PostgresProposalRepository implements IProposalRepository {
  constructor(private readonly pool: Pool) {}

  async create(params: CreateProposalParams): Promise<ProposalWithSheets> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Insert proposal record
      const proposalRes = await client.query(
        `INSERT INTO proposals (
          title, organization_id, lead_id, created_by, version, status, total_cost, currency, estimated_timeline_weeks
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *;`,
        [
          params.title,
          params.organizationId || null,
          params.leadId || null,
          params.createdBy || null,
          params.version || 'v1.0',
          params.status || 'DRAFT',
          params.totalCost ?? null,
          params.currency || 'USD',
          params.estimatedTimelineWeeks ?? null
        ]
      );

      const createdProposalRaw = proposalRes.rows[0];
      const proposalId = createdProposalRaw.id;

      // 2. Insert initial sheets
      const createdSheets: ProposalSheet[] = [];
      if (params.initialSheets && params.initialSheets.length > 0) {
        for (const s of params.initialSheets) {
          const sheetRes = await client.query(
            `INSERT INTO proposal_sheets (
              proposal_id, sheet_name, sheet_order, sheet_data, ai_generated
            ) VALUES ($1, $2, $3, $4, $5)
            RETURNING *;`,
            [
              proposalId,
              s.sheetName,
              s.sheetOrder,
              JSON.stringify(s.sheetData || {}),
              s.aiGenerated ?? false
            ]
          );
          createdSheets.push(this.mapSheet(sheetRes.rows[0]));
        }
      }

      await client.query('COMMIT');

      const proposal = this.mapProposal(createdProposalRaw);
      return {
        ...proposal,
        sheets: createdSheets
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findById(id: string, organizationId: string): Promise<ProposalWithSheets | null> {
    const proposalRes = await this.pool.query(
      `SELECT * FROM proposals WHERE id = $1 AND organization_id = $2;`,
      [id, organizationId]
    );

    if (proposalRes.rows.length === 0) {
      return null;
    }

    const proposal = this.mapProposal(proposalRes.rows[0]);

    const sheetsRes = await this.pool.query(
      `SELECT * FROM proposal_sheets WHERE proposal_id = $1 AND EXISTS (
         SELECT 1 FROM proposals p WHERE p.id = proposal_sheets.proposal_id AND p.organization_id = $2
       ) ORDER BY sheet_order ASC;`,
      [id, organizationId]
    );

    const sheets = sheetsRes.rows.map(row => this.mapSheet(row));

    return {
      ...proposal,
      sheets
    };
  }

  async findAll(filter: ProposalFilterParams): Promise<{ proposals: Proposal[]; total: number }> {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    conditions.push(`organization_id = $${idx++}`);
    values.push(filter.organizationId);

    if (filter.status) {
      conditions.push(`status = $${idx++}`);
      values.push(filter.status);
    }

    if (filter.search) {
      conditions.push(`title ILIKE $${idx++}`);
      values.push(`%${filter.search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total count
    const countRes = await this.pool.query(
      `SELECT COUNT(*) as count FROM proposals ${whereClause};`,
      values
    );
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    // Pagination
    const limit = filter.limit || 20;
    const offset = filter.offset || 0;
    values.push(limit);
    const limitIdx = idx++;
    values.push(offset);
    const offsetIdx = idx++;

    const listRes = await this.pool.query(
      `SELECT * FROM proposals ${whereClause} ORDER BY updated_at DESC, created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx};`,
      values
    );

    const proposals = listRes.rows.map(row => this.mapProposal(row));

    return { proposals, total };
  }

  async update(id: string, organizationId: string, params: UpdateProposalParams): Promise<Proposal | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (params.title !== undefined) {
      fields.push(`title = $${idx++}`);
      values.push(params.title);
    }
    if (params.version !== undefined) {
      fields.push(`version = $${idx++}`);
      values.push(params.version);
    }
    if (params.status !== undefined) {
      fields.push(`status = $${idx++}`);
      values.push(params.status);
    }
    if (params.totalCost !== undefined) {
      fields.push(`total_cost = $${idx++}`);
      values.push(params.totalCost);
    }
    if (params.currency !== undefined) {
      fields.push(`currency = $${idx++}`);
      values.push(params.currency);
    }
    if (params.estimatedTimelineWeeks !== undefined) {
      fields.push(`estimated_timeline_weeks = $${idx++}`);
      values.push(params.estimatedTimelineWeeks);
    }
    if (params.exportExcelUrl !== undefined) {
      fields.push(`export_excel_url = $${idx++}`);
      values.push(params.exportExcelUrl);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id, organizationId);

    const res = await this.pool.query(
      `UPDATE proposals
       SET ${fields.join(', ')}
       WHERE id = $${idx} AND organization_id = $${idx + 1}
       RETURNING *;`,
      values
    );

    return res.rows[0] ? this.mapProposal(res.rows[0]) : null;
  }

  async updateStatus(
    id: string,
    organizationId: string,
    actorId: string,
    status: Proposal['status'],
    allowedCurrentStatuses: Proposal['status'][]
  ): Promise<Proposal | null> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `UPDATE proposals SET status = $3, updated_at = NOW()
         WHERE id = $1 AND organization_id = $2 AND status = ANY($4::varchar[])
         RETURNING *;`,
        [id, organizationId, status, allowedCurrentStatuses]
      );
      if (!result.rows[0]) {
        await client.query('ROLLBACK');
        return null;
      }
      await client.query(
        `INSERT INTO audit_logs (organization_id, user_id, action, entity_type, entity_id, payload)
         VALUES ($1, $2, 'PROPOSAL_STATUS_CHANGED', 'proposal', $3, $4::jsonb);`,
        [organizationId, actorId, id, JSON.stringify({ status })]
      );
      await client.query('COMMIT');
      return this.mapProposal(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async submitForReview(id: string, organizationId: string, actorId: string): Promise<Proposal | null> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        "UPDATE proposals SET status = 'IN_REVIEW', updated_at = NOW() WHERE id = $1 AND organization_id = $2 AND status = 'DRAFT' RETURNING *;",
        [id, organizationId]
      );
      if (!result.rows[0]) { await client.query('ROLLBACK'); return null; }
      await client.query(
        `INSERT INTO audit_logs (organization_id, user_id, action, entity_type, entity_id, payload)
         VALUES ($1, $2, 'PROPOSAL_SUBMITTED_FOR_REVIEW', 'proposal', $3, $4::jsonb);`,
        [organizationId, actorId, id, JSON.stringify({ from: 'DRAFT', to: 'IN_REVIEW' })]
      );
      await client.query('COMMIT');
      return this.mapProposal(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }

  async updateSheet(
    proposalId: string,
    organizationId: string,
    sheetName: string,
    sheetOrder: number,
    sheetData: Record<string, any>,
    aiGenerated: boolean = false
  ): Promise<ProposalSheet | null> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const owned = await client.query(
        "SELECT 1 FROM proposals WHERE id = $1 AND organization_id = $2 AND status = 'DRAFT' FOR UPDATE;",
        [proposalId, organizationId]
      );
      if (!owned.rows[0]) { await client.query('ROLLBACK'); return null; }
      const res = await client.query(
        `INSERT INTO proposal_sheets (proposal_id, sheet_name, sheet_order, sheet_data, ai_generated, updated_at)
         VALUES ($1::uuid, $2::varchar, $3::integer, $4::jsonb, $5::boolean, NOW())
         ON CONFLICT (proposal_id, sheet_name)
         DO UPDATE SET sheet_data = EXCLUDED.sheet_data, ai_generated = EXCLUDED.ai_generated, updated_at = NOW()
         RETURNING *;`,
        [proposalId, sheetName, sheetOrder, JSON.stringify(sheetData), aiGenerated]
      );
      if (sheetName === 'Pricing & Quotation' && typeof sheetData.grandTotal === 'number') {
        await client.query(
          'UPDATE proposals SET total_cost = $3, updated_at = NOW() WHERE id = $1 AND organization_id = $2;',
          [proposalId, organizationId, sheetData.grandTotal]
        );
      }
      if (sheetName === 'Timeline & Milestones' && typeof sheetData.totalWeeks === 'number') {
        await client.query(
          'UPDATE proposals SET estimated_timeline_weeks = $3, updated_at = NOW() WHERE id = $1 AND organization_id = $2;',
          [proposalId, organizationId, sheetData.totalWeeks]
        );
      }
      await client.query('UPDATE proposals SET updated_at = NOW() WHERE id = $1 AND organization_id = $2;', [proposalId, organizationId]);
      await client.query('COMMIT');
      return this.mapSheet(res.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }

  async delete(id: string, organizationId: string): Promise<boolean> {
    const res = await this.pool.query(
      `DELETE FROM proposals WHERE id = $1 AND organization_id = $2 RETURNING id;`,
      [id, organizationId]
    );
    return res.rows.length > 0;
  }

  private mapProposal(row: any): Proposal {
    return {
      id: row.id,
      organizationId: row.organization_id,
      leadId: row.lead_id,
      createdBy: row.created_by,
      title: row.title,
      version: row.version,
      status: row.status,
      totalCost: row.total_cost !== null && row.total_cost !== undefined ? parseFloat(row.total_cost) : null,
      currency: row.currency || 'USD',
      estimatedTimelineWeeks: row.estimated_timeline_weeks,
      exportExcelUrl: row.export_excel_url,
      createdAt: row.created_at ? new Date(row.created_at) : undefined,
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined
    };
  }

  private mapSheet(row: any): ProposalSheet {
    let parsedData = row.sheet_data;
    if (typeof parsedData === 'string') {
      try {
        parsedData = JSON.parse(parsedData);
      } catch {
        parsedData = {};
      }
    }
    return {
      id: row.id,
      proposalId: row.proposal_id,
      sheetName: row.sheet_name,
      sheetOrder: row.sheet_order,
      sheetData: parsedData || {},
      aiGenerated: !!row.ai_generated,
      createdAt: row.created_at ? new Date(row.created_at) : undefined,
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined
    };
  }
}
