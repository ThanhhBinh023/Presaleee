import { Proposal, ProposalSheet, ProposalWithSheets } from '../entities/Proposal.js';

export interface CreateProposalParams {
  title: string;
  organizationId?: string | null;
  leadId?: string | null;
  createdBy?: string | null;
  version?: string;
  status?: Proposal['status'];
  totalCost?: number | null;
  currency?: string;
  estimatedTimelineWeeks?: number | null;
  initialSheets?: Array<{
    sheetName: string;
    sheetOrder: number;
    sheetData: Record<string, any>;
    aiGenerated?: boolean;
  }>;
}

export interface UpdateProposalParams {
  title?: string;
  version?: string;
  status?: Proposal['status'];
  totalCost?: number | null;
  currency?: string;
  estimatedTimelineWeeks?: number | null;
  exportExcelUrl?: string | null;
}

export interface ProposalFilterParams {
  organizationId?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface IProposalRepository {
  create(params: CreateProposalParams): Promise<ProposalWithSheets>;
  findById(id: string): Promise<ProposalWithSheets | null>;
  findAll(filter?: ProposalFilterParams): Promise<{ proposals: Proposal[]; total: number }>;
  update(id: string, params: UpdateProposalParams): Promise<Proposal>;
  updateSheet(proposalId: string, sheetName: string, sheetData: Record<string, any>, aiGenerated?: boolean): Promise<ProposalSheet>;
  delete(id: string): Promise<boolean>;
}
