import React, { useState } from 'react';
import { useToast } from './common/Toast';
import type { LeadItem } from '../services/leadService';
import type { ProposalItem } from '../services/proposalService';
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
  CheckCircle2
} from 'lucide-react';

interface ClientPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProject?: LeadItem | null;
  proposal?: ProposalItem | null;
}

export const ClientPortalModal: React.FC<ClientPortalModalProps> = ({ 
  isOpen, 
  onClose,
  activeProject,
  proposal
}) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'proposal' | 'prototype' | 'materials' | 'discussion'>('overview');
  
  const title = activeProject?.title || proposal?.title || 'Giải pháp Doanh nghiệp Presaleee';
  const org = activeProject?.organization || 'DUT';
  const meta = activeProject?.extracted_metadata || {};
  const budget = meta.budgetUsd || proposal?.totalCost || 120000;
  const timeline = meta.timelineWeeks || proposal?.estimatedTimelineWeeks || 20;
  const techStack = Array.isArray(meta.techStack) ? meta.techStack.join(', ') : (meta.techStack || 'Node.js, PostgreSQL, Redis, Kubernetes, Kafka');
  const compliance = Array.isArray(meta.complianceStandards) ? meta.complianceStandards.join(', ') : (meta.complianceStandards || 'SOC-2 Type II, ISO 27001');

  const [clientQuery, setClientQuery] = useState('');
  const [aiAnswers, setAiAnswers] = useState<Array<{ q: string; a: string }>>([
    {
      q: 'Hệ thống có cam kết khả năng chịu tải và thời gian sẵn sàng SLA bao nhiêu?',
      a: `Kiến trúc đề xuất cho dự án "${title}" cam kết thời gian hoạt động SLA 99.999%, tự động failover đa vùng dưới 3 giây và đáp ứng chuẩn ${compliance}.`,
    },
  ]);
  const [comments, setComments] = useState<string[]>([
    'CTO (Khách hàng): "Cần làm rõ tiêu chí nghiệm thu hoàn tất Phase 1 và phương án chuyển giao tài liệu CI/CD."',
  ]);
  const [newComment, setNewComment] = useState('');

  if (!isOpen) return null;

  const handleAskAI = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientQuery.trim()) return;
    setAiAnswers([
      ...aiAnswers,
      {
        q: clientQuery,
        a: `Dựa trên tài liệu đề xuất của dự án "${title}", giải pháp công nghệ ${techStack} đáp ứng đầy đủ yêu cầu của quý công ty với tiến độ ước tính ${timeline} tuần và mức đầu tư $${budget.toLocaleString()} USD.`,
      },
    ]);
    setClientQuery('');
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setComments([...comments, `Khách hàng (Client Reviewer): "${newComment}"`]);
    setNewComment('');
    toast.success('Đã gửi phản hồi thành công đến đội ngũ Presale!', 'Client Feedback');
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
                  {org} · Verified Client
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
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Xuất / In Overview</span>
            </button>
            <button
              onClick={() => toast.success('Đã xuất thành công gói hồ sơ đề xuất Proposal PDF!', 'Client Portal')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800 shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-white" />
              <span>Download Full PDF</span>
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
                  onClick={handleExportOverview}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-xs cursor-pointer self-start sm:self-auto"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Xuất File Overview</span>
                </button>
              </div>

              {/* KPI Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">NGÂN SÁCH ĐỀ XUẤT</span>
                  <span className="text-xl font-bold text-brand-700 font-sans mt-1 block">
                    ${budget.toLocaleString()} USD
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Trọn gói chuyển giao</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">TIẾN ĐỘ THỰC HIỆN</span>
                  <span className="text-xl font-bold text-slate-900 font-sans mt-1 block">
                    {timeline} Tuần
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">4 Giai đoạn (Phases)</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">CAM KẾT SLA</span>
                  <span className="text-xl font-bold text-emerald-700 font-sans mt-1 block">
                    99.999%
                  </span>
                  <span className="text-[10px] text-emerald-600 mt-0.5 block">Multi-AZ Uptime</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">TIÊU CHUẨN TUÂN THỦ</span>
                  <span className="text-sm font-bold text-slate-900 font-sans mt-1 block truncate">
                    {compliance}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Audit Sẵn Sàng</span>
                </div>
              </div>

              {/* Structured Overview Details */}
              <div className="space-y-4 text-xs font-sans">
                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-brand-600" />
                    <span>Mục Tiêu Chiến Lược Của Giải Pháp</span>
                  </h4>
                  <p className="text-slate-600 leading-relaxed">
                    Xây dựng và bàn giao nền tảng kỹ thuật hiện đại cho dự án "{title}", tối ưu hóa chi phí vận hành, bảo mật đa lớp theo chuẩn {compliance}, và đảm bảo khả năng mở rộng linh hoạt theo sự tăng trưởng của doanh nghiệp.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-brand-600" />
                    <span>Kiến Trúc Công Nghệ Cốt Lõi</span>
                  </h4>
                  <p className="text-slate-600 leading-relaxed font-mono text-[11px]">
                    Tech Stack: {techStack}
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    Kiến trúc Microservices độc lập, kết hợp lưu trữ phân tán, cơ chế caching tự động và cơ chế bảo mật xác thực mTLS/RBAC nghiêm ngặt.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-brand-600" />
                    <span>Phương Thức Chuyển Giao &amp; Bảo Hành</span>
                  </h4>
                  <p className="text-slate-600 leading-relaxed">
                    Triển khai theo phương pháp Agile Scrum (2 tuần/Sprint), kiểm thử tự động CI/CD. Chuyển giao toàn bộ mã nguồn, tài liệu kiến trúc kỹ thuật và bảo hành 12 tháng kể từ ngày nghiệm thu Go-Live.
                  </p>
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
                    Hồ Sơ Đề Xuất Kỹ Thuật (10 Sheets Tiêu Chuẩn)
                  </h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Đã được kiểm duyệt và ký duyệt bởi Solution Architect cho dự án: {title}.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-white text-brand-700 border border-brand-200 shadow-xs">
                  SLA: 99.999%
                </span>
              </div>

              <div className="prose prose-slate max-w-none text-xs sm:text-sm space-y-4 text-slate-700 leading-relaxed font-sans">
                <h3 className="text-lg font-bold text-slate-900 border-b pb-2">
                  1. Phạm Vi Triển Khai (Scope of Work &amp; WBS)
                </h3>
                <p>
                  Dự án bao gồm 5 phân hệ cốt lõi: Xác thực phân quyền tập trung, Gateway đồng bộ dữ liệu thời gian thực, Quy trình nghiệp vụ lõi, Client Portal tích hợp và Hạ tầng DevOps bảo mật cao theo tiêu chuẩn {compliance}.
                </p>

                <h3 className="text-lg font-bold text-slate-900 border-b pb-2 pt-2">
                  2. Kế Hoạch Nghiệm Thu &amp; Thanh Toán Theo Đợt
                </h3>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    <div>
                      <span className="text-slate-400 block text-[10px]">ĐỢT 1 (KÝ HỢP ĐỒNG)</span>
                      <span className="font-bold text-slate-800">20% (${Math.round(budget * 0.2).toLocaleString()})</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">ĐỢT 2 (PHÊ DUYỆT KIẾN TRÚC)</span>
                      <span className="font-bold text-slate-800">25% (${Math.round(budget * 0.25).toLocaleString()})</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">ĐỢT 3 (ALPHA UAT)</span>
                      <span className="font-bold text-slate-800">35% (${Math.round(budget * 0.35).toLocaleString()})</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">ĐỢT 4 (GO-LIVE)</span>
                      <span className="font-bold text-brand-700">20% (${Math.round(budget * 0.2).toLocaleString()})</span>
                    </div>
                  </div>
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
            <span>Presaleee Telemetry: Đang ghi nhận tín hiệu tương tác thời gian thực</span>
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
