import { IKnowledgeRepository } from '../../domain/repositories/IKnowledgeRepository.js';
import { IEmbeddingGateway } from '../../domain/repositories/IEmbeddingGateway.js';
import { IngestDocumentInputDTO, IngestDocumentOutputDTO } from '../dtos/IngestDocumentDTO.js';
import { TextSplitterService } from '../services/TextSplitterService.js';
import { ValidationError } from '../../domain/errors/AppError.js';

export class IngestDocumentUseCase {
  constructor(
    private readonly knowledgeRepo: IKnowledgeRepository,
    private readonly embeddingGateway: IEmbeddingGateway
  ) {}

  async execute(input: IngestDocumentInputDTO): Promise<IngestDocumentOutputDTO> {
    if (!input.title || !input.title.trim()) {
      throw new ValidationError('Document title is required.');
    }
    if (!input.content || !input.content.trim()) {
      throw new ValidationError('Document content is required.');
    }

    // 1. Create knowledge_docs entity record
    const docId = await this.knowledgeRepo.createDocument({
      title: input.title.trim(),
      category: input.category || 'GENERAL',
      domain: input.domain || 'GENERAL',
      content: input.content,
      organizationId: input.organizationId || null
    });

    // 2. Chunk text using sliding window
    const textChunks = TextSplitterService.splitIntoChunks(input.content);

    if (textChunks.length === 0) {
      return { docId, totalChunks: 0 };
    }

    // 3. Generate batch embeddings
    const embeddings = await this.embeddingGateway.generateEmbeddings(textChunks);

    // 4. Persist chunks and vectors
    const chunkEntities = textChunks.map((chunkContent, idx) => ({
      chunkIndex: idx,
      chunkContent,
      metadata: {
        title: input.title.trim(),
        category: input.category || 'GENERAL',
        domain: input.domain || 'GENERAL'
      },
      embedding: embeddings[idx]
    }));

    await this.knowledgeRepo.saveDocumentChunks(docId, chunkEntities);

    return {
      docId,
      totalChunks: textChunks.length
    };
  }
}
