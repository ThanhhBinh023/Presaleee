import express, { Request, Response } from 'express';
import cors from 'cors';
import { env } from './infrastructure/config/env.js';
import { container } from './container.js';
import { createApiRouter } from './presentation/routes/index.js';
import { errorHandler } from './presentation/middlewares/errorHandler.js';

if (!env.databaseUrl) {
  throw new Error('DATABASE_URL is required to start the backend.');
}
if (!env.jwtAccessSecret || Buffer.byteLength(env.jwtAccessSecret, 'utf8') < 32) {
  throw new Error('JWT_ACCESS_SECRET must be configured with at least 32 bytes.');
}
if (env.authCookieSameSite === 'none' && !env.authCookieSecure) {
  throw new Error('AUTH_COOKIE_SECURE must be true when AUTH_COOKIE_SAME_SITE is none.');
}

const app = express();

app.use(cors({ origin: env.frontendUrl, credentials: true }));
app.use(express.json({ limit: '2mb' }));

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
app.use('/api/v1', createApiRouter(
  container.ragController,
  container.proposalController,
  container.leadIntakeController,
  container.authController,
  container.dashboardController,
  container.knowledgeController,
  container.meetingController,
  container.portalController,
  container.portalRepository,
  container.clientController,
  container.rateCardController,
  container.userController,
  container.auditController
));


// Centralized error handling middleware
app.use(errorHandler);

const server = app.listen(env.port, () => {
  console.log(`🚀 Presaleee Backend is running on port ${env.port}`);
  console.log(`📡 RAG Endpoints available at: http://localhost:${env.port}/api/v1/rag`);
  console.log(`📋 Proposal Endpoints available at: http://localhost:${env.port}/api/v1/proposals`);
});

export { app, server };
