import React, { useState } from 'react';
import { 
  LayoutGrid, 
  FileText, 
  Sparkles, 
  BookOpen, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  ArrowRight, 
  LogOut, 
  UploadCloud, 
  Zap
} from 'lucide-react';

interface RfpIntakeProps {
  onNavigateOverview: () => void;
  onNavigateAIWorkspace: () => void;
  onLogout: () => void;
}

export const RfpIntake: React.FC<RfpIntakeProps> = ({
  onNavigateOverview,
  onNavigateAIWorkspace,
  onLogout,
}) => {
  const [inquiryText, setInquiryText] = useState(
    'Khách hàng yêu cầu hiện đại hoá hệ thống thanh toán cốt lõi. Chuyển đổi kiến trúc cơ sở dữ liệu truyền thống sang kiến trúc hướng sự kiện (event-driven) với độ trễ giao dịch dưới 50ms, đáp ứng chuẩn bảo mật SOC-2 Type II và chịu tải tối thiểu 40,000 giao dịch/giây trong các đợt cao điểm mua sắm.'
  );
  const [analyzing, setAnalyzing] = useState(false);
  const [intakeExtracted, setIntakeExtracted] = useState(true);
  const [qualifying, setQualifying] = useState(false);
  const [qualified, setQualified] = useState(true);
  const [decision, setDecision] = useState<'Approved' | 'Rejected' | null>('Approved');

  const handleRunIntake = () => {
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
      setIntakeExtracted(true);
    }, 700);
  };

  const handleRunQualification = () => {
    setQualifying(true);
    setTimeout(() => {
      setQualifying(false);
      setQualified(true);
    }, 700);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex text-slate-900 font-sans">
      
      {/* 1. SIDEBAR */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 hidden md:flex">
        <div>
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-sm font-bold font-mono text-base">
                P
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                Presaleee
              </span>
            </div>

            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
                <span className="text-xs font-mono font-bold text-slate-700">
                  DEMO WORKSPACE
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-brand-100 text-brand-800">
                PRO
              </span>
            </div>
          </div>

          <nav className="p-3 space-y-1">
            <button
              onClick={onNavigateOverview}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all"
            >
              <LayoutGrid className="w-4 h-4 text-slate-400" />
              <span>Overview</span>
            </button>

            {/* Active RFPs & Specs */}
            <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold bg-brand-500 text-white shadow-sm shadow-brand-500/30 transition-all">
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-white" />
                <span>RFPs &amp; Specs</span>
              </div>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-brand-600 text-white">
                Intake
              </span>
            </button>

            <button
              onClick={onNavigateAIWorkspace}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all"
            >
              <Sparkles className="w-4 h-4 text-slate-400" />
              <span>AI Workspace</span>
            </button>

            <button
              onClick={() => alert('Navigate to Knowledge Vault')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all"
            >
              <BookOpen className="w-4 h-4 text-slate-400" />
              <span>Knowledge Vault</span>
            </button>

            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all">
              <CreditCard className="w-4 h-4 text-slate-400" />
              <span>Plan &amp; Quota</span>
            </button>
          </nav>
        </div>

        <div className="p-3 border-t border-slate-100">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0">
                SE
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-slate-800 truncate">SE Team Lead</div>
                <div className="text-[11px] font-mono text-slate-400 truncate">sales-eng@org</div>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* 2. MAIN BODY */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-500">Presaleee</span>
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-brand-700">AI Intake &amp; Qualification Pipeline</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateAIWorkspace}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-xs"
            >
              <span>Go to Lead Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="p-6 sm:p-8 max-w-7xl mx-auto w-full space-y-8">
          
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              AI Intake &amp; Qualification Engine
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 leading-relaxed max-w-3xl">
              Chuyển đổi yêu cầu khách hàng chưa có cấu trúc thành dữ liệu dự án có cấu trúc. AI Intake chỉ thu thập thông tin; Qualification Engine là bước thẩm định độc lập do đội ngũ nội bộ quyết định.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* STEP 1: AI INTAKE (6 cols) */}
            <div className="lg:col-span-6 space-y-6">
              
              <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-4">
                
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-emerald-50 text-brand-700 font-bold font-mono text-xs flex items-center justify-center border border-brand-200">
                      01
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 font-mono">
                      AI INTAKE (Unstructured → Structured)
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    Data Collection Only
                  </span>
                </div>

                {/* Input Area */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Mô tả yêu cầu khách hàng (Free-form Description / RFP Brief):
                  </label>
                  <textarea
                    rows={4}
                    value={inquiryText}
                    onChange={(e) => setInquiryText(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-mono text-slate-800 focus:outline-none focus:border-brand-500 focus:bg-white leading-relaxed"
                  />
                </div>

                {/* Upload box */}
                <div className="p-3.5 rounded-2xl border-2 border-dashed border-slate-200 hover:border-brand-300 bg-slate-50/40 text-center cursor-pointer transition-colors">
                  <UploadCloud className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                  <span className="text-xs font-medium text-slate-600 block">
                    Đính kèm tài liệu RFP PDF / Brief specs (Tùy chọn)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Hỗ trợ PDF, DOCX, TXT</span>
                </div>

                <button
                  onClick={handleRunIntake}
                  disabled={analyzing}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold font-mono flex items-center justify-center gap-2 shadow-xs transition-all"
                >
                  <Zap className="w-3.5 h-3.5 text-brand-400" />
                  <span>{analyzing ? 'AI đang bóc tách thông tin...' : 'Chạy AI Intake Parser'}</span>
                </button>

                {/* Extracted Structured Data Box */}
                {intakeExtracted && (
                  <div className="pt-3 border-t border-slate-100 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between text-xs font-mono font-bold text-brand-700">
                      <span>THÔNG TIN DỰ ÁN ĐÃ CHUẨN HOÁ:</span>
                      <span className="text-[10px] bg-emerald-100 text-brand-800 px-2 py-0.5 rounded">
                        Created Lead #LEAD-789
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-slate-400 text-[10px] block">DOMAIN</span>
                        <span className="font-bold text-slate-800">Fintech / Core Banking</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-slate-400 text-[10px] block">TARGET SLA</span>
                        <span className="font-bold text-brand-700">&lt; 50ms Latency</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-slate-400 text-[10px] block">PEAK WORKLOAD</span>
                        <span className="font-bold text-slate-800">40,000+ TPS</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-slate-400 text-[10px] block">COMPLIANCE</span>
                        <span className="font-bold text-slate-800">SOC-2 Type II</span>
                      </div>
                    </div>

                    {/* Missing Info & Follow-up questions */}
                    <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2 text-xs">
                      <div className="font-bold text-amber-800 flex items-center gap-1.5 font-mono text-[11px]">
                        <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                        <span>THÔNG TIN CÒN THIẾU &amp; CÂU HỎI FOLLOW-UP (AI GENERATED):</span>
                      </div>
                      <ul className="list-disc pl-4 space-y-1 text-slate-700 text-[11px] font-mono">
                        <li>Cơ sở dữ liệu kế thừa hiện tại là Oracle hay MS SQL Server?</li>
                        <li>Yêu cầu duy trì cơ chế Dual-Write (Ghi song song) trong bao lâu?</li>
                        <li>Đội ngũ bảo mật khách hàng có yêu cầu lưu trữ mã khóa HSM tại chỗ không?</li>
                      </ul>
                    </div>
                  </div>
                )}

              </div>

            </div>

            {/* STEP 2: QUALIFICATION ENGINE (6 cols) */}
            <div className="lg:col-span-6 space-y-6">
              
              <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-4">
                
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-emerald-50 text-brand-700 font-bold font-mono text-xs flex items-center justify-center border border-brand-200">
                      02
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 font-mono">
                      QUALIFICATION ENGINE (Internal Review)
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono bg-emerald-50 text-brand-700 border border-brand-200 px-2 py-0.5 rounded font-bold">
                    Independent Step
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-500 font-mono">Thẩm định khả thi deal:</div>
                    <div className="text-sm font-bold text-slate-800">
                      Project Apollo (FinTech Core)
                    </div>
                  </div>
                  <button
                    onClick={handleRunQualification}
                    disabled={qualifying}
                    className="px-3.5 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-xs"
                  >
                    {qualifying ? 'Đang chấm điểm...' : 'Chạy Thẩm Định AI'}
                  </button>
                </div>

                {qualified && (
                  <div className="space-y-4 animate-in fade-in">
                    
                    {/* Qualification Score */}
                    <div className="p-4 rounded-2xl bg-emerald-50/70 border border-brand-200 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-mono text-slate-500 uppercase font-bold block">
                          QUALIFICATION SCORE
                        </span>
                        <div className="text-2xl font-extrabold font-mono text-brand-700 mt-0.5">
                          94 / 100
                        </div>
                        <span className="text-xs text-slate-600 font-medium">
                          Mức độ sẵn sàng cao (High Readiness • Tier-1 Lead)
                        </span>
                      </div>

                      <div className="w-12 h-12 rounded-full border-4 border-brand-500 flex items-center justify-center text-xs font-bold font-mono text-brand-800 bg-white shadow-xs">
                        94%
                      </div>
                    </div>

                    {/* Breakdown Reasons */}
                    <div className="space-y-2 text-xs font-mono">
                      <div className="font-bold text-slate-700 text-[11px] uppercase">
                        GIẢI THÍCH LÝ DO &amp; ĐÁNH GIÁ:
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-brand-600 shrink-0 mt-0.5" />
                        <span><strong>Kiến trúc phù hợp:</strong> Team có sẵn Blueprint Kafka Event Mesh đã chứng thực tại 3 khách hàng tương đương.</span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-brand-600 shrink-0 mt-0.5" />
                        <span><strong>Ngân sách &amp; Quy mô:</strong> Dự toán $1.2M - $1.4M ARR nằm trong ngưỡng khả thi cho Enterprise Tier.</span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <span><strong>Rủi ro cần lưu ý:</strong> Thời gian nghiệm thu phụ thuộc vào bộ phận bảo mật (InfoSec) phê duyệt quy chuẩn mTLS.</span>
                      </div>
                    </div>

                    {/* Project Brief */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono space-y-1">
                      <div className="text-slate-400 text-[10px] font-bold uppercase">
                        AI PROJECT BRIEF:
                      </div>
                      <p className="text-slate-700 leading-relaxed">
                        Dự án nâng cấp hệ thống thanh toán cốt lõi cho 4.2M tài khoản tiền gửi. Đề xuất bước tiếp theo: Tiến hành <strong>Discovery Meeting #1</strong> với CTO để xác định ranh giới di chuyển dữ liệu (Data Migration Boundaries).
                      </p>
                    </div>

                    {/* Approve / Reject Internal Decision Buttons */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold text-slate-600 font-mono">
                        Quyết định nội bộ:
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setDecision('Rejected')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                            decision === 'Rejected'
                              ? 'bg-rose-50 text-rose-700 border-rose-300'
                              : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                          }`}
                        >
                          Reject Lead
                        </button>

                        <button
                          onClick={() => {
                            setDecision('Approved');
                            onNavigateAIWorkspace();
                          }}
                          className={`px-4 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-all ${
                            decision === 'Approved'
                              ? 'bg-brand-500 hover:bg-brand-600 text-white'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          Approve &amp; Open Workspace →
                        </button>
                      </div>
                    </div>

                  </div>
                )}

              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
