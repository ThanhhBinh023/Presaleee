/** Modes accepted by the AI service `task_mode` contract. Values are part of the wire protocol. */
export enum LLMTaskMode {
  LEAD_INTAKE = 1,
  MEETING_ASSISTANT = 2,
  GAP_ANALYSIS = 3,
  BANT_QUALIFICATION = 4,
  PROPOSAL_BUILDER = 5,
  TECH_ARCHITECTURE = 6
}

export interface LLMGenerateOptions {
  taskMode: LLMTaskMode;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ILLMGateway {
  generate(options: LLMGenerateOptions): Promise<string>;
}
