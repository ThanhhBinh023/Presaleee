import { IProposalRepository, CreateProposalParams } from '../../domain/repositories/IProposalRepository.js';
import { ProposalWithSheets } from '../../domain/entities/Proposal.js';
import { ValidationError } from '../../domain/errors/AppError.js';
import { getDefaultProposalSheets } from '../services/DefaultProposalSheets.js';

export interface CreateProposalDTO {
  title: string;
  organizationId?: string | null;
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

    const currency = dto.currency || 'USD';
    const sheets = dto.initialSheets && dto.initialSheets.length > 0
      ? dto.initialSheets
      : getDefaultProposalSheets(dto.title.trim(), currency);

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
      organizationId: dto.organizationId || null,
      leadId: dto.leadId || null,
      createdBy: dto.createdBy || null,
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
