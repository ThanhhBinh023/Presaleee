import { IProposalRepository } from '../../domain/repositories/IProposalRepository.js';
import { IPdfExporterService } from '../../domain/repositories/IPdfExporterService.js';
import { NotFoundError, ValidationError } from '../../domain/errors/AppError.js';

export class ExportProposalToPdfUseCase {
  constructor(private readonly proposalRepository: IProposalRepository, private readonly pdfExporter: IPdfExporterService) {}

  async execute(id: string, organizationId: string): Promise<{ buffer: Buffer; filename: string }> {
    if (!id) throw new ValidationError('Proposal ID is required.');
    const proposal = await this.proposalRepository.findById(id, organizationId);
    if (!proposal) throw new NotFoundError('Proposal not found.');
    const buffer = await this.pdfExporter.generateProposalPdf(proposal);
    const safeTitle = proposal.title.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_');
    return { buffer, filename: `${safeTitle}_Proposal_${proposal.version || 'v1.0'}.pdf` };
  }
}
