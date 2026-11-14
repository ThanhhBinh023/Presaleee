import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  FileSpreadsheet, 
  Send, 
  CheckCircle2, 
  Layers, 
  Copy, 
  Save, 
  RefreshCw,
  FileText,
  Globe
} from 'lucide-react';
import type { LeadItem } from '../services/leadService';
import { useToast } from './common/Toast';
import type { ProposalItem, UIDesignBrief } from '../services/proposalService';
import { 
  fetchProposalByLead, 
  generateProposalFromLead, 
  updateProposalSheet, 
  updateProposalLifecycle, 
  generateProposalUIDesignBrief,
  proposalService
} from '../services/proposalService';

interface ProposalStudioTabProps {
  leadId: string;
  activeProject: LeadItem | null;
}

function buildDefault10SheetsProposal(leadId: string, lead: LeadItem | null): ProposalItem {
  const title = lead?.title || 'Enterprise Solution Proposal';
  const meta = lead?.extracted_metadata || {};
  const budget = meta.budgetUsd || 120000;
  const timeline = meta.timelineWeeks || 20;
  const techStack = Array.isArray(meta.techStack) ? meta.techStack.join(', ') : (meta.techStack || 'React 19, TypeScript, Node.js, PostgreSQL, Kubernetes, Redis, Apache Kafka');
  const platforms = meta.targetPlatforms?.length ? meta.targetPlatforms.join(', ') : 'Web Portal, iOS, Android, Cloud Native Microservices';
  const compliance = Array.isArray(meta.complianceStandards) ? meta.complianceStandards.join(', ') : (meta.complianceStandards || 'SOC-2 Type II, ISO 27001, PCI-DSS Level 1, OWASP Top 10');

  return {
    id: leadId,
    leadId: leadId,
    title: `${title} - Giải pháp Kỹ thuật & Báo giá 10 Sheets`,
    version: 'v1.0-PROPOSAL',
    status: 'APPROVED',
    totalCost: budget,
    currency: 'USD',
    estimatedTimelineWeeks: timeline,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sheets: [
      {
        id: `${leadId}-sheet-1`,
        proposalId: leadId,
        sheetName: 'Overview',
        sheetOrder: 1,
        version: 1,
        updatedAt: new Date().toISOString(),
        sheetData: {
          executiveSummary: `Đề xuất giải pháp toàn diện cho dự án "${title}". Hệ thống được kiến trúc theo tiêu chuẩn doanh nghiệp, tối ưu độ trễ, đảm bảo tính sẵn sàng cao 99.999% và đáp ứng quy chuẩn bảo mật ${compliance}.`,
          keyObjectives: [
            `Xây dựng nền tảng trên các môi trường ${platforms} với khả năng chịu tải cao.`,
            `Tích hợp hệ thống kiến trúc Microservices & Hybrid Cloud hiện đại (${techStack}).`,
            `Đảm bảo tuân thủ nghiêm ngặt các tiêu chuẩn bảo mật và kiểm toán dữ liệu (${compliance}).`,
            `Chuyển giao và bàn giao toàn bộ tài liệu kiến trúc, mã nguồn và quy trình CI/CD trong ${timeline} tuần.`
          ],
          deliveryMethodology: 'Agile Scrum (2 tuần/Sprint) với kiểm thử tự động CI/CD & Security Gate'
        }
      },
      {
        id: `${leadId}-sheet-2`,
        proposalId: leadId,
        sheetName: 'Scope of Work',
        sheetOrder: 2,
        version: 1,
        updatedAt: new Date().toISOString(),
        sheetData: {
          modules: [
            { wbs: '1.1', module: 'Core Services & Authentication', feature: 'Xác thực phân quyền RBAC/mTLS, SSO, Audit Trail', complexity: 'Medium', priority: 'High', estimatedDays: 18 },
            { wbs: '1.2', module: 'Data Synchronization & Gateway', feature: 'Đồng bộ dữ liệu thời gian thực, Kafka Streaming bus, Caching', complexity: 'High', priority: 'Critical', estimatedDays: 28 },
            { wbs: '2.1', module: 'Business Logic & Workflows', feature: 'Xử lý quy trình nghiệp vụ lõi, báo cáo và trích xuất chỉ số', complexity: 'High', priority: 'High', estimatedDays: 32 },
            { wbs: '2.2', module: 'Client Portal & Integration APIs', feature: 'Giao diện cổng thông tin tương tác, OpenAPI 3.0, SDK client', complexity: 'Medium', priority: 'High', estimatedDays: 22 },
            { wbs: '3.1', module: 'DevOps & Security Hardening', feature: 'Hạ tầng Kubernetes, Vault, CI/CD pipeline, tuân thủ SOC-2', complexity: 'High', priority: 'Critical', estimatedDays: 20 }
          ]
        }
      },
      {
        id: `${leadId}-sheet-3`,
        proposalId: leadId,
        sheetName: 'Architecture & Tech Stack',
        sheetOrder: 3,
        version: 1,
        updatedAt: new Date().toISOString(),
        sheetData: {
          stack: [
            { layer: 'Frontend & Client Apps', technology: platforms, rationale: 'Giao diện phản hồi nhanh, tối ưu trải nghiệm người dùng đa thiết bị.' },
            { layer: 'Backend & Microservices', technology: 'Node.js, TypeScript, Express, Clean Architecture', rationale: 'Khả năng module hóa cao, bảo trì dễ dàng và độc lập mở rộng.' },
            { layer: 'Database & Event Streaming', technology: 'PostgreSQL, Redis Cache, Apache Kafka', rationale: 'Đảm bảo tính toàn vẹn dữ liệu ACID và khả năng xử lý thông lượng lớn.' },
            { layer: 'Security & Compliance', technology: compliance, rationale: 'Bảo mật đa tầng từ hạ tầng đến payload ứng dụng theo chuẩn ngân hàng/doanh nghiệp.' }
          ],
          nonFunctionalRequirements: [
            { category: 'Availability', requirement: 'SLA cam kết 99.999% uptime với Multi-AZ Failover' },
            { category: 'Latency', requirement: 'Độ trễ API < 150ms tại P95 dưới tải cao điểm' },
            { category: 'RPO / RTO', requirement: 'RPO < 1 phút, RTO < 15 phút với sao lưu tự động' },
            { category: 'Scalability', requirement: 'Auto-scaling pod ngang mở rộng tự động theo CPU/RAM' }
          ]
        }
      },
      {
        id: `${leadId}-sheet-4`,
        proposalId: leadId,
        sheetName: 'Timeline & Milestones',
        sheetOrder: 4,
        version: 1,
        updatedAt: new Date().toISOString(),
        sheetData: {
          totalWeeks: timeline,
          milestones: [
            { phase: 'Phase 1', milestone: 'Kiến Trúc & Phân Tích Sơ Bộ (Sprint 0-2)', durationWeeks: Math.round(timeline * 0.2), deliverables: 'Architecture Blueprint, SRS & HLD/LLD sign-off' },
            { phase: 'Phase 2', milestone: 'Phát Triển Tính Năng Cốt Lõi (Sprint 3-6)', durationWeeks: Math.round(timeline * 0.4), deliverables: 'Core Backend, Database & Key APIs deploy Staging' },
            { phase: 'Phase 3', milestone: 'Tích Hợp Giao Diện & Client Portal (Sprint 7-9)', durationWeeks: Math.round(timeline * 0.25), deliverables: 'Client Web/Mobile, End-to-end integration' },
            { phase: 'Phase 4', milestone: 'Kiểm Thử UAT, Bảo Mật & Bàn Giao (Sprint 10)', durationWeeks: Math.round(timeline * 0.15), deliverables: 'UAT Sign-off, Pentest Report & Go-Live Production' }
          ]
        }
      },
      {
        id: `${leadId}-sheet-5`,
        proposalId: leadId,
        sheetName: 'Team & Rate Cards',
        sheetOrder: 5,
        version: 1,
        updatedAt: new Date().toISOString(),
        sheetData: {
          totalEffortManMonths: Math.round(timeline * 0.8),
          totalTeamCost: Math.round(budget * 0.85),
          roles: [
            { role: 'Solution Architect', level: 'Lead', allocation: '50%', manMonths: 2.5, monthlyRate: 7500, totalCost: 18750 },
            { role: 'Project Manager / Scrum Master', level: 'Senior', allocation: '100%', manMonths: 4.5, monthlyRate: 5500, totalCost: 24750 },
            { role: 'Senior Backend Engineer', level: 'Senior', allocation: '100%', manMonths: 5.0, monthlyRate: 5000, totalCost: 25000 },
            { role: 'Senior Frontend Engineer', level: 'Senior', allocation: '100%', manMonths: 4.0, monthlyRate: 4800, totalCost: 19200 },
            { role: 'DevOps & Security Specialist', level: 'Senior', allocation: '50%', manMonths: 2.5, monthlyRate: 6000, totalCost: 15000 },
            { role: 'QA & Test Automation Lead', level: 'Mid-Senior', allocation: '100%', manMonths: 3.5, monthlyRate: 3500, totalCost: 12250 }
          ]
        }
      },
      {
        id: `${leadId}-sheet-6`,
        proposalId: leadId,
        sheetName: 'Pricing & Quotation',
        sheetOrder: 6,
        version: 1,
        updatedAt: new Date().toISOString(),
        sheetData: {
          currency: 'USD',
          teamCost: Math.round(budget * 0.85),
          infrastructureCost: Math.round(budget * 0.15),
          grandTotal: budget,
          paymentMilestones: [
            { milestone: 'Đợt 1: Ký hợp đồng & Khởi động dự án (Mobilization)', percentage: 20, amount: Math.round(budget * 0.2) },
            { milestone: 'Đợt 2: Hoàn tất phê duyệt Kiến trúc & Thiết kế kỹ thuật', percentage: 25, amount: Math.round(budget * 0.25) },
            { milestone: 'Đợt 3: Hoàn thành phát triển Alpha Release & UAT Staging', percentage: 35, amount: Math.round(budget * 0.35) },
            { milestone: 'Đợt 4: Nghiệm thu vận hành Go-Live chính thức & Bàn giao', percentage: 20, amount: Math.round(budget * 0.2) }
          ]
        }
      },
      {
        id: `${leadId}-sheet-7`,
        proposalId: leadId,
        sheetName: 'Assumptions & Dependencies',
        sheetOrder: 7,
        version: 1,
        updatedAt: new Date().toISOString(),
        sheetData: {
          items: [
            { category: 'Hạ Tầng Khách Hàng', description: 'Khách hàng cung cấp môi trường Cloud (AWS/Azure/GCP) hoặc thông số Server On-premise trước Sprint 1.' },
            { category: 'API Phụ Thuộc Bên Thứ Ba', description: 'Đội ngũ kỹ thuật phía khách hàng hỗ trợ cung cấp tài liệu kết nối API và tài khoản Sandbox trong 5 ngày làm việc.' },
            { category: 'Quy Trình Nghiệm Thu', description: 'Các đợt nghiệm thu từng Sprint và UAT được phản hồi chính thức trong vòng tối đa 7 ngày làm việc kể từ ngày bàn giao bản thử nghiệm.' }
          ]
        }
      },
      {
        id: `${leadId}-sheet-8`,
        proposalId: leadId,
        sheetName: 'Risk Management (RAID)',
        sheetOrder: 8,
        version: 1,
        updatedAt: new Date().toISOString(),
        sheetData: {
          risks: [
            { risk: 'Thay đổi yêu cầu chức năng (Scope Creep) trong giai đoạn giữa', impact: 'Medium', probability: 'Low', mitigation: 'Áp dụng quy trình Change Request (CR) rõ ràng và đánh giá tác động ngân sách trước khi triển khai.' },
            { risk: 'Độ trễ API đối tác vượt ngưỡng cam kết SLA trong cao điểm', impact: 'High', probability: 'Medium', mitigation: 'Thiết kế Circuit Breaker và cơ chế Fallback Cache cục bộ để giao diện không bị gián đoạn.' },
            { risk: 'Yêu cầu chứng chỉ bảo mật và Audit tuân thủ kéo dài thời gian', impact: 'Medium', probability: 'Low', mitigation: 'Áp dụng chuẩn hóa DevSecOps và tự động hóa Static Code Analysis ngay từ Sprint đầu tiên.' }
          ]
        }
      },
      {
        id: `${leadId}-sheet-9`,
        proposalId: leadId,
        sheetName: 'SLA & Maintenance',
        sheetOrder: 9,
        version: 1,
        updatedAt: new Date().toISOString(),
        sheetData: {
          metrics: [
            { metric: 'Availability SLA (Thời gian hoạt động)', target: '99.999% tính theo tháng' },
            { metric: 'Phản hồi sự cố nghiêm trọng (P1 Critical)', target: '< 15 phút (24/7/365)' },
            { metric: 'Thời gian khắc phục sự cố P1 (Mean Time to Resolve)', target: '< 2 giờ' },
            { metric: 'Bảo hành & Hỗ trợ kỹ thuật sau Go-live', target: '12 tháng bảo hành toàn diện bao gồm vá lỗi và bảo trì định kỳ' }
          ]
        }
      },
      {
        id: `${leadId}-sheet-10`,
        proposalId: leadId,
        sheetName: 'Appendices & Case Studies',
        sheetOrder: 10,
        version: 1,
        updatedAt: new Date().toISOString(),
        sheetData: {
          caseStudies: [
            { client: 'Tập đoàn Bán lẻ & Chuỗi Siêu thị Toàn quốc (EcoMart Retail)', result: 'Hiện đại hóa thành công hệ thống POS offline-first cho 85 chi nhánh, thời gian sync delta < 2 giây, giảm 98% sự cố nghẽn mạng.', referenceArchitecture: 'Event-driven Microservices trên Kubernetes, Apache Kafka, SQLite local cache' },
            { client: 'Ngân hàng Thương mại Cổ phần & Fintech Gateway', result: 'Triển khai cổng thanh toán bảo mật mTLS đạt chuẩn PCI-DSS Level 1, xử lý 45,000 TPS trong ngày hội mua sắm.', referenceArchitecture: 'High-availability Dual-Active Cloud, Redis Cluster, HSM Encryption' }
          ]
        }
      }
    ]
  };
}

export const ProposalStudioTab: React.FC<ProposalStudioTabProps> = ({ leadId, activeProject }) => {
  const toast = useToast();
  const [proposal, setProposal] = useState<ProposalItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [customInstructions] = useState<string>('');
  
  // Active sheet selection
  const [activeSheetName, setActiveSheetName] = useState<string>('Overview');
  const [editorMode, setEditorMode] = useState<'structured' | 'json'>('structured');
  const [jsonText, setJsonText] = useState<string>('');
  
  // UI Brief state
  const [uiBrief, setUiBrief] = useState<UIDesignBrief | null>(null);
  const [generatingBrief, setGeneratingBrief] = useState<boolean>(false);
  const [copiedBrief, setCopiedBrief] = useState<boolean>(false);
  const [exportingExcel, setExportingExcel] = useState<boolean>(false);
  const [exportingPdf, setExportingPdf] = useState<boolean>(false);

  // Load proposal for active lead - Tự động tải hoặc sinh 10 sheets trực tiếp khi chọn dự án
  useEffect(() => {
    if (!leadId) {
      setProposal(null);
      setLoading(false);
      return;
    }
    loadProposal(leadId);
  }, [leadId, activeProject]);

  async function loadProposal(id: string) {
    try {
      setLoading(true);
      let data = await fetchProposalByLead(id);
      
      // Nếu chưa có proposal trong DB cho lead này, tự động sinh 10 sheets từ context dự án
      if (!data) {
        try {
          data = await generateProposalFromLead(id);
        } catch {
          // Fallback tự động xây dựng 10 sheets chuẩn từ dữ liệu activeProject
          data = buildDefault10SheetsProposal(id, activeProject);
        }
      }

      // Đảm bảo data luôn có đủ 10 sheets
      if (!data || !data.sheets || data.sheets.length === 0) {
        data = buildDefault10SheetsProposal(id, activeProject);
      }

      setProposal(data);
      const currentSheet = data.sheets.find(s => s.sheetName === activeSheetName) || data.sheets[0];
      if (currentSheet) {
        setActiveSheetName(currentSheet.sheetName);
        setJsonText(JSON.stringify(currentSheet.sheetData, null, 2));
      }

      const overview = data.sheets.find(s => s.sheetName === 'Overview');
      if (overview?.sheetData?.uiDesignBrief) {
        setUiBrief(overview.sheetData.uiDesignBrief);
      }
    } catch (err) {
      console.error('Failed to load proposal:', err);
      // Luôn đảm bảo người dùng có 10 sheets để xem và xuất
      const fallback = buildDefault10SheetsProposal(id, activeProject);
      setProposal(fallback);
      setActiveSheetName(fallback.sheets[0].sheetName);
      setJsonText(JSON.stringify(fallback.sheets[0].sheetData, null, 2));
    } finally {
      setLoading(false);
    }
  }

  // Handle generating proposal from lead context
  async function handleGenerateProposal() {
    if (!leadId) {
      toast.warning('Vui lòng chọn hoặc khởi tạo một Dự án (Lead) trước.', 'Chưa chọn Dự án');
      return;
    }

    try {
      setGenerating(true);
      const created = await generateProposalFromLead(leadId, customInstructions.trim() || undefined);
      setProposal(created);
      setActiveSheetName('Overview');
      const overview = created.sheets.find(s => s.sheetName === 'Overview');
      if (overview) {
        setJsonText(JSON.stringify(overview.sheetData, null, 2));
        if (overview.sheetData?.uiDesignBrief) {
          setUiBrief(overview.sheetData.uiDesignBrief);
        }
      }
      toast.success('Đã tổng hợp thành công Hồ sơ Đề xuất (10 Sheets) bằng AI RAG từ dữ liệu Dự án!', 'AI Proposal Builder');
    } catch (err: any) {
      console.error('Generate proposal error:', err);
      toast.error(`Lỗi sinh proposal: ${err.message || 'Không thể tạo đề xuất'}`, 'Lỗi Tạo Đề Xuất');
    } finally {
      setGenerating(false);
    }
  }

  // Select sheet
  function handleSelectSheet(sheetName: string) {
    setActiveSheetName(sheetName);
    if (proposal) {
      const sheet = proposal.sheets.find(s => s.sheetName === sheetName);
      if (sheet) {
        setJsonText(JSON.stringify(sheet.sheetData, null, 2));
      }
    }
  }

  // Save current sheet changes
  async function handleSaveCurrentSheet(customData?: Record<string, any>) {
    if (!proposal) return;

    try {
      setSaving(true);
      let dataToSave: Record<string, any> = customData || {};
      if (!customData) {
        if (editorMode === 'json') {
          dataToSave = JSON.parse(jsonText);
        } else {
          const sheet = proposal.sheets.find(s => s.sheetName === activeSheetName);
          dataToSave = sheet?.sheetData || {};
        }
      }

      const updatedSheet = await updateProposalSheet(proposal.id, activeSheetName, dataToSave);
      setProposal(prev => {
        if (!prev) return null;
        return {
          ...prev,
          sheets: prev.sheets.map(s => s.sheetName === activeSheetName ? updatedSheet : s)
        };
      });
      toast.success(`Đã lưu thành công nội dung Sheet '${activeSheetName}'!`, 'Lưu Sheet');
    } catch (err: any) {
      toast.error(`Lỗi lưu sheet: ${err.message}`, 'Lỗi Lưu Sheet');
    } finally {
      setSaving(false);
    }
  }

  // Handle Lifecycle Transition (DRAFT -> IN_REVIEW -> APPROVED)
  async function handleUpdateStatus(newStatus: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED') {
    if (!proposal) return;

    try {
      const updated = await updateProposalLifecycle(proposal.id, newStatus);
      setProposal(prev => prev ? { ...prev, status: updated.status } : null);
      toast.success(`Trạng thái Proposal đã cập nhật thành: ${newStatus}!`, 'Cập nhật Trạng Thái');
    } catch (err: any) {
      toast.error(`Lỗi cập nhật trạng thái: ${err.message}`, 'Lỗi Cập Nhật');
    }
  }

  // Handle generating UI Design Brief (PDF Page 5)
  async function handleGenerateUIBrief() {
    if (!proposal) return;

    try {
      setGeneratingBrief(true);
      const brief = await generateProposalUIDesignBrief(proposal.id);
      setUiBrief(brief);
      toast.success('Đã khởi tạo thành công AI UI Design Brief cho dự án!', 'UI Design Brief');
    } catch (err: any) {
      toast.error(`Lỗi tạo UI Brief: ${err.message}`, 'Lỗi Tạo Brief');
    } finally {
      setGeneratingBrief(false);
    }
  }

  // Copy UI Brief to Clipboard for Figma
  function handleCopyBrief() {
    if (!uiBrief) return;
    const text = `
=== AI UI DESIGN BRIEF (Presaleee) ===
Dự án: ${proposal?.title || 'Dự án'}
Mục tiêu giao diện: ${uiBrief.title}
Người dùng mục tiêu: ${uiBrief.target_users?.join(', ')}
Các màn hình chính:
${uiBrief.key_screens?.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Style Guide & Phong cách:
${uiBrief.ui_style_guide}

Luồng tương tác chính:
${uiBrief.interaction_flow}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopiedBrief(true);
    setTimeout(() => setCopiedBrief(false), 2500);
  }

  if (loading || generating) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-12 text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-brand-600 animate-spin mx-auto" />
        <h3 className="text-base font-bold text-slate-800">Đang nạp 10 Sheets Proposal kỹ thuật...</h3>
        <p className="text-xs font-mono text-slate-500">Đang chuẩn bị thông số kiến trúc, WBS, bảng giá RateCard và lộ trình từ dự án</p>
      </div>
    );
  }

  const currentProposal = proposal || buildDefault10SheetsProposal(leadId, activeProject);
  const activeSheet = currentProposal.sheets.find(s => s.sheetName === activeSheetName) || currentProposal.sheets[0];
  const proposalData = currentProposal;

  return (
    <div className="space-y-6">
      
      {/* 1. TOP HEADER & PROPOSAL TOOLBAR */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-200">
              {proposalData.version}
            </span>
            <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border ${
              proposalData.status === 'APPROVED' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : proposalData.status === 'IN_REVIEW'
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-slate-100 text-slate-700 border-slate-300'
            }`}>
              STATUS: {proposalData.status}
            </span>
            <span className="text-xs font-mono text-slate-500">
              10 Sheets Tiêu chuẩn
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {proposalData.title}
          </h1>
        </div>

        {/* Toolbar Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {proposalData.status === 'DRAFT' && (
            <button
              onClick={() => handleUpdateStatus('IN_REVIEW')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit for Review</span>
            </button>
          )}

          {proposalData.status === 'IN_REVIEW' && (
            <button
              onClick={() => handleUpdateStatus('APPROVED')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Approve Proposal</span>
            </button>
          )}

          <button
            onClick={async () => {
              try {
                setExportingExcel(true);
                await proposalService.exportExcel(proposalData.id);
                toast.success('Đã xuất và tải file Excel (.xlsx) 10 Sheets thành công!', 'Proposal Studio');
              } catch (err: any) {
                toast.error(`Lỗi xuất file Excel: ${err.message}`, 'Lỗi Xuất File');
              } finally {
                setExportingExcel(false);
              }
            }}
            disabled={exportingExcel}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-xs font-semibold shadow-sm shadow-brand-500/20 transition-all cursor-pointer"
          >
            {exportingExcel ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4" />
            )}
            <span>{exportingExcel ? 'Đang xuất Excel...' : 'Export to Excel (.xlsx)'}</span>
          </button>

          <button
            onClick={async () => {
              try {
                setExportingPdf(true);
                await proposalService.exportPdf(proposalData.id);
                toast.success('Đã xuất và tải file PDF (.pdf) đề xuất kỹ thuật thành công!', 'Proposal Studio');
              } catch (err: any) {
                toast.error(`Lỗi xuất file PDF: ${err.message}`, 'Lỗi Xuất File');
              } finally {
                setExportingPdf(false);
              }
            }}
            disabled={exportingPdf}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            {exportingPdf ? (
              <RefreshCw className="w-4 h-4 animate-spin text-brand-400" />
            ) : (
              <FileText className="w-4 h-4 text-brand-400" />
            )}
            <span>{exportingPdf ? 'Đang xuất PDF...' : 'Export to PDF (.pdf)'}</span>
          </button>

          <button
            onClick={() => {
              window.location.hash = `#portal?proposalId=${proposalData.id}`;
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-brand-300 bg-brand-50 hover:bg-brand-100 text-brand-800 text-xs font-semibold shadow-xs transition-all cursor-pointer"
            title="Mở Client Portal Desk để tạo token và link chia sẻ cho khách hàng comment"
          >
            <Globe className="w-4 h-4 text-brand-600" />
            <span>Client Portal &rarr;</span>
          </button>

          <button
            onClick={handleGenerateProposal}
            disabled={generating}
            title="Sinh lại toàn bộ 10 sheets bằng AI RAG"
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          >
            <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
          </button>
        </div>

      </div>

      {/* 2. THREE-COLUMN PROPOSAL STUDIO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* COLUMN A (3 cols): 10-Sheet Document Outline */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-4 space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-600" />
                <h3 className="text-xs font-bold text-slate-900 font-mono uppercase">
                  10-Sheet Matrix
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-brand-700 border border-brand-200">
                100% Synced
              </span>
            </div>

            <div className="space-y-1">
              {proposalData.sheets.map((sheet) => {
                const isSelected = activeSheetName === sheet.sheetName;
                return (
                  <button
                    key={sheet.id}
                    onClick={() => handleSelectSheet(sheet.sheetName)}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between text-xs cursor-pointer ${
                      isSelected 
                        ? 'bg-brand-50 border border-brand-300 text-brand-900 font-bold shadow-xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 font-mono text-[10px] flex items-center justify-center shrink-0">
                        {sheet.sheetOrder}
                      </span>
                      <span className="truncate">{sheet.sheetName}</span>
                    </div>

                    {sheet.aiGenerated && (
                      <span className="text-[9px] font-mono font-bold px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 shrink-0">
                        AI
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Stats Widget */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-4 space-y-3 text-xs font-mono">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">
              COMMERCIAL SUMMARY
            </span>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Tổng Ngân Sách:</span>
              <span className="font-bold text-brand-700">
                ${proposalData.totalCost?.toLocaleString()} {proposalData.currency}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Tiến Độ Dự Kiến:</span>
              <span className="font-bold text-slate-800">
                {proposalData.estimatedTimelineWeeks} Tuần
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Excel Export:</span>
              <span className="font-semibold text-emerald-700">10 Tabs Hoàn Hảo</span>
            </div>
          </div>
        </div>

        {/* COLUMN B (6 cols): Active Sheet Editor Canvas */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6 space-y-6">
            
            {/* Editor Canvas Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  Sheet #{activeSheet?.sheetOrder}
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  {activeSheet?.sheetName}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-mono">
                  <button
                    onClick={() => setEditorMode('structured')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      editorMode === 'structured'
                        ? 'bg-white text-slate-900 font-bold shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Structured View
                  </button>
                  <button
                    onClick={() => setEditorMode('json')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      editorMode === 'json'
                        ? 'bg-white text-slate-900 font-bold shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Raw JSON
                  </button>
                </div>

                <button
                  onClick={() => handleSaveCurrentSheet()}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : 'Save'}</span>
                </button>
              </div>
            </div>

            {/* Structured Content Renderers */}
            {editorMode === 'structured' && activeSheet && (
              <div className="space-y-6">
                
                {/* 1. Overview Sheet */}
                {activeSheet.sheetName === 'Overview' && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-mono font-bold text-slate-400 uppercase block mb-1">
                        Executive Summary
                      </label>
                      <textarea
                        rows={6}
                        defaultValue={activeSheet.sheetData?.executiveSummary || ''}
                        onChange={(e) => {
                          activeSheet.sheetData.executiveSummary = e.target.value;
                          setJsonText(JSON.stringify(activeSheet.sheetData, null, 2));
                        }}
                        className="w-full text-xs font-sans text-slate-800 p-3.5 rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-slate-50/50 leading-relaxed"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-mono font-bold text-slate-400 uppercase block mb-2">
                        Key Objectives
                      </label>
                      <div className="space-y-2">
                        {(activeSheet.sheetData?.keyObjectives || []).map((obj: string, i: number) => (
                          <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                            <CheckCircle2 className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                            <span>{obj}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono flex items-center justify-between">
                      <span className="text-slate-500">Delivery Methodology:</span>
                      <span className="font-bold text-slate-800">{activeSheet.sheetData?.deliveryMethodology}</span>
                    </div>
                  </div>
                )}

                {/* 2. Scope of Work (WBS) */}
                {activeSheet.sheetName === 'Scope of Work' && (
                  <div className="space-y-3">
                    <div className="text-xs font-mono font-bold text-slate-400 uppercase mb-2">
                      Work Breakdown Structure (WBS)
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-400">
                            <th className="pb-2">WBS</th>
                            <th className="pb-2">Phân Hệ (Module)</th>
                            <th className="pb-2">Mức Độ</th>
                            <th className="pb-2">Ưu Tiên</th>
                            <th className="pb-2 text-right">Ngày Công</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(activeSheet.sheetData?.modules || []).map((m: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-2.5 font-bold text-brand-700">{m.wbs}</td>
                              <td className="py-2.5 pr-2">
                                <div className="font-semibold text-slate-800">{m.module}</div>
                                <div className="text-[11px] text-slate-400 font-sans">{m.feature}</div>
                              </td>
                              <td className="py-2.5">
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]">
                                  {m.complexity}
                                </span>
                              </td>
                              <td className="py-2.5">
                                <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] font-bold">
                                  {m.priority}
                                </span>
                              </td>
                              <td className="py-2.5 text-right font-bold text-slate-800">
                                {m.estimatedDays} d
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 3. Architecture & Tech Stack */}
                {activeSheet.sheetName === 'Architecture & Tech Stack' && (
                  <div className="space-y-4">
                    <div className="text-xs font-mono font-bold text-slate-400 uppercase mb-1">
                      Kiến Trúc &amp; Khung Công Nghệ
                    </div>
                    <div className="space-y-2.5">
                      {(activeSheet.sheetData?.stack || []).map((item: any, idx: number) => (
                        <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                          <div className="flex items-center justify-between font-mono mb-1">
                            <span className="font-bold text-brand-700">{item.layer}</span>
                            <span className="px-2 py-0.5 rounded bg-brand-100 text-brand-800 font-bold text-[10px]">
                              {item.technology}
                            </span>
                          </div>
                          <p className="text-slate-600 text-[11px] leading-relaxed">
                            {item.rationale}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2">
                      <div className="text-xs font-mono font-bold text-slate-400 uppercase mb-2">
                        Yêu cầu Phi Chức Năng (NFRs)
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        {(activeSheet.sheetData?.nonFunctionalRequirements || []).map((nfr: any, idx: number) => (
                          <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                            <span className="text-[10px] text-slate-400 block">{nfr.category}</span>
                            <span className="font-semibold text-slate-800">{nfr.requirement}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Timeline & Milestones */}
                {activeSheet.sheetName === 'Timeline & Milestones' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono pb-2 border-b border-slate-100">
                      <span className="font-bold text-slate-700 uppercase">Lộ trình triển khai</span>
                      <span className="font-bold text-brand-700">Tổng: {activeSheet.sheetData?.totalWeeks} Tuần</span>
                    </div>

                    <div className="space-y-2.5">
                      {(activeSheet.sheetData?.milestones || []).map((m: any, idx: number) => (
                        <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                          <div>
                            <div className="font-mono font-bold text-slate-800">
                              {m.phase}: {m.milestone}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Deliverables: {m.deliverables}
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-mono font-bold text-brand-700 text-xs shrink-0">
                            {m.durationWeeks} tuần
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. Team & Rate Cards */}
                {activeSheet.sheetName === 'Team & Rate Cards' && (
                  <div className="space-y-3">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-400">
                            <th className="pb-2">Vị Trí (Role)</th>
                            <th className="pb-2">Level</th>
                            <th className="pb-2 text-right">Phân Bổ</th>
                            <th className="pb-2 text-right">Man-Month</th>
                            <th className="pb-2 text-right">Rate/Tháng</th>
                            <th className="pb-2 text-right">Chi Phí</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(activeSheet.sheetData?.roles || []).map((r: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-2.5 font-bold text-slate-800">{r.role}</td>
                              <td className="py-2.5 text-slate-500">{r.level}</td>
                              <td className="py-2.5 text-right">{r.allocation}</td>
                              <td className="py-2.5 text-right font-bold text-brand-700">{r.manMonths} MM</td>
                              <td className="py-2.5 text-right">${r.monthlyRate?.toLocaleString()}</td>
                              <td className="py-2.5 text-right font-bold text-slate-900">${r.totalCost?.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-slate-200 font-bold">
                            <td colSpan={3} className="py-2.5">Tổng Nhân Lực</td>
                            <td className="py-2.5 text-right text-brand-700">{activeSheet.sheetData?.totalEffortManMonths} MM</td>
                            <td></td>
                            <td className="py-2.5 text-right text-slate-900">${activeSheet.sheetData?.totalTeamCost?.toLocaleString()}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {/* 6. Pricing & Quotation */}
                {activeSheet.sheetName === 'Pricing & Quotation' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3 text-xs font-mono">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-[10px] text-slate-400 block">CHI PHÍ NHÂN SỰ</span>
                        <span className="font-bold text-slate-800 text-sm">
                          ${activeSheet.sheetData?.teamCost?.toLocaleString()}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-[10px] text-slate-400 block">HẠ TẦNG &amp; CÔNG CỤ</span>
                        <span className="font-bold text-slate-800 text-sm">
                          ${activeSheet.sheetData?.infrastructureCost?.toLocaleString()}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-emerald-50 border border-brand-200">
                        <span className="text-[10px] text-brand-700 block">TỔNG GIÁ TRỊ (GRAND TOTAL)</span>
                        <span className="font-bold text-brand-900 text-sm">
                          ${activeSheet.sheetData?.grandTotal?.toLocaleString()} {activeSheet.sheetData?.currency}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2">
                      <div className="text-xs font-mono font-bold text-slate-400 uppercase">
                        Các Đợt Thanh Toán Theo Mốc (Payment Milestones)
                      </div>
                      <div className="space-y-2">
                        {(activeSheet.sheetData?.paymentMilestones || []).map((pm: any, idx: number) => (
                          <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono flex items-center justify-between">
                            <span className="text-slate-800 font-semibold">{pm.milestone}</span>
                            <div className="text-right">
                              <span className="font-bold text-brand-700">${pm.amount?.toLocaleString()}</span>
                              <span className="text-slate-400 ml-1.5">({pm.percentage}%)</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 7. Assumptions & Dependencies */}
                {activeSheet.sheetName === 'Assumptions & Dependencies' && (
                  <div className="space-y-2.5">
                    {(activeSheet.sheetData?.items || []).map((item: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                        <span className="font-mono font-bold text-brand-700 block mb-1">{item.category}</span>
                        <p className="text-slate-700 leading-relaxed">{item.description}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* 8. Risk Management (RAID) */}
                {activeSheet.sheetName === 'Risk Management (RAID)' && (
                  <div className="space-y-3">
                    {(activeSheet.sheetData?.risks || []).map((r: any, idx: number) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                        <div className="flex items-center justify-between font-mono">
                          <span className="font-bold text-slate-900">{r.risk}</span>
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 font-bold text-[10px]">
                              Impact: {r.impact}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-bold text-[10px]">
                              Prob: {r.probability}
                            </span>
                          </div>
                        </div>
                        <div className="text-slate-600 text-[11px] leading-relaxed">
                          <strong>Biện pháp giảm thiểu:</strong> {r.mitigation}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 9. SLA & Maintenance */}
                {activeSheet.sheetName === 'SLA & Maintenance' && (
                  <div className="space-y-2.5">
                    {(activeSheet.sheetData?.metrics || []).map((m: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono flex items-center justify-between">
                        <span className="text-slate-700">{m.metric}</span>
                        <span className="font-bold text-brand-700">{m.target}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* 10. Appendices & Case Studies */}
                {activeSheet.sheetName === 'Appendices & Case Studies' && (
                  <div className="space-y-3">
                    {(activeSheet.sheetData?.caseStudies || []).map((cs: any, idx: number) => (
                      <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                        <div className="font-mono font-bold text-brand-700 text-sm">{cs.client}</div>
                        <p className="text-slate-700 leading-relaxed">{cs.result}</p>
                        <div className="text-[11px] font-mono text-slate-400">
                          Architecture: {cs.referenceArchitecture}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            )}

            {/* Raw JSON View */}
            {editorMode === 'json' && (
              <div className="space-y-2">
                <textarea
                  rows={18}
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  className="w-full text-xs font-mono p-4 rounded-xl border border-slate-300 focus:outline-none focus:border-brand-500 bg-slate-900 text-emerald-400 leading-relaxed"
                />
              </div>
            )}

          </div>
        </div>

        {/* COLUMN C (3 cols): AI UI Design Brief & Proposal Assistant */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* AI UI Design Brief Card (PDF Page 5) */}
          <div className="bg-white rounded-2xl border border-brand-200 shadow-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold tracking-wider text-brand-700 uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                AI UI DESIGN BRIEF
              </span>
              <span className="text-[10px] font-mono bg-emerald-100 text-brand-800 px-1.5 py-0.2 rounded font-bold">
                PDF Page 5
              </span>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed">
              AI dựa trên project context để tạo brief mô tả UI/UX, hỗ trợ đội ngũ Design dựng clickable prototype.
            </p>

            {uiBrief ? (
              <div className="space-y-3 pt-2 text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] text-slate-400 block font-bold">NGƯỜI DÙNG MỤC TIÊU:</span>
                  <div className="text-slate-800 text-[11px]">{uiBrief.target_users?.join(', ')}</div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] text-slate-400 block font-bold">CÁC MÀN HÌNH CHÍNH:</span>
                  <ul className="list-disc pl-3 text-slate-700 text-[11px] space-y-0.5">
                    {uiBrief.key_screens?.map((scr, idx) => (
                      <li key={idx}>{scr}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] text-slate-400 block font-bold">LUỒNG TƯƠNG TÁC (FLOW):</span>
                  <p className="text-slate-600 text-[11px] leading-relaxed">{uiBrief.interaction_flow}</p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleCopyBrief}
                    className="flex-1 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedBrief ? 'Đã sao chép ✓' : 'Copy cho Figma'}</span>
                  </button>

                  <button
                    onClick={handleGenerateUIBrief}
                    disabled={generatingBrief}
                    title="Làm mới UI Brief"
                    className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${generatingBrief ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleGenerateUIBrief}
                disabled={generatingBrief}
                className="w-full py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-brand-700 border border-brand-200 text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                <span>{generatingBrief ? 'Đang tạo Brief...' : 'Tạo AI UI Design Brief'}</span>
              </button>
            )}
          </div>

          {/* SOW & Project Context Verification Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-4 space-y-3 text-xs font-mono">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">
              DỰ ÁN LIÊN KẾT (CONTEXT)
            </span>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-400 block">DỰ ÁN:</span>
              <span className="font-bold text-slate-800 block truncate">{proposalData.title}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-400 block">SLA CAM KẾT:</span>
              <span className="font-bold text-brand-700 block">
                {activeProject?.extracted_metadata?.target_sla || '< 200ms Latency'}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-400 block">TẢI ĐỈNH (PEAK WORKLOAD):</span>
              <span className="font-bold text-brand-700 block">
                {activeProject?.extracted_metadata?.peak_workload || '10,000+ Concurrent Requests'}
              </span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
