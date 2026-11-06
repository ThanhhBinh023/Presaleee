import { apiRequest, apiRequestWithMeta } from './apiClient';
import type { AuthUser, ListMeta, UserRole, UserStatus } from '../types/auth';
import type { MemberDirectoryEntry, OrganizationSummary, UserAccount } from '../types/user';

const USERS_PREFIX = '/api/v1/users';

export interface MemberListQuery {
  page?: number;
  limit?: number;
  role?: UserRole;
  status?: UserStatus;
  search?: string;
  allOrganizations?: boolean;
}

export interface AddMemberInput {
  email: string;
  fullName: string;
  password: string;
  role?: UserRole;
}

export interface UpdateMemberInput {
  fullName?: string;
  role?: UserRole;
  status?: UserStatus;
}

export interface UpdateOwnProfileInput {
  fullName?: string;
  avatarUrl?: string | null;
  password?: string;
  currentPassword?: string;
}

function toQueryString(query: MemberListQuery): string {
  const params = new URLSearchParams();
  if (query.page !== undefined) params.set('page', String(query.page));
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  if (query.role) params.set('role', query.role);
  if (query.status) params.set('status', query.status);
  if (query.search) params.set('search', query.search);
  if (query.allOrganizations) params.set('allOrganizations', 'true');
  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
}

export const userService = {
  listOrganizations: () => apiRequest<OrganizationSummary[]>(`${USERS_PREFIX}/me/organizations`),

  listMembers: async (query: MemberListQuery = {}): Promise<{ members: MemberDirectoryEntry[]; meta: ListMeta | null }> => {
    const result = await apiRequestWithMeta<MemberDirectoryEntry[]>(`${USERS_PREFIX}${toQueryString(query)}`);
    return { members: result.data, meta: result.meta };
  },

  getMember: (id: string) => apiRequest<MemberDirectoryEntry>(`${USERS_PREFIX}/${encodeURIComponent(id)}`),

  addMember: (input: AddMemberInput) => apiRequest<UserAccount>(USERS_PREFIX, { method: 'POST', body: input }),

  updateMember: (id: string, patch: UpdateMemberInput) =>
    apiRequest<UserAccount>(`${USERS_PREFIX}/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch }),

  updateOwnProfile: (input: UpdateOwnProfileInput) =>
    apiRequest<{ user: AuthUser; passwordChanged: boolean }>(`${USERS_PREFIX}/me`, { method: 'PATCH', body: input })
};