export const PROPOSAL_STATUSES = [
  'DRAFT',
  'IN_REVIEW',
  'APPROVED',
  'SENT_TO_CLIENT',
  'ACCEPTED',
  'REJECTED'
] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

export const PROPOSAL_TRANSITIONS: Record<ProposalStatus, readonly ProposalStatus[]> = {
  DRAFT: ['IN_REVIEW', 'REJECTED'],
  IN_REVIEW: ['DRAFT', 'APPROVED', 'REJECTED'],
  APPROVED: ['IN_REVIEW', 'SENT_TO_CLIENT', 'REJECTED'],
  SENT_TO_CLIENT: ['ACCEPTED', 'REJECTED'],
  ACCEPTED: [],
  REJECTED: ['DRAFT']
};

export const PRIVILEGED_PROPOSAL_STATUSES: readonly ProposalStatus[] = [
  'APPROVED',
  'REJECTED',
  'SENT_TO_CLIENT',
  'ACCEPTED'
];

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

export type StandardSheetName = (typeof STANDARD_PROPOSAL_SHEETS)[number]['name'];

export interface ProposalSheet {
  id: string;
  proposalId: string;
  sheetName: string;
  sheetOrder: number;
  sheetData: Record<string, unknown>;
  aiGenerated: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProposalRecord {
  id: string;
  organizationId: string | null;
  leadId: string | null;
  createdBy: string | null;
  title: string;
  version: string;
  status: ProposalStatus;
  totalCost: number | null;
  currency: string;
  estimatedTimelineWeeks: number | null;
  exportExcelUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProposalWithSheets extends ProposalRecord {
  sheets: ProposalSheet[];
}

export interface GenerateSheetsResult {
  proposalId: string;
  sheets: ProposalSheet[];
  sources: Array<{ id: string; title: string | null; excerpt: string }>;
}

export type ProposalSummary = ProposalRecord;
