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
          params.totalCost || null,
          params.currency || 'USD',
          params.estimatedTimelineWeeks || null
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

  async findById(id: string): Promise<ProposalWithSheets | null> {
    const proposalRes = await this.pool.query(
      `SELECT * FROM proposals WHERE id = $1;`,
      [id]
    );

    if (proposalRes.rows.length === 0) {
      return null;
    }

    const proposal = this.mapProposal(proposalRes.rows[0]);

    const sheetsRes = await this.pool.query(
      `SELECT * FROM proposal_sheets WHERE proposal_id = $1 ORDER BY sheet_order ASC;`,
      [id]
    );

    const sheets = sheetsRes.rows.map(row => this.mapSheet(row));

    return {
      ...proposal,
      sheets
    };
  }

  async findAll(filter: ProposalFilterParams = {}): Promise<{ proposals: Proposal[]; total: number }> {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (filter.organizationId) {
      conditions.push(`organization_id = $${idx++}`);
      values.push(filter.organizationId);
    }

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

  async update(id: string, params: UpdateProposalParams): Promise<Proposal> {
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
    values.push(id);

    const res = await this.pool.query(
      `UPDATE proposals
       SET ${fields.join(', ')}
       WHERE id = $${idx}
       RETURNING *;`,
      values
    );

    return this.mapProposal(res.rows[0]);
  }

  async updateSheet(
    proposalId: string,
    sheetName: string,
    sheetData: Record<string, any>,
    aiGenerated: boolean = false
  ): Promise<ProposalSheet> {
    const res = await this.pool.query(
      `INSERT INTO proposal_sheets (proposal_id, sheet_name, sheet_order, sheet_data, ai_generated, updated_at)
       VALUES ($1::uuid, $2::varchar, 
         COALESCE((SELECT sheet_order FROM proposal_sheets WHERE proposal_id = $1::uuid AND sheet_name = $2::varchar), 1),
         $3::jsonb, $4::boolean, NOW())
       ON CONFLICT (proposal_id, sheet_name)
       DO UPDATE SET
         sheet_data = EXCLUDED.sheet_data,
         ai_generated = EXCLUDED.ai_generated,
         updated_at = NOW()
       RETURNING *;`,
      [proposalId, sheetName, JSON.stringify(sheetData), aiGenerated]
    );

    // Also update parent proposal updated_at
    await this.pool.query(
      `UPDATE proposals SET updated_at = NOW() WHERE id = $1;`,
      [proposalId]
    );

    return this.mapSheet(res.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const res = await this.pool.query(
      `DELETE FROM proposals WHERE id = $1 RETURNING id;`,
      [id]
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
