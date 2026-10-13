import { dbPool } from './infrastructure/database/connection.js';
import { PostgresKnowledgeRepository } from './infrastructure/database/repositories/PostgresKnowledgeRepository.js';
import { GeminiEmbeddingGateway } from './infrastructure/ai/GeminiEmbeddingGateway.js';
import { FastAPILMGateway } from './infrastructure/ai/FastAPILMGateway.js';
import { SearchHybridRAGUseCase } from './application/use-cases/SearchHybridRAGUseCase.js';
import { IngestDocumentUseCase } from './application/use-cases/IngestDocumentUseCase.js';
import { GenerateProposalUseCase } from './application/use-cases/GenerateProposalUseCase.js';
import { RAGController } from './presentation/controllers/RAGController.js';

export interface ServiceContainer {
  knowledgeRepository: PostgresKnowledgeRepository;
  embeddingGateway: GeminiEmbeddingGateway;
  llmGateway: FastAPILMGateway;
  searchHybridRAGUseCase: SearchHybridRAGUseCase;
  ingestDocumentUseCase: IngestDocumentUseCase;
  generateProposalUseCase: GenerateProposalUseCase;
  ragController: RAGController;
}

export function createContainer(): ServiceContainer {
  // 1. Infrastructure layer
  const knowledgeRepository = new PostgresKnowledgeRepository(dbPool);
  const embeddingGateway = new GeminiEmbeddingGateway();
  const llmGateway = new FastAPILMGateway();

  // 2. Application layer (Use Cases)
  const searchHybridRAGUseCase = new SearchHybridRAGUseCase(knowledgeRepository, embeddingGateway);
  const ingestDocumentUseCase = new IngestDocumentUseCase(knowledgeRepository, embeddingGateway);
  const generateProposalUseCase = new GenerateProposalUseCase(searchHybridRAGUseCase, llmGateway);

  // 3. Presentation layer (Controllers)
  const ragController = new RAGController(
    searchHybridRAGUseCase,
    ingestDocumentUseCase,
    generateProposalUseCase
  );

  return {
    knowledgeRepository,
    embeddingGateway,
    llmGateway,
    searchHybridRAGUseCase,
    ingestDocumentUseCase,
    generateProposalUseCase,
    ragController
  };
}

export const container = createContainer();
