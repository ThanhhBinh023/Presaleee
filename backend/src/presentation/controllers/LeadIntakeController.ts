import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { AnalyzeLeadIntakeUseCase } from '../../application/use-cases/AnalyzeLeadIntakeUseCase.js';
import { AnalyzeLeadIntakeInputDTO } from '../../application/dtos/AnalyzeLeadIntakeDTO.js';
import {
  CreateLeadUseCase,
  QualifyLeadUseCase,
  ListLeadsUseCase,
  GetLeadUseCase,
  UpdateLeadUseCase,
  UpdateLeadStatusUseCase,
  DeleteLeadUseCase,
  GetLatestQualificationUseCase
} from '../../application/use-cases/LeadUseCases.js';
import { AuthenticatedLeadScope, LeadWriteInput } from '../../application/dtos/LeadDTO.js';
import { LeadSource, LeadStatus } from '../../domain/entities/Lead.js';
import { IAuditRepository } from '../../domain/repositories/IAuditRepository.js';
import { UnauthorizedError, ValidationError } from '../../domain/errors/AppError.js';

function routeParam(req: Pick<Request, 'params'>, name: string): string {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] || '' : value || '';
}

/** Query-string filters arrive as strings and are re-validated by ListLeadsUseCase. */
function leadListFilters(query: Record<string, unknown>): {
  page?: string;
  limit?: string;
  status?: LeadStatus;
  source?: LeadSource;
  assignedTo?: string;
  clientId?: string;
  search?: string;
} {
  const text = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);
  return {
    page: text(query.page),
    limit: text(query.limit),
    status: text(query.status) as LeadStatus | undefined,
    source: text(query.source) as LeadSource | undefined,
    assignedTo: text(query.assignedTo),
    clientId: text(query.clientId),
    search: text(query.search)
  };
}

export class LeadIntakeController {
  constructor(
    private readonly analyzeUseCase: AnalyzeLeadIntakeUseCase,
    private readonly createLeadUseCase: CreateLeadUseCase,
    private readonly qualifyLeadUseCase: QualifyLeadUseCase,
    private readonly listLeadsUseCase: ListLeadsUseCase,
    private readonly getLeadUseCase: GetLeadUseCase,
    private readonly updateLeadUseCase: UpdateLeadUseCase,
    private readonly updateLeadStatusUseCase: UpdateLeadStatusUseCase,
    private readonly deleteLeadUseCase: DeleteLeadUseCase,
    private readonly getLatestQualificationUseCase: GetLatestQualificationUseCase,
    private readonly dbPool?: Pool,
    private readonly auditRepository?: IAuditRepository
  ) {}

  /** These handlers write SQL directly instead of through a use case, so they must log the write themselves. */
  private async recordLeadAudit(
    req: Pick<Request, 'auth' | 'socket'>,
    action: string,
    entityId: string | null,
    payload: Record<string, unknown>
  ): Promise<void> {
    if (!this.auditRepository || !req.auth?.organizationId) return;
    await this.auditRepository.record({
      organizationId: req.auth.organizationId,
      actorId: req.auth.sub,
      action,
      entityType: 'lead',
      entityId,
      payload,
      ipAddress: req.socket.remoteAddress ?? null
    });
  }

  private leadScope(req: Pick<Request, 'auth' | 'socket'>): AuthenticatedLeadScope {
    if (!req.auth?.sub) throw new UnauthorizedError('Authentication required.');
    if (!req.auth.organizationId) throw new ValidationError('An authenticated organization is required.');
    return {
      organizationId: req.auth.organizationId,
      userId: req.auth.sub,
      claims: req.auth,
      ipAddress: req.socket.remoteAddress
    };
  }

  createLead = async (
    req: Request<unknown, unknown, LeadWriteInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const body = req.body ?? ({} as LeadWriteInput);
      const lead = await this.createLeadUseCase.execute({
        ...this.leadScope(req),
        title: body.title,
        source: body.source,
        rawRfpContent: body.rawRfpContent,
        extractedMetadata: body.extractedMetadata,
        clientId: body.clientId,
        assignedTo: body.assignedTo
      });
      res.status(201).location(`/api/v1/leads/${lead.id}`).json({ success: true, data: lead });
    } catch (error) {
      console.error('[LeadIntakeController.createLead] Error:', error);
      next(error);
    }
  };

  /** The only qualification producer: both routes below point here so one lead can never get two shapes. */
  qualify = async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await this.qualifyLeadUseCase.execute(req.params.id, this.leadScope(req));
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      console.error('[LeadIntakeController.qualify] Error:', error);
      next(error);
    }
  };

  analyze = async (
    req: Request<unknown, unknown, AnalyzeLeadIntakeInputDTO & { persist?: boolean; inquiryText?: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const body = req.body ?? ({} as any);
      const rawRfpContent: string = (body.rawRfpContent || body.inquiryText || '').trim();
      const { source = 'INBOUND_EMAIL', persist = false } = body;
      const result = await this.analyzeUseCase.execute({ rawRfpContent, source });

      let savedLead = null;
      if (persist && this.dbPool) {
        const titleToUse = result.draft.title || 'New Presale Project';
        const metadataToSave = {
          ...result.draft.extractedMetadata,
          missing_information: result.missingInformation,
          target_sla: (result.draft.extractedMetadata as any).targetSla || '< 50ms Latency',
          peak_workload: (result.draft.extractedMetadata as any).peakWorkload || '40,000+ TPS'
        };

        const orgId = req.auth?.organizationId || null;
        const userId = req.auth?.sub || null;

        const insertRes = await this.dbPool.query(
          `INSERT INTO leads (title, source, status, raw_rfp_content, extracted_metadata, organization_id, created_by)
           VALUES ($1, $2, 'NEW', $3, $4::jsonb, $5, $6)
           RETURNING id, title, source, status, raw_rfp_content, extracted_metadata, organization_id, created_by, created_at;`,
          [titleToUse, source, rawRfpContent, JSON.stringify(metadataToSave), orgId, userId]
        );
        savedLead = insertRes.rows[0];
        await this.recordLeadAudit(req, 'LEAD_CREATED', savedLead?.id ?? null, { title: titleToUse, source, via: 'intake_analyze_persist' });
      }

      res.status(200).json({
        success: true,
        data: {
          ...result,
          lead: savedLead || result.draft
        },
        meta: {
          persisted: !!savedLead,
          message: savedLead ? 'Lead analyzed and successfully saved to workspace.' : 'Unsaved lead draft.'
        }
      });
    } catch (error) {
      console.error('[LeadIntakeController.analyze] Error:', error);
      next(error);
    }
  };

  listLeads = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.listLeadsUseCase.execute({
        ...this.leadScope(req),
        ...leadListFilters(req.query as Record<string, unknown>)
      });
      res.status(200).json({
        success: true,
        data: result.leads,
        meta: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages }
      });
    } catch (error) {
      console.error('[LeadIntakeController.listLeads] Error:', error);
      next(error);
    }
  };

  getLeadById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const lead = await this.getLeadUseCase.execute(routeParam(req, 'id'), this.leadScope(req).organizationId);
      res.status(200).json({ success: true, data: lead });
    } catch (error) {
      console.error('[LeadIntakeController.getLeadById] Error:', error);
      next(error);
    }
  };

  /** PUT is kept as an alias of PATCH so both verbs share exactly one implementation. */
  updateLead = async (
    req: Request<{ id: string }, unknown, Partial<LeadWriteInput> & { status?: unknown }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const body = req.body ?? {};
      const lead = await this.updateLeadUseCase.execute({
        ...this.leadScope(req),
        id: routeParam(req, 'id'),
        title: body.title,
        source: body.source,
        rawRfpContent: body.rawRfpContent,
        extractedMetadata: body.extractedMetadata,
        clientId: body.clientId,
        assignedTo: body.assignedTo,
        status: body.status as LeadStatus | undefined
      });
      res.status(200).json({ success: true, data: lead });
    } catch (error) {
      console.error('[LeadIntakeController.updateLead] Error:', error);
      next(error);
    }
  };

  changeStatus = async (
    req: Request<{ id: string }, unknown, { status?: unknown }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const lead = await this.updateLeadStatusUseCase.execute(
        routeParam(req, 'id'),
        this.leadScope(req),
        req.body?.status
      );
      res.status(200).json({ success: true, data: lead });
    } catch (error) {
      console.error('[LeadIntakeController.changeStatus] Error:', error);
      next(error);
    }
  };

  latestQualification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const qualification = await this.getLatestQualificationUseCase.execute(
        routeParam(req, 'id'),
        this.leadScope(req).organizationId
      );
      res.status(200).json({ success: true, data: qualification });
    } catch (error) {
      console.error('[LeadIntakeController.latestQualification] Error:', error);
      next(error);
    }
  };

  deleteLead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const leadId = routeParam(req, 'id');
      await this.deleteLeadUseCase.execute(leadId, this.leadScope(req));
      res.status(200).json({
        success: true,
        message: 'Lead deleted successfully.',
        data: { id: leadId }
      });
    } catch (error) {
      console.error('[LeadIntakeController.deleteLead] Error:', error);
      next(error);
    }
  };
}
