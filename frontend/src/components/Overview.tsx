import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useDashboardOverview } from '../hooks/useDashboard';
import { WorkspacePill } from './workspace/WorkspacePill';
import { UserCard } from './workspace/UserCard';
import { navigateTo } from '../navigation';
import { formatDateTime, formatMoney } from '../utils/format';
import type { CurrencyAmount } from '../types/dashboard';
import { ROLE_DETAILS } from './workspace/UserCard';
import type { UserRole } from '../types/auth';
import { 
  LayoutGrid, 
  FileText, 
  Sparkles, 
  Search, 
  Plus, 
  ArrowRight, 
  DollarSign, 
  Globe, 
  Zap, 
  RefreshCw,
  GitBranch,
  FolderOpen,
  SlidersHorizontal,
  Server,
  Database,
  Cpu,
  ShieldCheck,
  Users,
  History,
  Building2,
  Lock,
  BarChart3
} from 'lucide-react';

function formatCurrencies(values: CurrencyAmount[]): string {
  if (!values.length) return '—';
  return values.map((row) => formatMoney(row.amount, row.currency)).join(' · ');
}

interface OverviewProps {
  onLogout: () => void;
  onNavigateAIWorkspace?: () => void;
  onNavigateRfps?: () => void;
  onNavigateVault?: () => void;
  onNavigateMembers?: () => void;
  onNavigateClients?: () => void;
  onNavigateAudit?: () => void;
  onNavigateLeads?: () => void;
  onNavigateRateCards?: () => void;
  onNavigateMeetings?: () => void;
  onNavigateProposals?: () => void;
  onNavigatePortal?: () => void;
  onNavigatePipelines?: () => void;
  onNavigateAnalytics?: () => void;
}

export const Overview: React.FC<OverviewProps> = ({ 
  onLogout, 
  onNavigateAIWorkspace,
  onNavigateRfps,
  onNavigateVault,
  onNavigateMembers,
  onNavigateClients,
  onNavigateAudit,
  onNavigateLeads,
  onNavigateRateCards,
  onNavigateMeetings,
  onNavigateProposals,
  onNavigatePortal,
  onNavigatePipelines,
  onNavigateAnalytics
}) => {
  const { user } = useAuth();
  const [activeNav, setActiveNav] = useState('Overview');
  const [searchTerm, setSearchTerm] = useState('');
  const leadLimit = 20;
  const { overview, activity, isLoading, error, reload } = useDashboardOverview(leadLimit);
  const kpis = overview?.kpis;
  const pipeline = overview?.pipeline ?? [];
  const visibleLeads = (overview?.activeLeads ?? []).filter((lead) => {
    const needle = searchTerm.trim().toLowerCase();
    if (!needle) return true;
    return `${lead.title} ${lead.clientName ?? ''} ${lead.status}`.toLowerCase().includes(needle);
  });

  const userRole = (user?.role || 'VIEWER') as UserRole;
  const roleInfo = ROLE_DETAILS[userRole] || ROLE_DETAILS.VIEWER;

  // Role-specific greeting and subtitle
  const roleGreetings: Record<UserRole, { title: string; subtitle: string; actionText: string; onAction?: () => void }> = {
    PRESALE_LEAD: {
      title: `Trưởng nhóm Presale, ${user?.fullName || 'Presale Lead'}!`,
      subtitle: 'Quản trị danh mục thầu, thẩm định định mức Rate Cards và phê duyệt đề xuất 10 Sheets.',
      actionText: 'Mở Pipeline Phê Duyệt Presale Lead',
      onAction: onNavigatePipelines
    },
    SALES_REP: {
      title: `Đại diện Kinh doanh, ${user?.fullName || 'Sales Rep'}!`,
      subtitle: 'Theo dõi đường ống Leads, dữ liệu khách hàng và chia sẻ Client Portal.',
      actionText: 'Tiếp nhận RFP Mới',
      onAction: onNavigateRfps
    },
    PRESALE_CONSULTANT: {
      title: `Chuyên viên Tư vấn Presale, ${user?.fullName || 'Consultant'}!`,
      subtitle: 'Vận hành AI Intake, phân tích Discovery Meetings và hoàn thiện 10 Sheets Matrix.',
      actionText: 'Vào AI Presale Workspace',
      onAction: onNavigateAIWorkspace
    },
    SOLUTION_ARCHITECT: {
      title: `Kiến trúc sư Giải pháp, ${user?.fullName || 'Solution Architect'}!`,
      subtitle: 'Thiết kế kiến trúc hệ thống, rà soát ma trận rủi ro RAID và chuẩn bị UI Design Brief.',
      actionText: 'Vào AI Workspace (Kiến trúc)',
      onAction: onNavigateAIWorkspace
    },
    ADMIN: {
      title: `Quản trị viên Hệ thống, ${user?.fullName || 'Admin'}!`,
      subtitle: 'Quản lý toàn bộ tổ chức, phân quyền thành viên và giám sát nhật ký Audit Log bất biến.',
      actionText: 'Quản lý Thành viên (RBAC)',
      onAction: onNavigateMembers
    },
    VIEWER: {
      title: `Người quan sát, ${user?.fullName || 'Viewer'}!`,
      subtitle: 'Bạn đang ở chế độ xem chỉ đọc. Tra cứu tri thức, theo dõi tiến độ và tải hồ sơ báo cáo.',
      actionText: 'Tra cứu Knowledge Vault',
      onAction: onNavigateVault
    }
  };

  const currentGreeting = roleGreetings[userRole] || roleGreetings.VIEWER;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex text-slate-900 font-sans">
      
      {/* 1. LEFT SIDEBAR */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 hidden md:flex">
        
        <div>
          {/* Logo & User Organization Pill */}
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-sm font-bold font-mono text-base">
                P
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                Presaleee
              </span>
            </div>

            <WorkspacePill />
          </div>

          {/* Navigation Links: Dedicated items for ADMIN (Zero presale workspace leakage) vs Presale Roles */}
          <nav className="p-3 space-y-1">
            {userRole === 'ADMIN' ? (
              [
                { name: 'Overview', icon: LayoutGrid },
                { name: 'Platform Analytics', icon: BarChart3 },
                { name: 'Members (RBAC)', icon: Users },
                { name: 'Audit Trail', icon: History },
                { name: 'Clients', icon: Building2 },
                { name: 'Rate Cards', icon: DollarSign },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = activeNav === item.name;
                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      if (item.name === 'Overview') {
                        setActiveNav('Overview');
                      } else if (item.name === 'Platform Analytics' && onNavigateAnalytics) {
                        onNavigateAnalytics();
                      } else if (item.name === 'Members (RBAC)' && onNavigateMembers) {
                        onNavigateMembers();
                      } else if (item.name === 'Audit Trail' && onNavigateAudit) {
                        onNavigateAudit();
                      } else if (item.name === 'Clients' && onNavigateClients) {
                        onNavigateClients();
                      } else if (item.name === 'Rate Cards' && onNavigateRateCards) {
                        onNavigateRateCards();
                      }
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-purple-900 text-white font-semibold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-purple-300' : 'text-slate-400'}`} />
                      <span>{item.name}</span>
                    </div>
                  </button>
                );
              })
            ) : (
              [
                { name: 'Overview', icon: LayoutGrid },
                { name: 'RFPs & Specs', icon: FileText },
                { name: 'AI Workspace', icon: Sparkles, badge: 'Active' },
                { name: 'Leads', icon: Zap },
                { name: 'Client portal', icon: Globe },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = activeNav === item.name;
                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      if (item.name === 'Overview') {
                        setActiveNav('Overview');
                      } else if (item.name === 'AI Workspace' && onNavigateAIWorkspace) {
                        onNavigateAIWorkspace();
                      } else if (item.name === 'RFPs & Specs' && onNavigateRfps) {
                        onNavigateRfps();
                      } else if (item.name === 'Knowledge Vault' && onNavigateVault) {
                        onNavigateVault();
                      } else if (item.name === 'Clients' && onNavigateClients) {
                        onNavigateClients();
                      } else if (item.name === 'Audit trail' && onNavigateAudit) {
                        onNavigateAudit();
                      } else if (item.name === 'Members' && onNavigateMembers) {
                        onNavigateMembers();
                      } else if (item.name === 'Leads' && onNavigateLeads) {
                        onNavigateLeads();
                      } else if (item.name === 'Rate Cards' && onNavigateRateCards) {
                        onNavigateRateCards();
                      } else if (item.name === 'Meetings' && onNavigateMeetings) {
                        onNavigateMeetings();
                      } else if (item.name === 'Proposals' && onNavigateProposals) {
                        onNavigateProposals();
                      } else if (item.name === 'Client portal' && onNavigatePortal) {
                        onNavigatePortal();
                      }
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-slate-900 text-white font-semibold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-brand-400' : 'text-slate-400'}`} />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        isActive ? 'bg-brand-500 text-white' : 'bg-emerald-50 text-brand-700 border border-brand-200'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </nav>
        </div>

        {/* Settings / Guide & User Card at bottom of sidebar */}
        <div className="p-3 border-t border-slate-100 space-y-1.5">
          <button
            onClick={() => {
              if (onNavigatePipelines) {
                onNavigatePipelines();
              } else {
                navigateTo('pipelines');
              }
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-all cursor-pointer"
            title="Cài đặt & Hướng dẫn phân quyền 6 vai trò (Role Pipelines)"
          >
            <div className="flex items-center gap-2.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <span>Cài đặt &amp; Hướng dẫn</span>
            </div>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-brand-700 border border-brand-200">
              6 Roles
            </span>
          </button>

          <UserCard onLogout={onLogout} subtitle="role" />
        </div>

      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-3 flex items-center justify-between gap-4">
          
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-400">Workspace</span>
            <span className="text-slate-300">/</span>
            <span className={`font-semibold uppercase ${userRole === 'ADMIN' ? 'text-purple-700' : 'text-brand-700'}`}>
              {userRole.replace(/_/g, ' ')}
            </span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-500">
              {userRole === 'ADMIN' ? 'System Administration & Infrastructure' : 'Executive Dashboard'}
            </span>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            {userRole === 'ADMIN' ? (
              <>
                <button
                  onClick={() => onNavigateAnalytics?.()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-purple-300 bg-purple-100 hover:bg-purple-200 text-purple-900 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-purple-700" />
                  <span>Platform Analytics</span>
                </button>
                <button
                  onClick={() => onNavigateMembers?.()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 text-purple-600" />
                  <span>Members (RBAC)</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => onNavigatePipelines?.()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-brand-200 bg-brand-50 hover:bg-brand-100 text-brand-800 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
              >
                <GitBranch className="w-3.5 h-3.5 text-brand-600" />
                <span>Role Pipelines</span>
              </button>
            )}
            <button
              onClick={onLogout}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 sm:hidden"
            >
              Đăng xuất
            </button>
          </div>

        </header>

        {/* Dashboard Body */}
        {error && (
          <div className="mx-6 mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
        )}

        <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto w-full">
          
          {userRole === 'ADMIN' ? (
            /* DEDICATED SYSTEM ADMIN OPERATIONS & INFRASTRUCTURE DASHBOARD */
            <div className="space-y-8 animate-in fade-in duration-300">
              
              {/* 1. ROYAL PURPLE BANNER */}
              <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 rounded-3xl border border-purple-700/60 p-6 sm:p-8 shadow-xl text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none" />
                
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-purple-800/60">
                  <div className="space-y-2.5 max-w-2xl">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-400/30 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
                        👑 SYSTEM ADMIN PRIVILEGE
                      </span>
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-white/10 text-slate-300">
                        SEED HARDCODED · INFRASTRUCTURE &amp; SECURITY
                      </span>
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                      Quản Trị Viên Nền Tảng Cấp Cao Nhất
                    </h1>
                    <p className="text-xs sm:text-sm text-purple-200/90 leading-relaxed font-sans">
                      Chào mừng <strong>{user?.fullName || 'System Admin'}</strong>. Quản trị hạ tầng kỹ thuật, tài khoản người dùng và chính sách bảo mật Multi-tenant.
                    </p>
                    {overview && (
                      <p className="font-mono text-[10px] text-purple-300/70">
                        Hệ thống đồng bộ lúc: {formatDateTime(overview.generatedAt)}
                      </p>
                    )}
                  </div>

                  {/* Quick Action Navigation Pills (All in English) */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      onClick={() => onNavigateAnalytics?.()}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-purple-950 hover:bg-purple-100 transition-all shadow-md cursor-pointer"
                    >
                      <BarChart3 className="w-4 h-4 text-purple-700" />
                      <span>Platform Analytics</span>
                    </button>
                    <button
                      onClick={() => onNavigateMembers?.()}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-md cursor-pointer"
                    >
                      <Users className="w-4 h-4" />
                      <span>Members (RBAC)</span>
                    </button>
                    <button
                      onClick={() => onNavigateAudit?.()}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer"
                    >
                      <History className="w-4 h-4" />
                      <span>Audit Trail</span>
                    </button>
                    <button
                      onClick={() => onNavigateClients?.()}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer"
                    >
                      <Building2 className="w-4 h-4" />
                      <span>Clients</span>
                    </button>
                    <button
                      onClick={() => onNavigateRateCards?.()}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer"
                    >
                      <DollarSign className="w-4 h-4" />
                      <span>Rate Cards</span>
                    </button>
                  </div>
                </div>

                {/* Platform Metrics in Banner */}
                <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-purple-900/40 border border-purple-700/40 rounded-2xl p-3.5">
                    <div className="text-[10px] font-mono text-purple-300 uppercase font-semibold">TỔNG LEADS TOÀN ORG</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                      <span className="text-xl sm:text-2xl font-bold font-mono text-white">{isLoading ? '…' : kpis?.totalLeads ?? 0}</span>
                    </div>
                    <div className="text-[10px] text-purple-300/70 mt-0.5">Giám sát tổng thể</div>
                  </div>
                  <div className="bg-purple-900/40 border border-purple-700/40 rounded-2xl p-3.5">
                    <div className="text-[10px] font-mono text-purple-300 uppercase font-semibold">DỰ ÁN ĐANG ACTIVE</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <span className="text-xl sm:text-2xl font-bold font-mono text-white">{isLoading ? '…' : kpis?.activeLeads ?? 0}</span>
                    </div>
                    <div className="text-[10px] text-purple-300/70 mt-0.5">Đang xử lý trong pipeline</div>
                  </div>
                  <div className="bg-purple-900/40 border border-purple-700/40 rounded-2xl p-3.5">
                    <div className="text-[10px] font-mono text-purple-300 uppercase font-semibold">TỔNG GIÁ TRỊ THẦU</div>
                    <div className="flex items-center gap-1.5 mt-1 text-emerald-400 font-bold font-mono text-sm sm:text-base">
                      <DollarSign className="w-4 h-4 shrink-0" />
                      <span>{isLoading ? '…' : formatCurrencies(kpis?.estimatedValueByCurrency ?? [])}</span>
                    </div>
                    <div className="text-[10px] text-purple-300/70 mt-0.5">Quy mô cơ hội thị trường</div>
                  </div>
                  <div className="bg-purple-900/40 border border-purple-700/40 rounded-2xl p-3.5">
                    <div className="text-[10px] font-mono text-purple-300 uppercase font-semibold">CƠ CHẾ PHÂN QUYỀN</div>
                    <div className="flex items-center gap-2 mt-1">
                      <ShieldCheck className="w-4 h-4 text-purple-400" />
                      <span className="text-sm sm:text-base font-bold font-mono text-white">RBAC + PBAC</span>
                    </div>
                    <div className="text-[10px] text-purple-300/70 mt-0.5">Phân quyền 2 tầng độc lập</div>
                  </div>
                </div>
              </div>

              {/* 2. SERVER & INFRASTRUCTURE TELEMETRY CARDS */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Server className="w-5 h-5 text-purple-700" />
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                      Hạ Tầng Kỹ Thuật &amp; Giám Sát Máy Chủ (System Telemetry)
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                      4 Dịch Vụ Cốt Lõi
                    </span>
                  </div>
                  <span className="text-xs font-mono text-slate-400">Trạng thái: 100% Khả dụng</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Node.js Backend */}
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">CORE API SERVICE</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                        ONLINE
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 font-mono">Backend Express (Port 5000)</div>
                    <div className="text-xs text-slate-500 leading-relaxed font-sans">
                      Node.js v24 · Clean Architecture · PBAC Enforced · Token Auth · Rate Limit 60 req/min
                    </div>
                  </div>

                  {/* PostgreSQL + pgvector */}
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">PRIMARY DATABASE</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Database className="w-3 h-3 text-emerald-600" />
                        CONNECTED
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 font-mono">PostgreSQL + pgvector (AWS)</div>
                    <div className="text-xs text-slate-500 leading-relaxed font-sans">
                      Supabase Cloud · 768-dim Vector Embeddings · RLS Multi-Tenant Isolation
                    </div>
                  </div>

                  {/* AI Engine */}
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">AI INFERENCE ENGINE</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-50 text-sky-700 border border-sky-200">
                        <Cpu className="w-3 h-3 text-sky-600" />
                        PORT 8000
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 font-mono">Qwen1.5-4B + Gemini 2.5</div>
                    <div className="text-xs text-slate-500 leading-relaxed font-sans">
                      Hybrid Fallback: Local Fine-tuned LoRA + Google Gemini Cloud · text-embedding-004
                    </div>
                  </div>

                  {/* Multi-Tenant Security */}
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">SECURITY &amp; ISOLATION</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-50 text-purple-700 border border-purple-200">
                        <Lock className="w-3 h-3 text-purple-600" />
                        ENFORCED
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 font-mono">Multi-Tenant Isolation</div>
                    <div className="text-xs text-slate-500 leading-relaxed font-sans">
                      Strict Tenant Partitioning · Project Membership Verification · Immutable Audit Logs
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. TECHNICAL OPERATIONS HUB */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-purple-700" />
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                      Trung Tâm Thao Tác Vận Hành Kỹ Thuật (System Admin Hub)
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                      Đặc Quyền Cấp Cao
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {/* Card 0: Platform Analytics */}
                  <div 
                    onClick={() => onNavigateAnalytics?.()}
                    className="p-5 rounded-2xl bg-gradient-to-br from-purple-50 via-white to-indigo-50/70 border-2 border-purple-300/80 shadow-xs hover:border-purple-500 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div className="space-y-2.5">
                      <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs">
                        <BarChart3 className="w-5 h-5" />
                      </div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                          Platform Analytics
                        </h3>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">
                          NEW
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed font-sans">
                        Biểu đồ sản lượng AI Intake, phân bổ điểm BANT &amp; bộ lọc điểm tùy chọn, phễu trạng thái &amp; nguồn Leads, tần suất Discovery Meetings.
                      </p>
                    </div>
                    <div className="pt-3 mt-3 border-t border-purple-100 flex items-center justify-between text-xs font-semibold text-purple-700">
                      <span>Mở Thống Kê Chi Tiết</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>

                  {/* Card 1: Members */}
                  <div 
                    onClick={() => onNavigateMembers?.()}
                    className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-purple-300 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div className="space-y-2.5">
                      <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Users className="w-5 h-5" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                        Quản Lý Tài Khoản (RBAC)
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed font-sans">
                        Quản lý toàn bộ danh bạ thành viên, phân bổ 6 vai trò cấp tổ chức, khóa/kích hoạt tài khoản và cấp lại quyền.
                      </p>
                    </div>
                    <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-purple-700">
                      <span>Vào Danh bạ Thành viên</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>

                  {/* Card 2: Audit */}
                  <div 
                    onClick={() => onNavigateAudit?.()}
                    className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-purple-300 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div className="space-y-2.5">
                      <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <History className="w-5 h-5" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                        Nhật Ký Kiểm Toán (Audit Trail)
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed font-sans">
                        Truy vết toàn diện lịch sử thao tác hệ thống, thay đổi bảo mật, phê duyệt proposal và chia sẻ Client Portal.
                      </p>
                    </div>
                    <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-purple-700">
                      <span>Xem Nhật ký Audit</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>

                  {/* Card 3: Clients */}
                  <div 
                    onClick={() => onNavigateClients?.()}
                    className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-purple-300 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div className="space-y-2.5">
                      <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                        Khách Hàng Doanh Nghiệp
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed font-sans">
                        Quản lý danh bạ doanh nghiệp đối tác, phân loại ngành nghề, thông tin liên hệ và chính sách tiếp cận portal.
                      </p>
                    </div>
                    <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-purple-700">
                      <span>Xem Khách hàng</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>

                  {/* Card 4: Rate Cards */}
                  <div 
                    onClick={() => onNavigateRateCards?.()}
                    className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-purple-300 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div className="space-y-2.5">
                      <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <DollarSign className="w-5 h-5" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                        Định Mức Đơn Giá (Rate Cards)
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed font-sans">
                        Cấu hình định mức chi phí nhân sự tiêu chuẩn toàn doanh nghiệp cho các vị trí SA, Lead, Consultant, QA, Dev.
                      </p>
                    </div>
                    <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-purple-700">
                      <span>Cấu hình Rate Cards</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. PBAC BOUNDARY & ISOLATION POLICY NOTICE */}
              <div className="p-6 rounded-3xl bg-amber-50/90 border border-amber-200 text-amber-950 space-y-3">
                <div className="flex items-center gap-2.5 font-bold font-mono text-xs text-amber-900">
                  <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>CHÍNH SÁCH PHÂN TÁCH RANH GIỚI HỆ THỐNG (SYSTEM ADMIN ISOLATION &amp; PBAC)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 text-xs text-amber-900 leading-relaxed font-sans">
                  <div className="p-3.5 rounded-2xl bg-white/70 border border-amber-200/80 space-y-1">
                    <strong className="block text-amber-950">1. Không Khởi Tạo Dự Án:</strong>
                    Tài khoản System Admin không tạo Lead/thầu thay cho người dùng. Các cơ hội thầu do các bộ phận nghiệp vụ (Sales Rep / Presale Consultant) trực tiếp tiếp nhận từ khách hàng.
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white/70 border border-amber-200/80 space-y-1">
                    <strong className="block text-amber-950">2. Loại Bỏ Khỏi Project Role:</strong>
                    Admin không can thiệp bổ nhiệm hay gán vai trò cho nhân sự trong deal. Trưởng nhóm dự án (Presale Lead) của từng deal toàn quyền phân bổ 5 vai trò dự án theo mô hình PBAC.
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white/70 border border-amber-200/80 space-y-1">
                    <strong className="block text-amber-950">3. Tách Biệt Lead Workspace:</strong>
                    Admin không can thiệp hay tự ý truy cập vào Lead Workspace của các nhóm khác. Admin chỉ có thể truy cập vào dự án khi được Leader của dự án đó chủ động mời tham gia.
                  </div>
                </div>
              </div>

              {/* 5. WORKSPACE PROJECTS STATUS & ACCESS NOTICE */}
              <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-card flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-700">
                    <Lock className="w-4 h-4 text-purple-600" />
                    <span>KHÔNG GIAN DỰ ÁN &amp; TÍNH NĂNG LEAD WORKSPACE</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Quyền Truy Cập Dự Án Được Bảo Vệ Tuyệt Đối Theo Nhóm
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-sans">
                    Dữ liệu các gói thầu và Lead Workspace thuộc quyền sở hữu của các nhóm dự án. Tài khoản Quản trị viên (System Admin) hoạt động chuyên biệt ở tầng hạ tầng, không tự động xem hoặc chỉnh sửa dữ liệu của các team khác trừ khi được Trưởng dự án (Leader) thêm vào danh sách thành viên dự án.
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <button
                    onClick={() => onNavigateAudit?.()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 transition-all cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5 text-purple-600" />
                    <span>Xem Nhật Ký Kiểm Toán (Audit)</span>
                  </button>
                </div>
              </div>

            </div>
          ) : (
            /* NON-ADMIN: EXISTING TAILORED DASHBOARD WITH 4-STAGE FUNNEL & LEADS TABLE */
            <>
            {/* Top Hero Overview Banner (Tailored to Role) */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-card p-6 sm:p-7 relative overflow-hidden">
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
              
              {/* Title & Role badge */}
              <div>
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    Chào mừng {currentGreeting.title}
                  </h1>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${roleInfo.badgeClass}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse"></span>
                    {roleInfo.nameVi}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 max-w-xl leading-relaxed">
                  {currentGreeting.subtitle}
                </p>
                {overview && (
                  <p className="mt-1 font-mono text-[10px] text-slate-400">Đồng bộ lúc: {formatDateTime(overview.generatedAt)}</p>
                )}
              </div>

              {/* Top KPIs */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 sm:p-4 min-w-[120px]">
                  <div className="text-[11px] font-mono text-slate-400 uppercase font-semibold">TỔNG LEADS</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="w-2 h-2 rounded-full bg-brand-500"></span>
                    <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900">{isLoading ? '…' : kpis?.totalLeads ?? 0}</span>
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 sm:p-4 min-w-[120px]">
                  <div className="text-[11px] font-mono text-slate-400 uppercase font-semibold">ĐANG THẨM ĐỊNH</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900">{isLoading ? '…' : kpis?.activeLeads ?? 0}</span>
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 sm:p-4 min-w-[150px]">
                  <div className="text-[11px] font-mono text-slate-400 uppercase font-semibold">DỰ TOÁN NGÂN SÁCH</div>
                  <div className="flex items-center gap-1.5 mt-1 text-brand-700 font-bold font-mono text-sm sm:text-base">
                    <DollarSign className="w-4 h-4 text-brand-500 shrink-0" />
                    <span>{isLoading ? '…' : formatCurrencies(kpis?.estimatedValueByCurrency ?? [])}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Filter Search Row */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex-1 min-w-[240px] max-w-xl relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm kiếm dự án theo tên thầu, khách hàng hoặc trạng thái..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl text-xs font-mono bg-slate-50 border border-slate-200 focus:outline-none focus:border-brand-500 focus:bg-white text-slate-800 placeholder:text-slate-400"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={reload}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Tải lại</span>
                </button>
              </div>
            </div>

          </div>

          {/* 4-STAGE EXECUTIVE CONVERSION FUNNEL (Replacing bulky 9-box grid) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Phễu Chuyển Đổi Vòng Đời Thầu (Conversion Funnel)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-emerald-50 text-brand-700 border border-brand-200">
                  4 Giai Đoạn Chuẩn
                </span>
              </div>
              <button
                onClick={() => onNavigatePipelines?.()}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>Pipeline Phê Duyệt Presale Lead &rarr;</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Stage 1: Intake */}
              <div 
                onClick={() => onNavigateLeads?.()}
                className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-emerald-300 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    STAGE 1 · TIẾP NHẬN
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-700">NEW &amp; INTAKE</span>
                </div>
                <div className="text-2xl font-bold font-mono text-slate-900">
                  {pipeline.filter(s => ['NEW', 'INBOUND_EMAIL'].includes(s.status)).reduce((acc, curr) => acc + curr.count, 0)} Lead
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Yêu cầu RFP thô từ khách hàng đang chờ phân tích
                </div>
              </div>

              {/* Stage 2: Thẩm định & Thiết kế */}
              <div 
                onClick={() => onNavigateAIWorkspace?.()}
                className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-emerald-300 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    STAGE 2 · THẨM ĐỊNH &amp; THIẾT KẾ
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-700">QUALIFIED</span>
                </div>
                <div className="text-2xl font-bold font-mono text-amber-600">
                  {pipeline.filter(s => ['QUALIFYING', 'QUALIFIED', 'PROPOSAL_DRAFTING'].includes(s.status)).reduce((acc, curr) => acc + curr.count, 0)} Lead
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Chấm điểm BANT &amp; soạn thảo Proposal 10 Sheets
                </div>
              </div>

              {/* Stage 3: Phê duyệt & Portal */}
              <div 
                onClick={() => onNavigatePipelines?.()}
                className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-emerald-300 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    STAGE 3 · DUYỆT &amp; PORTAL
                  </span>
                  <span className="text-xs font-mono font-bold text-blue-700">IN REVIEW</span>
                </div>
                <div className="text-2xl font-bold font-mono text-blue-600">
                  {pipeline.filter(s => ['APPROVED', 'SENT_TO_CLIENT', 'IN_REVIEW'].includes(s.status)).reduce((acc, curr) => acc + curr.count, 0)} Lead
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Presale Lead ký duyệt &amp; cấp phép mở Client Portal
                </div>
              </div>

              {/* Stage 4: Chốt thầu */}
              <div 
                onClick={() => onNavigateLeads?.()}
                className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-emerald-300 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold text-brand-800 bg-emerald-50 px-2 py-0.5 rounded border border-brand-200">
                    STAGE 4 · CHỐT THẦU
                  </span>
                  <span className="text-xs font-mono font-bold text-brand-700">WON &amp; ACCEPTED</span>
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-600">
                  {pipeline.filter(s => ['WON', 'ACCEPTED'].includes(s.status)).reduce((acc, curr) => acc + curr.count, 0)} Won
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Khách hàng nghiệm thu &amp; ký kết hợp đồng
                </div>
              </div>
            </div>
          </div>

          {/* Split Content: Left (Real Active Leads Table) & Right (Role Context & Activity) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT COLUMN (8 cols): Real Active Leads Table */}
            <div className="lg:col-span-8 space-y-6">
              
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-card overflow-hidden">
                
                {/* Table Header Action */}
                <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-base font-bold text-slate-900">
                      Danh Sách Dự Án Đang Xử Lý (Active Deals)
                    </h3>
                    <span className="px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-slate-100 text-slate-700">
                      {visibleLeads.length} dự án
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onNavigateRfps?.()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white shadow-sm transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Khởi tạo Dự Án Mới</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-3 px-5">TÊN DỰ ÁN &amp; KHÁCH HÀNG</th>
                        <th className="py-3 px-4">TRẠNG THÁI</th>
                        <th className="py-3 px-4">ĐIỂM BANT</th>
                        <th className="py-3 px-5 text-right">CẬP NHẬT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {isLoading ? (
                        <tr><td className="py-8 px-5 text-center text-slate-400 font-mono" colSpan={4}>Đang tải danh sách dự án…</td></tr>
                      ) : visibleLeads.length === 0 ? (
                        <tr>
                          <td className="py-12 px-5 text-center" colSpan={4}>
                            <div className="max-w-md mx-auto space-y-3">
                              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-brand-200 text-brand-600 flex items-center justify-center mx-auto">
                                <FolderOpen className="w-6 h-6" />
                              </div>
                              <h4 className="text-sm font-bold text-slate-900">Không Gian Làm Việc Chưa Có Dự Án</h4>
                              <p className="text-xs text-slate-500 leading-relaxed font-sans">
                                Bạn đang ở trạng thái tài khoản mới hoặc chưa được phân bổ vào dự án nào. Hãy khởi tạo dự án đầu tiên để tự động trở thành Trưởng dự án (Leader) hoặc chờ đồng nghiệp mời vào dự án.
                              </p>
                              <button
                                onClick={() => onNavigateRfps?.()}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-sm transition-all cursor-pointer"
                              >
                                <Plus className="w-4 h-4" />
                                <span>Khởi Tạo Dự Án Đầu Tiên (New RFP)</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        visibleLeads.map((lead) => (
                          <tr
                            key={lead.id}
                            className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                            onClick={() => navigateTo('leads', { id: lead.id })}
                          >
                            <td className="py-4 px-5">
                              <div className="font-bold text-slate-900 text-xs sm:text-sm">{lead.title}</div>
                              <div className="text-[11px] font-mono text-slate-500 mt-0.5">{lead.clientName || 'Chưa gắn khách hàng'} · {lead.source}</div>
                            </td>
                            <td className="py-4 px-4 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-brand-500"></span>
                                {lead.status}
                              </span>
                            </td>
                            <td className="py-4 px-4 whitespace-nowrap font-mono">
                              {lead.bantScore ? (
                                <span className="px-2 py-0.5 rounded bg-emerald-50 text-brand-700 font-bold border border-brand-200">
                                  {lead.bantScore}/100
                                </span>
                              ) : '—'}
                            </td>
                            <td className="py-4 px-5 text-right whitespace-nowrap font-mono text-slate-500">{formatDateTime(lead.updatedAt)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN (4 cols): Role Context & Activity */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Role Context Action Card */}
              <div className="rounded-3xl border border-emerald-300 bg-gradient-to-br from-brand-900 via-brand-800 to-slate-900 text-white p-5 sm:p-6 shadow-card space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-300" />
                    <span className="text-xs font-bold font-mono text-emerald-300 uppercase">
                      {roleInfo.nameVi} Focus
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                    PBAC ROLE
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white">Trọng Tâm Tác Vụ Của Bạn</h4>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {roleInfo.description}
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => {
                      if (currentGreeting.onAction) currentGreeting.onAction();
                      else onNavigatePipelines?.();
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-400 hover:bg-emerald-300 text-slate-950 transition-all shadow-md cursor-pointer"
                  >
                    <span>{currentGreeting.actionText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Entity activity */}
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-card p-5 sm:p-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 font-mono">
                    Nhật ký cập nhật thầu
                  </h3>
                  <button
                    onClick={() => onNavigateAudit?.()}
                    className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Audit trail</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-slate-500">
                  Trạng thái thay đổi gần nhất của các Deal &amp; Proposal.
                </p>
                <div className="mt-4 space-y-3">
                  {activity.length === 0 ? (
                    <p className="text-xs text-slate-400 font-mono">Chưa có thay đổi gần đây.</p>
                  ) : (
                    activity.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => navigateTo(item.type.startsWith('LEAD') ? 'leads' : 'proposals', { id: item.entityId })}
                        className="w-full p-3 rounded-xl bg-slate-50/70 border border-slate-200/70 hover:bg-slate-50 text-left transition-all"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-mono font-bold text-brand-700">{item.type}</span>
                          <span className="text-[10px] font-mono text-slate-400">{formatDateTime(item.occurredAt)}</span>
                        </div>
                        <div className="text-xs font-bold text-slate-900">{item.title}</div>
                        <div className="text-[10px] font-mono text-slate-500">{item.status}</div>
                      </button>
                    ))
                  )}
                </div>
              </div>

            </div>

          </div>
          </>
          )}

        </div>

      </div>

    </div>
  );
};
