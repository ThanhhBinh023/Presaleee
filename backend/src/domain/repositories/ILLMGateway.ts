export interface LLMGenerateOptions {
  taskMode: number;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ILLMGateway {
  generate(options: LLMGenerateOptions): Promise<string>;
}

