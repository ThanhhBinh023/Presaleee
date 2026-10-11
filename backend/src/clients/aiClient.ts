import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export interface GenerateOptions {
  taskMode: number;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}

export class AIClient {
  /**
   * Gọi AI Service để tính toán vector embedding (BAAI/bge-m3 1024 dims)
   */
  static async getEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/api/v1/embed`, {
        texts
      });
      return response.data.embeddings;
    } catch (error: any) {
      console.error('❌ Error calling AI Service /embed:', error?.message || error);
      throw new Error(`AI Service embed failed: ${error?.message || 'Unknown error'}`);
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
