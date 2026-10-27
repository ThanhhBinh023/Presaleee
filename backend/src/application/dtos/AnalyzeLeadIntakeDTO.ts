export const LEAD_SOURCES = ['INBOUND_EMAIL', 'WEBSITE', 'REFERRAL', 'MEETING', 'MANUAL'] as const;

export type LeadSource = (typeof LEAD_SOURCES)[number];

export interface AnalyzeLeadIntakeInputDTO {
  rawRfpContent: string;
  source?: LeadSource;
}

export interface LeadIntakeExtractedMetadata {
  projectName: string | null;
  clientIndustry: string | null;
  businessGoal: string | null;
  timelineWeeks: number | null;
  budgetUsd: number | null;
  targetPlatforms: string[];
  coreFunctionalModules: string[];
  integrationsRequired: string[];
  complianceAndSecurity: string[];
  priorityLevel: 'High' | 'Medium' | 'Low' | null;
}

/**
 * Frontend-ready, unsaved Lead draft. Persistence-owned fields are optional and
 * nullable so the same shape can carry a saved Lead once the save/confirm
 * endpoint is implemented.
 */
export interface LeadIntakeDraftDTO {
  id?: string | null;
  organizationId?: string | null;
  clientId?: string | null;
  createdBy?: string | null;
  assignedTo?: string | null;
  title: string | null;
  source: LeadSource;
  status?: string | null;
  rawRfpContent: string;
  extractedMetadata: LeadIntakeExtractedMetadata;
  bantScore?: number | null;
  bantDetails?: Record<string, unknown> | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
}

export interface AnalyzeLeadIntakeOutputDTO {
  draft: LeadIntakeDraftDTO;
  missingInformation: string[];
}
