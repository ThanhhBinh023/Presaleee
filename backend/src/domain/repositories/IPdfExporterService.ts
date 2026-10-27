import { ProposalWithSheets } from '../entities/Proposal.js';

export interface IPdfExporterService {
  generateProposalPdf(proposal: ProposalWithSheets): Promise<Buffer>;
}
