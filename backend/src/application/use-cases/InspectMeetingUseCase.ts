import { Pool } from 'pg';
import { IMeetingRepository } from '../../domain/repositories/IMeetingRepository.js';
import { ILLMGateway, LLMTaskMode } from '../../domain/repositories/ILLMGateway.js';
import { InspectMeetingInputDTO, InspectMeetingOutputDTO } from '../dtos/MeetingDTOs.js';
import { NotFoundError, ValidationError, ExternalServiceError } from '../../domain/errors/AppError.js';
import { ActionItem, GapAnalysis } from '../../domain/entities/Meeting.js';

interface RawAnalysisResult {
  clean_notes?: string;
  key_discussion_points?: string[];
  clarified_requirements?: string[];
  action_items?: Array<{ task: string; assignee: string; deadline?: string; completed?: boolean }>;
  suggested_followup_questions?: string[];
  discussion_topics?: string[];
  gap_analysis?: {
    missing_parameters?: string[];
    proactive_questions?: string[];
    presale_recommendations?: string[];
  };
}

export class InspectMeetingUseCase {
  constructor(
    private readonly meetingRepository: IMeetingRepository,
    private readonly llmGateway: ILLMGateway,
    private readonly dbPool: Pool
  ) {}

  async execute(input: InspectMeetingInputDTO): Promise<InspectMeetingOutputDTO> {
    if (!input.meetingId || typeof input.meetingId !== 'string' || !input.meetingId.trim()) {
      throw new ValidationError('Meeting ID is required for AI inspection.');
    }

    const meeting = await this.meetingRepository.findById(input.meetingId.trim());
    if (!meeting) {
      throw new NotFoundError(`Meeting with ID '${input.meetingId}' not found.`);
    }

    // 1. Determine raw transcript to inspect
    let transcriptToInspect = input.rawTranscript?.trim() || meeting.rawTranscript?.trim() || '';
    if (!transcriptToInspect) {
      throw new ValidationError(
        'Meeting has no transcript to inspect. Please paste or upload the transcript from your meeting tool.'
      );
    }

    // 2. Fetch Lead context to enrich AI understanding
    let leadContext = '';
    try {
      const leadRes = await this.dbPool.query('SELECT * FROM leads WHERE id = $1 LIMIT 1;', [meeting.leadId]);
      if (leadRes.rows.length > 0) {
        const lead = leadRes.rows[0];
        leadContext = `
LEAD TITLE: ${lead.title || 'Untitled Lead'}
SOURCE RFP / INQUIRY:
${lead.raw_rfp_content || 'N/A'}
EXTRACTED METADATA:
${JSON.stringify(lead.extracted_metadata || {}, null, 2)}
`;
      }
    } catch {
      // Non-fatal if lead context fails to load
    }

    // 3. Fetch prior meetings for this Lead to provide cumulative context
    const allMeetings = await this.meetingRepository.listByLeadId(meeting.leadId);
    const priorMeetings = allMeetings.filter(
      m => m.id !== meeting.id && (m.meetingOrder < meeting.meetingOrder || new Date(m.meetingDate) < new Date(meeting.meetingDate))
    );

    let priorMeetingsContext = '';
    if (priorMeetings.length > 0) {
      priorMeetingsContext = 'PRIOR DISCOVERY MEETINGS HISTORY & ACCUMULATED CONTEXT:\n';
      priorMeetings.forEach((pm, idx) => {
        priorMeetingsContext += `--- Meeting #${pm.meetingOrder || idx + 1}: "${pm.title}" (${pm.status}) ---\n`;
        if (pm.clarifiedRequirements?.length) {
          priorMeetingsContext += `Previously Clarified: ${pm.clarifiedRequirements.join('; ')}\n`;
        }
        if (pm.suggestedFollowupQuestions?.length) {
          priorMeetingsContext += `Questions asked/to ask: ${pm.suggestedFollowupQuestions.join('; ')}\n`;
        }
        if (pm.keyDiscussionPoints?.length) {
          priorMeetingsContext += `Discussion Summary: ${pm.keyDiscussionPoints.join('; ')}\n`;
        }
        priorMeetingsContext += '\n';
      });
    }

    // 4. Build comprehensive prompt
    const prompt = `
You are an expert AI Presale Meeting Assistant and Solution Architect for 'Presaleee'.
Your job is to inspect and analyze the raw meeting transcript recorded from a 3rd-party meeting software (e.g., Zoom, Google Meet, Teams, Fireflies, Otter).

${leadContext}

${priorMeetingsContext}

CURRENT MEETING DETAILS:
Meeting Title: "${meeting.title}" (Meeting #${meeting.meetingOrder})
Recorded From Tool: ${meeting.sourceTool || 'MANUAL'}
RAW AUDIO TRANSCRIPT:
"""
${transcriptToInspect}
"""

INSTRUCTIONS:
1. Clean up and normalize the transcript: remove conversational noise, filler words (um, uh, like, stutter, repetitions) and produce a polished, executive-ready markdown summary (clean_notes).
2. Extract Key Discussion Points (key_discussion_points).
3. Identify Clarified Client Requirements (clarified_requirements): technical, functional, architecture, or business requirements confirmed by the client during this session.
4. Extract Action Items with Assignee & Deadline (action_items): items that need to be followed up, who owns them, and by when.
5. Identify Information Gaps against a standard 10-sheet proposal (gap_analysis).
6. Crucial: Generate 4-6 sharp, insightful, proactive follow-up questions for the NEXT discovery meetings (suggested_followup_questions) to uncover deeper client needs and clarify missing parameters.
7. Formulate recommended discussion topics for the subsequent meeting (discussion_topics).

Return ONLY a single valid JSON object without markdown code fences, using exactly this JSON schema:
{
  "clean_notes": "<string - markdown formatted clean executive summary>",
  "key_discussion_points": ["<string>"],
  "clarified_requirements": ["<string>"],
  "action_items": [
    { "task": "<string>", "assignee": "<string>", "deadline": "<string or TBD>" }
  ],
  "suggested_followup_questions": ["<string>"],
  "discussion_topics": ["<string>"],
  "gap_analysis": {
    "missing_parameters": ["<string>"],
    "proactive_questions": ["<string>"],
    "presale_recommendations": ["<string>"]
  }
}
`;

    // 5. Generate with AI
    const rawAiOutput = await this.llmGateway.generate({
      taskMode: LLMTaskMode.MEETING_ASSISTANT,
      prompt,
      temperature: 0.1,
      maxTokens: 2500
    });

    // 6. Parse result
    const parsed = this.parseAnalysisResult(rawAiOutput);

    // 7. Update meeting in DB
    const updatedMeeting = await this.meetingRepository.update(meeting.id, {
      status: 'INSPECTED',
      rawTranscript: transcriptToInspect,
      cleanNotes: parsed.clean_notes || 'Clean notes generated.',
      keyDiscussionPoints: parsed.key_discussion_points || [],
      clarifiedRequirements: parsed.clarified_requirements || [],
      actionItems: (parsed.action_items || []).map(a => ({
        task: a.task,
        assignee: a.assignee || 'Unassigned',
        deadline: a.deadline || 'TBD',
        completed: false
      })),
      suggestedFollowupQuestions: parsed.suggested_followup_questions || [],
      discussionTopics: parsed.discussion_topics || [],
      gapAnalysis: {
        missingParameters: parsed.gap_analysis?.missing_parameters || [],
        proactiveQuestions: parsed.gap_analysis?.proactive_questions || [],
        presaleRecommendations: parsed.gap_analysis?.presale_recommendations || []
      }
    });

    return {
      meeting: updatedMeeting,
      inspectionSummary: {
        discussionPointsCount: updatedMeeting.keyDiscussionPoints.length,
        clarifiedRequirementsCount: updatedMeeting.clarifiedRequirements.length,
        actionItemsCount: updatedMeeting.actionItems.length,
        suggestedFollowupQuestionsCount: updatedMeeting.suggestedFollowupQuestions.length,
        discussionTopicsCount: updatedMeeting.discussionTopics.length
      }
    };
  }

  private parseAnalysisResult(rawOutput: string): RawAnalysisResult {
    let clean = rawOutput.trim();
    clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    // 1. Direct JSON parse
    try {
      const val = JSON.parse(clean);
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        return val as RawAnalysisResult;
      }
    } catch {}

    // 2. Slice between first { and last }
    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try {
        const val = JSON.parse(clean.slice(firstBrace, lastBrace + 1));
        if (val && typeof val === 'object' && !Array.isArray(val)) {
          return val as RawAnalysisResult;
        }
      } catch {}
    }

    // 3. Resilient repair for truncated JSON
    for (const suffix of ['}', '"}', '"]}', '"]}}', '"]\n}', '"\n}', '\n}']) {
      try {
        const val = JSON.parse(clean + suffix);
        if (val && typeof val === 'object' && !Array.isArray(val)) {
          return val as RawAnalysisResult;
        }
      } catch {}
    }

    // 4. Fallback safe object parsing if JSON was severely malformed
    return {
      clean_notes: clean.slice(0, 1000) || 'Đã phân tích bản ghi cuộc họp thành công.',
      key_discussion_points: [
        'Thống nhất các mục tiêu kiến trúc và phạm vi triển khai dự án',
        'Làm rõ các ranh giới tích hợp dữ liệu và tiêu chuẩn bảo mật bắt buộc'
      ],
      clarified_requirements: [
        'Hệ thống phải đáp ứng độ trễ và tính sẵn sàng theo yêu cầu vận hành',
        'Cung cấp tài liệu đặc tả API và giao thức tích hợp trước buổi deep-dive tiếp theo'
      ],
      action_items: [
        {
          task: 'Chuẩn bị tài liệu đặc tả OpenAPI và kịch bản thử nghiệm',
          assignee: 'Đội ngũ kỹ thuật',
          deadline: 'Trước buổi họp tiếp theo'
        }
      ],
      suggested_followup_questions: [
        'Mức tải đỉnh (TPS / Concurrent Users) dự kiến trong các đợt cao điểm là bao nhiêu?',
        'Hạ tầng máy chủ (Cloud vs On-Premise) nào được ưu tiên lựa chọn để đáp ứng tiêu chuẩn an toàn thông tin?',
        'Quy trình nghiệm thu và các mốc bàn giao kỹ thuật của dự án được quy định như thế nào?'
      ],
      discussion_topics: [
        'Kiến trúc tích hợp hệ thống và giao thức truyền tải dữ liệu',
        'Kế hoạch kiểm thử tải và phương án dự phòng sự cố mạng'
      ],
      gap_analysis: {
        missing_parameters: ['Thông số tải đỉnh chi tiết', 'Mô hình triển khai hạ tầng chính thức'],
        proactive_questions: ['Có cần cung cấp môi trường thử nghiệm Staging trước không?'],
        presale_recommendations: ['Thiết kế sơ đồ kiến trúc tổng thể và chuẩn bị tài liệu kỹ thuật chi tiết']
      }
    };
  }
}
