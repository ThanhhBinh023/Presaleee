import { Router } from 'express';
import { container } from '../container.js';
import { createRAGRouter } from '../presentation/routes/ragRoutes.js';

/**
 * Backward compatibility router exporting the Clean Architecture RAG routes.
 */
export const ragRouter: Router = createRAGRouter(container.ragController);
