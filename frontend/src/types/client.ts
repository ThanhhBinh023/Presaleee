export const CLIENT_INDUSTRIES = [
  'Retail',
  'Fintech',
  'Healthcare',
  'Logistics',
  'Manufacturing',
  'Education',
  'Real Estate',
  'Government',
  'Telecom',
  'Other'
] as const;

export const LEAD_STATUSES = [
  'NEW',
  'IN_REVIEW',
  'QUALIFYING',
  'QUALIFIED',
  'PROPOSAL_DRAFTING',
  'APPROVED',
  'REJECTED',
  'WON',
  'LOST'
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

/** A client row as returned by /api/v1/clients. industry stays string for legacy free-form rows. */
export interface ClientRecord {
  id: string;
  organizationId: string;
  companyName: string;
  industry: string | null;
  contactPerson: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  country: string;
  createdAt: string;
  updatedAt: string;
}

/** Lead summary row from /api/v1/clients/:id/leads; the heavy RFP fields are not included. */
export interface ClientLeadSummary {
  id: string;
  organizationId: string;
  clientId: string | null;
  createdBy: string | null;
  assignedTo: string | null;
  title: string;
  source: string;
  status: LeadStatus;
  extractedMetadata: Record<string, unknown>;
  bantScore: number | null;
  createdAt: string;
  updatedAt: string;
}
