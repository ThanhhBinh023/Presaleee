import { apiDownload, apiRequest, apiRequestWithMeta, ApiError } from './apiClient';
import type { ListMeta } from '../types/auth';
import type {
  GenerateSheetsResult,
  ProposalRecord,
  ProposalSheet,
  ProposalStatus,
  ProposalWithSheets
} from '../types/proposal';

const PREFIX = '/api/v1/proposals';
const AI_TIMEOUT_MS = 120_000;
const AI_BATCH_TIMEOUT_MS = 300_000;

export interface ProposalSheetItem {
  id: string;
  proposalId: string;
  sheetName: string;
  sheetOrder: number;
  sheetData: Record<string, any>;
  aiGenerated?: boolean;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProposalItem {
  id: string;
  title: string;
  organizationId?: string | null;
  leadId?: string | null;
  createdBy?: string | null;
  version: string;
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'SENT_TO_CLIENT' | 'ACCEPTED' | 'REJECTED';
  totalCost?: number | null;
  currency: string;
  estimatedTimelineWeeks?: number | null;
  exportExcelUrl?: string | null;
  reviewNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  sheets: ProposalSheetItem[];
}

export interface UIDesignBrief {
  title: string;
  target_users: string[];
  key_screens: string[];
  ui_style_guide: string;
  interaction_flow: string;
}

export async function fetchProposalByLead(leadId: string): Promise<ProposalItem | null> {
  try {
    return await apiRequest<ProposalItem>(`${PREFIX}/lead/${encodeURIComponent(leadId)}`);
  } catch (err) {
    console.error('Error fetching proposal by lead:', err);
    return null;
  }
}

export async function generateProposalFromLead(
  leadId: string, 
  customInstructions?: string
): Promise<ProposalItem> {
  return await apiRequest<ProposalItem>(`${PREFIX}/generate-from-lead`, {
    method: 'POST',
    body: { leadId, customInstructions },
    timeoutMs: AI_TIMEOUT_MS
  });
}

export async function updateProposalSheet(
  proposalId: string, 
  sheetName: string, 
  sheetData: Record<string, any>
): Promise<ProposalSheetItem> {
  return await apiRequest<ProposalSheetItem>(`${PREFIX}/${encodeURIComponent(proposalId)}/sheets/${encodeURIComponent(sheetName)}`, {
    method: 'PUT',
    body: { sheetData, aiGenerated: false }
  });
}

export async function updateProposalLifecycle(
  proposalId: string, 
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'SENT_TO_CLIENT' | 'ACCEPTED' | 'REJECTED',
  reviewNotes?: string
): Promise<ProposalItem> {
  return await apiRequest<ProposalItem>(`${PREFIX}/${encodeURIComponent(proposalId)}/lifecycle`, {
    method: 'PATCH',
    body: { status, reviewNotes }
  });
}

export async function submitProposalForReview(proposalId: string): Promise<ProposalItem> {
  return await apiRequest<ProposalItem>(`${PREFIX}/${encodeURIComponent(proposalId)}/submit-for-review`, {
    method: 'POST'
  });
}

export async function generateProposalUIDesignBrief(proposalId: string): Promise<UIDesignBrief> {
  return await apiRequest<UIDesignBrief>(`${PREFIX}/${encodeURIComponent(proposalId)}/ui-brief`, {
    method: 'POST',
    timeoutMs: AI_TIMEOUT_MS
  });
}

export interface SheetAssessmentItem {
  sheetOrder: number;
  sheetName: string;
  score: number;
  status: 'PASSED' | 'NEEDS_REVISION';
  criteria: string;
  findings: string[];
  recommendations: string;
}

export interface SelfAssessmentResult {
  proposalId: string;
  proposalTitle: string;
  overallScore: number;
  rating: string;
  assessedByRole: string;
  evaluatedAt: string;
  summary: string;
  sheets: SheetAssessmentItem[];
}

export interface AIAssistResult {
  reply: string;
  suggestedText?: string;
  sheetName?: string;
  selectedText?: string;
}

export async function aiAssistProposal(
  proposalId: string,
  params: { prompt?: string; selectedText?: string; sheetName?: string; currentSheetData?: any }
): Promise<AIAssistResult> {
  return await apiRequest<AIAssistResult>(`${PREFIX}/${encodeURIComponent(proposalId)}/ai-assist`, {
    method: 'POST',
    body: params,
    timeoutMs: AI_TIMEOUT_MS
  });
}

export async function selfAssessProposal(proposalId: string): Promise<SelfAssessmentResult> {
  return await apiRequest<SelfAssessmentResult>(`${PREFIX}/${encodeURIComponent(proposalId)}/self-assess`, {
    method: 'POST',
    timeoutMs: AI_TIMEOUT_MS
  });
}

export function getProposalExcelDownloadUrl(proposalId: string): string {
  return `${PREFIX}/${encodeURIComponent(proposalId)}/export-excel`;
}

export function getProposalPdfDownloadUrl(proposalId: string): string {
  return `${PREFIX}/${encodeURIComponent(proposalId)}/export-pdf`;
}

export interface ProposalListQuery {
  page?: number;
  limit?: number;
  status?: ProposalStatus;
  search?: string;
  leadId?: string;
  presaleLeadOnly?: boolean;
}

export interface CreateProposalInput {
  title: string;
  version?: string;
  currency?: string;
  leadId?: string | null;
}

function toQueryString(query: ProposalListQuery): string {
  const params = new URLSearchParams();
  if (query.page !== undefined) params.set('page', String(query.page));
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  if (query.status) params.set('status', query.status);
  if (query.search) params.set('search', query.search);
  if (query.leadId) params.set('leadId', query.leadId);
  if (query.presaleLeadOnly) params.set('presaleLeadOnly', 'true');
  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
}

function sheetPath(id: string, sheetName: string): string {
  return `${PREFIX}/${encodeURIComponent(id)}/sheets/${encodeURIComponent(sheetName)}`;
}

export const proposalService = {
  list: async (query: ProposalListQuery = {}): Promise<{ proposals: ProposalRecord[]; meta: ListMeta | null }> => {
    const result = await apiRequestWithMeta<ProposalRecord[]>(`${PREFIX}${toQueryString(query)}`);
    return { proposals: result.data ?? [], meta: result.meta };
  },

  getById: (id: string) => apiRequest<ProposalWithSheets>(`${PREFIX}/${encodeURIComponent(id)}`),

  create: (input: CreateProposalInput) => apiRequest<ProposalWithSheets>(PREFIX, { method: 'POST', body: input }),

  updateMetadata: (
    id: string,
    patch: { title?: string; version?: string; currency?: string; estimatedTimelineWeeks?: number | null }
  ) => apiRequest<ProposalRecord>(`${PREFIX}/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch }),

  updateStatus: (id: string, status: ProposalStatus) =>
    apiRequest<ProposalRecord>(`${PREFIX}/${encodeURIComponent(id)}`, { method: 'PATCH', body: { status } }),

  submitForReview: (id: string) =>
    apiRequest<ProposalRecord>(`${PREFIX}/${encodeURIComponent(id)}/submit-review`, { method: 'POST' }),

  updateSheet: (id: string, sheetName: string, sheetData: Record<string, unknown>) =>
    apiRequest<ProposalSheet>(sheetPath(id, sheetName), { method: 'PUT', body: { sheetData } }),

  generate: async (id: string, body: { sheetNames?: string[]; instructions?: string } = {}) => {
    try {
      return await apiRequest<GenerateSheetsResult>(`${PREFIX}/${encodeURIComponent(id)}/generate`, {
        method: 'POST',
        body,
        timeoutMs: AI_BATCH_TIMEOUT_MS
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        throw new ApiError(0, 'Hết thời gian chờ sinh proposal. Server có thể vẫn đang xử lý — hãy tải lại trang sau ít phút để kiểm tra kết quả, đừng bấm sinh lại ngay.');
      }
      throw err;
    }
  },

  generateSheet: (id: string, sheetName: string, instructions?: string) =>
    apiRequest<GenerateSheetsResult>(`${sheetPath(id, sheetName)}/generate`, {
      method: 'POST',
      body: instructions ? { instructions } : {},
      timeoutMs: AI_TIMEOUT_MS
    }),

  delete: (id: string) => apiRequest<void>(`${PREFIX}/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  exportExcel: (id: string) => apiDownload(`${PREFIX}/${encodeURIComponent(id)}/export-excel`, 'proposal.xlsx'),

  exportPdf: (id: string) => apiDownload(`${PREFIX}/${encodeURIComponent(id)}/export-pdf`, 'proposal.pdf')
};
