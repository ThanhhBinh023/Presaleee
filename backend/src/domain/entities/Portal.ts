export interface PortalSession {
  id: string;
  proposalId: string;
  organizationId: string;
  clientEmail: string;
  clientName: string | null;
  expiresAt: string;
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

export interface PortalMaterial {
  id: string;
  title: string;
  description: string | null;
  fileName: string;
  fileUrl: string;
  mimeType: string | null;
  createdAt: string;
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

export interface PortalMaterialDetail extends PortalMaterial {
  isShared: boolean;
  createdBy: string | null;
}
