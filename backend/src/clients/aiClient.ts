import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not defined in environment variables. Please check backend/.env');
  }
  return new GoogleGenAI({ apiKey });
}

export interface GenerateOptions {
  taskMode: number;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}

export class AIClient {
  /**
   * Gọi Gemini API model gemini-embedding-001 (768 dims qua Matryoshka Embeddings)
   */
  static async getEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const ai = getGeminiClient();
      const results: number[][] = [];
      for (const text of texts) {
        const response = await ai.models.embedContent({
          model: 'gemini-embedding-001',
          contents: text,
          config: {
            outputDimensionality: 768
          }
        });
        if (response.embeddings && response.embeddings[0]?.values) {
          results.push(response.embeddings[0].values);
        } else {
          throw new Error('Không nhận được vector từ Gemini API');
        }
      }
      return results;
    } catch (error: any) {
      console.error('❌ Error calling Gemini embedContent:', error?.message || error);
      throw new Error(`Gemini embed failed: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Gọi AI Service để sinh nội dung bằng Qwen1.5-4B LoRA fine-tuned model
   */
  static async generate(options: GenerateOptions): Promise<string> {
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/api/v1/generate`, {
        task_mode: options.taskMode,
        prompt: options.prompt,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 1500
      });
      return response.data.output;
    } catch (error: any) {
      console.error('❌ Error calling AI Service /generate:', error?.message || error);
      throw new Error(`AI Service generate failed: ${error?.message || 'Unknown error'}`);
    }
  }
}

