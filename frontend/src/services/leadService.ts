import { apiRequest } from './apiClient';

export interface QualificationBreakdown {
  type: 'positive' | 'warning' | 'neutral';
  title: string;
  detail: string;
}

export interface QualificationData {
  qualification_score: number;
  readiness_level: string;
  breakdown: QualificationBreakdown[];
  project_brief: string;
}

export interface ExtractedMetadata {
  projectName?: string | null;
  clientIndustry?: string | null;
  businessGoal?: string | null;
  timelineWeeks?: number | null;
  budgetUsd?: number | null;
  targetPlatforms?: string[];
  coreFunctionalModules?: string[];
  integrationsRequired?: string[];
  complianceAndSecurity?: string[];
  priorityLevel?: string | null;
  missing_information?: string[];
  target_sla?: string;
  peak_workload?: string;
  qualification?: QualificationData;
}

export interface LeadItem {
  id: string;
  title: string;
  source: string;
  status: string;
  raw_rfp_content?: string;
  extracted_metadata?: ExtractedMetadata;
  created_at?: string;
}

export interface AnalyzeLeadResult {
  draft: {
    title: string;
    source: string;
    rawRfpContent: string;
    extractedMetadata: ExtractedMetadata;
  };
  missingInformation: string[];
  lead: LeadItem;
}

export async function fetchLeads(): Promise<LeadItem[]> {
  try {
    const list = await apiRequest<LeadItem[]>('/api/v1/leads');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function analyzeAndSaveLead(
  rawRfpContent: string, 
  source = 'INBOUND_EMAIL', 
  persist = true
): Promise<AnalyzeLeadResult> {
  return await apiRequest<AnalyzeLeadResult>('/api/v1/leads/intake/analyze', {
    method: 'POST',
    body: { rawRfpContent, source, persist }
  });
}

export async function qualifyLead(leadId: string, inquiryText?: string): Promise<{ qualification: QualificationData; lead: LeadItem }> {
  return await apiRequest<{ qualification: QualificationData; lead: LeadItem }>(`/api/v1/leads/${leadId}/qualify`, {
    method: 'POST',
    body: { leadId, inquiryText }
  });
}

export async function getLeadById(leadId: string): Promise<LeadItem | null> {
  try {
    return await apiRequest<LeadItem>(`/api/v1/leads/${leadId}`);
  } catch {
    return null;
  }
}

export async function updateLead(leadId: string, updates: Partial<LeadItem>): Promise<LeadItem> {
  return await apiRequest<LeadItem>(`/api/v1/leads/${leadId}`, {
    method: 'PUT',
    body: updates
  });
}

export async function deleteLead(leadId: string): Promise<void> {
  await apiRequest<void>(`/api/v1/leads/${leadId}`, {
    method: 'DELETE'
  });
}
