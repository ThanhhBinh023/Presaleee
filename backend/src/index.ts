import express, { Request, Response } from 'express';
import cors from 'cors';
import { env } from './infrastructure/config/env.js';
import { container } from './container.js';
import { createApiRouter } from './presentation/routes/index.js';
import { errorHandler } from './presentation/middlewares/errorHandler.js';

const app = express();

app.use(cors());
app.use(express.json());

// System healthcheck endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'presaleee-backend',
    architecture: 'clean-architecture',
    timestamp: new Date().toISOString()
  });
});

// Presentation API routes
app.use('/api/v1', createApiRouter(container.ragController, container.proposalController));

// Centralized error handling middleware
app.use(errorHandler);

const server = app.listen(env.port, () => {
  console.log(`🚀 Presaleee Backend is running on port ${env.port}`);
  console.log(`📡 RAG Endpoints available at: http://localhost:${env.port}/api/v1/rag`);
  console.log(`📋 Proposal Endpoints available at: http://localhost:${env.port}/api/v1/proposals`);
});

export { app, server };
