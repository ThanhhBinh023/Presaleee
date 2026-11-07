export interface PortalSessionCreated {
  id: string;
  proposalId: string;
  organizationId: string;
  clientEmail: string;
  clientName: string | null;
  expiresAt: string;
  accessToken: string;
}

export interface PortalSessionDetail {
  id: string;
  proposalId: string;
  clientEmail: string;
  clientName: string | null;
  expiresAt: string;
  revokedAt: string | null;
  lastAccessedAt: string | null;
  createdAt: string;
  commentCount: number;
}

export interface PortalMaterial {
  id: string;
  title: string;
  description: string | null;
  fileName: string;
  fileUrl: string;
  mimeType: string | null;
  createdAt: string;
}

export interface PortalMaterialDetail extends PortalMaterial {
  isShared: boolean;
  createdBy: string | null;
}

export interface PortalComment {
  id: string;
  proposalId: string;
  sessionId: string;
  authorName: string;
  authorEmail: string;
  body: string;
  createdAt: string;
}

export interface PortalProposalView {
  id: string;
  title: string;
  version: string;
  status: string;
  totalCost: number | null;
  currency: string;
  estimatedTimelineWeeks: number | null;
  sheets: Array<{ sheetName: string; sheetOrder: number; sheetData: Record<string, unknown> }>;
}

export interface PortalQuestionAnswer {
  answer: string;
  citations: Array<{ label: string; sheetName: string; excerpt: string }>;
}

export const PORTAL_MANAGER_ROLES = ['ADMIN', 'PRESALE_LEAD', 'SALES_REP', 'SOLUTION_ARCHITECT'] as const;
export const PORTAL_FIRST_SHARE_ROLES = ['ADMIN', 'PRESALE_LEAD'] as const;
