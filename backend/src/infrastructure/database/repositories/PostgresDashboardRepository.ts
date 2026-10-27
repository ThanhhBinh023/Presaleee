import { Pool } from 'pg';
import { DASHBOARD_PIPELINE_STATUSES, DashboardActivity, DashboardLead, DashboardOverview, DashboardPipelineStage } from '../../../domain/entities/Dashboard.js';
import { IDashboardRepository, DashboardScope } from '../../../domain/repositories/IDashboardRepository.js';

interface CountRow { total: string; active: string; qualified: string; proposals_in_progress: string; }
interface StageCountRow { status: DashboardPipelineStage['status']; count: string; }
interface ValueRow { currency: string; amount: string | null; }
interface PipelineRow { status: DashboardPipelineStage['status']; currency: string | null; amount: string | null; }
interface LeadRow {
  id: string; title: string; source: string; status: DashboardLead['status']; bant_score: number | null;
  client_name: string | null; assigned_to: string | null; created_at: Date | string; updated_at: Date | string;
}
interface ActivityRow {
  id: string; type: DashboardActivity['type']; entity_id: string; title: string; status: string; occurred_at: Date | string;
}

function toNumber(value: string | null | undefined): number {
  const result = Number(value || 0);
  return Number.isFinite(result) ? result : 0;
}

function mapLead(row: LeadRow): DashboardLead {
  return {
    id: row.id, title: row.title, source: row.source, status: row.status,
    bantScore: row.bant_score, clientName: row.client_name, assignedTo: row.assigned_to,
    createdAt: new Date(row.created_at).toISOString(), updatedAt: new Date(row.updated_at).toISOString()
  };
}

export class PostgresDashboardRepository implements IDashboardRepository {
  constructor(private readonly pool: Pool) {}

  async getOverview(scope: DashboardScope, leadLimit: number): Promise<DashboardOverview> {
    const [counts, valueRows, stageCountRows, pipelineRows, activeLeads] = await Promise.all([
      this.pool.query<CountRow>(
        `SELECT COUNT(*)::text AS total,
           COUNT(*) FILTER (WHERE status NOT IN ('WON', 'LOST', 'REJECTED'))::text AS active,
           COUNT(*) FILTER (WHERE status IN ('QUALIFIED', 'PROPOSAL_DRAFTING', 'APPROVED'))::text AS qualified,
           (SELECT COUNT(*) FROM proposals p WHERE p.organization_id = $1 AND p.status IN ('DRAFT', 'IN_REVIEW'))::text AS proposals_in_progress
         FROM leads WHERE organization_id = $1;`,
        [scope.organizationId]
      ),
      this.pool.query<ValueRow>(
        `SELECT currency, SUM(total_cost)::text AS amount FROM proposals
         WHERE organization_id = $1 AND status NOT IN ('REJECTED') AND total_cost IS NOT NULL
         GROUP BY currency ORDER BY currency;`,
        [scope.organizationId]
      ),
      this.pool.query<StageCountRow>(
        `SELECT status, COUNT(*)::text AS count FROM leads
         WHERE organization_id = $1 GROUP BY status;`,
        [scope.organizationId]
      ),
      this.pool.query<PipelineRow>(
        `SELECT l.status, p.currency, SUM(p.total_cost)::text AS amount
         FROM leads l
         JOIN proposals p ON p.lead_id = l.id AND p.organization_id = l.organization_id AND p.status <> 'REJECTED'
         WHERE l.organization_id = $1
         GROUP BY l.status, p.currency ORDER BY l.status, p.currency;`,
        [scope.organizationId]
      ),
      this.listLeads(scope, leadLimit)
    ]);

    const totals = counts.rows[0];
    const pipelineMap = new Map(DASHBOARD_PIPELINE_STATUSES.map(status => [status, {
      status,
      count: 0,
      estimatedValueByCurrency: [] as Array<{ currency: string; amount: number }>
    }]));
    for (const row of stageCountRows.rows) {
      const stage = pipelineMap.get(row.status);
      if (stage) stage.count = toNumber(row.count);
    }
    for (const row of pipelineRows.rows) {
      const stage = pipelineMap.get(row.status);
      if (!stage || !row.currency) continue;
      stage.estimatedValueByCurrency.push({ currency: row.currency, amount: toNumber(row.amount) });
    }
    const valueByCurrency = valueRows.rows.map(row => ({ currency: row.currency || 'USD', amount: toNumber(row.amount) }));
    const pipeline = Array.from(pipelineMap.values());

    return {
      kpis: {
        totalLeads: toNumber(totals?.total),
        activeLeads: toNumber(totals?.active),
        qualifiedLeads: toNumber(totals?.qualified),
        proposalsInProgress: toNumber(totals?.proposals_in_progress),
        estimatedValueByCurrency: valueByCurrency
      },
      pipeline,
      activeLeads,
      generatedAt: new Date().toISOString()
    };
  }

  async listLeads(scope: DashboardScope, limit: number): Promise<DashboardLead[]> {
    const result = await this.pool.query<LeadRow>(
      `SELECT l.id, l.title, l.source, l.status, l.bant_score, c.company_name AS client_name,
         l.assigned_to, l.created_at, l.updated_at
       FROM leads l LEFT JOIN clients c ON c.id = l.client_id AND c.organization_id = l.organization_id
       WHERE l.organization_id = $1 AND l.status NOT IN ('WON', 'LOST', 'REJECTED')
       ORDER BY l.updated_at DESC, l.created_at DESC LIMIT $2;`,
      [scope.organizationId, limit]
    );
    return result.rows.map(mapLead);
  }

  async listActivity(scope: DashboardScope, limit: number): Promise<DashboardActivity[]> {
    const result = await this.pool.query<ActivityRow>(
      `WITH activity AS (
         SELECT id::text || ':created' AS id, 'LEAD_CREATED' AS type, id AS entity_id,
           title, status, created_at AS occurred_at FROM leads WHERE organization_id = $1
         UNION ALL
         SELECT id::text || ':updated' AS id, 'LEAD_UPDATED' AS type, id AS entity_id,
           title, status, updated_at AS occurred_at FROM leads
           WHERE organization_id = $1 AND updated_at > created_at + INTERVAL '1 second'
         UNION ALL
         SELECT id::text || ':created' AS id, 'PROPOSAL_CREATED' AS type, id AS entity_id,
           title, status, created_at AS occurred_at FROM proposals WHERE organization_id = $1
         UNION ALL
         SELECT id::text || ':updated' AS id, 'PROPOSAL_UPDATED' AS type, id AS entity_id,
           title, status, updated_at AS occurred_at FROM proposals
           WHERE organization_id = $1 AND updated_at > created_at + INTERVAL '1 second'
       )
       SELECT id, type, entity_id, title, status, occurred_at FROM activity
       ORDER BY occurred_at DESC LIMIT $2;`,
      [scope.organizationId, limit]
    );
    return result.rows.map(row => ({
      id: row.id, type: row.type, entityId: row.entity_id, title: row.title,
      status: row.status, occurredAt: new Date(row.occurred_at).toISOString()
    }));
  }
}
