import { Client } from '../entities/Client.js';

export interface ClientScope {
  organizationId: string;
}

export interface ListClientFilters extends ClientScope {
  page: number;
  limit: number;
  search?: string;
  industry?: string;
}

export interface ClientInput extends ClientScope {
  companyName: string;
  industry: string | null;
  contactPerson: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  country: string;
}

export type UpdateClientInput = Partial<ClientInput>;

export interface IClientRepository {
  create(input: ClientInput): Promise<Client>;
  list(filters: ListClientFilters): Promise<{ clients: Client[]; total: number }>;
  findById(id: string, scope: ClientScope): Promise<Client | null>;
  update(id: string, scope: ClientScope, input: UpdateClientInput): Promise<Client | null>;
  delete(id: string, scope: ClientScope): Promise<boolean>;
  countLeads(clientId: string, scope: ClientScope): Promise<number>;
}
