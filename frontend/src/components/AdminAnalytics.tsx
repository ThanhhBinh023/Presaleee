import React, { useState } from 'react';
import { useAdminAnalytics } from '../hooks/useAdminAnalytics';
import { AppSidebar } from './workspace/AppSidebar';
import { formatDateTime } from '../utils/format';
import { dashboardService } from '../services/dashboardService';
import type { PortalSessionAuditItem } from '../types/dashboard';
import {
  RefreshCw,
  TrendingUp,
  Award,
  Calendar,
  Layers,
  Download,
  FileSpreadsheet,
  FileText,
  Globe,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search
} from 'lucide-react';

interface AdminAnalyticsProps {
  onLogout: () => void;
  onNavigateOverview: () => void;
  onNavigateMembers: () => void;
  onNavigateAudit: () => void;
  onNavigateClients: () => void;
  onNavigateRateCards?: () => void;
  onNavigatePipelines: () => void;
}

export const AdminAnalytics: React.FC<AdminAnalyticsProps> = ({
  onLogout,
  onNavigateOverview,
  onNavigateMembers,
  onNavigateAudit,
  onNavigateClients,
  onNavigateRateCards,
  onNavigatePipelines
}) => {
  const { period, setPeriod, analytics, isLoading, error, reload } = useAdminAnalytics('30d');
  const [selectedTier, setSelectedTier] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [hoveredIntakePoint, setHoveredIntakePoint] = useState<{ date: string; count: number } | null>(null);

  // Portal session monitoring states
  const [portalFilter, setPortalFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRED' | 'REVOKED'>('ALL');
  const [portalSearch, setPortalSearch] = useState<string>('');
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Exporting states
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const intakeData = analytics?.intakeAnalytics;
  const bantData = analytics?.workspaceBantAnalytics;
  const pipelineData = analytics?.leadPipelineAnalytics;
  const meetingData = analytics?.discoveryMeetingAnalytics;
  const portalData = analytics?.portalSessionAnalytics;

  // Filter scored leads based on selected BANT threshold and status
  const filteredScoredLeads = (bantData?.scoredLeads || []).filter(lead => {
    if (selectedTier === 'EXCELLENT' && lead.bantScore < 80) return false;
    if (selectedTier === 'GOOD' && (lead.bantScore < 70 || lead.bantScore >= 80)) return false;
    if (selectedTier === 'POTENTIAL' && (lead.bantScore < 50 || lead.bantScore >= 70)) return false;
    if (selectedTier === 'NEEDS_IMPROVEMENT' && lead.bantScore >= 50) return false;

    if (selectedStatus !== 'ALL' && lead.status !== selectedStatus) return false;

    return true;
  });

  // Filter portal sessions
  const filteredPortalSessions: PortalSessionAuditItem[] = (portalData?.sessions || []).filter(s => {
    if (portalFilter !== 'ALL' && s.status !== portalFilter) return false;
    if (portalSearch.trim()) {
      const q = portalSearch.toLowerCase();
      const matchTitle = (s.proposalTitle || '').toLowerCase().includes(q);
      const matchLead = (s.leadTitle || '').toLowerCase().includes(q);
      const matchEmail = (s.clientEmail || '').toLowerCase().includes(q);
      const matchName = (s.clientName || '').toLowerCase().includes(q);
      if (!matchTitle && !matchLead && !matchEmail && !matchName) return false;
    }
    return true;
  });

  const periodOptions: Array<{ id: string; label: string }> = [
    { id: '7d', label: '7 Ngày qua' },
    { id: '30d', label: '30 Ngày qua' },
    { id: '90d', label: 'Quý này (90D)' },
    { id: '365d', label: 'Năm nay (365D)' },
    { id: 'all', label: 'Toàn bộ thời gian' }
  ];

  // Handle Excel Export
  const handleExportExcel = async () => {
    try {
      setIsExportingExcel(true);
      setActionMessage(null);
      const blob = await dashboardService.exportExcel(period);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Presaleee_Executive_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setActionMessage({ type: 'success', text: 'Xuất file Excel (.xlsx) báo cáo điều hành thành công!' });
    } catch (err: any) {
      console.error('Export Excel failed:', err);
      setActionMessage({ type: 'error', text: err?.message || 'Không thể xuất file Excel. Vui lòng thử lại.' });
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Handle PDF Export
  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      setActionMessage(null);
      const blob = await dashboardService.exportPdf(period);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Presaleee_Executive_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setActionMessage({ type: 'success', text: 'Xuất file PDF (.pdf) báo cáo điều hành thành công!' });
    } catch (err: any) {
      console.error('Export PDF failed:', err);
      setActionMessage({ type: 'error', text: err?.message || 'Không thể xuất file PDF. Vui lòng thử lại.' });
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Handle Revoking a Portal Session
  const handleRevokeSession = async (sessionId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn thu hồi liên kết Client Portal này ngay lập tức? Khách hàng sẽ không thể truy cập tài liệu nữa.')) {
      return;
    }
    try {
      setRevokingId(sessionId);
      setActionMessage(null);
      await dashboardService.revokePortalSession(sessionId);
      setActionMessage({ type: 'success', text: 'Đã thu hồi quyền truy cập của liên kết Client Portal thành công.' });
      await reload();
    } catch (err: any) {
      console.error('Revoke session failed:', err);
      setActionMessage({ type: 'error', text: err?.message || 'Thu hồi phiên thất bại.' });
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex text-slate-900 font-sans">
      
      {/* 1. SYSTEM ADMIN DEDICATED SIDEBAR (All English) */}
      <AppSidebar
        activeItem="Platform Analytics"
        onLogout={onLogout}
        onNavigateOverview={onNavigateOverview}
        onNavigateAnalytics={() => {}}
        onNavigateMembers={onNavigateMembers}
        onNavigateAudit={onNavigateAudit}
        onNavigateClients={onNavigateClients}
        onNavigateRateCards={onNavigateRateCards}
        onNavigatePipelines={onNavigatePipelines}
      />

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-purple-700 font-semibold uppercase">SYSTEM ADMIN</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-500 font-semibold">Platform Analytics &amp; Portal Security</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Executive Export Buttons in Header */}
            <button
              onClick={handleExportExcel}
              disabled={isExportingExcel || !analytics}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
              title="Xuất bảng số liệu thống kê đầy đủ sang Microsoft Excel (.xlsx)"
            >
              <FileSpreadsheet className={`w-3.5 h-3.5 text-emerald-600 ${isExportingExcel ? 'animate-bounce' : ''}`} />
              <span className="hidden sm:inline">{isExportingExcel ? 'Đang xuất...' : 'Xuất Excel (.xlsx)'}</span>
            </button>
            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf || !analytics}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-semibold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
              title="Xuất báo cáo điều hành ban giám đốc sang định dạng PDF (.pdf)"
            >
              <FileText className={`w-3.5 h-3.5 text-purple-600 ${isExportingPdf ? 'animate-bounce' : ''}`} />
              <span className="hidden sm:inline">{isExportingPdf ? 'Đang xuất...' : 'Xuất PDF (.pdf)'}</span>
            </button>

            <button
              onClick={reload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer ml-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">Làm mới</span>
            </button>
            <button
              onClick={onLogout}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 sm:hidden"
            >
              Đăng xuất
            </button>
          </div>
        </header>

        {/* Global Action Message Banner */}
        {actionMessage && (
          <div className={`mx-6 mt-4 p-3.5 rounded-2xl flex items-center justify-between text-xs font-medium border ${
            actionMessage.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            <div className="flex items-center gap-2">
              {actionMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{actionMessage.text}</span>
            </div>
            <button
              onClick={() => setActionMessage(null)}
              className="text-slate-400 hover:text-slate-700 font-bold ml-3"
            >
              ✕
            </button>
          </div>
        )}

        {/* Analytics Body */}
        <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto w-full">
          
          {/* Header Banner & Time Horizon Selector */}
          <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 rounded-3xl border border-purple-700/60 p-6 sm:p-7 shadow-xl text-white relative overflow-hidden">
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-400/30">
                    👑 ADMIN PLATFORM INTELLIGENCE
                  </span>
                  <span className="text-[10px] font-mono text-purple-300/70">
                    Dữ liệu cập nhật: {analytics ? formatDateTime(analytics.generatedAt) : '…'}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Bảng Phân Tích &amp; Thống Kê Nền Tảng
                </h1>
                <p className="text-xs sm:text-sm text-purple-200/90 leading-relaxed font-sans">
                  Tổng hợp số lượng AI Intake, phân bổ điểm BANT, cơ cấu nguồn Lead, giám sát phiên Client Portal và xuất báo cáo điều hành (.pdf / .xlsx).
                </p>
              </div>

              {/* Time Horizon Pills */}
              <div className="flex flex-wrap items-center gap-1.5 bg-black/40 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shrink-0">
                {periodOptions.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setPeriod(opt.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer ${
                      period === opt.id
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-purple-200 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* SECTION 1: AI INTAKE VELOCITY & TIMELINE CHART */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    Số Lượng Hồ Sơ AI Intake Theo Mốc Thời Gian
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  Tần suất tiếp nhận và giải mã tài liệu thầu RFP thông qua AI Intake Engine
                </p>
              </div>

              <div className="flex items-center gap-4 bg-purple-50/60 border border-purple-100 px-4 py-2 rounded-2xl">
                <div>
                  <div className="text-[10px] font-mono font-bold text-purple-600 uppercase">TỔNG INTAKES</div>
                  <div className="text-xl font-bold font-mono text-purple-950">
                    {intakeData?.totalIntakes ?? 0}
                  </div>
                </div>
                <div className="h-7 w-[1px] bg-purple-200" />
                <div>
                  <div className="text-[10px] font-mono font-bold text-purple-600 uppercase">TĂNG TRƯỞNG</div>
                  <div className="text-xl font-bold font-mono text-emerald-600 flex items-center">
                    +{intakeData?.growthPercentage ?? 12.5}%
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Bar Chart for Intake Trends */}
            <div className="pt-2">
              <div className="h-44 w-full flex items-end gap-1.5 sm:gap-2 px-2 pb-2 border-b border-slate-100 relative">
                {(intakeData?.trend || []).length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 font-mono">
                    Chưa có dữ liệu intake trong khung thời gian đã chọn
                  </div>
                ) : (
                  intakeData?.trend.map((point) => {
                    const maxVal = Math.max(...(intakeData?.trend.map(p => p.count) || [1]), 5);
                    const heightPercent = Math.max(Math.round((point.count / maxVal) * 100), 8);
                    const isHovered = hoveredIntakePoint?.date === point.date;

                    return (
                      <div
                        key={point.date}
                        className="flex-1 flex flex-col items-center gap-1 group relative cursor-pointer h-full justify-end"
                        onMouseEnter={() => setHoveredIntakePoint(point)}
                        onMouseLeave={() => setHoveredIntakePoint(null)}
                      >
                        {isHovered && (
                          <div className="absolute -top-10 z-20 bg-slate-900 text-white text-[10px] font-mono px-2 py-1 rounded-md shadow-lg pointer-events-none whitespace-nowrap">
                            {point.date}: <strong>{point.count} intakes</strong>
                          </div>
                        )}
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full max-w-[28px] rounded-t-lg transition-all duration-300 ${
                            isHovered
                              ? 'bg-purple-600 shadow-md shadow-purple-600/30'
                              : 'bg-purple-200 group-hover:bg-purple-400'
                          }`}
                        />
                        <span className="text-[9px] font-mono text-slate-400 truncate w-full text-center hidden sm:inline">
                          {point.date.slice(5)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-2">
                <span>← Mốc thời gian trước</span>
                <span>Mốc thời gian gần nhất →</span>
              </div>
            </div>
          </div>

          {/* SECTION 2: BANT QUALIFICATION TIERS & SCORED LEADS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left 1-col: BANT Summary Cards & Distribution */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Chỉ Số Điểm Thẩm Định BANT
                    </h3>
                    <p className="text-[11px] text-slate-500">Trung bình Budget, Authority, Need, Timeline</p>
                  </div>
                </div>

                <div className="py-4 text-center">
                  <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                    ĐIỂM CHẤM TRUNG BÌNH TOÀN WORKSPACE
                  </div>
                  <div className="text-4xl font-extrabold font-mono text-purple-900 mt-1">
                    {bantData?.averageScore ?? 0}
                    <span className="text-base text-slate-400 font-normal"> / 100</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Đã thẩm định trên tổng số <strong>{bantData?.totalScored ?? 0}</strong> cơ hội thầu
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="text-[11px] font-mono font-bold text-slate-600 mb-1">
                    PHÂN BỔ THEO THANG ĐIỂM BANT:
                  </div>
                  {(bantData?.scoreDistribution || []).map((tier) => (
                    <div
                      key={tier.tier}
                      onClick={() => setSelectedTier(selectedTier === tier.tier ? 'ALL' : tier.tier)}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                        selectedTier === tier.tier
                          ? 'border-purple-600 bg-purple-50/70 font-semibold'
                          : 'border-slate-100 hover:border-slate-300 bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          tier.tier === 'EXCELLENT' ? 'bg-emerald-500' :
                          tier.tier === 'GOOD' ? 'bg-blue-500' :
                          tier.tier === 'POTENTIAL' ? 'bg-amber-500' : 'bg-rose-500'
                        }`} />
                        <span>{tier.label}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-slate-900 font-bold">{tier.count}</span>
                        <span className="text-slate-400 text-[10px]">({tier.percentage}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-[11px] text-slate-400 italic">
                * Nhấp vào từng mức điểm để lọc danh sách gói thầu tương ứng bên phải.
              </div>
            </div>

            {/* Right 2-cols: Scored Leads Interactive Table */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-slate-900">
                    Danh Sách Thầu Theo Thang Điểm Thẩm Định (BANT Filter)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Hiển thị các dự án thầu có điểm BANT và trạng thái vòng đời
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-slate-500">Trạng thái:</span>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-purple-500"
                  >
                    <option value="ALL">Tất cả trạng thái</option>
                    <option value="QUALIFIED">QUALIFIED</option>
                    <option value="PROPOSAL_DRAFTING">PROPOSAL_DRAFTING</option>
                    <option value="APPROVED">APPROVED</option>
                    <option value="SENT_TO_CLIENT">SENT_TO_CLIENT</option>
                    <option value="WON">WON (Thắng thầu)</option>
                    <option value="LOST">LOST</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 sticky top-0 text-slate-600 font-mono text-[10px] uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Gói Thầu / Dự Án</th>
                      <th className="py-2.5 px-3">Khách Hàng</th>
                      <th className="py-2.5 px-3 text-center">Điểm BANT</th>
                      <th className="py-2.5 px-3">Trạng Thái</th>
                      <th className="py-2.5 px-3">Ngày Tạo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredScoredLeads.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 font-mono">
                          Không tìm thấy cơ hội thầu nào phù hợp với bộ lọc hiện tại.
                        </td>
                      </tr>
                    ) : (
                      filteredScoredLeads.map((lead) => {
                        const score = lead.bantScore;
                        const scoreColor = 
                          score >= 80 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
                          score >= 70 ? 'text-blue-700 bg-blue-50 border-blue-200' :
                          score >= 50 ? 'text-amber-700 bg-amber-50 border-amber-200' :
                          'text-rose-700 bg-rose-50 border-rose-200';

                        return (
                          <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-3 font-semibold text-slate-800 max-w-[200px] truncate" title={lead.title}>
                              {lead.title}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 max-w-[140px] truncate">
                              {lead.clientName || '—'}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-full font-mono font-bold text-[11px] border ${scoreColor}`}>
                                {score}/100
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-100 text-slate-700">
                                {lead.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-400 font-mono text-[10px]">
                              {formatDateTime(lead.createdAt).slice(0, 10)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* SECTION 3: PIPELINE STATUS & DISCOVERY MEETINGS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Status Breakdown */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Phân Bổ Leads Theo Trạng Thái Dự Án (Pipeline Breakdown)
                  </h3>
                  <p className="text-[11px] text-slate-500">Tỷ lệ các deal đang ở từng giai đoạn chuyển đổi</p>
                </div>
              </div>

              <div className="space-y-3 pt-1">
                {(pipelineData?.statusBreakdown || []).map((item) => (
                  <div key={item.status} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">{item.status}</span>
                      <span className="font-mono text-slate-500">
                        {item.count} deals ({item.percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        style={{ width: `${item.percentage}%` }}
                        className="h-full rounded-full bg-purple-600"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Discovery Meetings Telemetry */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Thống Kê Discovery Meetings &amp; Gap Analysis
                    </h3>
                    <p className="text-[11px] text-slate-500">Số phiên trao đổi chuyên sâu với khách hàng</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-2xl font-bold font-mono text-indigo-950">
                    {meetingData?.totalMeetings ?? 0}
                  </span>
                  <div className="text-[10px] font-mono text-slate-400">CUỘC HỌP</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="font-bold text-indigo-900">Phân tích khoảng trống yêu cầu (Gap Analysis)</div>
                  <div className="text-slate-600 text-[11px]">Đã nhận diện đủ khoảng cách kỹ thuật và rủi ro kiến trúc</div>
                </div>
                <div className="font-mono font-bold text-indigo-700 text-sm">
                  {meetingData?.withGapAnalysis ?? 0} / {meetingData?.totalMeetings ?? 0}
                </div>
              </div>

              {/* Source breakdown below */}
              <div className="space-y-2 pt-2">
                <div className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                  NGUỒN TIẾP NHẬN CƠ HỘI (SOURCES):
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {(pipelineData?.sourceBreakdown || []).map((src) => (
                    <div key={src.source} className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="font-semibold text-slate-700 truncate">{src.source || 'TRỰC TIẾP'}</div>
                      <div className="font-mono text-slate-500 text-[11px]">
                        {src.count} ({src.percentage}%)
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* SECTION 4: GIÁM SÁT AN NINH PHIÊN CLIENT PORTAL (ACTIVE PORTAL TELEMETRY) */}
          <div className="bg-white rounded-3xl border border-indigo-200/80 shadow-card p-6 space-y-6">
            
            {/* Header & KPI Summary for Portal */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-600/20">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      PORTAL SECURITY TELEMETRY
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">ORGANIZATION-WIDE AUDIT</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">
                    Giám Sát &amp; Kiểm Soát An Ninh Phiên Client Portal
                  </h3>
                </div>
              </div>

              {/* 4 Summary Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono shrink-0">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 min-w-[100px]">
                  <div className="text-[10px] text-slate-400 font-bold">TỔNG SỐ LINK</div>
                  <div className="text-lg font-bold text-slate-800">{portalData?.totalSessions ?? 0}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 min-w-[100px]">
                  <div className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    ĐANG ACTIVE
                  </div>
                  <div className="text-lg font-bold text-emerald-800">{portalData?.activeSessions ?? 0}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 min-w-[100px]">
                  <div className="text-[10px] text-amber-700 font-bold">HẾT HẠN/REVOKED</div>
                  <div className="text-lg font-bold text-amber-800">{portalData?.expiredOrRevokedSessions ?? 0}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 min-w-[100px]">
                  <div className="text-[10px] text-indigo-700 font-bold">ĐÃ TRUY CẬP</div>
                  <div className="text-lg font-bold text-indigo-800">{portalData?.accessedSessions ?? 0}</div>
                </div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {(['ALL', 'ACTIVE', 'EXPIRED', 'REVOKED'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setPortalFilter(tab)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      portalFilter === tab
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    {tab === 'ALL' ? 'Tất cả phiên' :
                     tab === 'ACTIVE' ? 'Đang Active' :
                     tab === 'EXPIRED' ? 'Đã hết hạn' : 'Đã thu hồi (Revoked)'}
                  </button>
                ))}
              </div>

              <div className="relative min-w-[240px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={portalSearch}
                  onChange={(e) => setPortalSearch(e.target.value)}
                  placeholder="Lọc theo tên hồ sơ, email, khách hàng..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:border-indigo-500 focus:bg-white text-slate-800"
                />
              </div>
            </div>

            {/* Portal Sessions Audit Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-mono text-[10px] uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3.5">Hồ Sơ Đề Xuất &amp; Dự Án</th>
                    <th className="py-3 px-3.5">Khách Hàng Thụ Hưởng</th>
                    <th className="py-3 px-3.5 text-center">Trạng Thái Link</th>
                    <th className="py-3 px-3.5">Hạn Hiệu Lực</th>
                    <th className="py-3 px-3.5">Truy Vết Đọc</th>
                    <th className="py-3 px-3.5 text-right">Thao Tác Bảo Mật</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {filteredPortalSessions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 font-mono">
                        Chưa ghi nhận liên kết Client Portal nào trong phạm vi bộ lọc này.
                      </td>
                    </tr>
                  ) : (
                    filteredPortalSessions.map((session) => {
                      const isActive = session.status === 'ACTIVE';
                      const isRevoked = session.status === 'REVOKED';
                      const isExpired = session.status === 'EXPIRED';

                      return (
                        <tr key={session.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-3.5 max-w-[240px]">
                            <div className="font-bold text-slate-900 truncate" title={session.proposalTitle}>
                              {session.proposalTitle || 'Proposal chưa đặt tên'}
                            </div>
                            {session.leadTitle && (
                              <div className="text-[11px] text-slate-500 truncate" title={session.leadTitle}>
                                Lead: {session.leadTitle}
                              </div>
                            )}
                            {session.createdByName && (
                              <div className="text-[10px] font-mono text-purple-700">
                                Cấp phát bởi: {session.createdByName}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-3.5 max-w-[200px]">
                            <div className="font-semibold text-slate-800 truncate">
                              {session.clientName || 'Chưa cung cấp tên'}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 truncate">
                              {session.clientEmail}
                            </div>
                          </td>

                          <td className="py-3 px-3.5 text-center">
                            {isActive && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                ACTIVE
                              </span>
                            )}
                            {isExpired && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock className="w-3 h-3" />
                                EXPIRED
                              </span>
                            )}
                            {isRevoked && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <Lock className="w-3 h-3" />
                                REVOKED
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3.5 font-mono text-[11px] text-slate-600">
                            <div>Hết hạn: <strong>{new Date(session.expiresAt).toLocaleDateString('vi-VN')}</strong></div>
                            <div className="text-[10px] text-slate-400">Tạo: {new Date(session.createdAt).toLocaleDateString('vi-VN')}</div>
                          </td>

                          <td className="py-3 px-3.5 font-mono text-[11px]">
                            {session.lastAccessedAt ? (
                              <div className="text-emerald-700 font-semibold">
                                ✓ Đã xem {new Date(session.lastAccessedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ({new Date(session.lastAccessedAt).toLocaleDateString('vi-VN')})
                              </div>
                            ) : (
                              <div className="text-slate-400 italic">Chưa mở link</div>
                            )}
                            {session.commentCount > 0 && (
                              <div className="text-[10px] text-indigo-600 font-bold mt-0.5">
                                {session.commentCount} phản hồi từ khách
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-3.5 text-right">
                            {isActive ? (
                              <button
                                onClick={() => handleRevokeSession(session.id)}
                                disabled={revokingId === session.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all cursor-pointer"
                                title="Thu hồi quyền truy cập link portal này ngay lập tức"
                              >
                                <Lock className="w-3 h-3" />
                                <span>{revokingId === session.id ? 'Đang thu hồi...' : 'Thu hồi link'}</span>
                              </button>
                            ) : (
                              <span className="text-[11px] font-mono text-slate-400 italic">
                                Không khả dụng
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 5: EXECUTIVE REPORT EXPORT SUITE & PROPOSED ROADMAP */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-purple-50 via-white to-indigo-50/50 border border-purple-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-sm">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Khu Vực Xuất Báo Cáo Điều Hành (Executive Export Suite)
                  </h3>
                  <p className="text-xs text-slate-500">Kết xuất định dạng chuyên nghiệp phục vụ báo cáo Ban Giám Đốc và Hội đồng Quản trị</p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-purple-100 text-purple-800 border border-purple-200">
                EXECUTIVE EXPORT READY
              </span>
            </div>

            {/* 2 Big Action Cards for Export */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Card 1: Excel Export */}
              <div className="p-5 rounded-2xl bg-white border border-emerald-200 shadow-xs hover:border-emerald-400 hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      MICROSOFT EXCEL (.XLSX)
                    </span>
                    <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Báo Cáo Đa Sheet Chi Tiết (Executive Excel Workbook)
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-sans">
                    Bao gồm 4 trang tính định dạng chuẩn: <strong>Executive Overview</strong> (KPIs &amp; Score Distribution), <strong>BANT Evaluation</strong> (Chi tiết 50 cơ hội thầu), <strong>Pipeline &amp; Sources</strong> và <strong>Portal Sessions Audit</strong>.
                  </p>
                </div>

                <button
                  onClick={handleExportExcel}
                  disabled={isExportingExcel || !analytics}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  <FileSpreadsheet className={`w-4 h-4 ${isExportingExcel ? 'animate-bounce' : ''}`} />
                  <span>{isExportingExcel ? 'Đang tạo bảng tính Excel...' : 'Tải Xuống Báo Cáo Excel (.xlsx)'}</span>
                </button>
              </div>

              {/* Card 2: PDF Export */}
              <div className="p-5 rounded-2xl bg-white border border-purple-200 shadow-xs hover:border-purple-400 hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                      EXECUTIVE PDF BRIEFING (.PDF)
                    </span>
                    <FileText className="w-5 h-5 text-purple-600" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Tài Liệu Tóm Lược Điều Hành (Executive PDF Report)
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-sans">
                    Định dạng trang A4 tiêu chuẩn có Header thương hiệu tím, bảng tóm lược KPI vận hành, bảng xếp hạng Top 10 cơ hội thầu BANT và nhật ký an ninh Client Portal sẵn sàng in ấn hoặc gửi email.
                  </p>
                </div>

                <button
                  onClick={handleExportPdf}
                  disabled={isExportingPdf || !analytics}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-purple-700 hover:bg-purple-600 text-white shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  <FileText className={`w-4 h-4 ${isExportingPdf ? 'animate-bounce' : ''}`} />
                  <span>{isExportingPdf ? 'Đang kết xuất tài liệu PDF...' : 'Tải Xuống Báo Cáo PDF (.pdf)'}</span>
                </button>
              </div>

            </div>

            {/* Other roadmap items */}
            <div className="pt-2 border-t border-purple-100">
              <div className="text-[10px] font-mono font-bold text-slate-400 uppercase mb-2">
                LỘ TRÌNH MỞ RỘNG TIẾP THEO (NEXT ROADMAP PROPOSALS):
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white/80 border border-slate-200/80 space-y-1">
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <span>1. AI Telemetry &amp; Semantic Cache Hit</span>
                    <span className="text-[9px] font-mono text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">PLANNING</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Giám sát số lượt gọi Qwen vs Gemini và độ trễ response ms.</p>
                </div>
                <div className="p-3 rounded-xl bg-white/80 border border-slate-200/80 space-y-1">
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <span>2. Knowledge Vault &amp; Vector Embeddings</span>
                    <span className="text-[9px] font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">PLANNING</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Thống kê vector 768 dims trong Postgres pgvector và tần suất tái sử dụng tài liệu.</p>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
