import dotenv from 'dotenv';
import path from 'path';

// Support loading .env from current directory, backend/.env, or parent folder
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export interface AppConfig {
  port: number;
  databaseUrl: string;
  geminiApiKey: string;
  aiServiceUrl: string;
  nodeEnv: string;
}

export const env: AppConfig = {
  port: parseInt(process.env.PORT || '5000', 10),
  databaseUrl: process.env.DATABASE_URL || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  nodeEnv: process.env.NODE_ENV || 'development'
};
