import React, { useState } from 'react';
import { useAdminAnalytics } from '../hooks/useAdminAnalytics';
import { AppSidebar } from './workspace/AppSidebar';
import { formatDateTime } from '../utils/format';
import {
  RefreshCw,
  TrendingUp,
  Award,
  Sparkles,
  Calendar,
  Layers,
  FileCheck2,
  Download,
  Lightbulb,
  ArrowUpRight
} from 'lucide-react';

interface AdminAnalyticsProps {
  onLogout: () => void;
  onNavigateOverview: () => void;
  onNavigateMembers: () => void;
  onNavigateAudit: () => void;
  onNavigateClients: () => void;
  onNavigateRateCards: () => void;
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

  const intakeData = analytics?.intakeAnalytics;
  const bantData = analytics?.workspaceBantAnalytics;
  const pipelineData = analytics?.leadPipelineAnalytics;
  const meetingData = analytics?.discoveryMeetingAnalytics;

  // Filter scored leads based on selected BANT threshold and status
  const filteredScoredLeads = (bantData?.scoredLeads || []).filter(lead => {
    if (selectedTier === 'EXCELLENT' && lead.bantScore < 80) return false;
    if (selectedTier === 'GOOD' && (lead.bantScore < 70 || lead.bantScore >= 80)) return false;
    if (selectedTier === 'POTENTIAL' && (lead.bantScore < 50 || lead.bantScore >= 70)) return false;
    if (selectedTier === 'NEEDS_IMPROVEMENT' && lead.bantScore >= 50) return false;

    if (selectedStatus !== 'ALL' && lead.status !== selectedStatus) return false;

    return true;
  });

  const periodOptions: Array<{ id: string; label: string }> = [
    { id: '7d', label: '7 Ngày qua' },
    { id: '30d', label: '30 Ngày qua' },
    { id: '90d', label: 'Quý này (90D)' },
    { id: '365d', label: 'Năm nay (365D)' },
    { id: 'all', label: 'Toàn bộ thời gian' }
  ];

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
            <span className="text-slate-500 font-semibold">Thống Kê Nền Tảng &amp; Hiệu Năng (Platform Analytics)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={reload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>
            <button
              onClick={onLogout}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 sm:hidden"
            >
              Đăng xuất
            </button>
          </div>
        </header>

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
                  Tổng hợp số lượng AI Intake, phân bổ điểm BANT, cơ cấu nguồn Lead và tần suất họp Discovery Meetings trên toàn hệ thống workspace.
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

          {/* 4 CORE KPI METRIC CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Intakes */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-slate-400 uppercase">SỐ LƯỢNG AI INTAKE</span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900">
                  {isLoading ? '…' : intakeData?.totalIntakes ?? 0}
                </span>
                <span className="text-xs text-purple-700 font-semibold font-mono flex items-center">
                  <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
                  +{intakeData?.growthPercentage ?? 0}%
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-sans">
                Tài liệu RFP được đưa vào AI phân tích trong mốc {period}
              </p>
            </div>

            {/* Card 2: Average BANT Score */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-slate-400 uppercase">ĐIỂM BANT TRUNG BÌNH</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold font-mono text-emerald-600">
                  {isLoading ? '…' : bantData?.averageScore ?? 0}/100
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  ({bantData?.totalScored ?? 0} đã chấm)
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-sans">
                Chất lượng thẩm định BANT trung bình các đề xuất
              </p>
            </div>

            {/* Card 3: Total Leads */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-slate-400 uppercase">TỔNG DỰ ÁN TRONG PHỄU</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900">
                  {isLoading ? '…' : pipelineData?.totalLeads ?? 0}
                </span>
                <span className="text-xs text-blue-700 font-semibold font-mono">
                  {pipelineData?.statusBreakdown?.find(s => s.status === 'WON')?.count ?? 0} Thắng thầu
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-sans">
                Toàn bộ cơ hội thầu thuộc các team trong tổ chức
              </p>
            </div>

            {/* Card 4: Discovery Meetings */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-slate-400 uppercase">DISCOVERY MEETINGS</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold font-mono text-amber-700">
                  {isLoading ? '…' : meetingData?.totalMeetings ?? 0}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  ({meetingData?.withGapAnalysis ?? 0} có Gap analysis)
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-sans">
                Phiên họp khảo sát kỹ thuật đã diễn ra trong mốc thời gian
              </p>
            </div>
          </div>

          {/* 2 VISUAL TREND CHARTS (AI Intake & Discovery Meetings) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Chart 1: AI Intake Volume Trend */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span>Số Lượng AI Intake Xuất Theo Mốc Thời Gian</span>
                  </h3>
                  <p className="text-xs text-slate-500">Biểu đồ tần suất tài liệu RFP được trích xuất qua AI Intake</p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-purple-50 text-purple-700 border border-purple-200">
                  {intakeData?.trend?.length || 0} điểm dữ liệu
                </span>
              </div>

              {/* Interactive SVG Bar Chart */}
              <div className="h-56 w-full flex items-end gap-2 pt-6 pb-2 px-2 overflow-x-auto">
                {isLoading ? (
                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 font-mono">
                    Đang dựng biểu đồ...
                  </div>
                ) : !intakeData?.trend?.length ? (
                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 font-mono">
                    Chưa có lượt AI Intake nào trong khoảng thời gian này.
                  </div>
                ) : (
                  (() => {
                    const maxVal = Math.max(...intakeData.trend.map(t => t.count), 1);
                    return intakeData.trend.map((point, idx) => {
                      const heightPercent = Math.max((point.count / maxVal) * 100, 8);
                      const isHovered = hoveredIntakePoint?.date === point.date;
                      return (
                        <div
                          key={idx}
                          onMouseEnter={() => setHoveredIntakePoint(point)}
                          onMouseLeave={() => setHoveredIntakePoint(null)}
                          className="flex-1 min-w-[28px] max-w-[48px] h-full flex flex-col justify-end items-center group relative cursor-pointer"
                        >
                          {/* Tooltip */}
                          {isHovered && (
                            <div className="absolute -top-10 bg-slate-900 text-white text-[10px] font-mono py-1 px-2 rounded-lg shadow-lg whitespace-nowrap z-20 pointer-events-none">
                              {point.date}: <strong>{point.count} Intake</strong>
                            </div>
                          )}
                          <span className="text-[10px] font-mono text-slate-400 mb-1 font-bold group-hover:text-purple-700">
                            {point.count}
                          </span>
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className={`w-full rounded-t-xl transition-all duration-300 ${
                              isHovered
                                ? 'bg-gradient-to-t from-purple-800 to-purple-500 shadow-md scale-105'
                                : 'bg-gradient-to-t from-purple-600 to-purple-400 opacity-90 group-hover:opacity-100'
                            }`}
                          />
                          <span className="text-[9px] font-mono text-slate-400 mt-2 truncate w-full text-center">
                            {point.date.slice(5)}
                          </span>
                        </div>
                      );
                    });
                  })()
                )}
              </div>
            </div>

            {/* Chart 2: Discovery Meetings Activity Trend */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-600" />
                    <span>Tần Suất Khảo Sát Discovery Meetings</span>
                  </h3>
                  <p className="text-xs text-slate-500">Số lượng cuộc họp khảo sát kỹ thuật diễn ra theo thời gian</p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  Tổng {meetingData?.totalMeetings ?? 0} cuộc họp
                </span>
              </div>

              {/* Interactive SVG Bar Chart for Meetings */}
              <div className="h-56 w-full flex items-end gap-2 pt-6 pb-2 px-2 overflow-x-auto">
                {isLoading ? (
                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 font-mono">
                    Đang dựng biểu đồ...
                  </div>
                ) : !meetingData?.trend?.length ? (
                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 font-mono">
                    Chưa có cuộc họp nào diễn ra trong khoảng thời gian này.
                  </div>
                ) : (
                  (() => {
                    const maxVal = Math.max(...meetingData.trend.map(t => t.count), 1);
                    return meetingData.trend.map((point, idx) => {
                      const heightPercent = Math.max((point.count / maxVal) * 100, 8);
                      return (
                        <div
                          key={idx}
                          className="flex-1 min-w-[28px] max-w-[48px] h-full flex flex-col justify-end items-center group relative cursor-pointer"
                        >
                          <span className="text-[10px] font-mono text-slate-400 mb-1 font-bold group-hover:text-amber-700">
                            {point.count}
                          </span>
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className="w-full rounded-t-xl bg-gradient-to-t from-amber-600 to-amber-400 transition-all duration-300 opacity-90 group-hover:opacity-100 group-hover:scale-105"
                          />
                          <span className="text-[9px] font-mono text-slate-400 mt-2 truncate w-full text-center">
                            {point.date.slice(5)}
                          </span>
                        </div>
                      );
                    });
                  })()
                )}
              </div>
            </div>

          </div>

          {/* SECTION 3: BANT SCORE DISTRIBUTION & THRESHOLD FILTER */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 sm:p-7 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-emerald-600" />
                  <span>Phân Phối Điểm Thẩm Định BANT &amp; Lọc Theo Thang Điểm</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Thống kê điểm chấm BANT AI và bộ lọc tương tác theo các thang điểm chuẩn
                </p>
              </div>

              {/* Threshold Filter Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'ALL', label: 'Tất cả' },
                  { id: 'EXCELLENT', label: '>= 80 (Xuất sắc)' },
                  { id: 'GOOD', label: '70-79 (Khá tốt)' },
                  { id: 'POTENTIAL', label: '50-69 (Tiềm năng)' },
                  { id: 'NEEDS_IMPROVEMENT', label: '< 50 (Cần cải thiện)' }
                ].map(tier => (
                  <button
                    key={tier.id}
                    onClick={() => setSelectedTier(tier.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer ${
                      selectedTier === tier.id
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tier.label}
                  </button>
                ))}
              </div>
            </div>

            {/* BANT Distribution Meters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {bantData?.scoreDistribution?.map(tier => (
                <div 
                  key={tier.tier}
                  onClick={() => setSelectedTier(tier.tier)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    selectedTier === tier.tier
                      ? 'border-purple-600 bg-purple-50/50 shadow-sm'
                      : 'border-slate-200 bg-slate-50 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono font-bold mb-1">
                    <span className="text-slate-700">{tier.label}</span>
                    <span className="text-purple-700">{tier.percentage}%</span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-slate-900">
                    {tier.count} <span className="text-xs text-slate-400 font-normal">Dự án</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full mt-2 overflow-hidden">
                    <div 
                      style={{ width: `${tier.percentage}%` }}
                      className={`h-full rounded-full ${
                        tier.tier === 'EXCELLENT' ? 'bg-emerald-500' :
                        tier.tier === 'GOOD' ? 'bg-sky-500' :
                        tier.tier === 'POTENTIAL' ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Filtered Sample Table */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold text-slate-500 uppercase">
                    DANH SÁCH DỰ ÁN ({filteredScoredLeads.length} dự án):
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-900 text-white">
                    Thang điểm: {selectedTier}
                  </span>
                  {selectedStatus !== 'ALL' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
                      Trạng thái: {selectedStatus}
                      <button 
                        onClick={() => setSelectedStatus('ALL')}
                        className="hover:text-rose-600 font-bold ml-1 cursor-pointer"
                        title="Hủy lọc trạng thái"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {(selectedTier !== 'ALL' || selectedStatus !== 'ALL') && (
                    <button
                      onClick={() => {
                        setSelectedTier('ALL');
                        setSelectedStatus('ALL');
                      }}
                      className="text-[10px] font-mono text-purple-700 hover:underline cursor-pointer ml-1"
                    >
                      (Xóa tất cả bộ lọc)
                    </button>
                  )}
                </div>
                <span className="text-xs text-slate-400 font-mono">Dữ liệu ẩn danh phục vụ thống kê</span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-mono font-bold text-slate-400 uppercase">
                      <th className="py-2.5 px-4">TÊN DỰ ÁN</th>
                      <th className="py-2.5 px-4">ĐIỂM BANT</th>
                      <th className="py-2.5 px-4">TRẠNG THÁI</th>
                      <th className="py-2.5 px-4">KHÁCH HÀNG</th>
                      <th className="py-2.5 px-4 text-right">NGÀY NẠP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredScoredLeads.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400 font-mono">
                          Không có dự án nào thỏa mãn bộ lọc hiện tại.
                        </td>
                      </tr>
                    ) : (
                      filteredScoredLeads.slice(0, 10).map((l, i) => (
                        <tr key={i} className="hover:bg-slate-50/60">
                          <td className="py-3 px-4 font-semibold text-slate-900">{l.title}</td>
                          <td className="py-3 px-4 font-mono font-bold">
                            <span className={`px-2 py-0.5 rounded text-[11px] ${
                              l.bantScore >= 80 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              l.bantScore >= 70 ? 'bg-sky-50 text-sky-700 border border-sky-200' :
                              l.bantScore >= 50 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {l.bantScore}/100
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600">{l.status}</td>
                          <td className="py-3 px-4 text-slate-500">{l.clientName || '—'}</td>
                          <td className="py-3 px-4 text-right font-mono text-slate-400">{formatDateTime(l.createdAt)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* SECTION 4: PIPELINE STATUS BREAKDOWN & LEAD SOURCE BREAKDOWN */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Status Breakdown */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-600" />
                    <span>Bộ Lọc &amp; Cơ Cấu Trạng Thái Dự Án</span>
                  </h3>
                  <p className="text-xs text-slate-500">Bấm vào từng trạng thái để lọc nhanh danh sách dự án</p>
                </div>
                {selectedStatus !== 'ALL' && (
                  <button
                    onClick={() => setSelectedStatus('ALL')}
                    className="text-xs font-mono text-purple-700 hover:underline cursor-pointer"
                  >
                    Xem tất cả
                  </button>
                )}
              </div>

              <div className="space-y-2.5">
                {pipelineData?.statusBreakdown?.map(item => {
                  const isFiltered = selectedStatus === item.status;
                  return (
                    <div 
                      key={item.status} 
                      onClick={() => setSelectedStatus(isFiltered ? 'ALL' : item.status)}
                      className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                        isFiltered
                          ? 'border-purple-500 bg-purple-50/80 shadow-xs'
                          : 'border-slate-100 bg-slate-50/60 hover:bg-slate-100/80 hover:border-slate-200'
                      }`}
                      title={`Bấm để lọc theo trạng thái ${item.status}`}
                    >
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className={`font-bold flex items-center gap-1.5 ${isFiltered ? 'text-purple-900' : 'text-slate-800'}`}>
                          {item.status}
                          {isFiltered && <span className="text-[10px] bg-purple-600 text-white px-1.5 py-0.2 rounded-full">Đang lọc</span>}
                        </span>
                        <span className="text-slate-500">{item.count} Leads ({item.percentage}%)</span>
                      </div>
                      <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden mt-1.5">
                        <div 
                          style={{ width: `${item.percentage}%` }}
                          className={`h-full rounded-full transition-all duration-300 ${isFiltered ? 'bg-purple-700' : 'bg-purple-600'}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Source Breakdown */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-indigo-600" />
                    <span>Cơ Cấu Nguồn Tiếp Nhận (Lead Source Breakdown)</span>
                  </h3>
                  <p className="text-xs text-slate-500">Kênh tiếp cận khách hàng và xuất xứ RFP thầu</p>
                </div>
              </div>

              <div className="space-y-3">
                {pipelineData?.sourceBreakdown?.map(item => (
                  <div key={item.source} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-slate-800">{item.source}</span>
                      <span className="text-slate-500">{item.count} Leads ({item.percentage}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        style={{ width: `${item.percentage}%` }}
                        className="h-full rounded-full bg-indigo-600"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* SECTION 5: ĐỀ XUẤT CÁC TÍNH NĂNG MỞ RỘNG DÀNH CHO ADMIN (PROPOSED ROADMAP) */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-purple-50 via-white to-indigo-50/50 border border-purple-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center">
                  <Lightbulb className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Đề Xuất Tính Năng Giám Sát &amp; Phân Tích Mở Rộng Dành Cho Admin
                  </h3>
                  <p className="text-xs text-slate-500">Các tính năng đề xuất bổ sung vào menu Thống kê Nền tảng</p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-purple-100 text-purple-800 border border-purple-200">
                PROPOSED FEATURES
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
              {/* Proposal 1 */}
              <div className="p-4 rounded-2xl bg-white border border-purple-100 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">AI TELEMETRY</span>
                  <ArrowUpRight className="w-4 h-4 text-purple-400" />
                </div>
                <h4 className="text-xs font-bold text-slate-900">Giám Sát AI Inference &amp; Cache Hit</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                  Thống kê số lượt gọi mô hình Qwen1.5-4B vs Gemini 2.5, tỷ lệ Cache Hit của Semantic RAG và độ trễ phản hồi (latency ms).
                </p>
              </div>

              {/* Proposal 2 */}
              <div className="p-4 rounded-2xl bg-white border border-purple-100 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">PORTAL SECURITY</span>
                  <ArrowUpRight className="w-4 h-4 text-indigo-400" />
                </div>
                <h4 className="text-xs font-bold text-slate-900">Giám Sát Phiên Client Portal</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                  Theo dõi số lượng link chia sẻ cho khách hàng đang Active vs Hết hạn, tổng lượt đọc và cảnh báo lượt xem bất thường.
                </p>
              </div>

              {/* Proposal 3 */}
              <div className="p-4 rounded-2xl bg-white border border-purple-100 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">VECTOR STORAGE</span>
                  <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                </div>
                <h4 className="text-xs font-bold text-slate-900">Dung Lượng Knowledge Vault</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                  Theo dõi số vector nhúng (pgvector 768 dims), tần suất tìm kiếm ngữ nghĩa và tỷ lệ tái sử dụng tài liệu trong proposal.
                </p>
              </div>

              {/* Proposal 4 */}
              <div className="p-4 rounded-2xl bg-white border border-purple-100 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">EXECUTIVE EXPORT</span>
                  <Download className="w-4 h-4 text-blue-500" />
                </div>
                <h4 className="text-xs font-bold text-slate-900">Xuất Báo Cáo Định Kỳ (PDF/Excel)</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                  Tự động kết xuất toàn bộ dashboard số liệu thống kê thành file PDF báo cáo điều hành cho ban giám đốc.
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
