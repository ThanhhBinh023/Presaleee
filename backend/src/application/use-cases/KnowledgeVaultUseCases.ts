import { IKnowledgeRepository } from '../../domain/repositories/IKnowledgeRepository.js';
import { KnowledgeDocument } from '../../domain/entities/KnowledgeDocument.js';
import { NotFoundError, ValidationError } from '../../domain/errors/AppError.js';

export interface ListKnowledgeDocumentsInput {
  organizationId: string;
  category?: unknown;
  domain?: unknown;
  search?: unknown;
  page?: unknown;
  limit?: unknown;
}

export class ListKnowledgeDocumentsUseCase {
  constructor(private readonly repository: IKnowledgeRepository) {}

  async execute(input: ListKnowledgeDocumentsInput): Promise<{
    documents: KnowledgeDocument[]; total: number; page: number; limit: number; totalPages: number;
  }> {
    if (!input.organizationId) throw new ValidationError('Authenticated organization is required.');
    const page = input.page === undefined ? 1 : Number(input.page);
    const limit = input.limit === undefined ? 20 : Number(input.limit);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new ValidationError('page must be >= 1 and limit must be from 1 to 100.');
    }
    const category = this.optionalFilter(input.category, 'category', 100);
    const domain = this.optionalFilter(input.domain, 'domain', 100);
    const search = this.optionalFilter(input.search, 'search', 200);
    const result = await this.repository.findDocuments({
      organizationId: input.organizationId, category, domain, search, limit, offset: (page - 1) * limit
    });
    return { ...result, page, limit, totalPages: Math.ceil(result.total / limit) || 1 };
  }

  private optionalFilter(value: unknown, name: string, maxLength: number): string | undefined {
    if (value === undefined) return undefined;
    if (typeof value !== 'string' || value.length > maxLength) throw new ValidationError(`${name} must be text up to ${maxLength} characters.`);
    const trimmed = value.trim();
    return trimmed || undefined;
  }
}

export class GetKnowledgeDocumentUseCase {
  constructor(private readonly repository: IKnowledgeRepository) {}

  async execute(id: string, organizationId: string): Promise<KnowledgeDocument> {
    if (!id || !organizationId) throw new ValidationError('Document ID and organization are required.');
    const document = await this.repository.findDocumentById(id, organizationId);
    if (!document) throw new NotFoundError('Knowledge document not found.');
    return document;
  }
}

export class DeleteKnowledgeDocumentUseCase {
  constructor(private readonly repository: IKnowledgeRepository) {}

  async execute(id: string, organizationId: string): Promise<void> {
    if (!id || !organizationId) throw new ValidationError('Document ID and organization are required.');
    const deleted = await this.repository.deleteDocument(id, organizationId);
    if (!deleted) throw new NotFoundError('Knowledge document not found.');
  }
}
