import { Request, Response, NextFunction } from 'express';
import { SearchHybridRAGUseCase } from '../../application/use-cases/SearchHybridRAGUseCase.js';
import { IngestDocumentUseCase } from '../../application/use-cases/IngestDocumentUseCase.js';
import { GenerateProposalUseCase } from '../../application/use-cases/GenerateProposalUseCase.js';

export class RAGController {
  constructor(
    private readonly searchUseCase: SearchHybridRAGUseCase,
    private readonly ingestUseCase: IngestDocumentUseCase,
    private readonly generateProposalUseCase: GenerateProposalUseCase
  ) {}

  /**
   * POST /api/v1/rag/search
   */
  search = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { query, domain, topK } = req.body;
      const result = await this.searchUseCase.execute({
        query,
        domain,
        topK: topK ? parseInt(topK, 10) : undefined
      });

      res.status(200).json({
        success: true,
        data: result.chunks,
        meta: { total: result.totalRetrieved }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/rag/ingest
   */
  ingest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { title, category, domain, content, organizationId } = req.body;
      const result = await this.ingestUseCase.execute({
        title,
        category,
        domain,
        content,
        organizationId
      });

      res.status(201).json({
        success: true,
        data: result,
        message: 'Document successfully ingested and indexed with vector embeddings.'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/rag/generate-proposal
   */
  generateProposal = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { rfpText, domain, maxTokens } = req.body;
      const result = await this.generateProposalUseCase.execute({
        rfpText,
        domain,
        maxTokens: maxTokens ? parseInt(maxTokens, 10) : undefined
      });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  };
}

