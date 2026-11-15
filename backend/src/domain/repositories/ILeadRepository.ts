import { Lead, LeadListItem, LeadSource, LeadStatus } from '../entities/Lead.js';

export interface LeadScope { organizationId: string; }
export interface ListLeadFilters extends LeadScope {
  page: number;
  limit: number;
  status?: LeadStatus;
  source?: LeadSource;
  assignedTo?: string;
  clientId?: string;
  search?: string;
}
export interface CreateLeadInput extends LeadScope {
  clientId?: string | null;
  createdBy: string;
  assignedTo?: string | null;
  title: string;
  source: LeadSource;
  rawRfpContent: string;
  extractedMetadata: Record<string, unknown>;
}
export interface UpdateLeadInput {
  title?: string;
  clientId?: string | null;
  assignedTo?: string | null;
  source?: LeadSource;
  rawRfpContent?: string;
  extractedMetadata?: Record<string, unknown>;
}

/** A qualification as it is persisted: the numeric score plus the evidence blob behind it. */
export interface StoredQualification {
  score: number;
  details: object;
}

export interface ILeadRepository {
  updateStatusWithQualificationCheck(id: string, scope: LeadScope, status: LeadStatus, allowedCurrentStatuses: LeadStatus[], requiresQualification: boolean): Promise<Lead | null>;
  create(input: CreateLeadInput): Promise<Lead>;
  list(filters: ListLeadFilters): Promise<{ leads: LeadListItem[]; total: number }>;
  findById(id: string, scope: LeadScope): Promise<Lead | null>;
  update(id: string, scope: LeadScope, input: UpdateLeadInput): Promise<Lead | null>;
  delete(id: string, scope: LeadScope): Promise<boolean>;
  saveQualification(id: string, scope: LeadScope, qualification: StoredQualification, qualifyFrom: LeadStatus[]): Promise<Lead | null>;
}
