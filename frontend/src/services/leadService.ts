import { apiRequest, apiRequestWithMeta } from './apiClient';
import type { ListMeta } from '../types/auth';
import type {
  AnalyzeLeadResult,
  LeadExtractedMetadata,
  LeadListItem,
  LeadMeeting,
  LeadQualification,
  LeadRecord,
  LeadSource,
  LeadStatus,
  MeetingAttendee
} from '../types/lead';

const LEADS_PREFIX = '/api/v1/leads';
const AI_TIMEOUT_MS = 90_000;

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
  techStack?: string[] | string;
  complianceStandards?: string[] | string;
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
  qualification_score?: number | null;
  qualification_status?: string | null;
  organization?: string;
  client_name?: string;
  requirements_summary?: string;
  client_request_raw?: string;
}

export async function fetchLeads(): Promise<LeadItem[]> {
  try {
    const list = await apiRequest<LeadItem[]>(LEADS_PREFIX);
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
  return await apiRequest<AnalyzeLeadResult>(`${LEADS_PREFIX}/intake/analyze`, {
    method: 'POST',
    body: { rawRfpContent, source, persist },
    timeoutMs: AI_TIMEOUT_MS
  });
}

export async function qualifyLead(leadId: string, inquiryText?: string): Promise<{ qualification: QualificationData; lead: LeadItem }> {
  return await apiRequest<{ qualification: QualificationData; lead: LeadItem }>(`${LEADS_PREFIX}/${encodeURIComponent(leadId)}/qualify`, {
    method: 'POST',
    body: { leadId, inquiryText },
    timeoutMs: AI_TIMEOUT_MS
  });
}

export async function getLeadById(leadId: string): Promise<LeadItem | null> {
  try {
    return await apiRequest<LeadItem>(`${LEADS_PREFIX}/${encodeURIComponent(leadId)}`);
  } catch {
    return null;
  }
}

export async function updateLead(leadId: string, updates: Partial<LeadItem>): Promise<LeadItem> {
  return await apiRequest<LeadItem>(`${LEADS_PREFIX}/${encodeURIComponent(leadId)}`, {
    method: 'PUT',
    body: updates
  });
}

export async function deleteLead(leadId: string): Promise<void> {
  await apiRequest<void>(`${LEADS_PREFIX}/${encodeURIComponent(leadId)}`, {
    method: 'DELETE'
  });
}

export interface LeadListQuery {
  page?: number;
  limit?: number;
  status?: LeadStatus;
  source?: LeadSource;
  search?: string;
  assignedTo?: string;
  clientId?: string;
}

export interface CreateLeadInput {
  title: string;
  source?: LeadSource;
  rawRfpContent: string;
  extractedMetadata?: LeadExtractedMetadata;
  clientId?: string | null;
  assignedTo?: string | null;
}

export type UpdateLeadInput = Partial<CreateLeadInput>;

function toQueryString(query: LeadListQuery): string {
  const params = new URLSearchParams();
  if (query.page !== undefined) params.set('page', String(query.page));
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  if (query.status) params.set('status', query.status);
  if (query.source) params.set('source', query.source);
  if (query.search) params.set('search', query.search);
  if (query.assignedTo) params.set('assignedTo', query.assignedTo);
  if (query.clientId) params.set('clientId', query.clientId);
  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
}

export const leadService = {
  analyzeIntake: (rawRfpContent: string, source?: LeadSource) =>
    apiRequest<AnalyzeLeadResult>(`${LEADS_PREFIX}/intake/analyze`, {
      method: 'POST',
      body: { rawRfpContent, source, persist: false },
      timeoutMs: AI_TIMEOUT_MS
    }),

  listLeads: async (query: LeadListQuery = {}): Promise<{ leads: LeadListItem[]; meta: ListMeta | null }> => {
    const result = await apiRequestWithMeta<LeadListItem[]>(`${LEADS_PREFIX}${toQueryString(query)}`);
    return { leads: result.data ?? [], meta: result.meta };
  },

  getLead: (id: string) => apiRequest<LeadRecord>(`${LEADS_PREFIX}/${encodeURIComponent(id)}`),

  createLead: (input: CreateLeadInput) => apiRequest<LeadRecord>(LEADS_PREFIX, { method: 'POST', body: input }),

  updateLead: (id: string, patch: UpdateLeadInput) =>
    apiRequest<LeadRecord>(`${LEADS_PREFIX}/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch }),

  updateStatus: (id: string, status: LeadStatus) =>
    apiRequest<LeadRecord>(`${LEADS_PREFIX}/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: { status } }),

  deleteLead: (id: string) =>
    apiRequest<void>(`${LEADS_PREFIX}/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  qualify: (id: string) =>
    apiRequest<LeadQualification>(`${LEADS_PREFIX}/${encodeURIComponent(id)}/qualifications`, {
      method: 'POST',
      timeoutMs: AI_TIMEOUT_MS
    }),

  getLatestQualification: (id: string) =>
    apiRequest<LeadQualification>(`${LEADS_PREFIX}/${encodeURIComponent(id)}/qualifications/latest`),

  listMeetings: (leadId: string) =>
    apiRequest<LeadMeeting[]>(`${LEADS_PREFIX}/${encodeURIComponent(leadId)}/meetings`),

  createMeeting: (leadId: string, input: { title: string; meetingDate?: string; attendees?: MeetingAttendee[] }) =>
    apiRequest<LeadMeeting>(`${LEADS_PREFIX}/${encodeURIComponent(leadId)}/meetings`, { method: 'POST', body: input }),

  createProposal: (leadId: string, title?: string) =>
    apiRequest<{ id: string; title: string; status: string; totalCost: number | null; currency: string }>(
      `${LEADS_PREFIX}/${encodeURIComponent(leadId)}/proposals`,
      { method: 'POST', body: title ? { title } : {} }
    )
};
