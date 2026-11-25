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
import { UnauthorizedError, ValidationError, ForbiddenError, NotFoundError } from '../../domain/errors/AppError.js';

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
      const scope = this.leadScope(req);
      if (scope.claims?.role === 'ADMIN') {
        throw new ForbiddenError('Quản trị viên hệ thống (Admin) không có quyền khởi tạo dự án thay cho người dùng. Quy trình khởi tạo dự án do người dùng nghiệp vụ (Sales / Presale) đảm nhận.');
      }

      const body = req.body ?? ({} as LeadWriteInput);
      const lead = await this.createLeadUseCase.execute({
        ...scope,
        title: body.title,
        source: body.source,
        rawRfpContent: body.rawRfpContent,
        extractedMetadata: body.extractedMetadata,
        clientId: body.clientId,
        assignedTo: body.assignedTo
      });

      // Tự động phân quyền: Người khởi tạo dự án trở thành PRESALE_LEAD của dự án đó (Theo kế hoạch PBAC)
      if (this.dbPool && scope.userId) {
        try {
          await this.dbPool.query(`
            INSERT INTO project_memberships (project_id, user_id, project_role)
            VALUES ($1, $2, 'PRESALE_LEAD')
            ON CONFLICT (project_id, user_id) DO NOTHING;
          `, [lead.id, scope.userId]);
        } catch (memErr) {
          console.error('[LeadIntakeController.createLead] Failed to register project leader:', memErr);
        }
      }

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
      const scope = this.leadScope(req);
      const leadId = req.params.id;
      if (this.dbPool) {
        const checkRes = await this.dbPool.query(`
          SELECT project_role FROM project_memberships WHERE project_id = $1 AND user_id = $2;
        `, [leadId, scope.userId]);
        let projectRole = checkRes.rows[0]?.project_role;
        if (!projectRole) {
          const leadCheck = await this.dbPool.query(`
            SELECT created_by, assigned_to FROM leads WHERE id = $1;
          `, [leadId]);
          const leadRow = leadCheck.rows[0];
          if (leadRow?.created_by === scope.userId || leadRow?.assigned_to === scope.userId) {
            projectRole = 'PRESALE_LEAD';
          } else {
            projectRole = scope.claims?.role || 'VIEWER';
          }
        }
        if (projectRole === 'PRESALE_CONSULTANT') {
          throw new ForbiddenError('Chuyên viên tư vấn (PRESALE_CONSULTANT) không có quyền chạy thẩm định BANT. Chức năng này thuộc về SALES_REP hoặc PRESALE_LEAD.');
        }
        if (projectRole === 'VIEWER') {
          throw new ForbiddenError('Tài khoản Quan sát viên (VIEWER) không có quyền chạy thẩm định BANT.');
        }
      }
      const result = await this.qualifyLeadUseCase.execute(req.params.id, scope);
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
      if (persist) {
        if (req.auth?.role === 'ADMIN') {
          throw new ForbiddenError('Quản trị viên hệ thống (Admin) không có quyền khởi tạo dự án thay cho người dùng.');
        }
        if (this.dbPool) {
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

          // Tự động phân quyền: Người khởi tạo dự án trở thành PRESALE_LEAD của dự án đó (Theo kế hoạch PBAC)
          if (userId && savedLead?.id) {
            try {
              await this.dbPool.query(`
                INSERT INTO project_memberships (project_id, user_id, project_role)
                VALUES ($1, $2, 'PRESALE_LEAD')
                ON CONFLICT (project_id, user_id) DO UPDATE SET project_role = 'PRESALE_LEAD';
              `, [savedLead.id, userId]);
            } catch (memErr) {
              console.error('[LeadIntakeController.analyze] Failed to register project leader:', memErr);
            }
          }
        }
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
      const scope = this.leadScope(req);
      if (scope.claims?.role === 'ADMIN') {
        if (!this.dbPool) throw new Error('Database pool not available.');
        const memberLeadsRes = await this.dbPool.query(`
          SELECT project_id FROM project_memberships WHERE user_id = $1;
        `, [scope.userId]);
        const invitedProjectIds = memberLeadsRes.rows.map(r => r.project_id);
        if (invitedProjectIds.length === 0) {
          res.status(200).json({
            success: true,
            data: [],
            meta: { total: 0, page: 1, limit: 20, totalPages: 1 }
          });
          return;
        }
        const result = await this.listLeadsUseCase.execute({
          ...scope,
          ...leadListFilters(req.query as Record<string, unknown>)
        });
        const filteredLeads = result.leads.filter(l => invitedProjectIds.includes(l.id));
        res.status(200).json({
          success: true,
          data: filteredLeads,
          meta: { total: filteredLeads.length, page: 1, limit: result.limit, totalPages: 1 }
        });
        return;
      }

      const result = await this.listLeadsUseCase.execute({
        ...scope,
        ...leadListFilters(req.query as Record<string, unknown>)
      });

      // Attach dynamic project role for each lead (PBAC)
      let membershipMap: Record<string, string> = {};
      if (this.dbPool && scope.userId) {
        try {
          const memRes = await this.dbPool.query(`
            SELECT project_id, project_role FROM project_memberships WHERE user_id = $1;
          `, [scope.userId]);
          for (const row of memRes.rows) {
            membershipMap[row.project_id] = row.project_role;
          }
        } catch (e) {
          console.error('[LeadIntakeController.listLeads] Error reading memberships:', e);
        }
      }

      // Filter leads: user must be in project_memberships OR be creator/assignedTo
      const userLeads = result.leads.filter(lead => {
        if (membershipMap[lead.id]) return true;
        if (lead.createdBy === scope.userId || lead.assignedTo === scope.userId) return true;
        return false;
      });

      const leadsWithRole = userLeads.map(lead => {
        let myRoleInProject = membershipMap[lead.id];
        if (!myRoleInProject) {
          if (lead.createdBy === scope.userId || lead.assignedTo === scope.userId) {
            myRoleInProject = 'PRESALE_LEAD';
          } else {
            myRoleInProject = 'VIEWER';
          }
        }
        return {
          ...lead,
          myRoleInProject
        };
      });

      res.status(200).json({
        success: true,
        data: leadsWithRole,
        meta: { total: leadsWithRole.length, page: result.page, limit: result.limit, totalPages: result.totalPages }
      });
    } catch (error) {
      console.error('[LeadIntakeController.listLeads] Error:', error);
      next(error);
    }
  };

  getLeadById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const leadId = routeParam(req, 'id');
      const scope = this.leadScope(req);
      const lead = await this.getLeadUseCase.execute(leadId, scope.organizationId);

      let myRoleInProject: string = (scope.claims?.role || 'VIEWER');
      let projectMembers: any[] = [];

      if (this.dbPool) {
        const memRes = await this.dbPool.query(`
          SELECT pm.id, pm.user_id as "userId", pm.project_role as "projectRole", pm.created_at as "createdAt",
                 u.email, u.full_name as "fullName", u.avatar_url as "avatarUrl", u.role as "systemRole"
          FROM project_memberships pm
          JOIN users u ON u.id = pm.user_id
          WHERE pm.project_id = $1
          ORDER BY pm.created_at ASC;
        `, [leadId]);
        projectMembers = memRes.rows;

        const myMembership = projectMembers.find(m => m.userId === scope.userId);
        if (scope.claims?.role === 'ADMIN') {
          if (!myMembership) {
            throw new ForbiddenError('Tài khoản Quản trị hệ thống (System Admin) hoạt động tách biệt, không thể truy cập vào Lead Workspace của dự án nếu không được Leader dự án mời tham gia.');
          }
          myRoleInProject = myMembership.projectRole;
        } else if (myMembership) {
          myRoleInProject = myMembership.projectRole;
        } else if (lead.createdBy === scope.userId || lead.assignedTo === scope.userId) {
          myRoleInProject = 'PRESALE_LEAD';
          // Ensure auto-insert into project_memberships so subsequent actions find it
          if (scope.userId) {
            this.dbPool.query(`
              INSERT INTO project_memberships (project_id, user_id, project_role)
              VALUES ($1, $2, 'PRESALE_LEAD')
              ON CONFLICT (project_id, user_id) DO UPDATE SET project_role = 'PRESALE_LEAD';
            `, [leadId, scope.userId]).catch(() => {});
          }
        } else {
          throw new ForbiddenError('Bạn chưa được bổ nhiệm hoặc mời tham gia dự án này.');
        }
      }

      res.status(200).json({
        success: true,
        data: {
          ...lead,
          myRoleInProject,
          projectMembers
        }
      });
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
      const leadId = routeParam(req, 'id');
      const scope = this.leadScope(req);

      if (this.dbPool) {
        const checkRes = await this.dbPool.query(`
          SELECT project_role FROM project_memberships WHERE project_id = $1 AND user_id = $2;
        `, [leadId, scope.userId]);
        let projectRole = checkRes.rows[0]?.project_role;

        if (!projectRole) {
          const leadCheck = await this.dbPool.query(`
            SELECT created_by, assigned_to, status FROM leads WHERE id = $1;
          `, [leadId]);
          const leadRow = leadCheck.rows[0];
          if (leadRow?.created_by === scope.userId || leadRow?.assigned_to === scope.userId) {
            projectRole = 'PRESALE_LEAD';
          } else {
            projectRole = scope.claims?.role || 'VIEWER';
          }
        }

        if (scope.claims?.role === 'ADMIN' && projectRole === 'VIEWER') {
          throw new ForbiddenError('Tài khoản Quản trị hệ thống (System Admin) không thể chỉnh sửa dữ liệu dự án của các nhóm khác nếu không được Leader dự án mời tham gia với vai trò phù hợp.');
        }

        // SALES_REP cannot edit project SOW/intake or raw RFP
        if (projectRole === 'SALES_REP') {
          throw new ForbiddenError('Đại diện kinh doanh (SALES_REP) không có quyền chỉnh sửa thông tin kỹ thuật dự án (SOW / Raw RFP). Vai trò này chịu trách nhiệm tiếp nhận RFP, thẩm định BANT và khởi tạo Client Portal.');
        }

        if (projectRole === 'PRESALE_CONSULTANT') {
          throw new ForbiddenError('Chuyên viên tư vấn (PRESALE_CONSULTANT) không có quyền chỉnh sửa thông tin Intake gốc. Vai trò này tập trung vào soạn thảo, hoàn thiện 10 sheets Proposal.');
        }

        if (projectRole === 'VIEWER') {
          throw new ForbiddenError('Tài khoản Quan sát viên (VIEWER) ở chế độ chỉ đọc, không có quyền chỉnh sửa dự án.');
        }

        // Check if lead or proposal is completed / approved
        const statusRes = await this.dbPool.query(`
          SELECT l.status as lead_status, p.status as proposal_status
          FROM leads l
          LEFT JOIN proposals p ON p.lead_id = l.id
          WHERE l.id = $1
          LIMIT 1;
        `, [leadId]);
        const leadStatus = statusRes.rows[0]?.lead_status;
        const propStatus = statusRes.rows[0]?.proposal_status;

        if ((leadStatus === 'APPROVED' || leadStatus === 'WON' || propStatus === 'APPROVED' || propStatus === 'SENT_TO_CLIENT') && projectRole !== 'PRESALE_LEAD') {
          throw new ForbiddenError('Dự án đã được phê duyệt hoàn thành. Ngoại trừ Trưởng dự án (Presale Lead), không có vai trò nào được phép điều chỉnh.');
        }
      }

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

  /**
   * PBAC: Quản lý thành viên trong dự án (Project Memberships)
   */
  listMembers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const leadId = routeParam(req, 'id');
      const { organizationId } = this.leadScope(req);
      const lead = await this.getLeadUseCase.execute(leadId, organizationId);
      if (!lead) throw new NotFoundError('Lead not found.');

      if (this.dbPool) {
        const result = await this.dbPool.query(`
          SELECT pm.id, pm.user_id as "userId", pm.project_role as "projectRole", pm.created_at as "createdAt",
                 u.email, u.full_name as "fullName", u.avatar_url as "avatarUrl", u.role as "systemRole"
          FROM project_memberships pm
          JOIN users u ON u.id = pm.user_id
          WHERE pm.project_id = $1
          ORDER BY pm.created_at ASC;
        `, [leadId]);
        res.status(200).json({ success: true, data: result.rows });
      } else {
        res.status(200).json({ success: true, data: [] });
      }
    } catch (error) {
      console.error('[LeadIntakeController.listMembers] Error:', error);
      next(error);
    }
  };

  addMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const leadId = routeParam(req, 'id');
      const { organizationId, userId, claims } = this.leadScope(req);
      const { email, projectRole } = req.body ?? {};
      if (!email || !projectRole) throw new ValidationError('Email and projectRole are required.');

      const allowedRoles = ['PRESALE_LEAD', 'SALES_REP', 'PRESALE_CONSULTANT', 'VIEWER'];
      if (!allowedRoles.includes(projectRole)) {
        throw new ValidationError(`projectRole must be one of: ${allowedRoles.join(', ')}.`);
      }

      if (!this.dbPool) throw new Error('Database pool not available.');

      const callerRoleCheck = await this.dbPool.query(`
        SELECT project_role FROM project_memberships WHERE project_id = $1 AND user_id = $2;
      `, [leadId, userId]);
      let callerProjectRole = callerRoleCheck.rows[0]?.project_role;

      if (!callerProjectRole) {
        const leadCheck = await this.dbPool.query(`SELECT created_by, assigned_to FROM leads WHERE id = $1`, [leadId]);
        const leadRow = leadCheck.rows[0];
        if (leadRow && (!leadRow.created_by || leadRow.created_by === userId || leadRow.assigned_to === userId)) {
          callerProjectRole = 'PRESALE_LEAD';
          await this.dbPool.query(`
            INSERT INTO project_memberships (project_id, user_id, project_role)
            VALUES ($1, $2, 'PRESALE_LEAD')
            ON CONFLICT (project_id, user_id) DO UPDATE SET project_role = 'PRESALE_LEAD';
          `, [leadId, userId]).catch(() => {});
        }
      }

      if (callerProjectRole !== 'PRESALE_LEAD') {
        throw new ForbiddenError('Chỉ Trưởng dự án (PRESALE_LEAD) của dự án này mới có quyền bổ nhiệm thành viên vào deal. Quản trị viên hệ thống không can thiệp vào nhân sự nội bộ của dự án.');
      }

      const userRes = await this.dbPool.query(`
        SELECT id, email, full_name as "fullName", organization_id FROM users WHERE LOWER(email) = LOWER($1);
      `, [email.trim()]);
      if (userRes.rows.length === 0) {
        throw new NotFoundError(`Không tìm thấy tài khoản với email "${email}" trong hệ thống.`);
      }
      const targetUser = userRes.rows[0];

      // Ensure user belongs to the project's organization (e.g. if they registered with a duplicate org name)
      if (targetUser.organization_id !== organizationId) {
        await this.dbPool.query(`UPDATE users SET organization_id = $1 WHERE id = $2;`, [organizationId, targetUser.id]);
      }

      const insertRes = await this.dbPool.query(`
        INSERT INTO project_memberships (project_id, user_id, project_role)
        VALUES ($1, $2, $3)
        ON CONFLICT (project_id, user_id) DO UPDATE SET project_role = EXCLUDED.project_role, updated_at = NOW()
        RETURNING id, project_id as "projectId", user_id as "userId", project_role as "projectRole", created_at as "createdAt";
      `, [leadId, targetUser.id, projectRole]);

      // If targetUser has system role VIEWER, update their primary role to match their appointed role
      await this.dbPool.query(`
        UPDATE users SET role = $1 WHERE id = $2 AND role = 'VIEWER';
      `, [projectRole, targetUser.id]);

      await this.recordLeadAudit(req, 'PROJECT_MEMBER_ADDED', leadId, {
        targetUserId: targetUser.id,
        targetEmail: targetUser.email,
        projectRole
      });

      res.status(201).json({
        success: true,
        data: {
          ...insertRes.rows[0],
          email: targetUser.email,
          fullName: targetUser.fullName
        }
      });
    } catch (error) {
      console.error('[LeadIntakeController.addMember] Error:', error);
      next(error);
    }
  };

  updateMemberRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const leadId = routeParam(req, 'id');
      const targetUserId = routeParam(req, 'userId');
      const { userId, claims } = this.leadScope(req);
      const { projectRole } = req.body ?? {};
      if (!projectRole) throw new ValidationError('projectRole is required.');

      const allowedRoles = ['PRESALE_LEAD', 'SALES_REP', 'PRESALE_CONSULTANT', 'VIEWER'];
      if (!allowedRoles.includes(projectRole)) {
        throw new ValidationError(`projectRole must be one of: ${allowedRoles.join(', ')}.`);
      }

      if (!this.dbPool) throw new Error('Database pool not available.');

      const callerRoleCheck = await this.dbPool.query(`
        SELECT project_role FROM project_memberships WHERE project_id = $1 AND user_id = $2;
      `, [leadId, userId]);
      let callerProjectRole = callerRoleCheck.rows[0]?.project_role;

      if (!callerProjectRole) {
        const leadCheck = await this.dbPool.query(`SELECT created_by, assigned_to FROM leads WHERE id = $1`, [leadId]);
        const leadRow = leadCheck.rows[0];
        if (leadRow && (!leadRow.created_by || leadRow.created_by === userId || leadRow.assigned_to === userId)) {
          callerProjectRole = 'PRESALE_LEAD';
        }
      }

      if (callerProjectRole !== 'PRESALE_LEAD') {
        throw new ForbiddenError('Chỉ Trưởng dự án (PRESALE_LEAD) của dự án này mới có quyền thay đổi vai trò thành viên trong deal.');
      }

      const updateRes = await this.dbPool.query(`
        UPDATE project_memberships SET project_role = $1, updated_at = NOW()
        WHERE project_id = $2 AND user_id = $3
        RETURNING id, project_id as "projectId", user_id as "userId", project_role as "projectRole", updated_at as "updatedAt";
      `, [projectRole, leadId, targetUserId]);

      if (updateRes.rows.length === 0) throw new NotFoundError('Thành viên không tồn tại trong dự án.');

      // Also keep user's primary role in sync with updated project role
      await this.dbPool.query(`
        UPDATE users SET role = $1 WHERE id = $2;
      `, [projectRole, targetUserId]);

      await this.recordLeadAudit(req, 'PROJECT_MEMBER_ROLE_UPDATED', leadId, {
        targetUserId,
        projectRole
      });

      res.status(200).json({ success: true, data: updateRes.rows[0] });
    } catch (error) {
      console.error('[LeadIntakeController.updateMemberRole] Error:', error);
      next(error);
    }
  };

  removeMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const leadId = routeParam(req, 'id');
      const targetUserId = routeParam(req, 'userId');
      const { userId, claims } = this.leadScope(req);

      if (!this.dbPool) throw new Error('Database pool not available.');

      const callerRoleCheck = await this.dbPool.query(`
        SELECT project_role FROM project_memberships WHERE project_id = $1 AND user_id = $2;
      `, [leadId, userId]);
      let callerProjectRole = callerRoleCheck.rows[0]?.project_role;

      if (!callerProjectRole) {
        const leadCheck = await this.dbPool.query(`SELECT created_by, assigned_to FROM leads WHERE id = $1`, [leadId]);
        const leadRow = leadCheck.rows[0];
        if (leadRow && (!leadRow.created_by || leadRow.created_by === userId || leadRow.assigned_to === userId)) {
          callerProjectRole = 'PRESALE_LEAD';
        }
      }

      if (callerProjectRole !== 'PRESALE_LEAD') {
        throw new ForbiddenError('Chỉ Trưởng dự án (PRESALE_LEAD) của dự án này mới có quyền rút thành viên khỏi deal.');
      }

      await this.dbPool.query(`
        DELETE FROM project_memberships WHERE project_id = $1 AND user_id = $2;
      `, [leadId, targetUserId]);

      await this.recordLeadAudit(req, 'PROJECT_MEMBER_REMOVED', leadId, { targetUserId });

      res.status(204).send();
    } catch (error) {
      console.error('[LeadIntakeController.removeMember] Error:', error);
      next(error);
    }
  };

  deleteLead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const leadId = routeParam(req, 'id');
      const scope = this.leadScope(req);

      // PBAC: Chỉ Trưởng dự án (PRESALE_LEAD) của dự án này mới có quyền xóa dự án. Admin không can thiệp.
      if (this.dbPool) {
        const callerRoleCheck = await this.dbPool.query(`
          SELECT project_role FROM project_memberships WHERE project_id = $1 AND user_id = $2;
        `, [leadId, scope.userId]);
        let callerProjectRole = callerRoleCheck.rows[0]?.project_role;
        if (!callerProjectRole) {
          const leadCheck = await this.dbPool.query(`SELECT created_by, assigned_to FROM leads WHERE id = $1`, [leadId]);
          const leadRow = leadCheck.rows[0];
          if (leadRow && (!leadRow.created_by || leadRow.created_by === scope.userId || leadRow.assigned_to === scope.userId)) {
            callerProjectRole = 'PRESALE_LEAD';
          }
        }
        if (callerProjectRole !== 'PRESALE_LEAD') {
          throw new ForbiddenError('Chỉ Trưởng dự án (PRESALE_LEAD) của dự án này mới có quyền xóa dự án. Quản trị viên hệ thống không can thiệp vào vòng đời dữ liệu dự án.');
        }
      }

      await this.deleteLeadUseCase.execute(leadId, scope);
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
