import { Router, Request, Response } from 'express';
import { RAGService } from '../services/ragService.js';
import { AIClient } from '../clients/aiClient.js';

export const ragRouter = Router();

/**
 * Endpoint 1: Upload / Ingest tài liệu mẫu vào Supabase Vector DB
 * POST /api/v1/rag/ingest
 */
ragRouter.post('/ingest', async (req: Request, res: Response) => {
  try {
    const { title, category, domain, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, error: 'Title và content là bắt buộc' });
    }

    const result = await RAGService.ingestDocument(title, category || 'GENERAL', domain || 'GENERAL', content);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Endpoint 2: Tìm kiếm ngữ cảnh tương đồng (Semantic Search)
 * POST /api/v1/rag/search
 */
ragRouter.post('/search', async (req: Request, res: Response) => {
  try {
    const { query, domain, topK } = req.body;
    if (!query) {
      return res.status(400).json({ success: false, error: 'Query là bắt buộc' });
    }

    const chunks = await RAGService.searchRelevantContext(query, domain, topK || 3);
    res.json({ success: true, data: chunks });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Endpoint 3: Sinh Proposal Overview có kết hợp RAG (Full pipeline)
 * POST /api/v1/rag/generate-proposal
 */
ragRouter.post('/generate-proposal', async (req: Request, res: Response) => {
  try {
    const { rfpText, domain } = req.body;
    if (!rfpText) {
      return res.status(400).json({ success: false, error: 'rfpText là bắt buộc' });
    }

    const result = await RAGService.generateContextAwareProposalOverview(rfpText, domain);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
