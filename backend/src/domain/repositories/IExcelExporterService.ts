import { ProposalWithSheets } from '../entities/Proposal.js';

export interface IExcelExporterService {
  generateProposalWorkbook(proposal: ProposalWithSheets): Promise<Buffer>;
}
