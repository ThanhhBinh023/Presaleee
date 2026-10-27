import { PortalComment, PortalMaterial, PortalSession } from '../entities/Portal.js';

export type PortalSessionContext = PortalSession;

export interface IPortalRepository {
  createSession(input: {
    proposalId: string; organizationId: string; createdBy: string; clientEmail: string;
    clientName: string | null; tokenHash: string; expiresAt: string;
  }): Promise<PortalSession | null>;
  findActiveSession(tokenHash: string, proposalId: string): Promise<PortalSessionContext | null>;
  revokeSession(sessionId: string, organizationId: string, actorId: string): Promise<boolean>;
  listComments(proposalId: string, organizationId: string): Promise<PortalComment[]>;
  createComment(input: {
    proposalId: string; organizationId: string; sessionId: string;
    authorName: string; body: string;
  }): Promise<PortalComment | null>;
  listMaterials(proposalId: string, organizationId: string): Promise<PortalMaterial[]>;
  createMaterial(input: {
    proposalId: string; organizationId: string; createdBy: string; title: string;
    description: string | null; fileName: string; fileUrl: string; mimeType: string | null; isShared: boolean;
  }): Promise<PortalMaterial | null>;
  deleteMaterial(proposalId: string, materialId: string, organizationId: string): Promise<boolean>;
}
