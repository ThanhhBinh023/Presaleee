export const LEAD_SOURCES = ['INBOUND_EMAIL', 'WEBSITE', 'REFERRAL', 'MEETING', 'MANUAL'] as const;
export type LeadSource = typeof LEAD_SOURCES[number];

export const LEAD_STATUSES = ['NEW', 'IN_REVIEW', 'QUALIFYING', 'QUALIFIED', 'PROPOSAL_DRAFTING', 'APPROVED', 'REJECTED', 'WON', 'LOST'] as const;
export type LeadStatus = typeof LEAD_STATUSES[number];

export interface Lead {
  id: string;
  organizationId: string;
  clientId: string | null;
  createdBy: string | null;
  assignedTo: string | null;
  title: string;
  source: LeadSource;
  status: LeadStatus;
  rawRfpContent: string;
  extractedMetadata: Record<string, unknown>;
  bantScore: number | null;
  bantDetails: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface LeadListItem extends Omit<Lead, 'rawRfpContent' | 'bantDetails'> {}

export interface LeadQualification {
  score: number;
  recommendation: string;
  summary: string;
  criteria: {
    budget: QualificationCriterion;
    authority: QualificationCriterion;
    need: QualificationCriterion;
    timeline: QualificationCriterion;
  };
  risks: string[];
  nextSteps: string[];
  evaluatedAt: string;
}

export interface QualificationCriterion {
  score: number;
  maxScore: number;
  assessment: string;
  evidence: string[];
}
