export const LEAD_SOURCES = ['INBOUND_EMAIL', 'WEBSITE', 'REFERRAL', 'MEETING', 'MANUAL'] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

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

/** Allowed PATCH /leads/:id/status targets. APPROVED also requires a stored BANT score. */
export const LEAD_TRANSITIONS: Record<LeadStatus, readonly LeadStatus[]> = {
  NEW: ['IN_REVIEW', 'QUALIFYING', 'REJECTED'],
  IN_REVIEW: ['QUALIFYING', 'APPROVED', 'REJECTED'],
  QUALIFYING: ['QUALIFIED', 'IN_REVIEW', 'REJECTED'],
  QUALIFIED: ['APPROVED', 'PROPOSAL_DRAFTING', 'REJECTED'],
  PROPOSAL_DRAFTING: ['APPROVED', 'WON', 'LOST', 'REJECTED'],
  APPROVED: ['PROPOSAL_DRAFTING', 'WON', 'LOST', 'REJECTED'],
  REJECTED: ['IN_REVIEW'],
  WON: [],
  LOST: ['IN_REVIEW']
};

export const PROPOSAL_ELIGIBLE_STATUSES: readonly LeadStatus[] = ['QUALIFIED', 'APPROVED', 'PROPOSAL_DRAFTING'];

export interface LeadExtractedMetadata {
  projectName?: string | null;
  clientIndustry?: string | null;
  businessGoal?: string | null;
  timelineWeeks?: number | null;
  budgetUsd?: number | null;
  targetPlatforms?: string[];
  coreFunctionalModules?: string[];
  integrationsRequired?: string[];
  complianceAndSecurity?: string[];
  priorityLevel?: 'High' | 'Medium' | 'Low' | null;
  [key: string]: unknown;
}

export interface QualificationCriterion {
  score: number;
  maxScore: number;
  assessment: string;
  evidence: string[];
}

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

export interface LeadRecord {
  id: string;
  organizationId: string;
  clientId: string | null;
  createdBy: string | null;
  assignedTo: string | null;
  title: string;
  source: LeadSource;
  status: LeadStatus;
  rawRfpContent: string;
  extractedMetadata: LeadExtractedMetadata;
  bantScore: number | null;
  bantDetails: LeadQualification | Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export type LeadListItem = Omit<LeadRecord, 'rawRfpContent' | 'bantDetails'>;

export interface LeadIntakeDraft {
  id?: string | null;
  organizationId?: string | null;
  clientId?: string | null;
  createdBy?: string | null;
  assignedTo?: string | null;
  title: string | null;
  source: LeadSource;
  status?: string | null;
  rawRfpContent: string;
  extractedMetadata: LeadExtractedMetadata;
  bantScore?: number | null;
  bantDetails?: LeadQualification | Record<string, unknown> | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface AnalyzeLeadResult {
  draft: LeadIntakeDraft;
  missingInformation: string[];
}

export interface MeetingAttendee {
  name: string;
  email?: string;
  role?: string;
}

export type MeetingStatus = 'OPEN' | 'LOCKED' | 'INSPECTED';

export interface LeadMeeting {
  id: string;
  leadId: string;
  organizationId: string;
  createdBy: string | null;
  title: string;
  meetingDate: string;
  attendees: MeetingAttendee[];
  status: MeetingStatus;
  rawTranscript: string | null;
  cleanNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export function isLeadQualification(value: unknown): value is LeadQualification {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return typeof record.score === 'number' && record.criteria !== undefined && typeof record.criteria === 'object';
}
