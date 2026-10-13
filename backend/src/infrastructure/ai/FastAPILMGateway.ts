import axios from 'axios';
import { ILLMGateway, LLMGenerateOptions } from '../../domain/repositories/ILLMGateway.js';
import { ExternalServiceError } from '../../domain/errors/AppError.js';
import { env } from '../config/env.js';

export class FastAPILMGateway implements ILLMGateway {
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || env.aiServiceUrl;
  }

  async generate(options: LLMGenerateOptions): Promise<string> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/v1/generate`, {
        task_mode: options.taskMode,
        prompt: options.prompt,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 1500
      });

      if (!response.data || typeof response.data.output !== 'string') {
        throw new ExternalServiceError('Invalid response payload from AI Service.');
      }

      return response.data.output;
    } catch (error: any) {
      if (error instanceof ExternalServiceError) throw error;
      throw new ExternalServiceError(`AI Service generation failed: ${error?.message || 'Unknown error'}`);
    }
  }
}

