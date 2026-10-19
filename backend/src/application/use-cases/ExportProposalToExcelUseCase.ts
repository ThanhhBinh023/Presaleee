import { IProposalRepository } from '../../domain/repositories/IProposalRepository.js';
import { IExcelExporterService } from '../../domain/repositories/IExcelExporterService.js';
import { ProposalWithSheets } from '../../domain/entities/Proposal.js';
import { NotFoundError, ValidationError } from '../../domain/errors/AppError.js';

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
    if (!id || id.trim() === '') {
      throw new ValidationError('Proposal ID is required.');
    }

    const proposal = await this.proposalRepo.findById(id, organizationId);
    if (!proposal) {
      throw new NotFoundError(`Proposal with ID '${id}' was not found.`);
    }

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
