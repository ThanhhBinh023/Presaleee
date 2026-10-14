export type ProposalStatus = 
  | 'DRAFT' 
  | 'IN_REVIEW' 
  | 'APPROVED' 
  | 'SENT_TO_CLIENT' 
  | 'ACCEPTED' 
  | 'REJECTED';

export interface ProposalSheet {
  id: string;
  proposalId: string;
  sheetName: string;
  sheetOrder: number;
  sheetData: Record<string, any>;
  aiGenerated: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Proposal {
  id: string;
  organizationId?: string | null;
  leadId?: string | null;
  createdBy?: string | null;
  title: string;
  version: string;
  status: ProposalStatus;
  totalCost?: number | null;
  currency?: string;
  estimatedTimelineWeeks?: number | null;
  exportExcelUrl?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ProposalWithSheets extends Proposal {
  sheets: ProposalSheet[];
}

export const STANDARD_PROPOSAL_SHEETS = [
  { order: 1, name: 'Overview', title: 'Executive Summary & Overview' },
  { order: 2, name: 'Scope of Work', title: 'Scope of Work (WBS & Features)' },
  { order: 3, name: 'Architecture & Tech Stack', title: 'Architecture, Non-FR & Tech Stack' },
  { order: 4, name: 'Timeline & Milestones', title: 'Implementation Timeline & Gantt' },
  { order: 5, name: 'Team & Rate Cards', title: 'Team Composition & Role Allocation' },
  { order: 6, name: 'Pricing & Quotation', title: 'Commercial Proposal & Milestone Payments' },
  { order: 7, name: 'Assumptions & Dependencies', title: 'Assumptions & Client Responsibilities' },
  { order: 8, name: 'Risk Management (RAID)', title: 'RAID Log & Mitigation Strategies' },
  { order: 9, name: 'SLA & Maintenance', title: 'Service Level Agreement & Warranty' },
  { order: 10, name: 'Appendices & Case Studies', title: 'Relevant Experience & Case Studies' }
] as const;
