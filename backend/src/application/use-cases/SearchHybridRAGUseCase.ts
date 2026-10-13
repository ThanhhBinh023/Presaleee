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
    if (!input.query || !input.query.trim()) {
      throw new ValidationError('Search query must not be empty.');
    }

    const trimmedQuery = input.query.trim();
    const topK = input.topK && input.topK > 0 ? input.topK : 3;

    // 1. Generate query dense embedding (768 dims)
    const [queryEmbedding] = await this.embeddingGateway.generateEmbeddings([trimmedQuery]);

    // 2. Perform hybrid search (Dense vector + FTS + RRF) on PostgreSQL
    const chunks = await this.knowledgeRepo.searchHybrid({
      queryText: trimmedQuery,
      queryEmbedding,
      matchCount: topK,
      domain: input.domain || null
    });

    return {
      chunks,
      totalRetrieved: chunks.length
    };
  }
}

