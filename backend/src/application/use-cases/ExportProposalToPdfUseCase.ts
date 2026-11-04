import { IProposalRepository } from '../../domain/repositories/IProposalRepository.js';
import { IPdfExporterService } from '../../domain/repositories/IPdfExporterService.js';
import { NotFoundError } from '../../domain/errors/AppError.js';
import { requiredUuid } from '../services/RequestValidation.js';
import { toFilenameSlug } from '../services/ExportFilename.js';

export class ExportProposalToPdfUseCase {
  constructor(private readonly proposalRepository: IProposalRepository, private readonly pdfExporter: IPdfExporterService) {}

  async execute(id: string, organizationId: string): Promise<{ buffer: Buffer; filename: string }> {
    const proposal = await this.proposalRepository.findById(requiredUuid(id, 'id'), organizationId);
    if (!proposal) throw new NotFoundError('Proposal not found.');
    const buffer = await this.pdfExporter.generateProposalPdf(proposal);
    const safeTitle = toFilenameSlug(proposal.title);
    return { buffer, filename: `${safeTitle}_Proposal_${proposal.version || 'v1.0'}.pdf` };
  }
}
