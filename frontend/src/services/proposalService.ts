export interface ProposalSheetItem {
  id: string;
  proposalId: string;
  sheetName: string;
  sheetOrder: number;
  sheetData: Record<string, any>;
  aiGenerated: boolean;
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
    const res = await fetch(`/api/v1/proposals/lead/${leadId}`, {
    credentials: 'include' });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch (err) {
    console.error('Error fetching proposal by lead:', err);
    return null;
  }
}

export async function generateProposalFromLead(
  leadId: string, 
  customInstructions?: string
): Promise<ProposalItem> {
  const res = await fetch('/api/v1/proposals/generate-from-lead', {
    credentials: 'include',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leadId, customInstructions })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to generate proposal from lead.');
  }
  const json = await res.json();
  return json.data;
}

export async function updateProposalSheet(
  proposalId: string, 
  sheetName: string, 
  sheetData: Record<string, any>
): Promise<ProposalSheetItem> {
  const encodedName = encodeURIComponent(sheetName);
  const res = await fetch(`/api/v1/proposals/${proposalId}/sheets/${encodedName}`, {
    credentials: 'include',
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sheetData, aiGenerated: false })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update proposal sheet.');
  }
  const json = await res.json();
  return json.data;
}

export async function updateProposalLifecycle(
  proposalId: string, 
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED'
): Promise<ProposalItem> {
  const res = await fetch(`/api/v1/proposals/${proposalId}/lifecycle`, {
    credentials: 'include',
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update proposal status.');
  }
  const json = await res.json();
  return json.data;
}

export async function generateProposalUIDesignBrief(proposalId: string): Promise<UIDesignBrief> {
  const res = await fetch(`/api/v1/proposals/${proposalId}/ui-brief`, {
    credentials: 'include',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to generate UI design brief.');
  }
  const json = await res.json();
  return json.data;
}

export function getProposalExcelDownloadUrl(proposalId: string): string {
  return `/api/v1/proposals/${proposalId}/export-excel`;
}
