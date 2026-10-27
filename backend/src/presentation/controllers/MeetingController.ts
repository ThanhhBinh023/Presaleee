import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError, ValidationError } from '../../domain/errors/AppError.js';
import {
  AnalyzeMeetingUseCase, CreateMeetingUseCase, GetMeetingUseCase,
  ListLeadMeetingsUseCase, SaveMeetingTranscriptUseCase, UpdateMeetingStatusUseCase
} from '../../application/use-cases/MeetingUseCases.js';
import { parseCreateMeetingInput } from '../../application/dtos/MeetingDTO.js';

function context(req: Request): { organizationId: string; userId: string } {
  if (!req.auth?.sub) throw new UnauthorizedError();
  if (!req.auth.organizationId) throw new ForbiddenError('An organization is required for this operation.');
  return { organizationId: req.auth.organizationId, userId: req.auth.sub };
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
    private readonly updateStatusUseCase: UpdateMeetingStatusUseCase
  ) {}

  listForLead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId } = context(req);
      const result = await this.listUseCase.execute(routeParam(req, 'leadId'), organizationId);
      res.status(200).json({ success: true, data: result, meta: { total: result.length } });
    } catch (error) { next(error); }
  };

  createForLead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId, userId } = context(req);
      const meeting = await this.createUseCase.execute({
        leadId: routeParam(req, 'leadId'), organizationId, userId,
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
      const { organizationId } = context(req);
      const input = body(req);
      const meeting = await this.transcriptUseCase.execute(routeParam(req, 'meetingId'), organizationId, input.transcript ?? input.content, input.append);
      res.status(200).json({ success: true, data: meeting });
    } catch (error) { next(error); }
  };

  analyze = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId } = context(req);
      const meeting = await this.analyzeUseCase.execute(routeParam(req, 'meetingId'), organizationId);
      res.status(200).json({ success: true, data: meeting });
    } catch (error) { next(error); }
  };

  updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { organizationId } = context(req);
      const input = body(req);
      const meeting = await this.updateStatusUseCase.execute(routeParam(req, 'meetingId'), organizationId, input.status);
      res.status(200).json({ success: true, data: meeting });
    } catch (error) { next(error); }
  };
}
