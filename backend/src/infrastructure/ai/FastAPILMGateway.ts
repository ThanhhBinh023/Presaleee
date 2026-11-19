import axios from 'axios';
import { GoogleGenAI } from '@google/genai';
import { ILLMGateway, LLMGenerateOptions, LLMTaskMode } from '../../domain/repositories/ILLMGateway.js';
import { ExternalServiceError } from '../../domain/errors/AppError.js';
import { env } from '../config/env.js';

const SYSTEM_PROMPTS: Record<number, string> = {
  [LLMTaskMode.LEAD_INTAKE]:
    "You are an expert IT Presale Solutions Architect. Extract strictly valid JSON from the client request. Return ONLY the raw JSON object without markdown formatting, code fences, or explanations.",
  [LLMTaskMode.MEETING_ASSISTANT]:
    "You are an expert AI Presale Meeting Assistant for 'Presaleee'. Clean, normalize, and distill raw meeting transcripts into structured notes with Key Discussion Points, Clarified Requirements, Action Items & Ownership, and Open Questions.",
  [LLMTaskMode.GAP_ANALYSIS]:
    "You are a senior IT Presale Consultant for 'Presaleee'. Analyze gaps in client requirements against a complete 10-sheet proposal and suggest sharp proactive follow-up questions.",
  [LLMTaskMode.LEAD_QUALIFICATION]:
    "You are a Commercial Presale Director for 'Presaleee'. Qualify this lead using the BANT framework (0-100 score) with detailed risk evaluation.",
  [LLMTaskMode.PROPOSAL_BUILDER]:
    "You are a Lead Proposal Architect for 'Presaleee'. Synthesize a comprehensive executive overview for the technical proposal.",
  [LLMTaskMode.TECH_ARCHITECTURE]:
    "You are a Principal Solutions Architect for 'Presaleee'. Provide technical architecture, stack justification, and NFRs."
};

export const GEMINI_CANDIDATE_MODELS = ['gemini-3-flash-preview', 'gemini-3.1-flash-lite'] as const;

export class FastAPILMGateway implements ILLMGateway {
  private readonly baseUrl: string;
  private geminiClient: GoogleGenAI | null = null;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || env.aiServiceUrl;
  }

  private getGeminiClient(): GoogleGenAI {
    if (!this.geminiClient) {
      if (!env.geminiApiKey) {
        throw new ExternalServiceError('GEMINI_API_KEY environment variable is not defined.');
      }
      this.geminiClient = new GoogleGenAI({ apiKey: env.geminiApiKey });
    }
    return this.geminiClient;
  }

  async generate(options: LLMGenerateOptions): Promise<string> {
    // 1. Try local FastAPI AI service first (with generous 60s timeout)
    const fastApiStart = Date.now();
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/v1/generate`,
        {
          task_mode: options.taskMode,
          prompt: options.prompt,
          temperature: options.temperature ?? 0.2,
          max_tokens: options.maxTokens ?? 2000
        },
        { timeout: 60000 }
      );

      const duration = Date.now() - fastApiStart;
      if (response.data && typeof response.data.output === 'string' && response.data.output.trim().length > 0) {
        console.log(`[FastAPILMGateway] FastAPI request completed successfully in ${duration}ms.`);
        return response.data.output.trim();
      }
    } catch (err: any) {
      const duration = Date.now() - fastApiStart;
      console.warn(`[FastAPILMGateway] AI server at ${this.baseUrl} failed after ${duration}ms (${err?.message || err}). Falling back to direct Gemini.`);
    }

    // 2. Direct Gemini Fallback (with generous 45s timeout per candidate, max 2 live models)
    if (env.geminiApiKey) {
      try {
        const client = this.getGeminiClient();
        const systemInstruction = SYSTEM_PROMPTS[options.taskMode] || 'You are a helpful IT Presale Assistant.';

        for (const model of GEMINI_CANDIDATE_MODELS) {
          const modelStart = Date.now();
          try {
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error(`Timeout on model ${model} after 45000ms`)), 45000)
            );

            const generatePromise = client.models.generateContent({
              model,
              contents: `${systemInstruction}\n\n${options.prompt}`,
              config: {
                temperature: options.temperature ?? 0.2,
                maxOutputTokens: options.maxTokens ?? 2000
              }
            });

            const response = await Promise.race([generatePromise, timeoutPromise]);
            const duration = Date.now() - modelStart;
            const outputText = response.text?.trim();
            if (outputText && outputText.length > 0) {
              console.log(`[FastAPILMGateway] Direct Gemini model ${model} succeeded in ${duration}ms.`);
              return outputText;
            }
          } catch (modelErr: any) {
            const duration = Date.now() - modelStart;
            console.warn(`[FastAPILMGateway] Direct Gemini model ${model} failed after ${duration}ms: ${modelErr?.message || modelErr}. Trying next...`);
            continue;
          }
        }
      } catch (geminiErr: any) {
        console.warn(`[FastAPILMGateway] Direct Gemini fallback failed: ${geminiErr?.message || geminiErr}`);
      }
    }

    // 3. Resilient Dynamic Fallback Engine
    if (options.requireLiveModel) {
      throw new ExternalServiceError('No AI model answered this request; the placeholder response is not sent to clients.');
    }

    return this.generateHeuristicFallback(options.taskMode, options.prompt);
  }

  private generateHeuristicFallback(taskMode: LLMTaskMode, prompt: string): string {
    if (taskMode === LLMTaskMode.MEETING_ASSISTANT) {
      return this.heuristicMeetingAssistant(prompt);
    }

    if (taskMode === LLMTaskMode.LEAD_INTAKE) {
      return this.heuristicLeadIntake(prompt);
    }

    if (taskMode === LLMTaskMode.LEAD_QUALIFICATION) {
      return this.heuristicBantQualification(prompt);
    }

    if (taskMode === LLMTaskMode.PROPOSAL_BUILDER) {
      throw new ExternalServiceError('AI service unavailable for Proposal Generation. Heuristic placeholder is disabled.');
    }

    return JSON.stringify({
      summary: 'Automated Presale Analysis',
      status: 'PROCESSED',
      timestamp: new Date().toISOString()
    });
  }

  private heuristicLeadIntake(prompt: string): string {
    // Extract actual user source text from prompt tags if available
    const sourceMatch = prompt.match(/<source_text>([\s\S]*?)<\/source_text>/i);
    const sourceText = (sourceMatch ? sourceMatch[1] : prompt).trim();
    const lower = sourceText.toLowerCase();

    // Extract dynamic project title from user's actual text
    let projectName = '';
    const buildMatch = sourceText.match(/(?:xây dựng|phát triển|triển khai|thiết kế|nâng cấp)\s+(?:một\s+)?(hệ thống\s+[^.,;\n]+|nền tảng\s+[^.,;\n]+|ứng dụng\s+[^.,;\n]+|giải pháp\s+[^.,;\n]+|phần mềm\s+[^.,;\n]+)/i);
    if (buildMatch && buildMatch[1]?.trim().length > 5) {
      const raw = buildMatch[1].trim();
      projectName = raw.charAt(0).toUpperCase() + raw.slice(1);
    }

    if (!projectName) {
      const projMatch = sourceText.match(/(?:Dự án|Hệ thống|Nền tảng|Phần mềm|Đề án)[:\s]+([^.,;\n]+)/i);
      if (projMatch && projMatch[1]?.trim().length > 3) {
        projectName = projMatch[1].trim();
      }
    }

    if (!projectName) {
      if (lower.includes('bán hàng') || lower.includes('pos') || lower.includes('bán lẻ') || lower.includes('đơn hàng')) {
        projectName = 'Hệ thống Quản lý Bán hàng Trực tuyến';
      } else if (lower.includes('thanh toán') || lower.includes('ngân hàng') || lower.includes('fintech')) {
        projectName = 'Hệ thống Cổng Thanh toán & Ngân hàng số';
      } else if (lower.includes('y tế') || lower.includes('bệnh viện') || lower.includes('health')) {
        projectName = 'Hệ thống Quản lý Y tế & Bệnh viện số';
      } else if (lower.includes('gis') || lower.includes('vệ tinh') || lower.includes('bản đồ')) {
        projectName = 'Hệ thống Bản đồ Địa lý GIS & Viễn thám';
      } else {
        const firstLine = sourceText.split('\n')[0].trim();
        projectName = (firstLine.length > 5 && firstLine.length < 70) ? firstLine : 'Dự án Hiện đại hóa Giải pháp Số';
      }
    }

    // Detect domain / industry dynamically from sourceText
    let clientIndustry = 'Công nghệ Thông tin & Chuyển đổi Số';
    if (lower.includes('bán lẻ') || lower.includes('bán hàng') || lower.includes('sản phẩm') || lower.includes('đơn hàng') || lower.includes('tồn kho') || lower.includes('doanh thu') || lower.includes('pos') || lower.includes('retail') || lower.includes('e-commerce') || lower.includes('thương mại điện tử')) {
      clientIndustry = 'Bán lẻ & Thương mại Điện tử (E-Commerce)';
    } else if (lower.includes('thanh toán') || lower.includes('banking') || lower.includes('ngân hàng') || lower.includes('fintech') || lower.includes('tài chính')) {
      clientIndustry = 'FinTech & Ngân hàng số';
    } else if (lower.includes('y tế') || lower.includes('bệnh viện') || lower.includes('health') || lower.includes('phòng khám')) {
      clientIndustry = 'Y tế & Chăm sóc Sức khỏe (HealthTech)';
    } else if (lower.includes('giáo dục') || lower.includes('đào tạo') || lower.includes('trường học') || lower.includes('edtech')) {
      clientIndustry = 'Giáo dục & Đào tạo Trực tuyến (EdTech)';
    } else if (lower.includes('logistics') || lower.includes('kho vận') || lower.includes('vận tải') || lower.includes('giao hàng')) {
      clientIndustry = 'Logistics & Chuỗi Cung ứng';
    } else if (lower.includes('gis') || lower.includes('viễn thám') || lower.includes('vệ tinh') || lower.includes('địa vật')) {
      clientIndustry = 'Đô thị thông minh & GIS / Viễn thám';
    }

    // Detect SLA & peak workload
    let targetSla = '< 200ms API Response';
    const slaMatch = sourceText.match(/(?:độ trễ|latency|sla|phản hồi)\s*(?:dưới|<|<=)?\s*([0-9]+\s*(?:ms|giây|s))/i);
    if (slaMatch && slaMatch[1]) {
      targetSla = `< ${slaMatch[1].trim()}`;
    }

    let peakWorkload = '1,000+ Concurrent Users / High Scalability';
    const workloadMatch = sourceText.match(/([0-9,.]+\+?\s*(?:tps|giao dịch\/giây|người dùng|cán bộ|truy cập))/i);
    if (workloadMatch && workloadMatch[1]) {
      peakWorkload = workloadMatch[1].trim();
    }

    // Dynamic modules strictly based on user's actual keywords
    const coreModules: string[] = [];
    if (clientIndustry.includes('Bán lẻ') || lower.includes('bán hàng') || lower.includes('pos') || lower.includes('đơn hàng') || lower.includes('tồn kho')) {
      coreModules.push('Phân hệ Quản lý Danh mục Sản phẩm & Cập nhật Tồn kho');
      coreModules.push('Phân hệ Quản lý Đơn hàng & Theo dõi Tình trạng Giao dịch');
      coreModules.push('Phân hệ Quản lý Thông tin Khách hàng & Hồ sơ Người dùng');
      coreModules.push('Phân hệ Báo cáo Doanh thu & Thống kê Tình hình Kinh doanh');
    } else if (clientIndustry.includes('FinTech') || lower.includes('thanh toán') || lower.includes('ngân hàng')) {
      coreModules.push('Hệ thống Quản lý Giao dịch & Sổ cái Lõi');
      coreModules.push('Event Streaming Bus Phân tán Độ trễ Thấp');
      coreModules.push('Cổng Tích hợp Thanh toán & Đối soát Đối tác');
    } else if (clientIndustry.includes('GIS') || lower.includes('gis') || lower.includes('bản đồ')) {
      coreModules.push('Cơ sở Dữ liệu Bản đồ Địa lý GIS (PostGIS/GeoServer)');
      coreModules.push('Phân tích Ảnh viễn thám & Dữ liệu Không gian');
      coreModules.push('Cổng thông tin Tra cứu Quy hoạch & Báo cáo');
    } else {
      coreModules.push('Phân hệ Quản lý Nghiệp vụ & Dữ liệu Trung tâm');
      coreModules.push('Hệ thống Xử lý Dữ liệu Lõi Thời gian thực');
      coreModules.push('Phân hệ Báo cáo & Trực quan hóa Dashboard');
    }

    if (lower.includes('đăng nhập') || lower.includes('phân quyền') || lower.includes('bảo mật')) {
      coreModules.push('Hệ thống Đăng nhập, Phân quyền Người dùng (RBAC) & Bảo mật Dữ liệu');
    }

    if (lower.includes('mở rộng') || lower.includes('ổn định')) {
      coreModules.push('Kiến trúc Hạ tầng Sẵn sàng Mở rộng Quy mô (Scalability & Load Balancing)');
    }

    // Target platforms
    const targetPlatforms: string[] = [];
    if (lower.includes('web') || lower.includes('trực tuyến') || lower.includes('online')) {
      targetPlatforms.push('Cloud Web Application', 'Responsive Mobile Web');
    }
    if (lower.includes('app') || lower.includes('di động') || lower.includes('mobile')) {
      targetPlatforms.push('Mobile App (iOS / Android)');
    }
    if (targetPlatforms.length === 0) {
      targetPlatforms.push('Cloud Web Application', 'Hạ tầng Microservices / Container');
    }

    // Compliance
    const compliance: string[] = [];
    if (lower.includes('soc-2') || lower.includes('soc2')) compliance.push('SOC-2 Type II');
    if (lower.includes('pci')) compliance.push('PCI-DSS');
    if (lower.includes('iso')) compliance.push('ISO 27001');
    if (compliance.length === 0) compliance.push('Tiêu chuẩn An toàn Thông tin & Bảo mật Dữ liệu (ISO 27001 / OWASP Top 10)');

    // Missing information
    const missingInfo: string[] = [];
    if (clientIndustry.includes('Bán lẻ')) {
      missingInfo.push(
        'Dự kiến lượng người dùng truy cập đồng thời (CCU) và tốc độ tăng trưởng đơn hàng trong tương lai?',
        'Khách hàng có kế hoạch tích hợp với các cổng thanh toán (VNPay, Momo, VietQR) và đơn vị vận chuyển cụ thể nào?',
        'Yêu cầu môi trường triển khai (Cloud AWS/GCP hay hạ tầng máy chủ nội bộ On-Premise)?'
      );
    } else {
      missingInfo.push(
        'Hạ tầng máy chủ (Cloud hay On-Premise) khách hàng dự kiến sử dụng?',
        'Số lượng dữ liệu lịch sử cần di chuyển hoặc tích hợp ban đầu?',
        'Quy trình phê duyệt và các mốc nghiệm thu kỹ thuật chi tiết của dự án?'
      );
    }

    return JSON.stringify({
      project_name: projectName,
      client_industry: clientIndustry,
      business_goal: `Xây dựng và triển khai giải pháp ${projectName} đáp ứng tiêu chuẩn hiệu năng và nghiệp vụ của khách hàng.`,
      timeline_weeks: 20,
      budget_usd: 150000,
      target_platforms: targetPlatforms,
      core_functional_modules: coreModules,
      integrations_required: ['Cổng xác thực định danh SSO / OAuth2', 'Hệ thống Lưu trữ Dữ liệu Lõi'],
      compliance_and_security: compliance,
      priority_level: 'High',
      missing_information: missingInfo,
      target_sla: targetSla,
      peak_workload: peakWorkload
    }, null, 2);
  }

  private heuristicBantQualification(prompt: string): string {
    const sourceMatch = prompt.match(/<rfp_content>([\s\S]*?)<\/rfp_content>/i) || prompt.match(/<source_text>([\s\S]*?)<\/source_text>/i);
    const sourceText = (sourceMatch ? sourceMatch[1] : prompt).trim();
    const lower = (sourceText + ' ' + prompt).toLowerCase();
    
    // Extract dynamic title
    let title = '';
    const projMatch = prompt.match(/Lead title:\s*([^\n\r]+)/i) || sourceText.match(/(?:Dự án|Lead|Project|Hệ thống):\s*"?([^"\n\r.]+)"?/i);
    if (projMatch && projMatch[1]) {
      title = projMatch[1].trim();
    }
    if (!title) {
      if (lower.includes('bán hàng') || lower.includes('bán lẻ') || lower.includes('pos')) {
        title = 'Hệ thống Quản lý Bán hàng Trực tuyến';
      } else {
        title = 'Dự án Chuyển đổi Số Doanh nghiệp';
      }
    }

    const isRetail = lower.includes('bán hàng') || lower.includes('bán lẻ') || lower.includes('pos') || lower.includes('retail') || lower.includes('e-commerce');
    
    // Extract dynamic factors from user's actual raw content
    // 1. Budget Score (0-25)
    let budgetScore = 18;
    let budgetAssessment = 'Khách hàng chưa chốt con số ngân sách cụ thể, cần làm rõ dự toán trong các buổi thảo luận tiếp theo.';
    let budgetEvidence = ['Ước tính ngân sách nằm trong hạn mức tham khảo'];
    if (lower.includes('$') || lower.includes('usd') || lower.includes('triệu') || lower.includes('tỷ') || lower.includes('budget') || lower.includes('ngân sách')) {
      budgetScore = 24;
      budgetAssessment = 'Khách hàng có định hướng ngân sách rõ ràng, dự toán đầu tư khả thi với quy mô giải pháp.';
      budgetEvidence = ['Ngân sách dự kiến được xác định cụ thể trong yêu cầu', 'Mô hình đầu tư phân kỳ rõ ràng'];
    } else if (lower.includes('hạn hẹp') || lower.includes('tiết kiệm') || lower.includes('giá rẻ')) {
      budgetScore = 12;
      budgetAssessment = 'Ngân sách dự án hạn hẹp, cần cân nhắc tối ưu phạm vi tính năng để vừa vặn chi phí.';
      budgetEvidence = ['Khách hàng nhấn mạnh yếu tố chi phí thấp'];
    }

    // 2. Need Score (0-25)
    let needScore = 19;
    let needAssessment = 'Nhu cầu nghiệp vụ được mô tả ở mức cơ bản.';
    let needEvidence = ['Yêu cầu chức năng sơ bộ'];
    if (lower.length > 150 || lower.includes('cấp thiết') || lower.includes('nghiệp vụ') || lower.includes('tính năng') || lower.includes('quản lý') || lower.includes('yêu cầu')) {
      needScore = 25;
      needAssessment = isRetail
        ? 'Nhu cầu chuẩn hóa quy trình bán hàng, kiểm soát đơn hàng và đồng bộ tồn kho là rất cấp thiết.'
        : 'Bài toán nghiệp vụ rất cấp thiết, yêu cầu chức năng và mục tiêu vận hành cụ thể.';
      needEvidence = ['Yêu cầu tính năng và luồng nghiệp vụ chi tiết', 'Mục tiêu cải thiện hiệu suất vận hành rõ ràng'];
    } else if (lower.length < 50) {
      needScore = 13;
      needAssessment = 'Yêu cầu còn rất sơ sài, cần làm sâu sắc phạm vi chức năng qua các buổi họp tiếp theo.';
      needEvidence = ['Mô tả ban đầu quá ngắn, thiếu tiêu chí nghiệm thu'];
    }

    // 3. Timeline Score (0-25)
    let timelineScore = 18;
    let timelineAssessment = 'Tiến độ dự kiến trong khung thời gian hợp lý.';
    let timelineEvidence = ['Khung thời gian ước lượng 16 - 20 tuần'];
    if (lower.includes('tuần') || lower.includes('tháng') || lower.includes('deadline') || lower.includes('tiến độ') || lower.includes('giai đoạn') || lower.includes('quý')) {
      timelineScore = 23;
      timelineAssessment = 'Tiến độ bàn giao có lộ trình khả thi, phân kỳ theo từng giai đoạn rõ ràng.';
      timelineEvidence = ['Lộ trình bàn giao chia theo các mốc milestones', 'Thời gian dự kiến hoàn thành đáp ứng tiến độ'];
    } else if (lower.includes('gấp') || lower.includes('khẩn cấp') || lower.includes('ngay lập tức')) {
      timelineScore = 13;
      timelineAssessment = 'Áp lực tiến độ rất gấp, rủi ro trễ hạn cao nếu không tinh gọn phạm vi.';
      timelineEvidence = ['Yêu cầu triển khai gấp rút'];
    }

    // 4. Authority Score (0-25)
    let authorityScore = 20;
    let authorityAssessment = 'Đầu mối trao đổi nắm giữ vai trò ra quyết định hoặc tham mưu trực tiếp.';
    let authorityEvidence = ['Người đại diện trực tiếp trao đổi và tiếp nhận RFP'];
    if (lower.includes('giám đốc') || lower.includes('trưởng phòng') || lower.includes('lãnh đạo') || lower.includes('ceo') || lower.includes('cto') || lower.includes('hội đồng')) {
      authorityScore = 23;
      authorityAssessment = 'Có sự bảo trợ và quyết định trực tiếp từ cấp lãnh đạo phía đối tác.';
      authorityEvidence = ['Đầu mối lãnh đạo cấp cao phê duyệt dự án'];
    }

    const totalScore = budgetScore + needScore + timelineScore + authorityScore;
    const recommendation = totalScore >= 75 ? 'QUALIFY' : totalScore >= 55 ? 'REVIEW' : 'DISQUALIFY';

    return JSON.stringify({
      score: totalScore,
      recommendation,
      summary: totalScore >= 75
        ? `Dự án "${title}" đáp ứng đầy đủ tiêu chí thẩm định BANT (${totalScore}/100). Đạt mức độ sẵn sàng cao để triển khai các bước đề xuất giải pháp.`
        : `Dự án "${title}" đạt ${totalScore}/100 điểm BANT. Cần tiếp tục làm rõ thêm các khía cạnh nghiệp vụ và yêu cầu còn thiếu trước khi phê duyệt chính thức.`,
      criteria: {
        budget: {
          score: budgetScore,
          assessment: budgetAssessment,
          evidence: budgetEvidence
        },
        authority: {
          score: authorityScore,
          assessment: authorityAssessment,
          evidence: authorityEvidence
        },
        need: {
          score: needScore,
          assessment: needAssessment,
          evidence: needEvidence
        },
        timeline: {
          score: timelineScore,
          assessment: timelineAssessment,
          evidence: timelineEvidence
        }
      },
      risks: [
        'Cần làm rõ chi tiết các cổng tích hợp (thanh toán/vận chuyển) trong phiên họp Discovery tiếp theo.'
      ],
      next_steps: [
        'Tổ chức phiên Discovery Meeting với khách hàng',
        'Hoàn thiện ma trận giải pháp kỹ thuật và kiến trúc sơ bộ'
      ]
    }, null, 2);
  }

  private heuristicMeetingAssistant(prompt: string): string {
    const rawLines = prompt.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    // Extract dialog lines and statements
    const dialogLines = rawLines.filter(l => !l.startsWith('#') && !l.startsWith('---') && l.length > 5);
    const actionItems: Array<{ task: string; assignee: string; deadline: string }> = [];
    const clarifiedReqs: string[] = [];
    const discussionPoints: string[] = [];

    // Extract dynamic speakers
    const detectedSpeakers = new Set<string>();
    for (const line of dialogLines) {
      const match = line.match(/^\[?\d{0,2}:?\d{0,2}\]?\s*([A-Za-zÀ-ỹ0-9\s_.-]+?)(?:\s*\(([^)]+)\))?\s*:\s*(.+)$/);
      if (match) {
        const speaker = match[1].trim();
        if (speaker.length > 1 && speaker.length < 30) {
          detectedSpeakers.add(speaker);
        }
      }
    }
    const speakerList = Array.from(detectedSpeakers);

    // Parse lines for requirements and action items
    for (const line of dialogLines) {
      const lower = line.toLowerCase();
      const cleaned = line.replace(/^\[?\d{0,2}:?\d{0,2}\]?\s*/, '').trim();

      // Check for requirement-like statements
      if (
        lower.includes('cần') || lower.includes('yêu cầu') || lower.includes('phải') || 
        lower.includes('need') || lower.includes('must') || lower.includes('require') || 
        lower.includes('hỗ trợ') || lower.includes('support') || lower.includes('tính năng')
      ) {
        if (!clarifiedReqs.includes(cleaned) && clarifiedReqs.length < 5) {
          clarifiedReqs.push(cleaned);
        }
      }

      // Check for action-item-like statements
      if (
        lower.includes('gửi') || lower.includes('cung cấp') || lower.includes('hoàn thành') || 
        lower.includes('chuẩn bị') || lower.includes('send') || lower.includes('provide') || 
        lower.includes('schedule') || lower.includes('prepare') || lower.includes('deliver')
      ) {
        let assignee = speakerList[0] || 'Đội ngũ Presale';
        for (const spk of speakerList) {
          if (lower.includes(spk.toLowerCase())) {
            assignee = spk;
            break;
          }
        }
        actionItems.push({
          task: cleaned,
          assignee,
          deadline: 'Trước phiên họp tiếp theo'
        });
      }
    }

    // Fallbacks if transcript text is short or unstructured
    if (clarifiedReqs.length === 0) {
      for (const line of dialogLines.slice(0, 3)) {
        clarifiedReqs.push(line.replace(/^\[?\d{0,2}:?\d{0,2}\]?\s*/, '').trim());
      }
      if (clarifiedReqs.length === 0) {
        clarifiedReqs.push('Làm rõ phạm vi chức năng cốt lõi và các tiêu chí chấp nhận nghiệm thu.');
        clarifiedReqs.push('Xác định các giao tiếp API và ràng buộc tích hợp hệ thống bên thứ ba.');
      }
    }

    if (actionItems.length === 0) {
      actionItems.push({
        task: 'Tổng hợp biên bản cuộc họp và gửi xác nhận lại các yêu cầu đã thảo luận',
        assignee: speakerList[0] || 'Presale Consultant',
        deadline: 'Trong 24 giờ tới'
      });
      actionItems.push({
        task: 'Chuẩn bị tài liệu kiến trúc giải pháp sơ bộ cho buổi phản biện kỹ thuật',
        assignee: 'Solution Architect',
        deadline: 'Trước phiên trao đổi kế tiếp'
      });
    }

    for (const req of clarifiedReqs.slice(0, 3)) {
      discussionPoints.push(`Thảo luận chi tiết nội dung: ${req.length > 80 ? req.slice(0, 77) + '...' : req}`);
    }
    if (discussionPoints.length === 0) {
      discussionPoints.push('Trao đổi tổng quan nhu cầu bài toán và mục tiêu triển khai dự án');
      discussionPoints.push('Làm rõ ràng buộc kỹ thuật và tiến độ mong muốn của khách hàng');
    }

    return JSON.stringify({
      clean_notes: `### Tóm tắt Cuộc họp Discovery\n\n- **Tổng quan phiên làm việc**: Các bên đã thảo luận và làm rõ các yêu cầu then chốt dựa trên nội dung trao đổi trực tiếp.\n- **Trọng tâm kỹ thuật**: Đánh giá tính khả thi giải pháp, ma trận tích hợp và các điều kiện tiên quyết.\n- **Kế hoạch tiếp theo**: Đội ngũ Presale hoàn thiện tài liệu đề xuất giải pháp kỹ thuật và cập nhật vào hồ sơ Proposal.`,
      key_discussion_points: discussionPoints,
      clarified_requirements: clarifiedReqs.slice(0, 5),
      action_items: actionItems.slice(0, 4),
      suggested_followup_questions: [
        'Quy mô lượng người dùng đồng thời cao điểm (peak concurrent users) dự kiến là bao nhiêu?',
        'Khách hàng có yêu cầu đặc thù về hạ tầng lưu trữ (On-Premise, Private Cloud hay Public Cloud)?',
        'Các tiêu chuẩn bảo mật, phân quyền và mã hóa dữ liệu bắt buộc cần tuân thủ là gì?',
        'Tiến độ mục tiêu cho giai đoạn Pilot (thử nghiệm) và Go-Live chính thức là khi nào?'
      ],
      discussion_topics: [
        'Phân tích chi tiết quy trình nghiệp vụ và luồng xử lý dữ liệu',
        'Đặc tả giao thức tích hợp API và cơ chế đồng bộ dữ liệu',
        'Phương án bảo mật, phân quyền người dùng và kiểm toán bảo mật',
        'Lộ trình triển khai, kế hoạch kiểm thử UAT và bảo hành hỗ trợ'
      ],
      gap_analysis: {
        missing_parameters: [
          'Số liệu ước tính tải và lưu lượng giao dịch tối đa',
          'Tài liệu đặc tả API chi tiết từ các hệ thống hiện hữu',
          'Kế hoạch chuyển đổi và import dữ liệu lịch sử'
        ],
        proactive_questions: [
          'Phía đối tác có sẵn môi trường thử nghiệm (Sandbox / Staging) để Presale tiến hành PoC không?',
          'Đã có quy chuẩn thiết kế giao diện (UI/UX Design System) sẵn có hay cần xây dựng mới?'
        ],
        presale_recommendations: [
          'Cập nhật các yêu cầu đã thống nhất vào Sheet 2 (Scope of Work) và Sheet 5 (Technical Architecture)',
          'Chuẩn bị phương án quản trị rủi ro RAID cho các điểm phụ thuộc API ngoài'
        ]
      }
    }, null, 2);
  }
}
