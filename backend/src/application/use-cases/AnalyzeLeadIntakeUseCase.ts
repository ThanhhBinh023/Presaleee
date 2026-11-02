import { ILLMGateway, LLMTaskMode } from '../../domain/repositories/ILLMGateway.js';
import { ExternalServiceError, ValidationError } from '../../domain/errors/AppError.js';
import {
  AnalyzeLeadIntakeInputDTO,
  AnalyzeLeadIntakeOutputDTO,
  LEAD_SOURCES,
  LeadIntakeExtractedMetadata,
  LeadSource
} from '../dtos/AnalyzeLeadIntakeDTO.js';

const MAX_RFP_CHARACTERS = 50_000;

const INTAKE_JSON_SCHEMA = `{
  "project_name": "Tên dự án ngắn gọn, đúng nghiệp vụ yêu cầu",
  "client_industry": "Ngành nghề cụ thể (Đô thị thông minh & GIS, FinTech, Y tế, Bán lẻ,...)",
  "business_goal": "Mục tiêu kinh doanh cốt lõi",
  "timeline_weeks": 20,
  "budget_usd": 120000,
  "target_platforms": ["Web GIS", "Cloud API"],
  "core_functional_modules": ["Module 1", "Module 2", "Module 3"],
  "integrations_required": ["Hệ thống 1", "Hệ thống 2"],
  "compliance_and_security": ["Tiêu chuẩn 1", "Tiêu chuẩn 2"],
  "priority_level": "High",
  "target_sla": "<thời gian đáp ứng / SLA>",
  "peak_workload": "<tải đỉnh / khối lượng xử lý>",
  "missing_information": ["Câu hỏi khảo sát 1", "Câu hỏi khảo sát 2"]
}`;

function parseJsonObject(output: string): Record<string, unknown> {
  let trimmed = output.trim();
  trimmed = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  // 1. Direct parse attempt
  try {
    const val = JSON.parse(trimmed);
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      return val as Record<string, unknown>;
    }
  } catch {}

  // 2. Slice between first { and last }
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    try {
      const val = JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        return val as Record<string, unknown>;
      }
    } catch {}
  }

  // 3. Resilient repair for truncated JSON
  for (const suffix of ['}', '"}', '"]}', '"]}}', '"]\n}', '"\n}', '\n}']) {
    try {
      const val = JSON.parse(trimmed + suffix);
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        return val as Record<string, unknown>;
      }
    } catch {}
  }

  throw new ExternalServiceError('AI Intake returned invalid JSON. Please retry the analysis.');
}

function nullableString(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string') return value.trim() || null;
  return String(value).trim() || null;
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 ? value : null;
  }
  if (typeof value === 'string') {
    const digits = value.replace(/[^0-9.]/g, '');
    if (!digits) return null;
    const parsed = Number(digits);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }
  return null;
}

function stringArray(value: unknown): string[] {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) {
    return value.map(item => (typeof item === 'string' ? item.trim() : JSON.stringify(item))).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(/[,;\n]/).map(item => item.trim()).filter(Boolean);
  }
  return [];
}

function toExtractedMetadata(data: Record<string, unknown>, rawRfpContent: string): LeadIntakeExtractedMetadata & Record<string, unknown> {
  // Flatten if wrapped in client_request, lead, or project
  const flat: Record<string, unknown> =
    data.client_request && typeof data.client_request === 'object'
      ? { ...data, ...(data.client_request as Record<string, unknown>) }
      : data.lead && typeof data.lead === 'object'
      ? { ...data, ...(data.lead as Record<string, unknown>) }
      : data.project && typeof data.project === 'object'
      ? { ...data, ...(data.project as Record<string, unknown>) }
      : data;

  const rawProjectName = flat.project_name || flat.projectName || flat.project_title || flat.title;
  let projectName = nullableString(rawProjectName);
  if (!projectName) {
    const firstLine = rawRfpContent.split('\n')[0].replace(/^Khách hàng yêu cầu\s*/i, '').trim();
    projectName = firstLine.length > 60 ? firstLine.substring(0, 60) + '...' : firstLine || 'Dự án Hiện đại hóa Hệ thống';
  }

  const rawIndustry = flat.client_industry || flat.clientIndustry || flat.domain || flat.industry;
  const clientIndustry = nullableString(rawIndustry) || 'Công nghệ & Chuyển đổi số';

  const rawGoal = flat.business_goal || flat.businessGoal || flat.goal || flat.objectives;
  const businessGoal = Array.isArray(rawGoal) ? rawGoal.join('; ') : nullableString(rawGoal);

  const rawTimeline = flat.timeline_weeks || flat.timelineWeeks || flat.timeline;
  const timelineWeeks = nullableNumber(rawTimeline) || 20;

  const rawBudget = flat.budget_usd || flat.budgetUsd || flat.budget;
  const budgetUsd = nullableNumber(rawBudget) || 120000;

  const targetPlatforms = stringArray(flat.target_platforms || flat.targetPlatforms || flat.platforms);
  const coreFunctionalModules = stringArray(
    flat.core_functional_modules || flat.coreFunctionalModules || flat.modules || flat.core_technologies || flat.technologies
  );
  const integrationsRequired = stringArray(flat.integrations_required || flat.integrationsRequired || flat.integrations);
  const complianceAndSecurity = stringArray(flat.compliance_and_security || flat.complianceAndSecurity || flat.compliance);
  const missingInformation = stringArray(flat.missing_information || flat.missingInformation || flat.missing_info || flat.open_questions);

  const rawTargetSla = flat.target_sla || flat.targetSla || flat.sla;
  const targetSla = nullableString(rawTargetSla) || '< 100ms';

  const rawPeakWorkload = flat.peak_workload || flat.peakWorkload || flat.workload;
  const peakWorkload = nullableString(rawPeakWorkload) || 'Cao tải theo thời gian thực';

  return {
    projectName,
    clientIndustry,
    businessGoal,
    timelineWeeks,
    budgetUsd,
    targetPlatforms,
    coreFunctionalModules,
    integrationsRequired,
    complianceAndSecurity,
    priorityLevel: 'High',
    missingInformation,
    targetSla,
    peakWorkload
  };
}

export class AnalyzeLeadIntakeUseCase {
  constructor(private readonly llmGateway: ILLMGateway) {}

  async execute(input: AnalyzeLeadIntakeInputDTO): Promise<AnalyzeLeadIntakeOutputDTO> {
    if (typeof input.rawRfpContent !== 'string' || !input.rawRfpContent.trim()) {
      throw new ValidationError('RFP content is required.');
    }

    const rawRfpContent = input.rawRfpContent.trim();
    if (rawRfpContent.length > MAX_RFP_CHARACTERS) {
      throw new ValidationError(`RFP content must not exceed ${MAX_RFP_CHARACTERS} characters.`);
    }

    const source: LeadSource = input.source || 'MANUAL';
    if (!LEAD_SOURCES.includes(source)) {
      throw new ValidationError(`Source must be one of ${LEAD_SOURCES.join(', ')}.`);
    }

    const prompt = [
      'Extract project and client requirements from the source text below into a single valid JSON object.',
      'Return ONLY the raw JSON object without markdown fences, code blocks, or extra text.',
      'Use exactly this schema:',
      INTAKE_JSON_SCHEMA,
      'Source text:',
      '<source_text>',
      rawRfpContent,
      '</source_text>'
    ].join('\n\n');

    const output = await this.llmGateway.generate({
      taskMode: LLMTaskMode.LEAD_INTAKE,
      prompt,
      temperature: 0.1,
      maxTokens: 3000
    });

    const parsed = parseJsonObject(output);
    const extractedMetadata = toExtractedMetadata(parsed, rawRfpContent);
    const missingInformation = (extractedMetadata.missingInformation as string[]) || [];

    return {
      draft: {
        id: null,
        organizationId: null,
        clientId: null,
        createdBy: null,
        assignedTo: null,
        title: extractedMetadata.projectName,
        source,
        status: null,
        rawRfpContent,
        extractedMetadata,
        bantScore: null,
        bantDetails: null,
        createdAt: null,
        updatedAt: null
      },
      missingInformation
    };
  }
}
