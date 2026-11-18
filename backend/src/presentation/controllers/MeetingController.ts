import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { AppError, ValidationError, ForbiddenError } from '../../domain/errors/AppError.js';
import {
  AnalyzeMeetingUseCase, CreateMeetingUseCase, GetMeetingUseCase,
  ListLeadMeetingsUseCase, SaveMeetingTranscriptUseCase, UpdateMeetingStatusUseCase
} from '../../application/use-cases/MeetingUseCases.js';
import { parseCreateMeetingInput } from '../../application/dtos/MeetingDTO.js';

function context(req: Request): { organizationId: string; userId: string; role?: string } {
  if (!req.auth?.sub) throw new AppError('Authentication required.', 401);
  if (!req.auth.organizationId) throw new AppError('An organization is required for this operation.', 403);
  return { organizationId: req.auth.organizationId, userId: req.auth.sub, role: req.auth.role };
}
function routeParam(req: Request, name: string): string {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] || '' : value || '';
}
function body(req: Request): Record<string, unknown> {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) throw new ValidationError('Request body must be a JSON object.');
  return req.body as Record<string, unknown>;
}

export class MeetingController {
  constructor(
    private readonly listUseCase: ListLeadMeetingsUseCase,
    private readonly createUseCase: CreateMeetingUseCase,
    private readonly getUseCase: GetMeetingUseCase,
    private readonly transcriptUseCase: SaveMeetingTranscriptUseCase,
    private readonly analyzeUseCase: AnalyzeMeetingUseCase,
    private readonly updateStatusUseCase: UpdateMeetingStatusUseCase,
    private readonly dbPool?: Pool
  ) {}

  private async verifyWriteAccess(leadId: string, userId: string, baseRole?: string): Promise<void> {
    if (!this.dbPool) return;
    try {
      const memRes = await this.dbPool.query(`
        SELECT project_role FROM project_memberships WHERE project_id = $1 AND user_id = $2;
      `, [leadId, userId]);
      let projectRole = memRes.rows[0]?.project_role;

      if (!projectRole) {
        const leadRes = await this.dbPool.query(`
          SELECT created_by, assigned_to, status FROM leads WHERE id = $1;
        `, [leadId]);
        const leadRow = leadRes.rows[0];
        if (leadRow?.created_by === userId || leadRow?.assigned_to === userId) {
          projectRole = 'PRESALE_LEAD';
        } else {
          projectRole = baseRole || 'VIEWER';
        }
      }

      if (projectRole === 'SALES_REP') {
        throw new ForbiddenError('Đại diện kinh doanh (SALES_REP) không có quyền khởi tạo hoặc chỉnh sửa cuộc họp kỹ thuật. Vai trò này chịu trách nhiệm tiếp nhận RFP, thẩm định BANT và khởi tạo Client Portal.');
      }

      if (projectRole === 'VIEWER') {
        throw new ForbiddenError('Tài khoản Quan sát viên (VIEWER) ở chế độ chỉ đọc, không có quyền tạo hoặc chỉnh sửa cuộc họp.');
      }

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
        throw new ForbiddenError('Dự án đã được phê duyệt hoàn thành. Ngoại trừ Trưởng dự án (Presale Lead), không có vai trò nào được phép điều chỉnh cuộc họp.');
      }
    } catch (err: any) {
      if (err instanceof ForbiddenError) throw err;
      console.error('[MeetingController.verifyWriteAccess] Error checking PBAC:', err);
    }
  }

  private async resolveLeadIdFromMeeting(meetingId: string): Promise<string> {
    if (!this.dbPool) return '';
    try {
      const res = await this.dbPool.query(`SELECT lead_id FROM meetings WHERE id = $1 LIMIT 1;`, [meetingId]);
      return res.rows[0]?.lead_id || '';
    } catch {
      return '';
    }
  }

  listForLead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId } = context(req);
      const result = await this.listUseCase.execute(routeParam(req, 'leadId'), organizationId);
      res.status(200).json({ success: true, data: result, meta: { total: result.length } });
    } catch (error) { next(error); }
  };

  createForLead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId, userId, role } = context(req);
      const leadId = routeParam(req, 'leadId');
      await this.verifyWriteAccess(leadId, userId, role);

      const meeting = await this.createUseCase.execute({
        leadId, organizationId, userId,
        ...parseCreateMeetingInput(body(req))
      });
      res.status(201).location(`/api/v1/meetings/${meeting.id}`).json({ success: true, data: meeting });
    } catch (error) { next(error); }
  };

  get = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId } = context(req);
      const meeting = await this.getUseCase.execute(routeParam(req, 'meetingId'), organizationId);
      res.status(200).json({ success: true, data: meeting });
    } catch (error) { next(error); }
  };

  saveTranscript = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId, userId, role } = context(req);
      const meetingId = routeParam(req, 'meetingId');
      const leadId = await this.resolveLeadIdFromMeeting(meetingId);
      if (leadId) await this.verifyWriteAccess(leadId, userId, role);

      const input = body(req);
      const meeting = await this.transcriptUseCase.execute(meetingId, organizationId, input.transcript ?? input.content, input.append);
      res.status(200).json({ success: true, data: meeting });
    } catch (error) { next(error); }
  };

  analyze = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId, userId, role } = context(req);
      const meetingId = routeParam(req, 'meetingId');
      const leadId = await this.resolveLeadIdFromMeeting(meetingId);
      if (leadId) await this.verifyWriteAccess(leadId, userId, role);

      const meeting = await this.analyzeUseCase.execute(meetingId, organizationId);
      res.status(200).json({ success: true, data: meeting });
    } catch (error) { next(error); }
  };

  updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId, userId, role } = context(req);
      const meetingId = routeParam(req, 'meetingId');
      const leadId = await this.resolveLeadIdFromMeeting(meetingId);
      if (leadId) await this.verifyWriteAccess(leadId, userId, role);

      const input = body(req);
      const meeting = await this.updateStatusUseCase.execute(meetingId, organizationId, input.status);
      res.status(200).json({ success: true, data: meeting });
    } catch (error) { next(error); }
  };
}
