import { ConflictError, NotFoundError, ValidationError } from '../../domain/errors/AppError.js';
import { LEAD_STATUSES } from '../../domain/entities/Lead.js';
import { Client } from '../../domain/entities/Client.js';
import { ClientInput, IClientRepository, UpdateClientInput } from '../../domain/repositories/IClientRepository.js';
import { ILeadRepository } from '../../domain/repositories/ILeadRepository.js';
import { IAuditRepository } from '../../domain/repositories/IAuditRepository.js';
import { AuthenticatedScope } from '../dtos/AuthenticatedScope.js';
import {
  assignIfPresent,
  nullableText,
  pagination,
  parseEnum,
  requiredText,
  optionalEnum
} from '../services/RequestValidation.js';
import { CLIENT_INDUSTRIES } from '../../domain/entities/Client.js';

const MAX_ORGANIZATION_NAME = 255;
const COUNTRY_PATTERN = /^[A-Za-z][A-Za-z\s.-]{1,99}$/;

function parseCountry(value: unknown, field: string): string {
  if (value === undefined || value === null || value === '') return 'Vietnam';
  if (typeof value !== 'string' || !COUNTRY_PATTERN.test(value.trim())) {
    throw new ValidationError(`${field} must be a country name of 2 to 100 characters.`);
  }
  return value.trim();
}

/** Industry stays free-form for legacy rows but new writes must pick a known taxonomy value. */
function parseIndustry(value: unknown, field: string): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  return parseEnum(value, CLIENT_INDUSTRIES, field);
}

function normalizeCreate(dto: Record<string, unknown>): ClientInput {
  const input: ClientInput = {
    organizationId: '',
    companyName: requiredText(dto.companyName, 'companyName', MAX_ORGANIZATION_NAME),
    industry: parseIndustry(dto.industry, 'industry') ?? null,
    contactPerson: nullableText(dto.contactPerson, 'contactPerson', 255) ?? null,
    contactEmail: nullableText(dto.contactEmail, 'contactEmail', 255) ?? null,
    contactPhone: nullableText(dto.contactPhone, 'contactPhone', 50) ?? null,
    country: parseCountry(dto.country, 'country')
  };
  return input;
}

function normalizeUpdate(dto: Record<string, unknown>): UpdateClientInput {
  const input: UpdateClientInput = {};
  assignIfPresent(dto, input, 'companyName', value => requiredText(value, 'companyName', MAX_ORGANIZATION_NAME));
  assignIfPresent(dto, input, 'industry', value => parseIndustry(value, 'industry'));
  assignIfPresent(dto, input, 'contactPerson', value => nullableText(value, 'contactPerson', 255));
  assignIfPresent(dto, input, 'contactEmail', value => nullableText(value, 'contactEmail', 255));
  assignIfPresent(dto, input, 'contactPhone', value => nullableText(value, 'contactPhone', 50));
  assignIfPresent(dto, input, 'country', value => parseCountry(value, 'country'));
  if (Object.keys(input).length === 0) throw new ValidationError('At least one editable field is required.');
  return input;
}

export class CreateClientUseCase {
  constructor(
    private readonly clientRepository: IClientRepository,
    private readonly auditRepository: IAuditRepository
  ) {}

  async execute(scope: AuthenticatedScope, dto: Record<string, unknown>): Promise<Client> {
    const input = { ...normalizeCreate(dto), organizationId: scope.organizationId };
    const client = await this.clientRepository.create(input);
    await this.auditRepository.record({
      organizationId: scope.organizationId,
      actorId: scope.userId,
      action: 'CLIENT_CREATED',
      entityType: 'client',
      entityId: client.id,
      payload: { companyName: client.companyName, industry: client.industry },
      ipAddress: scope.ipAddress
    });
    return client;
  }
}

export class ListClientsUseCase {
  constructor(private readonly clientRepository: IClientRepository) {}

  async execute(scope: AuthenticatedScope, query: Record<string, unknown>) {
    const page = pagination(query.page, 'page', 100_000, 1);
    const limit = pagination(query.limit, 'limit', 100, 20);
    const search = query.search === undefined || query.search === ''
      ? undefined
      : requiredText(query.search, 'search', 200);
    const industry = optionalEnum(query.industry, CLIENT_INDUSTRIES, 'industry');
    const result = await this.clientRepository.list({
      organizationId: scope.organizationId,
      page,
      limit,
      search,
      industry
    });
    return { clients: result.clients, total: result.total, page, limit, totalPages: Math.ceil(result.total / limit) || 1 };
  }
}

export class GetClientUseCase {
  constructor(private readonly clientRepository: IClientRepository) {}

  async execute(scope: AuthenticatedScope, id: string): Promise<Client> {
    const client = await this.clientRepository.findById(id, { organizationId: scope.organizationId });
    if (!client) throw new NotFoundError('Client not found.');
    return client;
  }
}

export class UpdateClientUseCase {
  constructor(
    private readonly clientRepository: IClientRepository,
    private readonly auditRepository: IAuditRepository
  ) {}

  async execute(scope: AuthenticatedScope, id: string, dto: Record<string, unknown>): Promise<Client> {
    const existing = await this.clientRepository.findById(id, { organizationId: scope.organizationId });
    if (!existing) throw new NotFoundError('Client not found.');
    const updates = normalizeUpdate(dto);
    const client = await this.clientRepository.update(id, { organizationId: scope.organizationId }, updates);
    if (!client) throw new NotFoundError('Client not found.');
    await this.auditRepository.record({
      organizationId: scope.organizationId,
      actorId: scope.userId,
      action: 'CLIENT_UPDATED',
      entityType: 'client',
      entityId: client.id,
      payload: { changedFields: Object.keys(updates) },
      ipAddress: scope.ipAddress
    });
    return client;
  }
}

export class DeleteClientUseCase {
  constructor(
    private readonly clientRepository: IClientRepository,
    private readonly auditRepository: IAuditRepository
  ) {}

  async execute(scope: AuthenticatedScope, id: string): Promise<void> {
    const existing = await this.clientRepository.findById(id, { organizationId: scope.organizationId });
    if (!existing) throw new NotFoundError('Client not found.');
    const linkedLeads = await this.clientRepository.countLeads(id, { organizationId: scope.organizationId });
    if (linkedLeads > 0) {
      throw new ConflictError(`Reassign the ${linkedLeads} lead(s) attached to this client before deleting it.`);
    }
    const deleted = await this.clientRepository.delete(id, { organizationId: scope.organizationId });
    if (!deleted) throw new NotFoundError('Client not found.');
    await this.auditRepository.record({
      organizationId: scope.organizationId,
      actorId: scope.userId,
      action: 'CLIENT_DELETED',
      entityType: 'client',
      entityId: id,
      payload: { companyName: existing.companyName },
      ipAddress: scope.ipAddress
    });
  }
}

export class ListClientLeadsUseCase {
  constructor(private readonly clientRepository: IClientRepository, private readonly leadRepository: ILeadRepository) {}

  async execute(scope: AuthenticatedScope, clientId: string, query: Record<string, unknown>) {
    const client = await this.clientRepository.findById(clientId, { organizationId: scope.organizationId });
    if (!client) throw new NotFoundError('Client not found.');
    const page = pagination(query.page, 'page', 100_000, 1);
    const limit = pagination(query.limit, 'limit', 100, 20);
    const result = await this.leadRepository.list({
      organizationId: scope.organizationId,
      page,
      limit,
      clientId: client.id,
      status: optionalEnum(query.status, LEAD_STATUSES, 'status')
    });
    return {
      leads: result.leads,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit) || 1
    };
  }
}
