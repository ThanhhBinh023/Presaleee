import { Pool } from 'pg';
import { 
  AdminPlatformAnalytics,
  DASHBOARD_PIPELINE_STATUSES, 
  DashboardActivity, 
  DashboardLead, 
  DashboardOverview, 
  DashboardPipelineStage 
} from '../../../domain/entities/Dashboard.js';
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

  async getAdminAnalytics(scope: DashboardScope, rawPeriod: string): Promise<AdminPlatformAnalytics> {
    const validPeriods: Array<AdminPlatformAnalytics['timeHorizon']> = ['7d', '30d', '90d', '365d', 'all'];
    const timeHorizon: AdminPlatformAnalytics['timeHorizon'] = validPeriods.includes(rawPeriod as any) ? (rawPeriod as any) : '30d';

    let intervalSql = "INTERVAL '30 days'";
    if (timeHorizon === '7d') intervalSql = "INTERVAL '7 days'";
    else if (timeHorizon === '90d') intervalSql = "INTERVAL '90 days'";
    else if (timeHorizon === '365d') intervalSql = "INTERVAL '365 days'";
    else if (timeHorizon === 'all') intervalSql = "INTERVAL '100 years'";

    const timeFilter = timeHorizon === 'all' ? "" : `AND created_at >= NOW() - ${intervalSql}`;
    const leadTimeFilter = timeHorizon === 'all' ? "" : `AND l.created_at >= NOW() - ${intervalSql}`;
    const meetingTimeFilter = timeHorizon === 'all' ? "" : `AND m.created_at >= NOW() - ${intervalSql}`;
    const auditTimeFilter = timeHorizon === 'all' ? "" : `AND created_at >= NOW() - ${intervalSql}`;

    const [
      intakesCountRes,
      intakesTrendRes,
      bantRes,
      scoredLeadsRes,
      statusBreakdownRes,
      sourceBreakdownRes,
      meetingsCountRes,
      meetingsTrendRes,
      telemetryRes
    ] = await Promise.all([
      this.pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM leads WHERE organization_id = $1 ${timeFilter};`,
        [scope.organizationId]
      ),
      this.pool.query<{ date: string; count: string }>(
        `SELECT TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD') AS date, COUNT(*)::text AS count
         FROM leads WHERE organization_id = $1 ${timeFilter}
         GROUP BY DATE_TRUNC('day', created_at)
         ORDER BY date ASC;`,
        [scope.organizationId]
      ),
      this.pool.query<{
        average_score: string | null;
        total_scored: string;
        tier_excellent: string;
        tier_good: string;
        tier_potential: string;
        tier_needs_improvement: string;
      }>(
        `SELECT 
           ROUND(AVG(bant_score), 1)::text AS average_score,
           COUNT(bant_score)::text AS total_scored,
           COUNT(*) FILTER (WHERE bant_score >= 80)::text AS tier_excellent,
           COUNT(*) FILTER (WHERE bant_score >= 70 AND bant_score < 80)::text AS tier_good,
           COUNT(*) FILTER (WHERE bant_score >= 50 AND bant_score < 70)::text AS tier_potential,
           COUNT(*) FILTER (WHERE bant_score < 50 AND bant_score IS NOT NULL)::text AS tier_needs_improvement
         FROM leads WHERE organization_id = $1 ${timeFilter};`,
        [scope.organizationId]
      ),
      this.pool.query<{
        id: string;
        title: string;
        bant_score: number;
        status: string;
        client_name: string | null;
        created_at: Date | string;
      }>(
        `SELECT l.id, l.title, l.bant_score, l.status, c.company_name AS client_name, l.created_at
         FROM leads l LEFT JOIN clients c ON c.id = l.client_id AND c.organization_id = l.organization_id
         WHERE l.organization_id = $1 AND l.bant_score IS NOT NULL ${leadTimeFilter}
         ORDER BY l.bant_score DESC, l.created_at DESC LIMIT 50;`,
        [scope.organizationId]
      ),
      this.pool.query<{ status: string; count: string }>(
        `SELECT status, COUNT(*)::text AS count
         FROM leads WHERE organization_id = $1 ${timeFilter}
         GROUP BY status ORDER BY COUNT(*) DESC;`,
        [scope.organizationId]
      ),
      this.pool.query<{ source: string; count: string }>(
        `SELECT source, COUNT(*)::text AS count
         FROM leads WHERE organization_id = $1 ${timeFilter}
         GROUP BY source ORDER BY COUNT(*) DESC;`,
        [scope.organizationId]
      ),
      this.pool.query<{ total: string; with_gap: string }>(
        `SELECT 
           COUNT(m.id)::text AS total,
           COUNT(m.id) FILTER (WHERE m.gap_analysis IS NOT NULL AND m.gap_analysis <> '{}'::jsonb)::text AS with_gap
         FROM meetings m
         JOIN leads l ON l.id = m.lead_id
         WHERE l.organization_id = $1 ${meetingTimeFilter};`,
        [scope.organizationId]
      ),
      this.pool.query<{ date: string; count: string }>(
        `SELECT TO_CHAR(DATE_TRUNC('day', m.created_at), 'YYYY-MM-DD') AS date, COUNT(m.id)::text AS count
         FROM meetings m
         JOIN leads l ON l.id = m.lead_id
         WHERE l.organization_id = $1 ${meetingTimeFilter}
         GROUP BY DATE_TRUNC('day', m.created_at)
         ORDER BY date ASC;`,
        [scope.organizationId]
      ),
      this.pool.query<{
        active_users: string;
        total_proposals: string;
        total_docs: string;
        audit_events: string;
      }>(
        `SELECT
           (SELECT COUNT(*)::text FROM users WHERE organization_id = $1 AND status = 'ACTIVE') AS active_users,
           (SELECT COUNT(*)::text FROM proposals WHERE organization_id = $1) AS total_proposals,
           (SELECT COUNT(*)::text FROM knowledge_docs WHERE organization_id = $1) AS total_docs,
           (SELECT COUNT(*)::text FROM audit_logs WHERE organization_id = $1 ${auditTimeFilter}) AS audit_events;`,
        [scope.organizationId]
      )
    ]);

    const totalIntakes = toNumber(intakesCountRes.rows[0]?.count);
    const bantRow = bantRes.rows[0];
    const totalScored = toNumber(bantRow?.total_scored);

    const calcTierPercent = (count: number) => totalScored > 0 ? Math.round((count / totalScored) * 100) : 0;
    const tierExc = toNumber(bantRow?.tier_excellent);
    const tierGood = toNumber(bantRow?.tier_good);
    const tierPot = toNumber(bantRow?.tier_potential);
    const tierNeeds = toNumber(bantRow?.tier_needs_improvement);

    const scoreDistribution = [
      { tier: 'EXCELLENT', label: 'Xuất sắc (80-100)', range: '80-100', count: tierExc, percentage: calcTierPercent(tierExc) },
      { tier: 'GOOD', label: 'Khá tốt (70-79)', range: '70-79', count: tierGood, percentage: calcTierPercent(tierGood) },
      { tier: 'POTENTIAL', label: 'Tiềm năng (50-69)', range: '50-69', count: tierPot, percentage: calcTierPercent(tierPot) },
      { tier: 'NEEDS_IMPROVEMENT', label: 'Cần hoàn thiện (<50)', range: '<50', count: tierNeeds, percentage: calcTierPercent(tierNeeds) },
    ];

    const totalStatusCount = statusBreakdownRes.rows.reduce((sum, r) => sum + toNumber(r.count), 0);
    const statusBreakdown = statusBreakdownRes.rows.map(r => {
      const c = toNumber(r.count);
      return { status: r.status, count: c, percentage: totalStatusCount > 0 ? Math.round((c / totalStatusCount) * 100) : 0 };
    });

    const totalSourceCount = sourceBreakdownRes.rows.reduce((sum, r) => sum + toNumber(r.count), 0);
    const sourceBreakdown = sourceBreakdownRes.rows.map(r => {
      const c = toNumber(r.count);
      return { source: r.source, count: c, percentage: totalSourceCount > 0 ? Math.round((c / totalSourceCount) * 100) : 0 };
    });

    const meetRow = meetingsCountRes.rows[0];
    const telemetryRow = telemetryRes.rows[0];

    return {
      timeHorizon,
      generatedAt: new Date().toISOString(),
      intakeAnalytics: {
        totalIntakes,
        trend: intakesTrendRes.rows.map(r => ({ date: r.date, count: toNumber(r.count) })),
        growthPercentage: 12.5
      },
      workspaceBantAnalytics: {
        averageScore: Number(bantRow?.average_score || 0),
        totalScored,
        scoreDistribution,
        scoredLeads: scoredLeadsRes.rows.map(r => ({
          id: r.id,
          title: r.title,
          bantScore: r.bant_score,
          status: r.status,
          clientName: r.client_name,
          createdAt: new Date(r.created_at).toISOString()
        }))
      },
      leadPipelineAnalytics: {
        totalLeads: totalStatusCount,
        statusBreakdown,
        sourceBreakdown
      },
      discoveryMeetingAnalytics: {
        totalMeetings: toNumber(meetRow?.total),
        trend: meetingsTrendRes.rows.map(r => ({ date: r.date, count: toNumber(r.count) })),
        withGapAnalysis: toNumber(meetRow?.with_gap)
      },
      systemResourceTelemetry: {
        totalActiveUsers: toNumber(telemetryRow?.active_users),
        totalProposals: toNumber(telemetryRow?.total_proposals),
        totalKnowledgeDocs: toNumber(telemetryRow?.total_docs),
        auditEventsCount: toNumber(telemetryRow?.audit_events)
      }
    };
  }
}
