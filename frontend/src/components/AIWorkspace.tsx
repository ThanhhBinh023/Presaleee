import React, { useState, useEffect } from 'react';
import type { LeadItem } from '../services/leadService';
import { fetchLeads } from '../services/leadService';
import { 
  LayoutGrid, 
  FileText, 
  Sparkles, 
  BookOpen, 
  Search, 
  Bell, 
  History, 
  Send, 
  CheckCircle2, 
  ShieldCheck, 
  Zap, 
  LogOut, 
  Settings, 
  Cpu, 
  ArrowRight,
  Eye,
  Copy,
  AlertTriangle,
  HelpCircle
} from 'lucide-react';
import { ClientPortalModal } from './ClientPortalModal';
import { DiscoveryMeetingsTab } from './DiscoveryMeetingsTab';
import { ProposalStudioTab } from './ProposalStudioTab';
import { useToast } from './common/Toast';

interface AIWorkspaceProps {
  onNavigateOverview: () => void;
  onLogout: () => void;
  onNavigateRfps?: () => void;
  onNavigateVault?: () => void;
}

export const AIWorkspace: React.FC<AIWorkspaceProps> = ({ 
  onNavigateOverview, 
  onLogout,
  onNavigateRfps,
  onNavigateVault
}) => {
  const toast = useToast();
  // Multi-project support (Requirement 3)
  const [projects, setProjects] = useState<LeadItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  useEffect(() => {
    async function loadProjects() {
      try {
        const list = await fetchLeads();
        setProjects(list);
        const savedLeadId = localStorage.getItem('presaleee_active_lead_id');
        if (savedLeadId && list.some(p => p.id === savedLeadId)) {
          setSelectedProjectId(savedLeadId);
        } else if (list.length > 0) {
          setSelectedProjectId(list[0].id);
        }
      } catch (err) {
        console.error('Failed to load projects:', err);
      }
    }
    loadProjects();
  }, []);

  const selectedProject = projects.find(p => p.id === selectedProjectId) || projects[0] || null;

  const [activeSubnav, setActiveSubnav] = useState('Proposal Builder v2.4');

  const {
    members: workspaceMembers,
    meta: workspaceMeta,
    isLoading: isLoadingMembers,
    error: membersError
  } = useMemberDirectory({ limit: 5 });
  const visibleMembers = workspaceMembers.slice(0, 4);
  const hiddenMemberCount = Math.max(0, (workspaceMeta?.total ?? workspaceMembers.length) - visibleMembers.length);

  // Client Portal preview modal
  const [portalModalOpen, setPortalModalOpen] = useState(false);


  // Email copy state
  const [emailCopied, setEmailCopied] = useState(false);

  // UI Design Brief generated

  return (
    <div className="min-h-screen bg-[#f8fafc] flex text-slate-900 font-sans">
      
      {/* Client Portal Modal */}
      <ClientPortalModal 
        isOpen={portalModalOpen} 
        onClose={() => setPortalModalOpen(false)} 
      />

      {/* 1. LEFT SIDEBAR */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 hidden md:flex">
        
        <div>
          {/* Logo & Workspace Dropdown */}
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
            <button
              onClick={onNavigateOverview}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all"
            >
              <LayoutGrid className="w-4 h-4 text-slate-400" />
              <span>Overview</span>
            </button>

            <button 
              onClick={() => {
                if (onNavigateRfps) onNavigateRfps();
                else setActiveSubnav('Intake & Scope');
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all"
            >
              <FileText className="w-4 h-4 text-slate-400" />
              <span>RFPs &amp; Specs</span>
            </button>

            {/* Active AI Workspace */}
            <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold bg-brand-500 text-white shadow-sm shadow-brand-500/30 transition-all">
              <div className="flex items-center gap-3">
                <Sparkles className="w-4 h-4 text-white" />
                <span>AI Workspace</span>
              </div>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-brand-600 text-white">
                Active
              </span>
            </button>

            <button 
              onClick={() => {
                if (onNavigateVault) onNavigateVault();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all"
            >
              <BookOpen className="w-4 h-4 text-slate-400" />
              <span>Knowledge Vault</span>
            </button>

            <button
              onClick={() => navigateTo('leads')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all"
            >
              <FileText className="w-4 h-4 text-slate-400" />
              <span>Leads</span>
            </button>
            <button
              onClick={() => navigateTo('rate-cards')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all"
            >
              <CreditCard className="w-4 h-4 text-slate-400" />
              <span>Rate cards</span>
            </button>
          </nav>
        </div>

        {/* User Card at bottom of sidebar */}
        <div className="p-3 border-t border-slate-100 space-y-2">
          <button className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-50">
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
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
            <button 
              onClick={onNavigateOverview}
              className="text-slate-500 hover:text-slate-800 hover:underline"
            >
              Workspace
            </button>
            <span className="text-slate-300">/</span>
            <span className="text-slate-500">Presaleee Workspace</span>
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-brand-700">Active Context</span>
          </div>

          {/* Quick search & Action */}
          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search RFPs, tags, assets..."
                className="w-full pl-8 pr-10 py-1.5 rounded-lg text-xs font-mono bg-slate-50 border border-slate-200 focus:outline-none focus:border-brand-500 focus:bg-white text-slate-800 placeholder:text-slate-400"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 border border-slate-200 bg-white px-1.5 py-0.5 rounded">
                ⌘K
              </span>
            </div>

            <button className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 relative">
              <Bell className="w-4 h-4" />
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 absolute top-1.5 right-1.5"></span>
            </button>

            <button 
              onClick={() => setPortalModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-xs"
            >
              <Eye className="w-3.5 h-3.5 text-brand-400" />
              <span>Preview Client Portal</span>
            </button>
          </div>

        </header>

        {/* Lead Title & Metrics Bar */}
        <div className="bg-white border-b border-slate-200 px-6 sm:px-8 py-6">
          
          <div className="max-w-7xl mx-auto space-y-4">
            
            {/* Top Row: Path & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-slate-400">Workspace / Presaleee Workspace /</span>
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  Project Apollo (FinTech Core)
                  <span className="w-2 h-2 rounded-full bg-brand-500"></span>
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* Avatar Stack — thành viên thật của tổ chức */}
                <button
                  onClick={() => navigateTo('members')}
                  title="Member list"
                  className="flex items-center -space-x-1.5"
                >
                  {visibleMembers.map((member, index) => (
                    <span
                      key={member.id}
                      className={`w-6 h-6 rounded-full border-2 border-white text-[10px] flex items-center justify-center font-bold ${
                        index % 2 === 0 ? 'bg-slate-300 text-slate-700' : 'bg-slate-400 text-white'
                      }`}
                    >
                      {initialsOf(member.fullName)}
                    </span>
                  ))}
                  {hiddenMemberCount > 0 && (
                    <span className="w-6 h-6 rounded-full bg-brand-100 border-2 border-white text-[10px] flex items-center justify-center font-bold text-brand-800">
                      +{hiddenMemberCount}
                    </span>
                  )}
                  {isLoadingMembers && <span className="text-[10px] font-mono text-slate-400 pr-1.5">loading…</span>}
                  {!isLoadingMembers && membersError && <span className="text-[10px] font-mono text-rose-500 pr-1.5">error</span>}
                </button>

                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-mono font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                  <History className="w-3.5 h-3.5 text-slate-400" />
                  <span>Version Log</span>
                </button>

                <button 
                  onClick={() => toast.info('Proposal submitted for Internal Review (Draft -> In Review)', 'Trình duyệt Proposal')}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-sm transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit for Review</span>
                </button>
              </div>
            </div>

            {/* Status Pills */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-brand-700 border border-brand-200 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500"></span>
                STAGE: PROPOSAL BUILDER
              </span>

              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-brand-700 border border-brand-200">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500"></span>
                Qualification Score: <strong>{selectedProject?.extracted_metadata?.qualification?.qualification_score || 88}/100</strong>
              </span>

              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Est. Value: <strong>{selectedProject?.extracted_metadata?.budgetUsd ? `$${selectedProject.extracted_metadata.budgetUsd.toLocaleString()} USD` : '$150,000 USD'}</strong>
              </span>

              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Target Timeline: <strong>{selectedProject?.extracted_metadata?.timelineWeeks ? `${selectedProject.extracted_metadata.timelineWeeks} Weeks` : '20 Weeks'}</strong>
              </span>
            </div>

            {/* Title & SOW Completeness */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pt-1">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {selectedProject?.title || 'Dự án AI Presale Workspace'}
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-3xl leading-relaxed">
                  {selectedProject?.raw_rfp_content || selectedProject?.extracted_metadata?.businessGoal || 'Chọn hoặc nhập yêu cầu RFP tại khối AI Intake để phân tích dự án.'}
                </p>
              </div>

              {/* KPI Badges */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border-4 border-brand-500 flex items-center justify-center font-mono font-bold text-xs text-brand-700">
                    85%
                  </div>
                  <div className="text-xs">
                    <div className="font-bold text-slate-800">SOW Completeness</div>
                    <div className="text-[11px] text-slate-400 font-mono">6/7 Sections Approved</div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3">
                  <ShieldCheck className="w-6 h-6 text-brand-600 shrink-0" />
                  <div className="text-xs">
                    <div className="font-bold text-slate-800">SOC-2 Type II</div>
                    <div className="text-[11px] text-slate-400 font-mono">Full Regulatory Parity</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Secondary Navigation Tabs matching PDF lifecycle */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 overflow-x-auto text-xs font-medium">
              {[
                { name: 'Intake & Scope' },
                { name: 'Discovery Meetings', count: '3' },
                { name: 'Technical Sessions' },
                { name: 'Proposal Builder v2.4', icon: FileText },
                { name: 'Client Intelligence' },
              ].map((tab, idx) => {
                const isTabActive = activeSubnav === tab.name;
                const Icon = tab.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => setActiveSubnav(tab.name)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                      isTabActive
                        ? 'bg-slate-900 text-white font-semibold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {Icon && <Icon className="w-3.5 h-3.5 text-brand-400" />}
                    <span>{tab.name}</span>
                    {tab.count && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-bold">
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

          </div>

        </div>

        {/* 3. DYNAMIC CONTENT AREA BASED ON LIFECYCLE TAB */}
        <div className="p-6 sm:p-8 max-w-7xl mx-auto w-full">
          
          {/* TAB 1: INTAKE & SCOPE */}
          {activeSubnav === 'Intake & Scope' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      Lead Intake Extract &amp; Qualification Assessment
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Dữ liệu từ AI Intake và kết quả chạy Qualification Engine cho {selectedProject?.title || 'dự án'}.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-50 text-brand-700 border border-brand-200">
                    Lead Status: {selectedProject?.status || 'Approved'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left: Raw Intake */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 font-mono">
                      Raw Client Intake Extract
                    </h3>
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 font-mono text-xs text-slate-700 leading-relaxed italic max-h-48 overflow-y-auto whitespace-pre-wrap">
                      "{selectedProject?.raw_rfp_content || 'We need to migrate our legacy payment ledger to an event-driven architecture running on Kubernetes with sub-50ms transaction finality and SOC2 compliance.'}"
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-slate-400 text-[10px] block">CLIENT TIER / DOMAIN</span>
                        <span className="font-bold text-slate-800">
                          {selectedProject?.extracted_metadata?.clientIndustry || 'Enterprise Core'}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-slate-400 text-[10px] block">EST. VALUE</span>
                        <span className="font-bold text-brand-700">
                          ${(selectedProject?.extracted_metadata?.budgetUsd || 1200000).toLocaleString()} ARR
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-slate-400 text-[10px] block">TARGET SLA</span>
                        <span className="font-bold text-slate-800">
                          {selectedProject?.extracted_metadata?.target_sla || '< 50ms Latency'}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-slate-400 text-[10px] block">PEAK WORKLOAD</span>
                        <span className="font-bold text-brand-700">
                          {selectedProject?.extracted_metadata?.peak_workload || '40,000+ TPS'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Qualification Engine */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 font-mono">
                      Qualification Engine Assessment
                    </h3>
                    <div className="p-4 rounded-2xl bg-emerald-50/70 border border-brand-200 space-y-2.5">
                      <div className="flex justify-between items-center text-xs font-mono">
                        <span className="font-bold text-brand-900">
                          Score: {selectedProject?.extracted_metadata?.qualification?.qualification_score || 94} / 100
                        </span>
                        <span className="text-brand-700">
                          {selectedProject?.extracted_metadata?.qualification?.readiness_level || 'Readiness: High'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {selectedProject?.extracted_metadata?.qualification?.project_brief ||
                          'Đội ngũ đã phê duyệt tiếp nhận (Approve). Rủi ro chính là thống nhất lộ trình kiểm thử Dual-Write trong 6 tháng đầu.'}
                      </p>
                    </div>

                    <button
                      onClick={() => setActiveSubnav('Discovery Meetings')}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs cursor-pointer"
                    >
                      <span>Proceed to Discovery Meetings</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DISCOVERY MEETINGS (PDF Page 2) */}
          {activeSubnav === 'Discovery Meetings' && (
            <DiscoveryMeetingsTab />
          )}

          {activeSubnav === 'Technical Sessions' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-6">
                
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      Technical Deep Dive &amp; Technical Summary
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      AI tổng hợp toàn bộ các session kỹ thuật thành một Technical Summary trực tiếp cấp dữ liệu cho Proposal Builder.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setActiveSubnav('Proposal Builder v2.4');
                      toast.success('Technical Summary synced directly to Proposal Builder!', 'Đồng bộ Discovery');
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-xs"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Sync to Proposal Builder →</span>
                  </button>
                </div>

                {/* 6 Sections of Technical Summary from PDF Page 3 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-mono">
                  
                  {/* 1. Architecture Overview */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="font-bold text-brand-700 uppercase flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5" />
                      <span>Architecture Overview</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      Hệ thống Microservices hướng sự kiện (Event-driven) trên nền Kubernetes, kết nối qua Apache Kafka bus và bộ nhớ đệm đa tầng Redis.
                    </p>
                  </div>

                  {/* 2. Technical Decisions */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="font-bold text-brand-700 uppercase flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Technical Decisions</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      Sử dụng Debezium CDC cho luồng ghi song song; xác thực TLS 1.3 mTLS cho toàn bộ ingress payload; mã hoá hardware-accelerated.
                    </p>
                  </div>

                  {/* 3. Constraints */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="font-bold text-rose-700 uppercase flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Hard Constraints</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      Cơ sở dữ liệu cũ bắt buộc chạy song song không gián đoạn trong Phase 1; RTO &lt; 3s; RPO = 0 tuyệt đối.
                    </p>
                  </div>

                  {/* 4. Assumptions */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="font-bold text-slate-700 uppercase flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>Assumptions</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      Khách hàng cung cấp sẵn kết nối DirectConnect tới hạ tầng Cloud; team nội bộ có 2 DBA hỗ trợ cutover ca đêm.
                    </p>
                  </div>

                  {/* 5. Risks */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="font-bold text-amber-700 uppercase flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Risks</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      Khả năng phát sinh trễ khi phân đoạn bảng 4.2M tài khoản; giải pháp giảm thiểu: chạy benchmark thử nghiệm tại Sprint 1.
                    </p>
                  </div>

                  {/* 6. Outstanding Questions */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="font-bold text-brand-700 uppercase flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>Outstanding Questions</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      Xác nhận lần cuối về chính sách lưu trữ log kiểm toán 7 năm của SOC-2 trên S3 Object Lock.
                    </p>
                  </div>

                </div>

              </div>
            </div>
          )}

          {/* TAB 4: PROPOSAL BUILDER V2.4 (Real Database & AI Synthesis) */}
          {activeSubnav === 'Proposal Builder v2.4' && (
            <ProposalStudioTab 
              leadId={selectedProjectId} 
              activeProject={selectedProject} 
            />
          )}

          {/* TAB 5: CLIENT INTELLIGENCE (PDF Page 6 & 7) */}
          {activeSubnav === 'Client Intelligence' && (
            <div className="space-y-6">
              
              <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-6">
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      Client Engagement Tracking &amp; Lead Intelligence
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Theo dõi hành vi tương tác trên Client Portal (Signals) và tự động tính toán Next Best Action.
                    </p>
                  </div>

                  <button
                    onClick={() => setPortalModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Open Client Portal Preview</span>
                  </button>
                </div>

                {/* 4 Signals Cards from PDF Page 6 */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">PORTAL OPENED</span>
                    <div className="text-2xl font-bold font-mono text-slate-900 mt-1">14 Times</div>
                    <span className="text-[11px] text-brand-700 font-semibold">CTO &amp; VP active</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">SECTION 2.4 READ</span>
                    <div className="text-2xl font-bold font-mono text-slate-900 mt-1">8m 12s</div>
                    <span className="text-[11px] text-brand-700 font-semibold">High attention on SLA</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">AI QUERIES</span>
                    <div className="text-2xl font-bold font-mono text-slate-900 mt-1">2 Questions</div>
                    <span className="text-[11px] text-brand-700 font-semibold">Failover &amp; RPO check</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">LEAD HEALTH</span>
                    <div className="text-2xl font-bold font-mono text-brand-700 mt-1">96%</div>
                    <span className="text-[11px] text-emerald-700 font-semibold">Closing Probability: High</span>
                  </div>
                </div>

                {/* Next Best Action & Email Draft from PDF Page 7 */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
                  
                  {/* Left: Next Best Action & Discussion Topics (5 cols) */}
                  <div className="lg:col-span-5 space-y-4">
                    <div className="text-xs font-mono font-bold text-slate-800 uppercase flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-brand-600" />
                      <span>RECOMMENDED NEXT BEST ACTIONS:</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-50/70 border border-brand-200 space-y-2">
                      <div className="font-bold text-xs text-brand-900">
                        1. Gửi phụ lục cam kết SOC-2 Type II cho VP of InfoSec
                      </div>
                      <p className="text-[11px] text-slate-600 font-mono">
                        Dữ liệu cho thấy InfoSec đã đọc phần mTLS 3 lần trong 24 giờ qua.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="font-bold text-xs text-slate-900">
                        2. Lên lịch làm rõ cơ chế Dual-Write 15 phút với CTO
                      </div>
                      <p className="text-[11px] text-slate-600 font-mono">
                        Chủ đề thảo luận gợi ý: Xác định tiêu chí nghiệm thu hoàn tất Phase 1.
                      </p>
                    </div>
                  </div>

                  {/* Right: Suggested Follow-up Email Draft (7 cols) */}
                  <div className="lg:col-span-7 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-slate-800 uppercase">
                        SUGGESTED FOLLOW-UP EMAIL DRAFT (AI GENERATED):
                      </span>
                      <button
                        onClick={() => {
                          setEmailCopied(true);
                          setTimeout(() => setEmailCopied(false), 2000);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-mono text-brand-700 bg-emerald-50 px-2 py-0.5 rounded border border-brand-200 hover:bg-emerald-100"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{emailCopied ? 'Copied ✓' : 'Copy Email'}</span>
                      </button>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 font-mono text-xs text-slate-700 leading-relaxed space-y-2">
                      <div className="text-slate-400 text-[10px]">
                        TO: Evelyn Shaw (CTO) &lt;evelyn@fintechclient.org&gt;<br />
                        SUBJECT: Follow-up: Section 2.4 High-Availability &amp; SLA Commitment
                      </div>
                      <div className="border-t border-slate-200 pt-2 space-y-1.5">
                        <p>Hi Evelyn,</p>
                        <p>
                          Following up on your review of Section 2.4 in the Presaleee Client Portal, our architecture team has embedded our pre-audited Tier-4 Mission-Critical Clause to guarantee a 99.999% SLA threshold and sub-3s multi-region failover.
                        </p>
                        <p>
                          Would you have 15 minutes this Thursday afternoon to quickly align on the Phase 1 dual-write validation criteria so we can finalize the SOW for sign-off?
                        </p>
                        <p>Best regards,<br />Alex Vance — Lead Architect, Presaleee</p>
                      </div>
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
};
