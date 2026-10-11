import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ragRouter } from './routes/ragRoutes.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Healthcheck
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'presaleee-backend',
    database: 'supabase-pgvector',
    timestamp: new Date().toISOString()
  });
});

// RAG API Routes
app.use('/api/v1/rag', ragRouter);

app.listen(port, () => {
  console.log(`🚀 Presaleee Backend is running on port ${port}`);
  console.log(`📡 RAG Endpoints available at: http://localhost:${port}/api/v1/rag`);
});
