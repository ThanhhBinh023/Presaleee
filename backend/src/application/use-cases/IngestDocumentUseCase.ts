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
    if (!input.organizationId || !input.uploadedBy) throw new ValidationError('Authenticated organization and user are required.');
    if (input.title.trim().length > 255) throw new ValidationError('Document title must not exceed 255 characters.');
    if (input.category.length > 100 || input.domain.length > 100) throw new ValidationError('category and domain must not exceed 100 characters.');
    if (input.content.length > 1_000_000) throw new ValidationError('Text content must not exceed 1,000,000 characters.');

    const textChunks = TextSplitterService.splitIntoChunks(input.content);
    if (!textChunks.length) throw new ValidationError('Document content did not produce any indexable text.');
    const docId = await this.knowledgeRepo.createDocument({
      title: input.title.trim(),
      category: input.category || 'GENERAL',
      domain: input.domain || 'GENERAL',
      content: input.content,
      organizationId: input.organizationId,
      uploadedBy: input.uploadedBy,
      fileType: 'TEXT',
      totalTokens: input.content.trim().split(/\s+/).length
    });

    try {
      const embeddings = await this.embeddingGateway.generateEmbeddings(textChunks);
      if (embeddings.length !== textChunks.length) throw new Error('Embedding provider returned an unexpected number of vectors.');
      const chunkEntities = textChunks.map((chunkContent, idx) => ({
        chunkIndex: idx,
        chunkContent,
        metadata: { title: input.title.trim(), category: input.category || 'GENERAL', domain: input.domain || 'GENERAL' },
        embedding: embeddings[idx]
      }));
      await this.knowledgeRepo.saveDocumentChunks(docId, chunkEntities);
    } catch (error) {
      await this.knowledgeRepo.deleteDocument(docId, input.organizationId);
      throw error;
    }

    return {
      docId,
      totalChunks: textChunks.length
    };
  }
}

