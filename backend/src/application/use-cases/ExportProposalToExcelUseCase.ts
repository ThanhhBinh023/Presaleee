import { IProposalRepository } from '../../domain/repositories/IProposalRepository.js';
import { IExcelExporterService } from '../../domain/repositories/IExcelExporterService.js';
import { ProposalWithSheets } from '../../domain/entities/Proposal.js';
import { NotFoundError } from '../../domain/errors/AppError.js';
import { requiredUuid } from '../services/RequestValidation.js';

export interface ExportExcelResult {
  buffer: Buffer;
  filename: string;
  proposal: ProposalWithSheets;
}

export class ExportProposalToExcelUseCase {
  constructor(
    private readonly proposalRepo: IProposalRepository,
    private readonly excelExporter: IExcelExporterService
  ) {}

  async execute(id: string, organizationId: string): Promise<ExportExcelResult> {
    const proposal = await this.proposalRepo.findById(requiredUuid(id, 'id'), organizationId);
    if (!proposal) throw new NotFoundError('Proposal not found.');

    const buffer = await this.excelExporter.generateProposalWorkbook(proposal);
    const safeTitle = proposal.title.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_');
    const filename = `${safeTitle}_Proposal_${proposal.version || 'v1.0'}.xlsx`;

    return {
      buffer,
      filename,
      proposal
    };
  }
}
