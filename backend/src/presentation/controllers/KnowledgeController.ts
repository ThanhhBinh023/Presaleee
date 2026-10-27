import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, ValidationError } from '../../domain/errors/AppError.js';
import { IngestDocumentUseCase } from '../../application/use-cases/IngestDocumentUseCase.js';
import { ListKnowledgeDocumentsUseCase, GetKnowledgeDocumentUseCase, DeleteKnowledgeDocumentUseCase } from '../../application/use-cases/KnowledgeVaultUseCases.js';
import { AskKnowledgeUseCase } from '../../application/use-cases/AskKnowledgeUseCase.js';

function organizationId(req: Request): string {
  if (!req.auth?.organizationId) throw new ForbiddenError('An organization is required for this operation.');
  return req.auth.organizationId;
}

function param(req: Request, name: string): string {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] || '' : value || '';
}

function requestBody(req: Request): Record<string, unknown> {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) throw new ValidationError('Request body must be a JSON object.');
  return req.body as Record<string, unknown>;
}

export class KnowledgeController {
  constructor(
    private readonly ingestUseCase: IngestDocumentUseCase,
    private readonly listUseCase: ListKnowledgeDocumentsUseCase,
    private readonly getUseCase: GetKnowledgeDocumentUseCase,
    private readonly deleteUseCase: DeleteKnowledgeDocumentUseCase,
    private readonly askUseCase: AskKnowledgeUseCase
  ) {}

  ingest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = requestBody(req);
      const result = await this.ingestUseCase.execute({
        title: body.title as string,
        category: typeof body.category === 'string' ? body.category : 'GENERAL',
        domain: typeof body.domain === 'string' ? body.domain : 'GENERAL',
        content: body.content as string,
        organizationId: organizationId(req),
        uploadedBy: req.auth!.sub
      });
      res.status(201).json({ success: true, data: result });
    } catch (error) { next(error); }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.listUseCase.execute({
        organizationId: organizationId(req), category: req.query.category,
        domain: req.query.domain, search: req.query.search, page: req.query.page, limit: req.query.limit
      });
      res.status(200).json({ success: true, data: result.documents, meta: {
        total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages
      } });
    } catch (error) { next(error); }
  };

  get = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const document = await this.getUseCase.execute(param(req, 'id'), organizationId(req));
      res.status(200).json({ success: true, data: document });
    } catch (error) { next(error); }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.deleteUseCase.execute(param(req, 'id'), organizationId(req));
      res.status(204).end();
    } catch (error) { next(error); }
  };

  ask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = requestBody(req);
      const result = await this.askUseCase.execute({
        question: body.question, domain: body.domain, topK: body.topK, organizationId: organizationId(req)
      });
      res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
  };
}
