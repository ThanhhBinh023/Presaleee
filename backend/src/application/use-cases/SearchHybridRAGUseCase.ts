import { IKnowledgeRepository } from '../../domain/repositories/IKnowledgeRepository.js';
import { IEmbeddingGateway } from '../../domain/repositories/IEmbeddingGateway.js';
import { RAGSearchInputDTO, RAGSearchOutputDTO } from '../dtos/RAGSearchDTO.js';
import { ValidationError } from '../../domain/errors/AppError.js';

export class SearchHybridRAGUseCase {
  constructor(
    private readonly knowledgeRepo: IKnowledgeRepository,
    private readonly embeddingGateway: IEmbeddingGateway
  ) {}

  async execute(input: RAGSearchInputDTO): Promise<RAGSearchOutputDTO> {
    if (typeof input.query !== 'string' || !input.query.trim()) {
      throw new ValidationError('Search query must not be empty.');
    }
    const trimmedQuery = input.query.trim();
    if (trimmedQuery.length > 20_000) throw new ValidationError('query must not exceed 20,000 characters.');
    if (input.domain !== undefined && input.domain !== null
      && (typeof input.domain !== 'string' || !input.domain.trim() || input.domain.length > 100)) {
      throw new ValidationError('domain must be text up to 100 characters.');
    }

    const topK = input.topK ?? 3;
    if (!Number.isInteger(topK) || topK < 1 || topK > 20) throw new ValidationError('topK must be an integer from 1 to 20.');

    // 1. Generate query dense embedding (768 dims)
    const [queryEmbedding] = await this.embeddingGateway.generateEmbeddings([trimmedQuery]);

    // 2. Perform hybrid search (Dense vector + FTS + RRF) on PostgreSQL
    const chunks = await this.knowledgeRepo.searchHybrid({
      queryText: trimmedQuery,
      queryEmbedding,
      matchCount: topK,
      domain: typeof input.domain === 'string' && input.domain.trim() ? input.domain.trim() : null,
      organizationId: input.organizationId || null
    });

    return {
      chunks,
      totalRetrieved: chunks.length
    };
  }
}

