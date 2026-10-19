export interface AnalyzeLeadIntakeInputDTO {
  rawRfpContent: string;
  source?: 'INBOUND_EMAIL' | 'WEBSITE' | 'REFERRAL' | 'MEETING' | 'MANUAL';
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
 * Frontend-ready, unsaved Lead draft. Persistence-owned fields intentionally
 * remain null until a separate save/confirm endpoint is implemented.
 */
export interface LeadIntakeDraftDTO {
  id: null;
  organizationId: null;
  clientId: null;
  createdBy: null;
  assignedTo: null;
  title: string | null;
  source: AnalyzeLeadIntakeInputDTO['source'];
  status: null;
  rawRfpContent: string;
  extractedMetadata: LeadIntakeExtractedMetadata;
  bantScore: null;
  bantDetails: null;
  createdAt: null;
  updatedAt: null;
}

export interface AnalyzeLeadIntakeOutputDTO {
  draft: LeadIntakeDraftDTO;
  missingInformation: string[];
}
