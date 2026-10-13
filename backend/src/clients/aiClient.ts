import { container } from '../container.js';
import { LLMGenerateOptions } from '../domain/repositories/ILLMGateway.js';

export interface GenerateOptions extends LLMGenerateOptions {}

/**
 * AIClient facade providing backward compatibility with earlier iterations.
 * Delegates to GeminiEmbeddingGateway and FastAPILMGateway.
 */
export class AIClient {
  /**
   * Generates dense vector embeddings using Google Gemini API (gemini-embedding-001, 768 dims).
   */
  static async getEmbeddings(texts: string[]): Promise<number[][]> {
    return container.embeddingGateway.generateEmbeddings(texts);
  }

  /**
   * Calls AI inference service to generate text via fine-tuned Qwen1.5-4B LoRA model.
   */
  static async generate(options: GenerateOptions): Promise<string> {
    return container.llmGateway.generate(options);
  }
}
