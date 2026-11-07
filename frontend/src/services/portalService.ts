import { apiDownload, apiRequest, apiRequestWithMeta } from './apiClient';
import type { ListMeta } from '../types/auth';
import type {
  PortalComment,
  PortalMaterial,
  PortalMaterialDetail,
  PortalProposalView,
  PortalQuestionAnswer,
  PortalSessionCreated,
  PortalSessionDetail
} from '../types/portal';

const STAFF = '/api/v1';
const CLIENT = '/api/v1/portal/proposals';

export interface CreatePortalSessionInput {
  proposalId: string;
  clientEmail: string;
  clientName?: string;
  expiresInHours?: number;
}

export interface CreatePortalMaterialInput {
  title: string;
  fileName: string;
  fileUrl: string;
  description?: string;
  mimeType?: string;
  isShared?: boolean;
}

export const portalStaffService = {
  createSession: (input: CreatePortalSessionInput) =>
    apiRequest<PortalSessionCreated>(`${STAFF}/portal/sessions`, { method: 'POST', body: input }),

  revokeSession: (sessionId: string) =>
    apiRequest<void>(`${STAFF}/portal/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' }),

  listSessions: async (proposalId: string): Promise<{ sessions: PortalSessionDetail[]; meta: ListMeta | null }> => {
    const result = await apiRequestWithMeta<PortalSessionDetail[]>(
      `${STAFF}/proposals/${encodeURIComponent(proposalId)}/portal-sessions`
    );
    return { sessions: result.data ?? [], meta: result.meta };
  },

  listMaterials: async (proposalId: string): Promise<{ materials: PortalMaterialDetail[]; meta: ListMeta | null }> => {
    const result = await apiRequestWithMeta<PortalMaterialDetail[]>(
      `${STAFF}/proposals/${encodeURIComponent(proposalId)}/portal-materials`
    );
    return { materials: result.data ?? [], meta: result.meta };
  },

  createMaterial: (proposalId: string, input: CreatePortalMaterialInput) =>
    apiRequest<PortalMaterial>(`${STAFF}/proposals/${encodeURIComponent(proposalId)}/portal-materials`, {
      method: 'POST',
      body: input
    }),

  deleteMaterial: (proposalId: string, materialId: string) =>
    apiRequest<void>(
      `${STAFF}/proposals/${encodeURIComponent(proposalId)}/portal-materials/${encodeURIComponent(materialId)}`,
      { method: 'DELETE' }
    )
};

function clientOpts(token: string, extra: { method?: 'GET' | 'POST'; body?: unknown; timeoutMs?: number } = {}) {
  return { ...extra, bearerToken: token, credentials: 'omit' as const };
}

export const portalClientService = {
  getProposal: (proposalId: string, token: string) =>
    apiRequest<PortalProposalView>(`${CLIENT}/${encodeURIComponent(proposalId)}`, clientOpts(token)),

  listComments: async (proposalId: string, token: string): Promise<PortalComment[]> => {
    const result = await apiRequestWithMeta<PortalComment[]>(
      `${CLIENT}/${encodeURIComponent(proposalId)}/comments`,
      clientOpts(token)
    );
    return result.data ?? [];
  },

  createComment: (proposalId: string, token: string, body: string, authorName?: string) =>
    apiRequest<PortalComment>(
      `${CLIENT}/${encodeURIComponent(proposalId)}/comments`,
      clientOpts(token, { method: 'POST', body: { body, authorName } })
    ),

  listMaterials: async (proposalId: string, token: string): Promise<PortalMaterial[]> => {
    const result = await apiRequestWithMeta<PortalMaterial[]>(
      `${CLIENT}/${encodeURIComponent(proposalId)}/materials`,
      clientOpts(token)
    );
    return result.data ?? [];
  },

  ask: (proposalId: string, token: string, question: string) =>
    apiRequest<PortalQuestionAnswer>(
      `${CLIENT}/${encodeURIComponent(proposalId)}/questions`,
      clientOpts(token, { method: 'POST', body: { question }, timeoutMs: 90_000 })
    ),

  exportPdf: (proposalId: string, token: string) =>
    apiDownload(`${CLIENT}/${encodeURIComponent(proposalId)}/export-pdf`, 'proposal.pdf', 30_000, { bearerToken: token })
};
