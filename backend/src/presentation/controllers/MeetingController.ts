import { Request, Response, NextFunction } from 'express';
import { CreateMeetingUseCase } from '../../application/use-cases/CreateMeetingUseCase.js';
import { InspectMeetingUseCase } from '../../application/use-cases/InspectMeetingUseCase.js';
import { UpdateMeetingLifecycleUseCase } from '../../application/use-cases/UpdateMeetingLifecycleUseCase.js';
import { ListMeetingsByLeadUseCase } from '../../application/use-cases/ListMeetingsByLeadUseCase.js';
import { GetMeetingByIdUseCase } from '../../application/use-cases/GetMeetingByIdUseCase.js';
import { IMeetingRepository } from '../../domain/repositories/IMeetingRepository.js';

function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] || '';
  return param || '';
}

export class MeetingController {
  constructor(
    private readonly createUseCase: CreateMeetingUseCase,
    private readonly inspectUseCase: InspectMeetingUseCase,
    private readonly lifecycleUseCase: UpdateMeetingLifecycleUseCase,
    private readonly listByLeadUseCase: ListMeetingsByLeadUseCase,
    private readonly getByIdUseCase: GetMeetingByIdUseCase,
    private readonly meetingRepository: IMeetingRepository
  ) {}

  /**
   * POST /api/v1/meetings
   * Create a new Discovery Meeting
   */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { leadId, title, meetingDate, sourceTool, audioRecordUrl, rawTranscript } = req.body;
      const meeting = await this.createUseCase.execute({
        leadId,
        title,
        meetingDate,
        sourceTool,
        audioRecordUrl,
        rawTranscript
      });

      res.status(201).json({
        success: true,
        message: 'Discovery Meeting created successfully.',
        data: meeting
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/meetings/lead/:leadId
   * List all meetings for a Lead
   */
  listByLead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const leadId = getParam(req.params.leadId);
      const meetings = await this.listByLeadUseCase.execute(leadId);

      res.status(200).json({
        success: true,
        data: meetings,
        meta: { total: meetings.length }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/meetings/:id
   * Get single meeting by ID
   */
  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = getParam(req.params.id);
      const meeting = await this.getByIdUseCase.execute(id);

      res.status(200).json({
        success: true,
        data: meeting
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/meetings/:id/inspect
   * AI Inspection: Clean transcript, extract action items & generate proactive follow-up questions
   */
  inspect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const meetingId = getParam(req.params.id);
      const { rawTranscript } = req.body;

      const result = await this.inspectUseCase.execute({
        meetingId,
        rawTranscript
      });

      res.status(200).json({
        success: true,
        message: 'Meeting inspected successfully by AI.',
        data: result.meeting,
        meta: result.inspectionSummary
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/v1/meetings/:id/lifecycle
   * Update lifecycle (OPEN -> LOCKED -> INSPECTED -> REOPENED)
   */
  updateLifecycle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const meetingId = getParam(req.params.id);
      const { status } = req.body;

      const updated = await this.lifecycleUseCase.execute({
        meetingId,
        status
      });

      res.status(200).json({
        success: true,
        message: `Meeting lifecycle transitioned to ${status}.`,
        data: updated
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/v1/meetings/:id
   * Update meeting fields directly
   */
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const meetingId = getParam(req.params.id);
      const updated = await this.meetingRepository.update(meetingId, req.body);

      res.status(200).json({
        success: true,
        message: 'Meeting updated successfully.',
        data: updated
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/v1/meetings/:id
   * Delete meeting
   */
  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const meetingId = getParam(req.params.id);
      const success = await this.meetingRepository.delete(meetingId);

      res.status(200).json({
        success,
        message: success ? 'Meeting deleted successfully.' : 'Meeting not found.'
      });
    } catch (error) {
      next(error);
    }
  };
}
