import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useDashboardOverview } from '../hooks/useDashboard';
import { WorkspacePill } from './workspace/WorkspacePill';
import { UserCard } from './workspace/UserCard';
import { navigateTo } from '../navigation';
import { formatDateTime, formatMoney } from '../utils/format';
import type { CurrencyAmount } from '../types/dashboard';
import { 
  LayoutGrid, 
  FileText, 
  Sparkles, 
  Search, 
  Plus, 
  ArrowRight, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  Globe, 
  Zap, 
  ChevronRight,
  SlidersHorizontal
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
  onNavigatePortal
}) => {
  const { user } = useAuth();
  const [activeNav, setActiveNav] = useState('Overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [leadLimit, setLeadLimit] = useState(8);
  const { overview, activity, isLoading, error, reload } = useDashboardOverview(leadLimit);
  const kpis = overview?.kpis;
  const pipeline = overview?.pipeline ?? [];
  const visibleLeads = (overview?.activeLeads ?? []).filter((lead) => {
    const needle = searchTerm.trim().toLowerCase();
    if (!needle) return true;
    return `${lead.title} ${lead.clientName ?? ''} ${lead.status}`.toLowerCase().includes(needle);
  });

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

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {[
              { name: 'Overview', icon: LayoutGrid },
              { name: 'RFPs & Specs', icon: FileText },
              { name: 'AI Workspace', icon: Sparkles, badge: 'New' },
              { name: 'Leads', icon: Zap },
              { name: 'Client portal', icon: Globe },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.name;
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    if (item.name === 'AI Workspace' && onNavigateAIWorkspace) {
                      onNavigateAIWorkspace();
                    } else if (item.name === 'RFPs & Specs' && onNavigateRfps) {
                      onNavigateRfps();
                    } else if (item.name === 'Knowledge Vault' && onNavigateVault) {
                      onNavigateVault();;
                    } else if (item.name === 'Clients' && onNavigateClients) {
                      onNavigateClients();
                    } else if (item.name === 'Audit trail' && onNavigateAudit) {
                      onNavigateAudit();
                    } else if (item.name === 'Members' && onNavigateMembers) {
                      onNavigateMembers();
                    } else if (item.name === 'Leads' && onNavigateLeads) {
                      onNavigateLeads();
                    } else if (item.name === 'Rate cards' && onNavigateRateCards) {
                      onNavigateRateCards();
                    } else if (item.name === 'Meetings' && onNavigateMeetings) {
                      onNavigateMeetings();
                    } else if (item.name === 'Proposals' && onNavigateProposals) {
                      onNavigateProposals();
                    } else if (item.name === 'Client portal' && onNavigatePortal) {
                      onNavigatePortal();
                    } else {
                      setActiveNav(item.name);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-50/80 text-brand-700 font-semibold border border-brand-200/70 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-brand-600' : 'text-slate-400'}`} />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-brand-100 text-brand-800">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Real User Profile & Logout at Bottom of Sidebar */}
        <div className="p-3 border-t border-slate-100">
          <UserCard onLogout={onLogout} logoutTitle="Sign out to Home" />
        </div>

      </aside>

      {/* 2. MAIN WORKSPACE CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-4">
          
          {/* Breadcrumb with User Role */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-400">Workspace</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className="font-bold text-brand-700 bg-emerald-50 px-2 py-0.5 rounded border border-brand-200">
              {user?.role.replace(/_/g, ' ') || 'Workspace'}
            </span>
          </div>

          {/* Quick search & user actions */}
          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm dự án & RFPs..."
                className="w-full pl-8 pr-4 py-1.5 rounded-lg text-xs font-mono bg-slate-50 border border-slate-200 focus:outline-none focus:border-brand-500 focus:bg-white text-slate-800 placeholder:text-slate-400 transition-all"
              />
            </div>

            <button 
              onClick={onNavigateRfps}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm Yêu Cầu RFP</span>
            </button>

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
          
          {/* Top Hero Overview Banner */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-card p-6 sm:p-7 relative overflow-hidden">
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
              
              {/* Title & telemetry badge */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    Chào mừng, {user?.fullName || 'Presale Architect'}!
                  </h1>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-50 text-brand-700 border border-brand-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse"></span>
                    USER ACTIVE
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 max-w-xl">
                  Organization-scoped KPIs from GET /dashboard/overview. Currencies are never mixed. VIEWER can read this surface.
                </p>
                {overview && (
                  <p className="mt-1 font-mono text-[10px] text-slate-400">generated {formatDateTime(overview.generatedAt)}</p>
                )}
              </div>

              <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 sm:p-4 min-w-[130px]">
                  <div className="text-[11px] font-mono text-slate-400 uppercase font-semibold">TOTAL LEADS</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="w-2 h-2 rounded-full bg-brand-500"></span>
                    <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900">{isLoading ? '…' : kpis?.totalLeads ?? 0}</span>
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 sm:p-4 min-w-[130px]">
                  <div className="text-[11px] font-mono text-slate-400 uppercase font-semibold">ACTIVE LEADS</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="w-2 h-2 rounded-full bg-brand-500"></span>
                    <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900">{isLoading ? '…' : kpis?.activeLeads ?? 0}</span>
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 sm:p-4 min-w-[140px]">
                  <div className="text-[11px] font-mono text-slate-400 uppercase font-semibold">ESTIMATED VALUE</div>
                  <div className="flex items-center gap-1.5 mt-1 text-brand-700 font-bold font-mono text-sm sm:text-base">
                    <DollarSign className="w-4 h-4 text-brand-500 shrink-0" />
                    <span>{isLoading ? '…' : formatCurrencies(kpis?.estimatedValueByCurrency ?? [])}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Filter Search Row */}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[240px] relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter the active-lead panel by title, client, or status"
                  className="w-full pl-9 pr-4 py-2 rounded-xl text-xs font-mono bg-slate-50 border border-slate-200 focus:outline-none focus:border-brand-500 focus:bg-white text-slate-800 placeholder:text-slate-400"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-white border border-slate-200 text-slate-700">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                  leadLimit
                  <select
                    value={leadLimit}
                    onChange={(e) => setLeadLimit(Number(e.target.value))}
                    className="bg-transparent font-mono"
                  >
                    {[8, 20, 50].map((value) => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <button onClick={reload} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50">
                  Reload
                </button>
              </div>
            </div>

          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Presale pipeline
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-emerald-50 text-brand-700 border border-brand-200">
                  9 lead statuses
                </span>
              </div>
              <button
                onClick={() => onNavigateLeads?.()}
                className="text-xs font-semibold text-slate-500 hover:text-brand-600 transition-colors flex items-center gap-1"
              >
                <span>Open leads</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-9 gap-3.5">
              {pipeline.map((stage) => (
                <button
                  key={stage.status}
                  type="button"
                  onClick={() => onNavigateLeads?.()}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 text-left hover:border-brand-300 hover:shadow-sm transition-all"
                >
                  <div className="text-[10px] font-mono font-bold text-slate-400 truncate">{stage.status}</div>
                  <div className="mt-1 text-2xl font-bold font-mono text-slate-900">{stage.count}</div>
                  <div className="mt-0.5 text-[10px] font-mono text-slate-500">{formatCurrencies(stage.estimatedValueByCurrency)}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Split Content: Left (Real Active Leads Table) & Right (Copilot & Capabilities) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT COLUMN (8 cols): Real Active Leads Table */}
            <div className="lg:col-span-8 space-y-6">
              
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-card overflow-hidden">
                
                {/* Table Header Action */}
                <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-base font-bold text-slate-900">
                      Active leads
                    </h3>
                    <span className="px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-slate-100 text-slate-700">
                      {overview?.activeLeads.length ?? 0} of leadLimit {leadLimit}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onNavigateRfps?.()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white shadow-sm transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>New RFP</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-3 px-5">LEAD &amp; CLIENT</th>
                        <th className="py-3 px-4">STATUS</th>
                        <th className="py-3 px-4">BANT</th>
                        <th className="py-3 px-5 text-right">UPDATED</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {isLoading ? (
                        <tr><td className="py-6 px-5 text-slate-400" colSpan={4}>Loading dashboard…</td></tr>
                      ) : visibleLeads.length === 0 ? (
                        <tr><td className="py-6 px-5 text-slate-400" colSpan={4}>No active leads in this panel.</td></tr>
                      ) : (
                        visibleLeads.map((lead) => (
                          <tr
                            key={lead.id}
                            className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                            onClick={() => navigateTo('leads', { id: lead.id })}
                          >
                            <td className="py-4 px-5">
                              <div className="font-bold text-slate-900 text-xs sm:text-sm">{lead.title}</div>
                              <div className="text-[11px] font-mono text-slate-500 mt-0.5">{lead.clientName || 'No client'} · {lead.source}</div>
                            </td>
                            <td className="py-4 px-4 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-brand-500"></span>
                                {lead.status}
                              </span>
                            </td>
                            <td className="py-4 px-4 whitespace-nowrap font-mono">{lead.bantScore ?? '—'}</td>
                            <td className="py-4 px-5 text-right whitespace-nowrap font-mono text-slate-500">{formatDateTime(lead.updatedAt)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-brand-200 flex items-center justify-center text-brand-600 shrink-0">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xl font-bold font-mono text-slate-900">{kpis?.qualifiedLeads ?? 0} qualified</div>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                      QUALIFIED + PROPOSAL_DRAFTING + APPROVED.
                    </p>
                  </div>
                </div>
                <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-brand-200 flex items-center justify-center text-brand-600 shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xl font-bold font-mono text-slate-900">{kpis?.proposalsInProgress ?? 0} in progress</div>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                      Proposals in DRAFT or IN_REVIEW.
                    </p>
                  </div>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN (4 cols): Copilot Recommendation & Features */}
            <div className="lg:col-span-4 space-y-6">
              
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-card p-5 sm:p-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 font-mono">
                    Entity activity
                  </h3>
                  <button
                    onClick={() => onNavigateAudit?.()}
                    className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                  >
                    <span>Audit trail</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                <p className="mt-2 text-[10px] text-slate-400">
                  Synthesized from lead/proposal timestamps, not audit_logs. At most two rows per entity.
                </p>
                <div className="mt-4 space-y-3">
                  {activity.length === 0 ? (
                    <p className="text-xs text-slate-400">No recent entity timestamps.</p>
                  ) : (
                    activity.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => navigateTo(item.type.startsWith('LEAD') ? 'leads' : 'proposals', { id: item.entityId })}
                        className="w-full p-3 rounded-xl bg-slate-50/70 border border-slate-200/70 hover:bg-slate-50 text-left"
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

              <div className="rounded-3xl border border-brand-200 bg-gradient-to-b from-emerald-50/90 via-white to-slate-50 p-5 shadow-card">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-brand-600" />
                  <span className="text-xs font-bold text-slate-900 font-mono">How this differs from audit</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  Sheet writes, portal sessions, pricing apply and deletes do not appear here. ADMIN / PRESALE_LEAD can open the immutable audit trail.
                </p>
                <button
                  onClick={() => onNavigateAudit?.()}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Open audit trail
                </button>
              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
