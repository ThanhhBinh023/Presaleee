import { GoogleGenAI } from '@google/genai';
import { IEmbeddingGateway } from '../../domain/repositories/IEmbeddingGateway.js';
import { ExternalServiceError } from '../../domain/errors/AppError.js';
import { env } from '../config/env.js';

export class GeminiEmbeddingGateway implements IEmbeddingGateway {
  private client: GoogleGenAI | null = null;
  private readonly dimension: number = 768;
  private readonly modelName: string = 'gemini-embedding-001';

  private getClient(): GoogleGenAI {
    if (!this.client) {
      if (!env.geminiApiKey) {
        throw new ExternalServiceError('GEMINI_API_KEY environment variable is not defined.');
      }
      this.client = new GoogleGenAI({ apiKey: env.geminiApiKey });
    }
    return this.client;
  }

  getDimension(): number {
    return this.dimension;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const client = this.getClient();
      const results: number[][] = [];

      for (const text of texts) {
        const response = await client.models.embedContent({
          model: this.modelName,
          contents: text,
          config: {
            outputDimensionality: this.dimension
          }
        });

        const vector = response.embeddings?.[0]?.values;
        if (!vector || vector.length === 0) {
          throw new ExternalServiceError('No vector values returned from Gemini embedContent API.');
        }
        results.push(vector);
      }

      return results;
    } catch (error: any) {
      if (error instanceof ExternalServiceError) throw error;
      throw new ExternalServiceError(`Gemini embedding failed: ${error?.message || 'Unknown error'}`);
    }
  }
}
