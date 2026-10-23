import { IKnowledgeRepository } from '../../domain/repositories/IKnowledgeRepository.js';
import { IEmbeddingGateway } from '../../domain/repositories/IEmbeddingGateway.js';
import { IngestDocumentInputDTO, IngestDocumentOutputDTO } from '../dtos/IngestDocumentDTO.js';
import { TextSplitterService } from '../services/TextSplitterService.js';
import { ValidationError } from '../../domain/errors/AppError.js';

const MAX_CONTENT_LENGTH = 1_000_000;

function requiredText(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string' || !value.trim()) throw new ValidationError(`${field} is required.`);
  if (value.length > maxLength) throw new ValidationError(`${field} must not exceed ${maxLength} characters.`);
  return value;
}

function optionalLabel(value: unknown, field: string): string {
  if (value === undefined || value === null) return 'GENERAL';
  const label = requiredText(value, field, 100).trim();
  return label;
}

export class IngestDocumentUseCase {
  constructor(
    private readonly knowledgeRepo: IKnowledgeRepository,
    private readonly embeddingGateway: IEmbeddingGateway
  ) {}

  async execute(input: IngestDocumentInputDTO): Promise<IngestDocumentOutputDTO> {
    const title = requiredText(input.title, 'Document title', 255).trim();
    if (typeof input.content !== 'string' || !input.content.trim()) throw new ValidationError('Document content is required.');
    if (input.content.length > MAX_CONTENT_LENGTH) throw new ValidationError('Text content must not exceed 1,000,000 characters.');
    const content = input.content;
    if (!input.organizationId || !input.uploadedBy) throw new ValidationError('Authenticated organization and user are required.');
    const category = optionalLabel(input.category, 'category');
    const domain = optionalLabel(input.domain, 'domain');

    const textChunks = TextSplitterService.splitIntoChunks(content);
    if (!textChunks.length) throw new ValidationError('Document content did not produce any indexable text.');
    const docId = await this.knowledgeRepo.createDocument({
      title,
      category,
      domain,
      content,
      organizationId: input.organizationId,
      uploadedBy: input.uploadedBy,
      fileType: 'TEXT',
      totalTokens: content.trim().split(/\s+/).length
    });

    try {
      const embeddings = await this.embeddingGateway.generateEmbeddings(textChunks);
      if (embeddings.length !== textChunks.length) throw new Error('Embedding provider returned an unexpected number of vectors.');
      const chunkEntities = textChunks.map((chunkContent, idx) => ({
        chunkIndex: idx,
        chunkContent,
        metadata: { title, category, domain },
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
