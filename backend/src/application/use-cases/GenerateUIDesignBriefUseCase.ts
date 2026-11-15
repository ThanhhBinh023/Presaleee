import { IProposalRepository } from '../../domain/repositories/IProposalRepository.js';
import { ILLMGateway, LLMTaskMode } from '../../domain/repositories/ILLMGateway.js';
import { ConflictError, NotFoundError } from '../../domain/errors/AppError.js';

export interface UIDesignBrief {
  title: string;
  target_users: string[];
  key_screens: string[];
  ui_style_guide: string;
  interaction_flow: string;
}

const BRIEF_SCHEMA = [
  '{',
  '  "title": "string",',
  '  "target_users": ["string", "..."],',
  '  "key_screens": ["string", "... (4 to 8 screens)"],',
  '  "ui_style_guide": "string",',
  '  "interaction_flow": "string"',
  '}'
].join('\n');

function parseJsonObject(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  const candidate = first >= 0 && last > first ? cleaned.slice(first, last + 1) : cleaned;
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function isBrief(value: unknown): value is UIDesignBrief {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  const isTextList = (list: unknown) => Array.isArray(list) && list.length > 0 && list.every(entry => typeof entry === 'string' && entry.trim().length > 0);
  return typeof item.title === 'string' && item.title.trim().length > 0
    && isTextList(item.target_users) && isTextList(item.key_screens)
    && typeof item.ui_style_guide === 'string' && item.ui_style_guide.trim().length > 0
    && typeof item.interaction_flow === 'string' && item.interaction_flow.trim().length > 0;
}

export class GenerateUIDesignBriefUseCase {
  constructor(
    private readonly proposalRepository: IProposalRepository,
    private readonly llmGateway: ILLMGateway
  ) {}

  async execute(proposalId: string, organizationId: string): Promise<{ brief: UIDesignBrief; source: 'sheet' | 'ai' }> {
    const proposal = await this.proposalRepository.findById(proposalId, organizationId);
    if (!proposal) throw new NotFoundError('Proposal not found.');

    const stored = proposal.sheets.find(sheet => sheet.sheetName === 'Overview')?.sheetData?.uiDesignBrief;
    if (isBrief(stored)) return { brief: stored, source: 'sheet' };

    const overview = proposal.sheets.find(sheet => sheet.sheetName === 'Overview');
    const prompt = [
      'Generate an interactive UI/UX design brief for the admin-facing product described by this technical proposal.',
      `Proposal title: ${proposal.title}`,
      `Estimated timeline: ${proposal.estimatedTimelineWeeks ?? 'unknown'} weeks`,
      `Overview sheet content:\n${JSON.stringify(overview?.sheetData ?? {})}`,
      'Return ONLY one valid JSON object, no markdown, no code fences, in exactly this shape:',
      BRIEF_SCHEMA
    ].join('\n\n');

    const output = await this.llmGateway.generate({ taskMode: LLMTaskMode.TECH_ARCHITECTURE, prompt, temperature: 0.2, maxTokens: 1200 });
    const brief = parseJsonObject(output);
    if (!isBrief(brief)) {
      throw new ConflictError('AI service returned no usable UI design brief (the model tiers are unreachable or answered off-schema). Nothing was generated.');
    }
    return { brief, source: 'ai' };
  }
}
