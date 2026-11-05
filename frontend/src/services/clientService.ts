import { apiRequest, apiRequestWithMeta } from './apiClient';
import type { ListMeta } from '../types/auth';
import type { ClientLeadSummary, ClientRecord } from '../types/client';

const CLIENTS_PREFIX = '/api/v1/clients';

export interface ClientListQuery {
  page?: number;
  limit?: number;
  search?: string;
  industry?: string;
}

export interface ClientLeadQuery {
  page?: number;
  limit?: number;
  status?: string;
}

export interface CreateClientInput {
  companyName: string;
  industry?: string | null;
  contactPerson?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  country?: string;
}

export type UpdateClientInput = Partial<CreateClientInput>;

function clientQueryToString(query: ClientListQuery): string {
  const params = new URLSearchParams();
  if (query.page !== undefined) params.set('page', String(query.page));
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  if (query.search) params.set('search', query.search);
  if (query.industry) params.set('industry', query.industry);
  return serialize(params);
}

function leadQueryToString(query: ClientLeadQuery): string {
  const params = new URLSearchParams();
  if (query.page !== undefined) params.set('page', String(query.page));
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  if (query.status) params.set('status', query.status);
  return serialize(params);
}

function serialize(params: URLSearchParams): string {
  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
}

export const clientService = {
  listClients: async (query: ClientListQuery = {}): Promise<{ clients: ClientRecord[]; meta: ListMeta | null }> => {
    const result = await apiRequestWithMeta<ClientRecord[]>(`${CLIENTS_PREFIX}${clientQueryToString(query)}`);
    return { clients: result.data, meta: result.meta };
  },

  getClient: (id: string) => apiRequest<ClientRecord>(`${CLIENTS_PREFIX}/${encodeURIComponent(id)}`),

  createClient: (input: CreateClientInput) => apiRequest<ClientRecord>(CLIENTS_PREFIX, { method: 'POST', body: input }),

  updateClient: (id: string, patch: UpdateClientInput) =>
    apiRequest<ClientRecord>(`${CLIENTS_PREFIX}/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch }),

  deleteClient: (id: string) =>
    apiRequest<void>(`${CLIENTS_PREFIX}/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  listClientLeads: async (
    id: string,
    query: ClientLeadQuery = {}
  ): Promise<{ leads: ClientLeadSummary[]; meta: ListMeta | null }> => {
    const result = await apiRequestWithMeta<ClientLeadSummary[]>(
      `${CLIENTS_PREFIX}/${encodeURIComponent(id)}/leads${leadQueryToString(query)}`
    );
    return { leads: result.data ?? [], meta: result.meta };
  }
};
