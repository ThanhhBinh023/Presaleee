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
    const res = await fetch('/api/v1/leads');
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch {
    return [];
  }
}

export async function analyzeAndSaveLead(
  rawRfpContent: string, 
  source = 'INBOUND_EMAIL', 
  persist = true
): Promise<AnalyzeLeadResult> {
  const res = await fetch('/api/v1/leads/intake/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawRfpContent, source, persist })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to analyze and save Lead.');
  }
  const data = await res.json();
  return data.data;
}

export async function qualifyLead(leadId: string, inquiryText?: string): Promise<{ qualification: QualificationData; lead: LeadItem }> {
  const res = await fetch(`/api/v1/leads/${leadId}/qualify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leadId, inquiryText })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to qualify Lead.');
  }
  const data = await res.json();
  return data.data;
}

export async function getLeadById(leadId: string): Promise<LeadItem | null> {
  try {
    const res = await fetch(`/api/v1/leads/${leadId}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.data || null;
  } catch {
    return null;
  }
}
