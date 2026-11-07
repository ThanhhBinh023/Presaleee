import { Pool } from 'pg';
import { IProposalRepository } from '../../domain/repositories/IProposalRepository.js';
import { ILLMGateway, LLMTaskMode } from '../../domain/repositories/ILLMGateway.js';
import { SearchHybridRAGUseCase } from './SearchHybridRAGUseCase.js';
import { ProposalWithSheets } from '../../domain/entities/Proposal.js';
import { NotFoundError, ValidationError } from '../../domain/errors/AppError.js';

export interface GenerateProposalFromLeadInput {
  leadId: string;
  customInstructions?: string;
  userId?: string | null;
}

export class GenerateProposalFromLeadUseCase {
  constructor(
    private readonly proposalRepo: IProposalRepository,
    private readonly searchRAGUseCase: SearchHybridRAGUseCase,
    private readonly llmGateway: ILLMGateway,
    private readonly dbPool: Pool
  ) {}

  async execute(input: GenerateProposalFromLeadInput): Promise<ProposalWithSheets> {
    if (!input.leadId) {
      throw new ValidationError('Lead ID is required to generate a proposal.');
    }

    // 1. Fetch Lead from database
    const leadRes = await this.dbPool.query('SELECT * FROM leads WHERE id = $1 LIMIT 1;', [input.leadId]);
    if (leadRes.rows.length === 0) {
      throw new NotFoundError(`Lead with ID ${input.leadId} not found.`);
    }
    const lead = leadRes.rows[0];
    const meta = lead.extracted_metadata || {};

    // 2. Fetch Discovery Meetings for this lead
    const meetingsRes = await this.dbPool.query(
      `SELECT * FROM meetings WHERE lead_id = $1 ORDER BY meeting_order ASC;`,
      [input.leadId]
    );
    const meetings = meetingsRes.rows;

    let meetingsContext = '';
    if (meetings.length > 0) {
      meetingsContext = 'DISCOVERY MEETINGS CONTEXT & CLARIFIED REQUIREMENTS:\n';
      meetings.forEach((m, idx) => {
        meetingsContext += `Meeting #${idx + 1} (${m.title} - ${m.source_tool || 'MEETING'}):\n`;
        if (m.clean_notes) meetingsContext += `- Summary: ${m.clean_notes.slice(0, 300)}...\n`;
        if (m.clarified_requirements && m.clarified_requirements.length > 0) {
          meetingsContext += `- Clarified Requirements: ${m.clarified_requirements.join('; ')}\n`;
        }
        if (m.key_discussion_points && m.key_discussion_points.length > 0) {
          meetingsContext += `- Key Discussion: ${m.key_discussion_points.join('; ')}\n`;
        }
        meetingsContext += '\n';
      });
    }

    // 3. Search RAG Knowledge Base for relevant technical reference chunks
    const domainQuery = `${lead.title} ${meta.clientIndustry || 'Enterprise'}`;
    const ragResult = await this.searchRAGUseCase.execute({
      query: `${lead.title} ${lead.raw_rfp_content || ''}`,
      domain: meta.clientIndustry || undefined,
      topK: 3
    });

    let ragContext = '';
    if (ragResult.chunks && ragResult.chunks.length > 0) {
      ragContext = 'PROVEN ARCHITECTURAL REFERENCES & BENCHMARKS:\n';
      ragResult.chunks.forEach((chunk, i) => {
        const title = chunk.metadata?.title || 'Knowledge Reference';
        const section = chunk.metadata?.section || 'Architecture';
        ragContext += `Ref #${i + 1} (${title} - ${section}): ${chunk.chunkContent}\n`;
      });
    }

    // 4. Construct AI Synthesis Prompt
    const prompt = `
You are the Principal Solutions Architect and Presale Director for 'Presaleee'.
Synthesize a comprehensive, executive-grade Technical Proposal for the following project.

PROJECT DETAILS:
Title: "${lead.title}"
Industry / Domain: ${meta.clientIndustry || 'Enterprise Technology'}
Business Goal: ${meta.businessGoal || 'Modernize system infrastructure and deliver scalable IT solution.'}
Raw Client RFP:
"""
${lead.raw_rfp_content || 'Comprehensive digital transformation and systems engineering.'}
"""
Target Platforms: ${JSON.stringify(meta.targetPlatforms || ['Cloud Web Application', 'Microservices API'])}
Core Functional Modules: ${JSON.stringify(meta.coreFunctionalModules || ['Core Engine', 'Management Dashboard', 'Integration API'])}
Target SLA: ${meta.target_sla || meta.targetSla || '< 200ms Latency'}
Peak Workload: ${meta.peak_workload || meta.peakWorkload || '10,000+ Concurrent Requests'}
Compliance & Security: ${JSON.stringify(meta.complianceAndSecurity || ['ISO 27001', 'SOC-2 Type II'])}
Estimated Timeline: ${meta.timelineWeeks || 20} Weeks
Estimated Budget: $${meta.budgetUsd || 150000} USD

${meetingsContext}
${ragContext}
${input.customInstructions ? `SPECIAL CLIENT DIRECTIVES: ${input.customInstructions}` : ''}

INSTRUCTIONS:
Generate a strictly valid JSON object synthesizing the complete Proposal structure across the standard sheets.
Return ONLY the raw JSON object without markdown code fences:
{
  "executive_summary": "<Detailed 2-3 paragraph executive summary specific to this project, client goals, and core solution>",
  "key_objectives": ["<Objective 1>", "<Objective 2>", "<Objective 3>", "<Objective 4>"],
  "delivery_methodology": "Agile Scrum (2-week sprint cadence with bi-weekly demo & sprint review)",
  "scope_of_work": [
    { "wbs": "1.0", "module": "<Module Name>", "feature": "<Key Feature Details>", "complexity": "Medium", "priority": "Must Have", "estimatedDays": 15 },
    { "wbs": "2.0", "module": "<Module Name>", "feature": "<Key Feature Details>", "complexity": "High", "priority": "Must Have", "estimatedDays": 25 },
    { "wbs": "3.0", "module": "<Module Name>", "feature": "<Key Feature Details>", "complexity": "High", "priority": "Must Have", "estimatedDays": 20 },
    { "wbs": "4.0", "module": "<Module Name>", "feature": "<Key Feature Details>", "complexity": "Medium", "priority": "Must Have", "estimatedDays": 15 },
    { "wbs": "5.0", "module": "<Module Name>", "feature": "<Key Feature Details>", "complexity": "Low", "priority": "Should Have", "estimatedDays": 10 }
  ],
  "architecture_stack": [
    { "layer": "Frontend & Portal", "technology": "<Technologies>", "rationale": "<Technical Rationale>" },
    { "layer": "Core Services & API Gateway", "technology": "<Technologies>", "rationale": "<Technical Rationale>" },
    { "layer": "Data Processing & AI Pipeline", "technology": "<Technologies>", "rationale": "<Technical Rationale>" },
    { "layer": "Database & Spatial / Storage", "technology": "<Technologies>", "rationale": "<Technical Rationale>" },
    { "layer": "Infrastructure & Security", "technology": "<Technologies>", "rationale": "<Technical Rationale>" }
  ],
  "timeline_milestones": [
    { "phase": "Phase 1", "milestone": "Discovery & UI/UX Design Blueprint", "durationWeeks": 3, "deliverables": "Clickable Prototype, Architecture Blueprint" },
    { "phase": "Phase 2", "milestone": "Core Foundation & DB Migrations", "durationWeeks": 4, "deliverables": "Core Data Schema, Auth & Gateway" },
    { "phase": "Phase 3", "milestone": "Core Business Modules & AI Integration", "durationWeeks": 6, "deliverables": "Feature Modules, AI Pipelines" },
    { "phase": "Phase 4", "milestone": "Testing, Security Hardening & UAT", "durationWeeks": 4, "deliverables": "End-to-End Tests, Pen-testing Report" },
    { "phase": "Phase 5", "milestone": "Production Deployment & Hypercare", "durationWeeks": 3, "deliverables": "Go-Live, Admin Training, Support" }
  ],
  "assumptions_dependencies": [
    { "category": "Client Dependencies", "description": "<Specific prerequisite required from client team>" },
    { "category": "Data Access", "description": "<Sample payloads, APIs or data access requirements>" },
    { "category": "Environment", "description": "<Cloud hosting or server infrastructure access>" }
  ],
  "risks_and_mitigation": [
    { "risk": "<Specific Technical / Delivery Risk>", "impact": "High", "probability": "Medium", "mitigation": "<Actionable mitigation plan>" },
    { "risk": "<Integration / Data Risk>", "impact": "Medium", "probability": "High", "mitigation": "<Actionable mitigation plan>" },
    { "risk": "<Compliance / Timeline Risk>", "impact": "Medium", "probability": "Medium", "mitigation": "<Actionable mitigation plan>" }
  ],
  "sla_commitments": [
    { "metric": "System Availability", "target": "99.95% Monthly Uptime" },
    { "metric": "API Response Latency", "target": "${meta.target_sla || meta.targetSla || '< 200ms Latency'}" },
    { "metric": "Incident Response (Sev 1)", "target": "< 15 minutes 24/7" }
  ],
  "ui_design_brief": {
    "title": "Interactive UI/UX Design Brief",
    "target_users": ["<Primary User Persona>", "<Secondary User Persona>"],
    "key_screens": ["<Key Screen 1>", "<Key Screen 2>", "<Key Screen 3>"],
    "ui_style_guide": "<Design philosophy, color palette, responsive constraints>",
    "interaction_flow": "<Step-by-step user interaction flow for external design tool prototype>"
  }
}
`;

    // 5. Call LLM Gateway
    let aiProposal: any = null;
    try {
      const rawAi = await this.llmGateway.generate({
        taskMode: LLMTaskMode.PROPOSAL_BUILDER,
        prompt,
        temperature: 0.2,
        maxTokens: 3500
      });

      let clean = rawAi.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      const firstBrace = clean.indexOf('{');
      const lastBrace = clean.lastIndexOf('}');
      if (firstBrace >= 0 && lastBrace > firstBrace) {
        clean = clean.slice(firstBrace, lastBrace + 1);
      }

      try {
        aiProposal = JSON.parse(clean);
      } catch {
        for (const suffix of ['}', '"}', '"]}', '"]}}', '"]\n}', '"\n}', '\n}']) {
          try {
            aiProposal = JSON.parse(clean + suffix);
            break;
          } catch {}
        }
      }
    } catch (llmErr) {
      console.warn('[GenerateProposalFromLeadUseCase] LLM generation warning:', llmErr);
    }

    // Fallback if AI synthesis returned incomplete JSON
    const title = lead.title || 'Technical Solution Proposal';
    const totalWeeks = meta.timelineWeeks || 20;

    const modules = aiProposal?.scope_of_work?.length > 0
      ? aiProposal.scope_of_work
      : (meta.coreFunctionalModules || ['Core Engine', 'Management Dashboard', 'Integration API']).map((m: string, idx: number) => ({
          wbs: `${idx + 1}.0`,
          module: m,
          feature: `Triển khai phân hệ ${m} đáp ứng chuẩn bảo mật và hiệu năng của dự án`,
          complexity: idx === 0 ? 'High' : 'Medium',
          priority: 'Must Have',
          estimatedDays: 18
        }));

    const stack = aiProposal?.architecture_stack?.length > 0
      ? aiProposal.architecture_stack
      : [
          { layer: 'Giao diện & Ứng dụng Web', technology: 'React 19, TypeScript, TailwindCSS', rationale: 'Giao diện trực quan, tương tác thời gian thực và trải nghiệm mượt mà' },
          { layer: 'Cổng Dịch vụ & API Backend', technology: 'Node.js, Express, Clean Architecture', rationale: 'Kiến trúc module hóa, bảo trì dễ dàng và chịu tải đồng thời cao' },
          { layer: 'Xử lý Dữ liệu Lõi & AI', technology: 'Python, FastAPI, TensorRT/PyTorch, Gemini Cloud', rationale: 'Pipeline xử lý chuyên sâu và tối ưu hóa hiệu năng tính toán' },
          { layer: 'Cơ sở Dữ liệu & Lưu trữ', technology: 'PostgreSQL 16, PostGIS, S3 Object Storage', rationale: 'Bảo toàn giao dịch ACID và lưu trữ dữ liệu dung lượng lớn' },
          { layer: 'Hạ tầng & An toàn Thông tin', technology: 'Docker, Kubernetes, mTLS, CI/CD Pipeline', rationale: 'Triển khai bất biến, tự động mở rộng quy mô và kiểm thử liên tục' }
        ];

    const milestones = aiProposal?.timeline_milestones?.length > 0
      ? aiProposal.timeline_milestones
      : [
          { phase: 'Giai đoạn 1', milestone: 'Khảo sát Kỹ thuật & Thiết kế Kiến trúc Blueprint', durationWeeks: 3, deliverables: 'Bản vẽ Kiến trúc, SRS, Clickable Prototype' },
          { phase: 'Giai đoạn 2', milestone: 'Thiết lập Hạ tầng Lõi & Cơ sở Dữ liệu', durationWeeks: 4, deliverables: 'Hạ tầng Cloud/Server, CSDL, Cổng xác thực định danh' },
          { phase: 'Giai đoạn 3', milestone: 'Phát triển các Phân hệ Nghiệp vụ & Module AI', durationWeeks: 7, deliverables: 'Toàn bộ các phân hệ chức năng và pipeline xử lý' },
          { phase: 'Giai đoạn 4', milestone: 'Kiểm thử Hiệu năng, Bảo mật & Chạy Thử nghiệm (UAT)', durationWeeks: 4, deliverables: 'Báo cáo Kiểm thử Tải, Báo cáo An ninh Mạng, Biên bản UAT' },
          { phase: 'Giai đoạn 5', milestone: 'Bàn giao, Đào tạo Vận hành & Hỗ trợ Hypercare', durationWeeks: 2, deliverables: 'Vận hành chính thức (Go-Live), Tài liệu HDSD' }
        ];

    // Compute dynamic team cost and rate cards
    const roles = [
      { role: 'Project Manager (PM)', level: 'SENIOR', allocation: '50%', manMonths: Math.round(totalWeeks / 4 * 0.5 * 10) / 10, monthlyRate: 4500, totalCost: 0 },
      { role: 'Principal Solution Architect', level: 'LEAD', allocation: '50%', manMonths: Math.round(totalWeeks / 4 * 0.5 * 10) / 10, monthlyRate: 6000, totalCost: 0 },
      { role: 'Senior Backend / AI Engineer', level: 'SENIOR', allocation: '100%', manMonths: Math.round(totalWeeks / 4 * 1.0 * 10) / 10, monthlyRate: 4500, totalCost: 0 },
      { role: 'Senior Frontend Developer', level: 'SENIOR', allocation: '100%', manMonths: Math.round(totalWeeks / 4 * 1.0 * 10) / 10, monthlyRate: 3800, totalCost: 0 },
      { role: 'QA & Automation Test Engineer', level: 'MID', allocation: '100%', manMonths: Math.round(totalWeeks / 4 * 0.75 * 10) / 10, monthlyRate: 2800, totalCost: 0 }
    ];

    let totalTeamCost = 0;
    roles.forEach(r => {
      r.totalCost = Math.round(r.manMonths * r.monthlyRate);
      totalTeamCost += r.totalCost;
    });

    const infraCost = 15000;
    const contingencyCost = Math.round(totalTeamCost * 0.1);
    const grandTotal = totalTeamCost + infraCost + contingencyCost;

    // 6. Build the 10 standard proposal sheets
    const sheets = [
      {
        sheetName: 'Overview',
        sheetOrder: 1,
        aiGenerated: true,
        sheetData: {
          title: 'Executive Summary & Project Overview',
          projectName: title,
          clientIndustry: meta.clientIndustry || 'Enterprise',
          date: new Date().toISOString().split('T')[0],
          executiveSummary: aiProposal?.executive_summary || `Hồ sơ đề xuất giải pháp kỹ thuật và kế hoạch triển khai toàn diện cho dự án "${title}". Giải pháp được kiến trúc hóa nhằm đáp ứng yêu cầu độ trễ (${meta.target_sla || '< 200ms'}), năng lực chịu tải đỉnh (${meta.peak_workload || '10,000+ người dùng'}), đồng thời tuân thủ các quy chuẩn bảo mật cao cấp nhất.`,
          keyObjectives: aiProposal?.key_objectives || [
            `Xây dựng nền tảng ${title} hiệu năng cao và độ trễ thấp`,
            'Tự động hóa luồng quy trình nghiệp vụ và phân tích dữ liệu chuyên sâu',
            'Đảm bảo tiêu chuẩn an toàn thông tin và tính sẵn sàng 99.95%',
            'Triển khai theo phương pháp luận Agile linh hoạt, giảm thiểu rủi ro dự án'
          ],
          deliveryMethodology: aiProposal?.delivery_methodology || 'Agile Scrum (Sprint 2 tuần kèm demo kiểm thử định kỳ)',
          uiDesignBrief: aiProposal?.ui_design_brief || {
            title: `UI/UX Design Brief cho ${title}`,
            target_users: ['Cán bộ Quản trị Hệ thống', 'Chuyên viên Vận hành Nghiệp vụ', 'Người dùng Tra cứu'],
            key_screens: ['Dashboard Tổng quan & Telemetry', 'Bản đồ Tương tác & Phân lớp Dữ liệu', 'Cổng Báo cáo & Phân quyền'],
            ui_style_guide: 'Phong cách Enterprise hiện đại, gam màu Slate Navy & Emerald chủ đạo, hỗ trợ Dark/Light mode và tương thích máy tính bảng.',
            interaction_flow: 'Đăng nhập SSO -> Xem Dashboard thời gian thực -> Thao tác tra cứu bản đồ / dữ liệu -> Xuất báo cáo tự động.'
          }
        }
      },
      {
        sheetName: 'Scope of Work',
        sheetOrder: 2,
        aiGenerated: true,
        sheetData: {
          title: 'Scope of Work (WBS & Functional Specifications)',
          modules
        }
      },
      {
        sheetName: 'Architecture & Tech Stack',
        sheetOrder: 3,
        aiGenerated: true,
        sheetData: {
          title: 'Technical Architecture & Non-Functional Requirements',
          stack,
          nonFunctionalRequirements: [
            { category: 'Độ trễ API (Performance)', requirement: meta.target_sla || '< 200ms phản hồi cho các tác vụ tra cứu chính' },
            { category: 'Tính sẵn sàng (Availability)', requirement: '99.95% uptime SLA với hạ tầng dự phòng Active-Passive' },
            { category: 'Tải đỉnh (Scalability)', requirement: meta.peak_workload || 'Hỗ trợ tối thiểu 10,000 người dùng truy cập đồng thời' },
            { category: 'Bảo mật (Security)', requirement: (meta.complianceAndSecurity || ['ISO 27001']).join(', ') }
          ]
        }
      },
      {
        sheetName: 'Timeline & Milestones',
        sheetOrder: 4,
        aiGenerated: true,
        sheetData: {
          title: 'Implementation Timeline & Milestone Roadmap',
          totalWeeks,
          milestones
        }
      },
      {
        sheetName: 'Team & Rate Cards',
        sheetOrder: 5,
        aiGenerated: true,
        sheetData: {
          title: 'Team Composition & Role Allocation',
          roles,
          totalEffortManMonths: Math.round(roles.reduce((acc, r) => acc + r.manMonths, 0) * 10) / 10,
          totalTeamCost
        }
      },
      {
        sheetName: 'Pricing & Quotation',
        sheetOrder: 6,
        aiGenerated: true,
        sheetData: {
          title: 'Commercial Pricing & Milestone Payment Schedule',
          currency: 'USD',
          teamCost: totalTeamCost,
          infrastructureCost: infraCost,
          contingencyBuffer: contingencyCost,
          grandTotal,
          paymentMilestones: [
            { milestone: 'Ký hợp đồng & Khởi động dự án (Kick-off)', percentage: 30, amount: Math.round(grandTotal * 0.3) },
            { milestone: 'Hoàn thành Khảo sát & Phê duyệt Blueprint', percentage: 25, amount: Math.round(grandTotal * 0.25) },
            { milestone: 'Nghiệm thu Giai đoạn Thử nghiệm UAT', percentage: 30, amount: Math.round(grandTotal * 0.3) },
            { milestone: 'Vận hành Chính thức (Go-Live) & Bàn giao', percentage: 15, amount: Math.round(grandTotal * 0.15) }
          ]
        }
      },
      {
        sheetName: 'Assumptions & Dependencies',
        sheetOrder: 7,
        aiGenerated: true,
        sheetData: {
          title: 'Assumptions & Client Dependencies',
          items: aiProposal?.assumptions_dependencies || [
            { category: 'Phía Khách hàng', description: 'Cung cấp đầu mối kỹ thuật phụ trách tích hợp hệ thống trong vòng 5 ngày làm việc sau kick-off.' },
            { category: 'Dữ liệu Đầu vào', description: 'Cung cấp tài liệu đặc tả API và dữ liệu mẫu kiểm thử đảm bảo tiến độ Sprint.' },
            { category: 'Hạ tầng Máy chủ', description: 'Cấp quyền truy cập môi trường Staging/Cloud đúng theo tiến độ triển khai.' }
          ]
        }
      },
      {
        sheetName: 'Risk Management (RAID)',
        sheetOrder: 8,
        aiGenerated: true,
        sheetData: {
          title: 'Risk Assessment & Mitigation Matrix',
          risks: aiProposal?.risks_and_mitigation || [
            { risk: 'Độ trễ phản hồi khi tải cao', impact: 'High', probability: 'Medium', mitigation: 'Ứng dụng caching đa tầng và tối ưu hóa cấu trúc truy vấn' },
            { risk: 'Thay đổi phạm vi yêu cầu trong quá trình phát triển', impact: 'Medium', probability: 'High', mitigation: 'Áp dụng quy trình Change Request (CR) chặt chẽ theo từng Sprint' },
            { risk: 'Chậm trễ trong quá trình phê duyệt bảo mật an ninh mạng', impact: 'High', probability: 'Medium', mitigation: 'Rà soát an ninh mã nguồn và chuẩn bị hồ sơ tuân thủ ngay từ giai đoạn 1' }
          ]
        }
      },
      {
        sheetName: 'SLA & Maintenance',
        sheetOrder: 9,
        aiGenerated: true,
        sheetData: {
          title: 'Service Level Agreement & Maintenance Commitments',
          metrics: aiProposal?.sla_commitments || [
            { metric: 'Tính sẵn sàng hệ thống', target: '99.95% Thời gian hoạt động (Uptime)' },
            { metric: 'Thời gian phản hồi sự cố nghiêm trọng (Sev 1)', target: 'Dưới 15 phút (24/7/365)' },
            { metric: 'Thời gian khắc phục sự cố (RTO)', target: 'Dưới 2 giờ làm việc' },
            { metric: 'Bảo hành & Hỗ trợ kỹ thuật sau Go-live', target: '12 tháng bảo hành tiêu chuẩn miễn phí' }
          ]
        }
      },
      {
        sheetName: 'Appendices & Case Studies',
        sheetOrder: 10,
        aiGenerated: true,
        sheetData: {
          title: 'Appendices, Credentials & Case Studies',
          caseStudies: [
            {
              client: 'Dự án Tiêu chuẩn Doanh nghiệp Tương đương',
              industry: meta.clientIndustry || 'Công nghệ Thông tin',
              result: 'Triển khai thành công hệ thống chịu tải 50,000+ giao dịch/giây, tiết kiệm 40% chi phí vận hành hạ tầng.',
              referenceArchitecture: 'Microservices, PostGIS/PostgreSQL, Event-driven Streaming, Kubernetes'
            }
          ]
        }
      }
    ];

    // 7. Check if proposal already exists for this lead
    const existingProposal = await this.proposalRepo.findByLeadId(input.leadId);

    if (existingProposal) {
      // Update existing proposal header
      await this.proposalRepo.update(existingProposal.id, {
        title,
        status: 'DRAFT',
        totalCost: grandTotal,
        estimatedTimelineWeeks: totalWeeks,
        currency: 'USD'
      });

      // Update all sheets
      for (const s of sheets) {
        await this.proposalRepo.updateSheet(existingProposal.id, s.sheetName, s.sheetData, true);
      }

      const refreshed = await this.proposalRepo.findById(existingProposal.id);
      return refreshed!;
    } else {
      // Create new proposal with all 10 sheets
      const created = await this.proposalRepo.create({
        title,
        leadId: input.leadId,
        createdBy: input.userId || null,
        version: 'v1.0',
        status: 'DRAFT',
        totalCost: grandTotal,
        currency: 'USD',
        estimatedTimelineWeeks: totalWeeks,
        initialSheets: sheets
      });
      return created;
    }
  }
}
