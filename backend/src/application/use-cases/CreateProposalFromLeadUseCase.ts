import { ILeadRepository } from '../../domain/repositories/ILeadRepository.js';
import { ConflictError, NotFoundError, ValidationError } from '../../domain/errors/AppError.js';
import { CreateProposalUseCase } from './CreateProposalUseCase.js';
import { ProposalWithSheets } from '../../domain/entities/Proposal.js';
import { getDefaultProposalSheets } from '../services/DefaultProposalSheets.js';

export class CreateProposalFromLeadUseCase {
  constructor(
    private readonly leadRepository: ILeadRepository,
    private readonly createProposalUseCase: CreateProposalUseCase
  ) {}

  async execute(leadId: string, organizationId: string, userId: string, titleOverride?: string): Promise<ProposalWithSheets> {
    if (!leadId || !organizationId || !userId) throw new ValidationError('Lead, user, and organization are required.');
    const lead = await this.leadRepository.findById(leadId, { organizationId });
    if (!lead) throw new NotFoundError('Lead not found.');
    if (!['QUALIFIED', 'APPROVED', 'PROPOSAL_DRAFTING'].includes(lead.status)) {
      throw new ConflictError('Lead must be qualified or approved before proposal creation.');
    }
    const title = (titleOverride ?? lead.title).trim();
    if (!title || title.length > 255) {
      throw new ValidationError('Proposal title must be 1–255 characters.');
    }

    const sheets = getDefaultProposalSheets(title, 'USD');
    const overview = sheets.find(sheet => sheet.sheetName === 'Overview');
    const scopeSheet = sheets.find(sheet => sheet.sheetName === 'Scope of Work');
    const metadata = lead.extractedMetadata;
    const coreModules = Array.isArray(metadata.coreFunctionalModules) ? metadata.coreFunctionalModules : [];
    if (overview) Object.assign(overview.sheetData, {
      projectName: lead.title,
      businessGoal: typeof metadata.businessGoal === 'string' ? metadata.businessGoal : '',
      targetPlatforms: Array.isArray(metadata.targetPlatforms) ? metadata.targetPlatforms : [],
      timelineWeeks: typeof metadata.timelineWeeks === 'number' ? metadata.timelineWeeks : null,
      budgetUsd: typeof metadata.budgetUsd === 'number' ? metadata.budgetUsd : null
    });
    if (scopeSheet) Object.assign(scopeSheet.sheetData, {
      modules: coreModules.filter((item): item is string => typeof item === 'string').map((module, index) => ({
        wbs: `${index + 1}.0`, module, feature: '', complexity: '', priority: '', estimatedDays: null
      }))
    });
    return this.createProposalUseCase.execute({
      title,
      organizationId,
      createdBy: userId,
      leadId: lead.id,
      currency: 'USD',
      initialSheets: sheets
    });
  }
}
