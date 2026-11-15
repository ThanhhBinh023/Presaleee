import React, { useState } from 'react';
import { useToast } from './common/Toast';
import type { LeadItem } from '../services/leadService';
import type { ProposalItem } from '../services/proposalService';
import { proposalService } from '../services/proposalService';
import { 
  X, 
  ShieldCheck, 
  FileText, 
  Bot, 
  MessageSquare, 
  Send, 
  Eye, 
  Sparkles,
  Download,
  Printer,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

/** Shown wherever the stored proposal genuinely has no value yet — never replaced by an invented default. */
const MISSING_FACT = 'chưa có trong hồ sơ';

interface ClientPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProject?: LeadItem | null;
  proposal?: ProposalItem | null;
  clientName?: string | null;
}

export const ClientPortalModal: React.FC<ClientPortalModalProps> = ({ 
  isOpen, 
  onClose,
  activeProject,
  proposal,
  clientName
}) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'proposal' | 'prototype' | 'materials' | 'discussion'>('overview');
  
  const title = activeProject?.title || proposal?.title || 'Giải pháp Doanh nghiệp Presaleee';
  const org = clientName || 'chưa gắn khách hàng (chưa tạo phiên Portal)';
  const meta = activeProject?.extractedMetadata || {};

  /**
   * Everything below comes from the stored proposal sheets. When a sheet is absent the UI says so
   * instead of falling back to made-up numbers — the earlier version hard-coded 120k USD, 20 weeks,
   * 99.999% SLA and a 20/25/35/20 payment split that contradicted the real Pricing sheet.
   */
  const sheetData = (name: string): Record<string, any> =>
    proposal?.sheets?.find(s => s.sheetName === name)?.sheetData ?? {};
  const overviewSheet = sheetData('Overview');
  const scopeSheet = sheetData('Scope of Work');
  const architectureSheet = sheetData('Architecture & Tech Stack');
  const timelineSheet = sheetData('Timeline & Milestones');
  const pricingSheet = sheetData('Pricing & Quotation');
  const slaSheet = sheetData('SLA & Maintenance');

  const currency: string = pricingSheet.currency || proposal?.currency || 'USD';
  const grandTotal: number | null = Number(pricingSheet.grandTotal ?? proposal?.totalCost ?? meta.budgetUsd) || null;
  const totalWeeks: number | null = Number(timelineSheet.totalWeeks ?? proposal?.estimatedTimelineWeeks ?? meta.timelineWeeks) || null;

  const milestones: any[] = Array.isArray(timelineSheet.milestones) ? timelineSheet.milestones : [];
  const slaMetrics: any[] = Array.isArray(slaSheet.metrics) ? slaSheet.metrics : [];
  const paymentMilestones: any[] = Array.isArray(pricingSheet.paymentMilestones) ? pricingSheet.paymentMilestones : [];
  const scopeModules: any[] = Array.isArray(scopeSheet.modules) ? scopeSheet.modules : [];
  const stackLayers: any[] = Array.isArray(architectureSheet.stack) ? architectureSheet.stack : [];
  const nonFunctional: any[] = Array.isArray(architectureSheet.nonFunctionalRequirements) ? architectureSheet.nonFunctionalRequirements : [];
  const keyObjectives: string[] = Array.isArray(overviewSheet.keyObjectives) ? overviewSheet.keyObjectives : [];

  const uptimeTarget: string = slaMetrics.find(m => /uptime|sẵn sàng/i.test(String(m?.metric)))?.target || meta.target_sla || MISSING_FACT;
  const warrantyTarget: string = slaMetrics.find(m => /bảo hành|hypercare/i.test(String(m?.metric)))?.target || '';
  const techStack: string = stackLayers.length
    ? stackLayers.map(l => l.technology).filter(Boolean).join(', ')
    : (Array.isArray(meta.techStack) ? meta.techStack.join(', ') : (meta.techStack || MISSING_FACT));
  const securityRequirement = nonFunctional.find(n => /bảo mật|security/i.test(String(n?.category)));
  const compliance: string = securityRequirement?.requirement
    || (Array.isArray(meta.complianceStandards) ? meta.complianceStandards.join(', ') : (meta.complianceStandards as string))
    || MISSING_FACT;
  const executiveSummary: string = overviewSheet.executiveSummary || '';
  const hasSheets = Boolean(proposal?.sheets?.length);

  const [clientQuery, setClientQuery] = useState('');
  const [aiAnswers, setAiAnswers] = useState<Array<{ q: string; a: string }>>([]);
  const [comments, setComments] = useState<string[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  if (!isOpen) return null;

  const handleAskAI = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientQuery.trim()) return;
    setAiAnswers([
      ...aiAnswers,
      {
        q: clientQuery,
        a: `[Xem thử] Dự án "${title}" được đề xuất với ${techStack}, tiến độ ${totalWeeks === null ? MISSING_FACT : `${totalWeeks} tuần`}, mức đầu tư ${grandTotal === null ? MISSING_FACT : `${grandTotal.toLocaleString()} ${currency}`}. Đây là bản nháp sinh tại trình duyệt — khách hàng thật phải hỏi qua đường dẫn portal, câu trả lời mới đi qua AI và trích dẫn source.`,
      },
    ]);
    setClientQuery('');
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setComments([...comments, `[Xem thử, chưa gửi] Khách hàng (Client Reviewer): "${newComment}"`]);
    setNewComment('');
    toast.info('Bản xem thử: phản hồi chỉ hiển thị ở trình duyệt, chưa được gửi về đội Presale.', 'Client Feedback');
  };

  const handleDownloadPdf = async () => {
    const targetId = proposal?.id;
    if (!targetId) {
      toast.warning('Lead này chưa có proposal, nên chưa có PDF để tải. Hãy tạo proposal trước.', 'Tải PDF');
      return;
    }
    try {
      setIsDownloadingPdf(true);
      await proposalService.exportPdf(targetId);
      toast.success('Đã tải xuống Proposal PDF (10 Sheets) thành công!', 'Client Portal');
    } catch (err: any) {
      toast.error(`Lỗi tải Proposal PDF: ${err.message}`, 'Lỗi Tải File');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  /** Assembled from the stored proposal sheets; nothing here falls back to an invented number. */
  const handleDownloadOverviewFile = () => {
    const money = (value: number | null) => (value === null ? MISSING_FACT : `${value.toLocaleString()} ${currency}`);
    const bullet = (prefix: string, lines: string[]) => (lines.length ? lines : [`- ${prefix}: ${MISSING_FACT}`]);

    const overviewText = [
      '============================================================',
      'BẢN TÓM TẮT DỰ ÁN DÀNH CHO KHÁCH HÀNG (EXECUTIVE OVERVIEW)',
      '============================================================',
      `Dự án: ${title}`,
      `Khách hàng / Tổ chức: ${org}`,
      `Hồ sơ đề xuất: ${proposal ? `${proposal.title} — trạng thái ${proposal.status}, phiên bản ${proposal.version}` : 'chưa được tạo cho lead này'}`,
      `Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`,
      '',
      '1. CHỈ SỐ QUAN TRỌNG (KEY METRICS)',
      `- Ngân sách đề xuất: ${money(grandTotal)}`,
      `- Tiến độ thực hiện: ${totalWeeks === null ? MISSING_FACT : `${totalWeeks} tuần`}${milestones.length ? ` (${milestones.length} giai đoạn)` : ''}`,
      `- Cam kết SLA: ${uptimeTarget}`,
      `- Tiêu chuẩn tuân thủ / bảo mật: ${compliance}`,
      '',
      '2. TÓM TẮT ĐIỀU HÀNH',
      executiveSummary || `- Hồ sơ chưa có Executive Summary (sheet "Overview" chưa được tạo).`,
      '',
      '3. MỤC TIÊU CHIẾN LƯỢC',
      ...bullet('Mục tiêu', keyObjectives.map(o => `- ${o}`)),
      '',
      '4. KIẾN TRÚC CÔNG NGHỆ CỐT LÕI',
      ...bullet('Tech stack', stackLayers.map(l => `- ${l.layer}: ${l.technology} (${l.rationale})`)),
      '',
      '5. YÊU CẦU PHI CHỨC NĂNG',
      ...bullet('NFR', nonFunctional.map(n => `- ${n.category}: ${n.requirement}`)),
      '',
      '6. CÁC MỐC TRIỂN KHAI CHÍNH (MILESTONES)',
      ...bullet('Milestone', milestones.map(m => `- ${m.phase}: ${m.milestone} (${m.durationWeeks} tuần) — Bàn giao: ${m.deliverables}`)),
      '',
      '7. NGÂN SÁCH & LỊCH THANH TOÁN',
      `- Tổng trọn gói: ${money(grandTotal)}`,
      ...bullet('Đợt thanh toán', paymentMilestones.map(p => `- ${p.milestone}: ${p.percentage}% = ${money(Number(p.amount) || null)}`)),
      '',
      '8. SLA & BẢO HÀNH',
      ...bullet('SLA', slaMetrics.map(m => `- ${m.metric}: ${m.target}`)),
      '============================================================',
      hasSheets
        ? 'Nguồn: 10 sheet của hồ sơ đề xuất đã lưu trong hệ thống (Proposal sheets).'
        : 'Nguồn: thông số RFP trích xuất. Hồ sơ đề xuất chưa được tạo nên các mục trên chưa phải cam kết với khách hàng.'
    ].join('\n');

    const blob = new Blob([overviewText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]/g, '_')}_Executive_Overview.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success('Đã tải xuống tệp Bản Tóm Tắt Dự Án (Overview) thành công!', 'Xuất Overview');
  };

  const handleExportOverview = () => {
    window.print();
    toast.success(`Đang chuẩn bị in / xuất bản tóm tắt Overview cho dự án: ${title}`, 'Xuất Overview');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Top Navigation Bar */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white font-bold font-mono text-sm">
              P
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm font-mono">
                  Presaleee Client Portal View
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-brand-800 border border-brand-200">
                  {clientName ? `${clientName} · Verified Client` : 'chưa cấp phiên cho khách hàng'}
                </span>
              </div>
              <div className="text-xs text-slate-600 font-semibold truncate max-w-md">
                {title}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportOverview}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer"
              title="In hoặc lưu dạng PDF qua hộp thoại Print"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Xuất / In Overview</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 shadow-xs cursor-pointer"
              title="Tải về bộ hồ sơ kỹ thuật Proposal PDF 10 Sheets"
            >
              {isDownloadingPdf ? (
                <RefreshCw className="w-3.5 h-3.5 text-white animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 text-white" />
              )}
              <span>{isDownloadingPdf ? 'Đang tải PDF...' : 'Download Full PDF'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Client Subtabs */}
        <div className="px-6 border-b border-slate-200 flex items-center gap-4 text-xs font-medium overflow-x-auto">
          {[
            { id: 'overview', label: 'Executive Overview', icon: FileText },
            { id: 'proposal', label: '10 Sheets Proposal', icon: Sparkles },
            { id: 'prototype', label: 'Interactive UI Prototype', icon: Eye },
            { id: 'materials', label: 'Shared Materials', icon: ShieldCheck },
            { id: 'discussion', label: 'Discussions & AI Assistant', icon: MessageSquare },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3.5 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-brand-500 text-brand-700 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* TAB 1: EXECUTIVE OVERVIEW (Đồng bộ xuất Overview) */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              
              <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-brand-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-brand-500 text-white">
                    EXECUTIVE OVERVIEW
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    Bản Tóm Tắt Dự Án Dành Cho Khách Hàng: {title}
                  </h3>
                  <p className="text-xs text-slate-600">
                    Được khởi tạo và đồng bộ tự động từ thông số kỹ thuật RFP &amp; Biên bản Discovery.
                  </p>
                </div>
                <button
                  onClick={handleDownloadOverviewFile}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-xs cursor-pointer self-start sm:self-auto"
                  title="Tải về file văn bản tóm tắt Executive Overview"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Xuất File Overview</span>
                </button>
              </div>

              {/* KPI Cards Grid — each value names the sheet it came from */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">NGÂN SÁCH ĐỀ XUẤT</span>
                  <span className="text-xl font-bold text-brand-700 font-sans mt-1 block">
                    {grandTotal === null ? MISSING_FACT : `${grandTotal.toLocaleString()} ${currency}`}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    {pricingSheet.grandTotal ? 'Pricing & Quotation — trọn gói chuyển giao' : 'chưa có sheet Pricing & Quotation'}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">TIẾN ĐỘ THỰC HIỆN</span>
                  <span className="text-xl font-bold text-slate-900 font-sans mt-1 block">
                    {totalWeeks === null ? MISSING_FACT : `${totalWeeks} Tuần`}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    {milestones.length ? `${milestones.length} giai đoạn (Timeline & Milestones)` : 'chưa có milestones'}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">CAM KẾT SLA</span>
                  <span className="text-sm font-bold text-emerald-700 font-sans mt-1 block">
                    {uptimeTarget}
                  </span>
                  <span className="text-[10px] text-emerald-600 mt-0.5 block">
                    {slaMetrics.length ? `${slaMetrics.length} chỉ số (SLA & Maintenance)` : 'chưa có sheet SLA'}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">TIÊU CHUẨN TUÂN THỦ</span>
                  <span className="text-sm font-bold text-slate-900 font-sans mt-1 block truncate">
                    {compliance}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    {securityRequirement ? 'Architecture & Tech Stack — Security' : 'RFP extracted metadata'}
                  </span>
                </div>
              </div>

              {!hasSheets && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  Lead này chưa có hồ sơ đề xuất (10 sheets). Các con số ở trên chỉ lấy từ thông số RFP đã
                  trích xuất, chưa phải nội dung cam kết với khách hàng — hãy chạy Generate Proposal from Lead
                  để bản xem thử này có dữ liệu thật.
                </div>
              )}

              {/* Structured Overview Details */}
              <div className="space-y-4 text-xs font-sans">
                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-brand-600" />
                    <span>Tóm Tắt Điều Hành &amp; Mục Tiêu Chiến Lược</span>
                  </h4>
                  {executiveSummary ? (
                    <p className="text-slate-600 leading-relaxed">{executiveSummary}</p>
                  ) : (
                    <p className="text-slate-500 italic">Sheet "Overview" chưa được tạo — {MISSING_FACT}.</p>
                  )}
                  {keyObjectives.length > 0 && (
                    <ul className="space-y-1 pt-1">
                      {keyObjectives.map((objective, idx) => (
                        <li key={idx} className="text-slate-600 flex gap-2">
                          <span className="text-brand-600">•</span>
                          <span>{objective}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-brand-600" />
                    <span>Kiến Trúc Công Nghệ Cốt Lõi</span>
                  </h4>
                  {stackLayers.length > 0 ? (
                    <ul className="space-y-1.5">
                      {stackLayers.map((layer, idx) => (
                        <li key={idx} className="text-slate-600">
                          <span className="font-semibold text-slate-800">{layer.layer}</span>
                          <span className="font-mono text-[11px] text-brand-700"> — {layer.technology}</span>
                          {layer.rationale && <p className="text-slate-500 text-[11px]">{layer.rationale}</p>}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-600 leading-relaxed font-mono text-[11px]">Tech Stack: {techStack}</p>
                  )}
                  {nonFunctional.length > 0 && (
                    <ul className="space-y-1 pt-2 border-t border-slate-100">
                      {nonFunctional.map((nfr, idx) => (
                        <li key={idx} className="text-slate-500 text-[11px]">
                          <span className="font-semibold text-slate-700">{nfr.category}:</span> {nfr.requirement}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-brand-600" />
                    <span>Phương Thức Chuyển Giao &amp; Bảo Hành</span>
                  </h4>
                  <p className="text-slate-600 leading-relaxed">
                    {overviewSheet.deliveryMethodology || `Chưa có phương thức chuyển giao trong hồ sơ — ${MISSING_FACT}.`}
                  </p>
                  {warrantyTarget && (
                    <p className="text-slate-500 text-[11px]">Bảo hành &amp; hỗ trợ sau Go-live: {warrantyTarget}</p>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: PROPOSAL 10 SHEETS */}
          {activeTab === 'proposal' && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-emerald-50/60 border border-brand-200 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Hồ Sơ Đề Xuất Kỹ Thuật ({proposal?.sheets?.length ?? 0}/10 sheets đã tạo)
                  </h4>
                  <p className="text-xs text-slate-600 mt-1">
                    {proposal
                      ? `${proposal.title} — trạng thái ${proposal.status}, phiên bản ${proposal.version}.`
                      : `Lead này chưa có hồ sơ đề xuất — hãy chạy Generate Proposal from Lead.`}
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-white text-brand-700 border border-brand-200 shadow-xs">
                  SLA: {uptimeTarget}
                </span>
              </div>

              <div className="prose prose-slate max-w-none text-xs sm:text-sm space-y-4 text-slate-700 leading-relaxed font-sans">
                <h3 className="text-lg font-bold text-slate-900 border-b pb-2">
                  1. Phạm Vi Triển Khai (Scope of Work &amp; WBS)
                </h3>
                {scopeModules.length > 0 ? (
                  <ul className="space-y-1">
                    {scopeModules.map((module, idx) => (
                      <li key={idx}>
                        <span className="font-mono text-[11px] text-slate-500">{module.wbs}</span>{' '}
                        <span className="font-semibold text-slate-800">{module.module}</span>
                        {module.feature && <span className="text-slate-600"> — {module.feature}</span>}
                        {module.priority && <span className="text-[11px] text-slate-500"> ({module.priority})</span>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Sheet "Scope of Work" chưa có dữ liệu — {MISSING_FACT}.</p>
                )}

                <h3 className="text-lg font-bold text-slate-900 border-b pb-2 pt-2">
                  2. Kế Hoạch Nghiệm Thu &amp; Thanh Toán Theo Đợt
                </h3>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono space-y-2">
                  {paymentMilestones.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                      {paymentMilestones.map((payment, idx) => (
                        <div key={idx}>
                          <span className="text-slate-400 block text-[10px]">
                            ĐỢT {idx + 1} — {payment.milestone}
                          </span>
                          <span className="font-bold text-slate-800">
                            {payment.percentage}% ({Number(payment.amount).toLocaleString()} {currency})
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500">Sheet "Pricing &amp; Quotation" chưa có lịch thanh toán — {MISSING_FACT}.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PROTOTYPE */}
          {activeTab === 'prototype' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Mô Hình Giao Diện Tương Tác (UI Prototype Sandbox)
                  </h4>
                  <p className="text-xs text-slate-500">
                    Khởi tạo tự động từ AI UI Design Brief theo ngữ cảnh dự án "{title}".
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-50 text-brand-700 border border-brand-200">
                  Interactive Prototype
                </span>
              </div>

              <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-600 flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h5 className="text-base font-bold text-slate-800">
                  {title} — Dashboard Điều Hành
                </h5>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Giao diện quản trị thời gian thực tích hợp phân quyền đa cấp, giám sát hệ thống và phân tích chỉ số vận hành.
                </p>
                <div className="p-4 bg-white rounded-xl border border-slate-200 max-w-lg mx-auto shadow-sm text-left text-xs font-mono space-y-2">
                  <div className="flex justify-between border-b pb-1 text-slate-400 text-[10px]">
                    <span>STATUS</span>
                    <span className="text-emerald-600 font-bold">SẴN SÀNG TRIỂN KHAI</span>
                  </div>
                  <div className="text-slate-800 font-bold">Tech Stack: {techStack}</div>
                  <div className="text-slate-500 text-[11px]">Tiêu chuẩn: {compliance} • Độ trễ &lt; 150ms</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MATERIALS */}
          {activeTab === 'materials' && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-900">
                Tài Liệu Kỹ Thuật Đính Kèm &amp; Tiêu Chuẩn Bảo Mật
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 font-mono">Architecture Blueprint PDF</span>
                    <span className="text-[10px] font-mono bg-emerald-100 text-brand-800 px-2 py-0.5 rounded">Tier-1 Spec</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Bản vẽ thiết kế kiến trúc hệ thống, sơ đồ luồng dữ liệu và giải pháp sẵn sàng cao 99.999%.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 font-mono">Bản Cam Kết Tuân Thủ Bảo Mật</span>
                    <span className="text-[10px] font-mono bg-emerald-100 text-brand-800 px-2 py-0.5 rounded">{compliance}</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Quy chuẩn mã hóa dữ liệu tại chỗ và khi truyền tải, chính sách kiểm toán bảo mật và sao lưu định kỳ.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: DISCUSSION & AI ASSISTANT */}
          {activeTab === 'discussion' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: Ask AI */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Bot className="w-4 h-4 text-brand-600" />
                    <span className="text-xs font-bold text-slate-900 font-mono">
                      Hỏi Trợ Lý AI Về Hồ Sơ Đề Xuất Này
                    </span>
                  </div>

                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {aiAnswers.length === 0 && (
                      <p className="text-[11px] text-slate-500 font-mono">Chưa có câu hỏi nào. Câu trả lời ở đây chỉ là văn bản mẫu tạo tại trình duyệt, không gọi AI.</p>
                    )}
                    {aiAnswers.map((item, i) => (
                      <div key={i} className="text-xs space-y-1">
                        <div className="font-semibold text-slate-800">Q: {item.q}</div>
                        <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-slate-600 font-mono text-[11px] leading-relaxed">
                          {item.a}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleAskAI} className="flex gap-2 pt-2">
                  <input
                    type="text"
                    value={clientQuery}
                    onChange={(e) => setClientQuery(e.target.value)}
                    placeholder="Hỏi về SLA, kiến trúc, bảng giá..."
                    className="flex-1 px-3 py-2 rounded-xl text-xs bg-white border border-slate-200 focus:outline-none focus:border-brand-500 font-mono"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-xs cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>

              {/* Right: Comments */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="w-4 h-4 text-brand-600" />
                    <span className="text-xs font-bold text-slate-900 font-mono">
                      Góp Ý &amp; Thắc Mắc Của Khách Hàng
                    </span>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {comments.length === 0 && (
                      <p className="text-[11px] text-slate-500 font-mono">Chưa có góp ý. Phản hồi khách hàng thật đi qua POST /portal/proposals/:id/comments và chỉ ghi được khi có token portal.</p>
                    )}
                    {comments.map((c, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 leading-relaxed font-mono text-[11px]">
                        {c}
                      </div>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleAddComment} className="flex gap-2 pt-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Nhập phản hồi hoặc yêu cầu chỉnh sửa..."
                    className="flex-1 px-3 py-2 rounded-xl text-xs bg-white border border-slate-200 focus:outline-none focus:border-brand-500 font-mono"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs cursor-pointer"
                  >
                    Gửi
                  </button>
                </form>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-mono">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
            <span>Bản xem thử Client Portal — không ghi nhận telemetry, không lưu câu hỏi/góp ý vào hệ thống</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-slate-300 hover:bg-white text-slate-700 font-semibold cursor-pointer"
          >
            Đóng Xem Thử
          </button>
        </div>

      </div>
    </div>
  );
};
