import { Request, Response, NextFunction } from 'express';
import { SearchHybridRAGUseCase } from '../../application/use-cases/SearchHybridRAGUseCase.js';
import { IngestDocumentUseCase } from '../../application/use-cases/IngestDocumentUseCase.js';
import { GenerateProposalUseCase } from '../../application/use-cases/GenerateProposalUseCase.js';
import { AppError } from '../../domain/errors/AppError.js';

function organizationId(req: Request): string {
  if (!req.auth?.organizationId) throw new AppError('An organization is required for this operation.', 403);
  return req.auth.organizationId;
}

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
      const { query, domain, topK } = req.body || {};
      const result = await this.searchUseCase.execute({
        query,
        domain,
        topK: topK === undefined ? undefined : Number(topK),
        organizationId: organizationId(req)
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
      const { title, category, domain, content } = req.body || {};
      const result = await this.ingestUseCase.execute({
        title,
        category,
        domain,
        content,
        organizationId: organizationId(req), uploadedBy: req.auth!.sub
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
      const { rfpText, domain, maxTokens } = req.body || {};
      const result = await this.generateProposalUseCase.execute({
        rfpText,
        domain,
        organizationId: organizationId(req),
        maxTokens: maxTokens === undefined ? undefined : Number(maxTokens)
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

