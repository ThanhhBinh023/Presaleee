import { ILLMGateway, LLMTaskMode } from '../../domain/repositories/ILLMGateway.js';
import { SearchHybridRAGUseCase } from './SearchHybridRAGUseCase.js';
import { GenerateProposalInputDTO, GenerateProposalOutputDTO } from '../dtos/GenerateProposalDTO.js';
import { ValidationError } from '../../domain/errors/AppError.js';

export class GenerateProposalUseCase {
  constructor(
    private readonly searchUseCase: SearchHybridRAGUseCase,
    private readonly llmGateway: ILLMGateway
  ) {}

  async execute(input: GenerateProposalInputDTO): Promise<GenerateProposalOutputDTO> {
    if (!input.rfpText || !input.rfpText.trim()) {
      throw new ValidationError('RFP text is required to generate a proposal.');
    }

    const trimmedRfp = input.rfpText.trim();

    // 1. Retrieve most relevant context chunks using Hybrid RAG
    const searchResult = await this.searchUseCase.execute({
      query: trimmedRfp,
      domain: input.domain,
      organizationId: input.organizationId,
      topK: 3
    });

    const relevantChunks = searchResult.chunks;

    // 2. Augment prompt with retrieved verified domain knowledge
    let augmentedPrompt = `CLIENT RFP & REQUIREMENTS:\n${trimmedRfp}\n\n`;

    if (relevantChunks.length > 0) {
      augmentedPrompt += `[PROVEN ARCHITECTURAL REFERENCES & BENCHMARKS FROM PAST PROJECTS]:\n`;
      relevantChunks.forEach((chunk, index) => {
        const title = chunk.metadata?.title || 'Knowledge Reference';
        const section = chunk.metadata?.section || 'Overview';
        const tech = Array.isArray(chunk.metadata?.tech_stack)
          ? chunk.metadata.tech_stack.join(', ')
          : '';
        const compliance = Array.isArray(chunk.metadata?.compliance)
          ? chunk.metadata.compliance.join(', ')
          : '';

        augmentedPrompt += `Reference #${index + 1} (${title} - ${section}):\n`;
        augmentedPrompt += `- Solution details: ${chunk.chunkContent}\n`;
        if (tech) augmentedPrompt += `- Proven Tech Stack: ${tech}\n`;
        if (compliance) augmentedPrompt += `- Compliance Standards: ${compliance}\n`;
        augmentedPrompt += `\n`;
      });

      augmentedPrompt += `INSTRUCTIONS:\n`;
      augmentedPrompt += `Based on the client's RFP requirements and the proven technical references provided above, synthesize a professional Executive Proposal Overview covering: 1) Solution Vision, 2) Proposed Architecture & Verified Tech Stack, 3) Security & Compliance Commitments, and 4) Why This Solution is optimal for the client.`;
    }

    // 3. Generate response using LLM Gateway
    const generatedText = await this.llmGateway.generate({
      taskMode: LLMTaskMode.PROPOSAL_BUILDER,
      prompt: augmentedPrompt,
      temperature: 0.2,
      maxTokens: input.maxTokens || 1500
    });

    return {
      overview: generatedText,
      sources: relevantChunks
    };
  }
}

