import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { WorkspacePill } from './workspace/WorkspacePill';
import { UserCard } from './workspace/UserCard';
import { 
  LayoutGrid, 
  FileText, 
  Sparkles, 
  BookOpen, 
  Search, 
  Plus, 
  CheckCircle2, 
  DollarSign, 
  TrendingUp, 
  ShieldCheck, 
  Bot, 
  Zap, 
  ArrowUpRight, 
  ChevronRight,
  Users
} from 'lucide-react';

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
  const [dashboardData, setDashboardData] = useState<DashboardOverviewData | null>(null);
  const [leadsList, setLeadsList] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [recommendationDismissed, setRecommendationDismissed] = useState(false);
  const [synthesized, setSynthesized] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [overview, leads] = await Promise.all([
          fetchDashboardOverview(),
          fetchLeads()
        ]);
        setDashboardData(overview);
        setLeadsList(leads);
      } catch (err) {
        console.error('Error loading overview data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Format total pipeline value from dashboard data or lead calculations
  const totalPipelineAmount = dashboardData?.kpis?.estimatedValueByCurrency?.reduce((acc, curr) => acc + curr.amount, 0) || 0;
  const formattedPipelineValue = totalPipelineAmount > 0 
    ? `$${(totalPipelineAmount / 1000).toFixed(1)}K` 
    : '$0';

  const activeDealsCount = dashboardData?.kpis?.activeLeads ?? leadsList.length;
  const qualifiedDealsCount = dashboardData?.kpis?.qualifiedLeads ?? leadsList.filter(l => l.status === 'QUALIFIED').length;

  // Pipeline stages mapped to real data
  const pipelineStages = [
    {
      name: 'NEW INQUIRY',
      count: leadsList.filter(l => l.status === 'NEW').length,
      desc: 'Raw RFPs pending qualification',
      color: 'bg-blue-50 text-blue-700 border-blue-200'
    },
    {
      name: 'QUALIFIED (BANT)',
      count: qualifiedDealsCount,
      desc: 'High-fit budget & timeline verified',
      color: 'bg-emerald-50 text-brand-700 border-brand-200'
    },
    {
      name: 'DISCOVERY SESSIONS',
      count: leadsList.filter(l => l.status === 'IN_REVIEW' || l.status === 'DISCOVERY').length,
      desc: 'Deep-dive interviews & transcripts',
      color: 'bg-amber-50 text-amber-700 border-amber-200'
    },
    {
      name: 'PROPOSAL STUDIO',
      count: dashboardData?.kpis?.proposalsInProgress ?? (leadsList.length > 0 ? 1 : 0),
      desc: '10 Sheets SOW & commercial pricing',
      color: 'bg-indigo-50 text-indigo-700 border-indigo-200'
    }
  ];

  // Filter leads by search term
  const filteredLeads = leadsList.filter(lead => 
    lead.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (lead.source && lead.source.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
              { name: 'Leads', icon: Zap },
              { name: 'Meetings', icon: Calendar },
              { name: 'Proposals', icon: FileText },
              { name: 'Client portal', icon: Globe },
              { name: 'Rate cards', icon: CreditCard },
              { name: 'AI Workspace', icon: Sparkles, badge: 'New' },
              { name: 'Knowledge Vault', icon: BookOpen },
              { name: 'Clients', icon: Building2 },
              { name: 'Audit trail', icon: ShieldCheck },
              { name: 'Members', icon: Users },
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
                  Theo dõi tiến độ thẩm định BANT, phiên họp Discovery và tổng hợp hồ sơ đề xuất Proposal của tổ chức bạn.
                </p>
              </div>

              {/* 3 Quick Stat Cards (Real Data) */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
                
                {/* ACTIVE DEALS */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 sm:p-4 min-w-[130px]">
                  <div className="text-[11px] font-mono text-slate-400 uppercase font-semibold">
                    DỰ ÁN ĐANG XỬ LÝ
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="w-2 h-2 rounded-full bg-brand-500"></span>
                    <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900">
                      {loading ? '...' : activeDealsCount}
                    </span>
                  </div>
                </div>

                {/* PIPELINE VALUE */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 sm:p-4 min-w-[140px]">
                  <div className="text-[11px] font-mono text-slate-400 uppercase font-semibold">
                    ƯỚC TÍNH NGÂN SÁCH
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-brand-700 font-bold font-mono text-xl sm:text-2xl">
                    <DollarSign className="w-4 h-4 text-brand-500" />
                    <span>{loading ? '...' : formattedPipelineValue}</span>
                  </div>
                </div>

                {/* QUALIFIED RATIO */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 sm:p-4 min-w-[130px]">
                  <div className="text-[11px] font-mono text-slate-400 uppercase font-semibold">
                    ĐÃ THẨM ĐỊNH BANT
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-slate-900 font-bold font-mono text-xl sm:text-2xl">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>{loading ? '...' : qualifiedDealsCount} <span className="text-xs font-normal text-slate-500">deals</span></span>
                  </div>
                </div>

              </div>

            </div>

            {/* Quick action bar */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
              <div className="text-slate-500">
                Tài khoản: <strong className="text-slate-800">{user?.email}</strong> • Phân quyền: <span className="text-brand-700 font-bold">{user?.role}</span>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={onNavigateAIWorkspace}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                  <span>Mở AI Workspace</span>
                </button>
                <button 
                  onClick={onNavigateVault}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                  <span>Knowledge Vault</span>
                </button>
              </div>
            </div>

          </div>

          {/* Presale Pipeline Status (Real Stages) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Tiến Độ Pipeline Dự Án
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-emerald-50 text-brand-700 border border-brand-200">
                  {leadsList.length} Dự Án Hiện Hữu
                </span>
              </div>
            </div>

            {/* Stage Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {pipelineStages.map((stage, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 flex flex-col justify-between hover:border-brand-300 hover:shadow-sm transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-400 mb-1.5">
                      <span className="truncate">{stage.name}</span>
                      <span className="text-slate-700 font-bold px-2 py-0.5 bg-slate-100 rounded-md">
                        {stage.count} deals
                      </span>
                    </div>

                    <div className="text-2xl font-bold font-mono text-slate-900 mt-2">
                      {stage.count}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                      {stage.desc}
                    </p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-100">
                    <span className={`inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${stage.color}`}>
                      Stage {idx + 1}
                    </span>
                  </div>
                </div>
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
                      Dự Án Của Bạn (My Active Leads)
                    </h3>
                    <span className="px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-slate-100 text-slate-700">
                      {filteredLeads.length} Total
                    </span>
                  </div>

                  <button 
                    onClick={onNavigateRfps}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white shadow-sm transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm Yêu Cầu Mới</span>
                  </button>
                </div>

                {/* Table Content */}
                <div className="overflow-x-auto">
                  {filteredLeads.length === 0 ? (
                    <div className="p-10 text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                        <Briefcase className="w-6 h-6" />
                      </div>
                      <div className="text-sm font-bold text-slate-800">
                        Chưa có dự án nào trong tổ chức của bạn
                      </div>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Hãy bắt đầu bằng cách nhập yêu cầu RFP thô đầu tiên qua AI Intake để tạo Lead và thẩm định BANT tự động.
                      </p>
                      <button
                        onClick={onNavigateRfps}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white shadow-sm transition-all mt-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Chạy AI Intake Ngay</span>
                      </button>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                          <th className="py-3 px-5">TÊN DỰ ÁN &amp; NGUỒN</th>
                          <th className="py-3 px-4">TRẠNG THÁI</th>
                          <th className="py-3 px-4">ĐIỂM BANT</th>
                          <th className="py-3 px-5 text-right">HÀNH ĐỘNG</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredLeads.map((lead) => {
                          const bantScore = lead.extracted_metadata?.qualification?.qualification_score;
                          return (
                            <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                              {/* Lead Title & Source */}
                              <td className="py-4 px-5">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 text-xs sm:text-sm">
                                    {lead.title}
                                  </span>
                                  {lead.status === 'QUALIFIED' && (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                                  )}
                                </div>
                                <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                                  Nguồn: {lead.source || 'INBOUND_EMAIL'} • Tạo ngày: {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : 'Vừa xong'}
                                </div>
                              </td>

                              {/* Status Badge */}
                              <td className="py-4 px-4 whitespace-nowrap">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold border ${
                                  lead.status === 'QUALIFIED' 
                                    ? 'bg-emerald-50 text-brand-700 border-brand-200'
                                    : lead.status === 'NEW'
                                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                                      : 'bg-slate-100 text-slate-700 border-slate-200'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${lead.status === 'QUALIFIED' ? 'bg-brand-500' : 'bg-slate-400'}`}></span>
                                  {lead.status}
                                </span>
                              </td>

                              {/* BANT Score */}
                              <td className="py-4 px-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <span className="w-7 h-7 rounded-lg bg-emerald-50 border border-brand-200 text-brand-800 font-bold font-mono text-xs flex items-center justify-center">
                                    {bantScore ? `${bantScore}` : '—'}
                                  </span>
                                  <div className="text-[11px] font-mono">
                                    <span className="font-semibold text-brand-700 block">
                                      {bantScore && bantScore >= 80 ? 'High Fit' : bantScore ? 'Normal' : 'Pending'}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Action Button */}
                              <td className="py-4 px-5 text-right whitespace-nowrap">
                                <button 
                                  onClick={() => {
                                    localStorage.setItem('presaleee_active_lead_id', lead.id);
                                    if (onNavigateAIWorkspace) onNavigateAIWorkspace();
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-brand-700 hover:text-white bg-emerald-50 hover:bg-brand-500 border border-brand-200 hover:border-brand-500 transition-all"
                                >
                                  <span>Mở Workspace</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

              </div>

              {/* 2 Bottom Metric Quality Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-brand-200 flex items-center justify-center text-brand-600 shrink-0">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xl font-bold font-mono text-slate-900">
                      100% Real-Data Driven
                    </div>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                      Dữ liệu dự án, biên bản họp và đề xuất được đồng bộ trực tiếp từ Supabase và LLM Gateway.
                    </p>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-brand-200 flex items-center justify-center text-brand-600 shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xl font-bold font-mono text-slate-900">
                      Bảo Mật Multi-Tenant
                    </div>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                      Phân quyền RBAC nghiêm ngặt và cô lập dữ liệu theo tổ chức ({user?.organizationId ? 'Isolate Verified' : 'Standard'}).
                    </p>
                  </div>
                </div>

              </div>

            </div>

            {/* RIGHT COLUMN (4 cols): Copilot Recommendation & Features */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Quick AI Presale Assistant Card */}
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-card p-5 sm:p-6">
                
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-brand-600" />
                    <h3 className="text-sm font-bold text-slate-900 font-mono">
                      Quy Trình Presale
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-brand-700 border border-brand-200">
                    v2.4
                  </span>
                </div>

                <div className="mt-4 space-y-3.5 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                    <div className="font-bold text-slate-900 flex items-center gap-2 mb-1">
                      <span className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-[10px]">1</span>
                      <span>AI Intake & Thẩm Định</span>
                    </div>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Trích xuất tự động WBS, Platform, Ngân sách và chấm điểm BANT từ RFP thô.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                    <div className="font-bold text-slate-900 flex items-center gap-2 mb-1">
                      <span className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-[10px]">2</span>
                      <span>Discovery Meetings</span>
                    </div>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Tổng hợp biên bản cuộc họp từ transcript, phân tích lỗ hổng và gợi ý câu hỏi tiếp theo.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                    <div className="font-bold text-slate-900 flex items-center gap-2 mb-1">
                      <span className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-[10px]">3</span>
                      <span>Proposal Studio</span>
                    </div>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Tổng hợp 10 sheet tiêu chuẩn, tạo UI Design Brief cho Figma và xuất file Excel (.xlsx).
                    </p>
                  </div>
                </div>

              </div>

              {/* Copilot Recommendation Box */}
              {!recommendationDismissed && (
                <div className="rounded-3xl border border-brand-200 bg-gradient-to-b from-emerald-50/90 via-white to-slate-50 p-5 shadow-card relative">
                  
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-brand-600" />
                      <span className="text-xs font-bold text-slate-900 font-mono">
                        AI Copilot Gợi Ý
                      </span>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-brand-500 animate-ping"></span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    Tổ chức của bạn có <strong className="text-slate-800">{leadsList.length} dự án</strong> đang hoạt động. Bạn có muốn kích hoạt tổng hợp tự động các tài liệu kiến trúc cho dự án ưu tiên nhất?
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSynthesized(true);
                        if (leadsList.length > 0) {
                          localStorage.setItem('presaleee_active_lead_id', leadsList[0].id);
                        }
                        if (onNavigateAIWorkspace) onNavigateAIWorkspace();
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white shadow-sm transition-all"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>{synthesized ? 'Đang chuyển...' : 'Mở Workspace Dự Án'}</span>
                    </button>

                    <button
                      onClick={() => setRecommendationDismissed(true)}
                      className="px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
                    >
                      Bỏ qua
                    </button>
                  </div>

                </div>
              )}

            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
