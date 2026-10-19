import { IProposalRepository, CreateProposalParams } from '../../domain/repositories/IProposalRepository.js';
import { ProposalWithSheets } from '../../domain/entities/Proposal.js';
import { ValidationError } from '../../domain/errors/AppError.js';
import { getDefaultProposalSheets } from '../services/DefaultProposalSheets.js';
import { STANDARD_PROPOSAL_SHEETS } from '../../domain/entities/Proposal.js';

export interface CreateProposalDTO {
  title: string;
  organizationId: string;
  leadId?: string | null;
  createdBy?: string | null;
  version?: string;
  currency?: string;
  totalCost?: number | null;
  estimatedTimelineWeeks?: number | null;
  initialSheets?: Array<{
    sheetName: string;
    sheetOrder: number;
    sheetData: Record<string, any>;
    aiGenerated?: boolean;
  }>;
}

export class CreateProposalUseCase {
  constructor(private readonly proposalRepo: IProposalRepository) {}

  async execute(dto: CreateProposalDTO): Promise<ProposalWithSheets> {
    if (!dto.title || dto.title.trim() === '') {
      throw new ValidationError('Proposal title is required.');
    }
    if (dto.title.trim().length > 255) throw new ValidationError('Proposal title must not exceed 255 characters.');
    if (!dto.organizationId || !dto.createdBy) throw new ValidationError('Authenticated user and organization are required.');

    const currency = dto.currency || 'USD';
    if (!/^[A-Z]{3}$/.test(currency)) throw new ValidationError('currency must be a three-letter uppercase ISO code.');
    if (dto.version !== undefined && (!dto.version.trim() || dto.version.length > 20)) throw new ValidationError('version must contain 1–20 characters.');
    if (dto.totalCost !== undefined && dto.totalCost !== null && (!Number.isFinite(dto.totalCost) || dto.totalCost < 0)) {
      throw new ValidationError('totalCost must be a non-negative finite number.');
    }
    if (dto.estimatedTimelineWeeks !== undefined && dto.estimatedTimelineWeeks !== null &&
      (!Number.isInteger(dto.estimatedTimelineWeeks) || dto.estimatedTimelineWeeks < 1)) {
      throw new ValidationError('estimatedTimelineWeeks must be a positive integer.');
    }
    const sheets = dto.initialSheets && dto.initialSheets.length > 0
      ? dto.initialSheets
      : getDefaultProposalSheets(dto.title.trim(), currency);
    if (sheets.length > STANDARD_PROPOSAL_SHEETS.length) throw new ValidationError('A proposal may contain at most 10 standard sheets.');
    const seen = new Set<string>();
    for (const sheet of sheets) {
      const definition = sheet && STANDARD_PROPOSAL_SHEETS.find(item => item.name === sheet.sheetName);
      if (!sheet || !definition) {
        throw new ValidationError('initialSheets contains an unknown sheet name.');
      }
      if (seen.has(sheet.sheetName)) throw new ValidationError('initialSheets cannot contain duplicate sheet names.');
      seen.add(sheet.sheetName);
      if (sheet.sheetOrder !== definition.order || !sheet.sheetData || typeof sheet.sheetData !== 'object' || Array.isArray(sheet.sheetData)) {
        throw new ValidationError(`Sheet '${sheet.sheetName}' must have an integer order and JSON object data.`);
      }
    }

    // Calculate default totalCost and timeline if not explicitly provided
    let calculatedCost = dto.totalCost ?? null;
    let calculatedTimeline = dto.estimatedTimelineWeeks ?? null;

    if (calculatedCost === null) {
      const pricingSheet = sheets.find(s => s.sheetName === 'Pricing & Quotation');
      if (pricingSheet && typeof pricingSheet.sheetData?.grandTotal === 'number') {
        calculatedCost = pricingSheet.sheetData.grandTotal;
      }
    }

    if (calculatedTimeline === null) {
      const timelineSheet = sheets.find(s => s.sheetName === 'Timeline & Milestones');
      if (timelineSheet && typeof timelineSheet.sheetData?.totalWeeks === 'number') {
        calculatedTimeline = timelineSheet.sheetData.totalWeeks;
      }
    }

    const params: CreateProposalParams = {
      title: dto.title.trim(),
      organizationId: dto.organizationId,
      leadId: dto.leadId || null,
      createdBy: dto.createdBy,
      version: dto.version || 'v1.0',
      status: 'DRAFT',
      totalCost: calculatedCost,
      currency,
      estimatedTimelineWeeks: calculatedTimeline,
      initialSheets: sheets
    };

    return await this.proposalRepo.create(params);
  }
}
