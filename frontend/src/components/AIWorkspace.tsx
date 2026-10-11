import React, { useState } from 'react';
import { 
  LayoutGrid, 
  FileText, 
  Sparkles, 
  BookOpen, 
  CreditCard, 
  Search, 
  Bell, 
  Plus, 
  History, 
  Send, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Zap, 
  LogOut, 
  Paperclip, 
  Check, 
  Layers, 
  Settings, 
  Cpu, 
  Bot, 
  GitBranch, 
  ArrowRight,
  Eye,
  Copy,
  AlertTriangle,
  HelpCircle
} from 'lucide-react';
import { ClientPortalModal } from './ClientPortalModal';

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
  const [activeTab, setActiveTab] = useState<'Rich Text' | 'Markdown' | 'Diff View'>('Rich Text');
  const [activeSubnav, setActiveSubnav] = useState('Proposal Builder v2.4');
  const [suggestionInserted, setSuggestionInserted] = useState(false);
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [attached1, setAttached1] = useState(false);
  const [attached2, setAttached2] = useState(false);

  // Client Portal preview modal
  const [portalModalOpen, setPortalModalOpen] = useState(false);

  // Discovery Meeting state (PDF Page 2: Open -> Locked -> Inspect -> Reopen)
  const [meetingLifecycle, setMeetingLifecycle] = useState<'Locked' | 'Inspected' | 'Open'>('Inspected');
  const [selectedMeeting, setSelectedMeeting] = useState(2);

  // Email copy state
  const [emailCopied, setEmailCopied] = useState(false);

  // UI Design Brief generated
  const [briefGenerated, setBriefGenerated] = useState(false);

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

            {/* DEMO WORKSPACE Pill */}
            <button className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100/70 transition-colors">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
                <span className="text-xs font-mono font-bold text-slate-700">
                  DEMO WORKSPACE PRO
                </span>
              </div>
              <span className="text-slate-400 text-xs">⇕</span>
            </button>
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

            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all">
              <CreditCard className="w-4 h-4 text-slate-400" />
              <span>Plan &amp; Quota</span>
            </button>
          </nav>
        </div>

        {/* User Card at bottom of sidebar */}
        <div className="p-3 border-t border-slate-100 space-y-2">
          <button className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-50">
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>

          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0">
                AV
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-slate-800 truncate">Alex Vance</div>
                <div className="text-[11px] font-mono text-slate-400 truncate">Lead Architect</div>
              </div>
            </div>

            <button
              onClick={onLogout}
              title="Sign out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
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
                {/* Avatar Stack */}
                <div className="flex items-center -space-x-1.5">
                  <div className="w-6 h-6 rounded-full bg-slate-300 border-2 border-white text-[10px] flex items-center justify-center font-bold text-slate-700">ES</div>
                  <div className="w-6 h-6 rounded-full bg-slate-400 border-2 border-white text-[10px] flex items-center justify-center font-bold text-white">MV</div>
                  <div className="w-6 h-6 rounded-full bg-brand-100 border-2 border-white text-[10px] flex items-center justify-center font-bold text-brand-800">+3</div>
                </div>

                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-mono font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                  <History className="w-3.5 h-3.5 text-slate-400" />
                  <span>Version Log</span>
                </button>

                <button 
                  onClick={() => alert('Proposal submitted for Internal Review (Draft -> In Review)')}
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
                Qualification Score: <strong>94/100</strong>
              </span>

              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Est. Value: <strong>$1,200,000 ARR</strong>
              </span>

              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Target Timeline: <strong>Q3 2025 Go-Live</strong>
              </span>
            </div>

            {/* Title & SOW Completeness */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pt-1">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Project Apollo — FinTech Core Modernization
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-3xl leading-relaxed">
                  High-throughput distributed ledger migration, zero-downtime event streaming pipeline, and sovereign compliance envelope for 4.2M retail deposit accounts.
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
                      Dữ liệu từ AI Intake và kết quả chạy Qualification Engine cho Project Apollo.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-50 text-brand-700 border border-brand-200">
                    Lead Status: Approved
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left: Raw Intake */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 font-mono">
                      Raw Client Intake Extract
                    </h3>
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 font-mono text-xs text-slate-700 leading-relaxed italic">
                      "We need to migrate our legacy payment ledger to an event-driven architecture running on Kubernetes with sub-50ms transaction finality and SOC2 compliance."
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-slate-400 text-[10px] block">CLIENT TIER</span>
                        <span className="font-bold text-slate-800">Enterprise Core</span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-slate-400 text-[10px] block">EST. VALUE</span>
                        <span className="font-bold text-brand-700">$1.2M ARR</span>
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
                        <span className="font-bold text-brand-900">Score: 94 / 100</span>
                        <span className="text-brand-700">Readiness: High</span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        Đội ngũ đã phê duyệt tiếp nhận (Approve). Rủi ro chính là thống nhất lộ trình kiểm thử Dual-Write trong 6 tháng đầu.
                      </p>
                    </div>

                    <button
                      onClick={() => setActiveSubnav('Discovery Meetings')}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs"
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
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-6">
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      Discovery Meeting Management
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Lifecycle: Open → Locked → Inspect → Reopen. AI sử dụng toàn bộ lịch sử để các buổi tiếp theo đi sâu hơn.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-xs">
                      <Plus className="w-3.5 h-3.5" />
                      <span>New Discovery Meeting</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Left: Meeting list */}
                  <div className="lg:col-span-4 space-y-3">
                    <div className="text-[11px] font-mono font-bold text-slate-400 uppercase">
                      LỊCH SỬ CÁC BUỔI DISCOVERY:
                    </div>

                    {[
                      { id: 1, title: 'Meeting #1: Initial Business Scope', date: 'Sept 14', status: 'Locked' },
                      { id: 2, title: 'Meeting #2: Cloud Architecture & Compliance', date: 'Sept 19', status: 'Inspected' },
                      { id: 3, title: 'Meeting #3: Migration Risk & Dual-Write', date: 'Sept 24', status: 'Inspected' },
                    ].map((m) => (
                      <div
                        key={m.id}
                        onClick={() => setSelectedMeeting(m.id)}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                          selectedMeeting === m.id
                            ? 'bg-emerald-50/70 border-brand-300 shadow-xs'
                            : 'bg-slate-50/70 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-bold text-slate-900 font-mono mb-1">
                          <span>{m.title}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                          <span>{m.date}</span>
                          <span className="px-2 py-0.2 rounded bg-white border border-slate-200 text-brand-700 font-semibold">
                            {m.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Right: Selected Meeting Deep Dive & AI Inspect */}
                  <div className="lg:col-span-8 p-5 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-5">
                    
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 font-mono">
                          Meeting #{selectedMeeting} // Transcript &amp; Audio Inspect
                        </h3>
                        <span className="text-[11px] font-mono text-slate-500">
                          Recorded 48m 12s • CTO &amp; Lead Systems Architect
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-100 text-brand-800">
                          Lifecycle: {meetingLifecycle}
                        </span>
                      </div>
                    </div>

                    {/* Audio Transcript Snippet */}
                    <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
                      <div className="text-[11px] font-mono font-bold text-brand-700">
                        CTO [Prospect]:
                      </div>
                      <p className="text-xs sm:text-sm font-mono text-slate-700 italic">
                        "Our primary hurdle is zero-downtime database replication during peak retail traffic. Existing database must stay live during phase 1 dual-write validation."
                      </p>
                    </div>

                    {/* AI Inspected Output: Suggested Follow-up Questions & Discussion Topics */}
                    <div className="space-y-3">
                      <div className="text-xs font-bold text-brand-700 font-mono flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-brand-600" />
                        <span>AI INSPECT: SUGGESTED FOLLOW-UP QUESTIONS (DỰA TRÊN LỊCH SỬ DISCOVERY)</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                        <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                          <span className="font-bold text-slate-800 block">Q1. CDC Replication Strategy:</span>
                          <span className="text-slate-600">
                            Cần xác định băng thông dedicated VPC peering cho cụm Debezium CDC để tránh nghẽn mạch giờ cao điểm.
                          </span>
                        </div>

                        <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                          <span className="font-bold text-slate-800 block">Q2. InfoSec Tenancy Mandate:</span>
                          <span className="text-slate-600">
                            Hỏi thêm Security VP về yêu cầu phân vùng tenancy cô lập hoàn toàn hay chấp nhận logic namespace isolation.
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Meeting Lifecycle Controls */}
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-mono">Lifecycle Actions:</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setMeetingLifecycle('Open')}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 font-mono text-slate-700"
                        >
                          Reopen Meeting
                        </button>
                        <button
                          onClick={() => {
                            setMeetingLifecycle('Inspected');
                            alert('AI re-inspected discovery context and updated discussion topics');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-mono font-semibold"
                        >
                          Re-run AI Inspect
                        </button>
                      </div>
                    </div>

                  </div>

                </div>

              </div>
            </div>
          )}

          {/* TAB 3: TECHNICAL SESSIONS (PDF Page 3) */}
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
                      alert('Technical Summary synced directly to Proposal Builder!');
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

          {/* TAB 4: PROPOSAL BUILDER V2.4 (The 3-Column Studio + AI UI Design Brief) */}
          {activeSubnav === 'Proposal Builder v2.4' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* COLUMN A (3 cols): Document Outline & Session Stats */}
              <div className="lg:col-span-3 space-y-5">
                
                {/* Document Outline Card */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-brand-600" />
                      <h3 className="text-xs font-bold text-slate-900 font-mono uppercase">
                        Document Outline
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-brand-700 border border-brand-200">
                      85% Ready
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    
                    {/* Item 1 */}
                    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 text-slate-700">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-brand-600" />
                        <span>1. Executive Summary</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">3m</span>
                    </div>

                    {/* Item 2 (Active section) */}
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="flex items-center justify-between text-slate-900 font-semibold mb-1.5">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-brand-600" />
                          <span>2. Architecture &amp; Tech Mesh</span>
                        </div>
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-500"></span>
                      </div>

                      <div className="pl-5 space-y-1 text-[11px] font-mono">
                        <div className="text-slate-500 hover:text-slate-800 cursor-pointer py-0.5">
                          2.1 Legacy Decoupling
                        </div>
                        <div className="text-slate-500 hover:text-slate-800 cursor-pointer py-0.5">
                          2.2 Event Streaming Pipeline
                        </div>
                        <div className="text-brand-700 font-bold bg-emerald-100/70 px-1.5 py-0.5 rounded border border-brand-200">
                          2.4 High-Availability Mesh
                        </div>
                      </div>
                    </div>

                    {/* Item 3 */}
                    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 text-slate-700">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-brand-600" />
                        <span>3. Implementation Scope</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">12p</span>
                    </div>

                    {/* Item 4 */}
                    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 text-slate-700">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>4. Effort &amp; Timeline</span>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-50 text-brand-700 font-semibold">
                        AI Drafted
                      </span>
                    </div>

                    {/* Item 5 */}
                    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 text-slate-700">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                        <span>5. Commercial &amp; Ratecard</span>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-50 text-brand-700 font-semibold">
                        AI Drafted
                      </span>
                    </div>

                    {/* Item 6 */}
                    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 text-slate-700">
                      <div className="flex items-center gap-2">
                        <Cpu className="w-3.5 h-3.5 text-slate-400" />
                        <span>6. Interactive Prototype</span>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                        Live Sandbox
                      </span>
                    </div>

                  </div>

                  {/* Add SOW Clause Button */}
                  <button className="mt-4 w-full py-2 rounded-xl border border-dashed border-slate-300 hover:border-brand-400 text-xs font-semibold text-slate-600 hover:text-brand-600 flex items-center justify-center gap-1.5 transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add SOW Clause</span>
                  </button>

                </div>

                {/* AI UI Design Brief Card (PDF Page 5) */}
                <div className="bg-white rounded-2xl border border-brand-200 shadow-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold tracking-wider text-brand-700 uppercase flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-brand-600" />
                      AI UI DESIGN BRIEF
                    </span>
                    <span className="text-[10px] font-mono bg-emerald-100 text-brand-800 px-1.5 py-0.2 rounded">
                      PDF Page 5
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Tạo brief mô tả UI/UX dựa trên context dự án, đưa sang design tool để tạo prototype attach vào Proposal.
                  </p>

                  <button
                    onClick={() => {
                      setBriefGenerated(true);
                      alert('AI UI Design Brief Generated & attached to Proposal Prototype Section!');
                    }}
                    className="w-full py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-brand-700 border border-brand-200 text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Zap className="w-3 h-3 text-brand-600" />
                    <span>{briefGenerated ? 'UI Brief Generated ✓' : 'Generate UI Design Brief'}</span>
                  </button>
                </div>

                {/* Active Session Stats Card */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-4 space-y-3">
                  <div className="text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">
                    ACTIVE SESSION STATS
                  </div>

                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Last Saved:</span>
                      <span className="font-semibold text-slate-800">2 min ago (Sync OK)</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Target Read Time:</span>
                      <span className="font-semibold text-slate-800">18 mins</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Client Access:</span>
                      <span className="font-semibold text-brand-700">Protected NDA Token</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* COLUMN B (6 cols): Document Editor Canvas */}
              <div className="lg:col-span-6 space-y-5">
                
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-6 sm:p-7 space-y-6">
                  
                  {/* Editor Header: Section Pill & View Toggles */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        Section 2.4
                      </span>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-brand-700 border border-brand-200">
                        Drafting v2.4
                      </span>
                    </div>

                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-mono">
                      {(['Rich Text', 'Markdown', 'Diff View'] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setActiveTab(mode)}
                          className={`px-2.5 py-1 rounded-md transition-all ${
                            activeTab === mode
                              ? 'bg-white text-slate-900 font-bold shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Section Content */}
                  <div className="space-y-4">
                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                      Solution Architecture &amp; High-Availability Event Mesh
                    </h2>

                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                      The target runtime topology decouples core transaction ledger from legacy synchronous REST gateways. By establishing an <span className="font-mono px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-semibold text-brand-700">Apache Kafka</span> event spine backed by high-throughput clustering, ledger updates maintain an uncompromising sub-second settlement cadence while eliminating hard lockups across batch reconciliation intervals.
                    </p>

                    <h3 className="text-base font-bold text-slate-900 pt-2 font-mono">
                      2.4.1 Zero-Trust Ledger Replication Strategy
                    </h3>

                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                      All transactional payloads pass through hardware-accelerated payload signing modules. Synchronous ingress traffic triggers distributed consensus validations before persisting state entries to regional Aurora PostgreSQL active-active clusters.
                    </p>

                    {/* Inserted Copilot Suggestion Clause if active */}
                    {suggestionInserted && (
                      <div className="p-3.5 rounded-xl bg-emerald-50 border border-brand-300 font-mono text-xs text-brand-900 leading-relaxed shadow-xs">
                        <div className="text-[10px] font-bold text-brand-700 uppercase mb-1 flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3 text-brand-600" />
                          INSERTED: TIER-4 MISSION-CRITICAL CLAUSE
                        </div>
                        "Provider commits to a 99.999% SLA availability threshold for distributed event clustering. In the event of failover exceeding 5.0 seconds, financial remediation clauses apply subject to Section 8.2 terms."
                      </div>
                    )}

                    {/* Verified Decisions Callout */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-mono font-bold text-brand-700">
                          <CheckCircle2 className="w-4 h-4 text-brand-600" />
                          <span>VERIFIED TECHNICAL DECISIONS FROM DISCOVERY #2</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">Ref: TECH-DISC-094</span>
                      </div>

                      <div className="space-y-2 text-xs text-slate-700">
                        <div className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-brand-600 shrink-0 mt-0.5" />
                          <span><strong>Event Mesh Throughput:</strong> p99 latency &lt; 10ms over 48,000 peak TPS using Kafka + tiered Redis cache.</span>
                        </div>

                        <div className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-brand-600 shrink-0 mt-0.5" />
                          <span><strong>Envelope Security:</strong> TLS 1.3 zero-trust mutual authentication with ephemeral mTLS certificate rotations.</span>
                        </div>

                        <div className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-brand-600 shrink-0 mt-0.5" />
                          <span><strong>Disaster Recovery RTO/RPO:</strong> Multi-region active-active failover with &lt;3s RTO and mathematical RPO = 0.</span>
                        </div>

                        <div className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-brand-600 shrink-0 mt-0.5" />
                          <span><strong>Credential Safeguards:</strong> Integrated FIDO2 WebAuthn biometric approval layer on ledger administration triggers.</span>
                        </div>
                      </div>
                    </div>

                    {/* Engineering Allocation Matrix Table */}
                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-bold font-mono text-slate-800">
                          Engineering Allocation Matrix
                        </h4>
                        <span className="text-[10px] font-mono text-slate-400">
                          Sprint Sizing Model
                        </span>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 text-[11px] font-mono text-slate-400 border-b border-slate-200">
                              <th className="py-2 px-3 font-semibold">Workstream</th>
                              <th className="py-2 px-3 font-semibold">Engineering Hrs</th>
                              <th className="py-2 px-3 font-semibold">Complexity</th>
                              <th className="py-2 px-3 font-semibold">Target Sprint</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                            <tr>
                              <td className="py-2.5 px-3 font-medium text-slate-800">Event Mesh Connector (Kafka/Cloud)</td>
                              <td className="py-2.5 px-3 text-slate-600">180 hrs</td>
                              <td className="py-2.5 px-3">
                                <span className="px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200 font-bold">
                                  High
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-600">Sprint 1 - 3</td>
                            </tr>

                            <tr>
                              <td className="py-2.5 px-3 font-medium text-slate-800">Multi-Region Aurora Sharding</td>
                              <td className="py-2.5 px-3 text-slate-600">120 hrs</td>
                              <td className="py-2.5 px-3">
                                <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-brand-700 border border-brand-200 font-bold">
                                  Medium
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-600">Sprint 2 - 4</td>
                            </tr>

                            <tr>
                              <td className="py-2.5 px-3 font-medium text-slate-800">FIDO2 Regulatory Key Vault</td>
                              <td className="py-2.5 px-3 text-slate-600">60 hrs</td>
                              <td className="py-2.5 px-3">
                                <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200 font-bold">
                                  Low
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-600">Sprint 4</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>

                  {/* Bottom Canvas Toolbar */}
                  <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button 
                        onClick={() => alert('Vault Block inserted')}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        Insert Vault Block
                      </button>
                      <button 
                        onClick={() => alert('AI regenerated Section 2.4 based on Discovery context')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono font-medium text-brand-700 bg-emerald-50 hover:bg-emerald-100/70 border-brand-200 transition-colors"
                      >
                        <Zap className="w-3 h-3 text-brand-600" />
                        <span>Regenerate with AI</span>
                      </button>
                      <button className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                        Compare v2.3
                      </button>
                    </div>

                    <button
                      onClick={() => setSaved(true)}
                      className="px-4 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-sm transition-all"
                    >
                      {saved ? 'Saved ✓' : 'Save Section'}
                    </button>
                  </div>

                </div>

              </div>

              {/* COLUMN C (3 cols): Presale AI Copilot, Vault Assets & Buying Committee */}
              <div className="lg:col-span-3 space-y-5">
                
                {/* Card 1: Presale AI Copilot */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-4 space-y-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-brand-600" />
                      <h3 className="text-xs font-bold text-slate-900 font-mono">
                        Presale AI Copilot
                      </h3>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
                  </div>

                  {/* Context badge */}
                  <div className="text-[11px] font-mono text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200">
                    Context: Discovery Synthesis
                  </div>

                  {/* Quick action prompt chips */}
                  <div className="space-y-1.5">
                    <button className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-mono bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-brand-800 border border-slate-200 hover:border-brand-200 transition-all flex items-center gap-1.5">
                      <Zap className="w-3 h-3 text-brand-500" />
                      <span>Review SLA penalties</span>
                    </button>

                    <button className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-mono bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-brand-800 border border-slate-200 hover:border-brand-200 transition-all flex items-center gap-1.5">
                      <Zap className="w-3 h-3 text-brand-500" />
                      <span>Check regulatory compliance</span>
                    </button>

                    <button className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-mono bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-brand-800 border border-slate-200 hover:border-brand-200 transition-all flex items-center gap-1.5">
                      <Zap className="w-3 h-3 text-brand-500" />
                      <span>Tighten pricing phrasing</span>
                    </button>
                  </div>

                  {/* Copilot Suggestion Box */}
                  {!suggestionDismissed && (
                    <div className="p-3 rounded-xl bg-gradient-to-b from-emerald-50/80 to-slate-50 border border-brand-200 space-y-2.5">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="font-bold text-brand-700 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          Copilot Suggestion
                        </span>
                        <span className="text-slate-400">Just now</span>
                      </div>

                      <p className="text-[11px] text-slate-700 font-mono leading-relaxed">
                        "In Section 2.4, client requested explicit language for financial penalties if event cluster failover exceeds 5.0 seconds. I recommend embedding our standard <strong>Tier-4 Mission-Critical Clause</strong> to protect delivery margins while providing a 99.999% SLA commitment."
                      </p>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => setSuggestionInserted(true)}
                          className="flex-1 py-1 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-[10px] font-mono font-bold transition-all shadow-xs"
                        >
                          {suggestionInserted ? 'Inserted ✓' : 'Insert into Draft'}
                        </button>
                        <button
                          onClick={() => setSuggestionDismissed(true)}
                          className="px-2 py-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 text-[10px] font-mono"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Bottom query bar */}
                  <div className="pt-1">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Ask Copilot about SOW..."
                        className="w-full pl-3 pr-8 py-1.5 rounded-lg text-xs font-mono bg-slate-50 border border-slate-200 focus:outline-none focus:border-brand-500 focus:bg-white text-slate-800 placeholder:text-slate-400"
                      />
                      <button className="absolute right-2 top-1/2 -translate-y-1/2 text-brand-600 hover:text-brand-700">
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                </div>

                {/* Card 2: Linked Vault Assets */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                      <h3 className="text-xs font-bold text-slate-900 font-mono">
                        Linked Vault Assets
                      </h3>
                    </div>
                    <span className="text-[11px] font-mono text-brand-600">
                      Auto-Linked
                    </span>
                  </div>

                  <div className="space-y-3">
                    
                    {/* Asset 1 */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                          <GitBranch className="w-3.5 h-3.5 text-brand-600" />
                          <span className="truncate">Tier-1 FinTech Event Mesh</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-brand-700 border border-brand-200">
                          98% Match
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        Architecture Blueprint • PDF
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-2">
                        Pre-audited high-availability reference spec deployed...
                      </p>
                      <button
                        onClick={() => setAttached1(!attached1)}
                        className="w-full py-1 text-[11px] font-mono font-semibold rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 flex items-center justify-center gap-1 transition-colors"
                      >
                        <Paperclip className="w-3 h-3 text-slate-400" />
                        <span>{attached1 ? 'Attached ✓' : 'Attach to Proposal'}</span>
                      </button>
                    </div>

                    {/* Asset 2 */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                          <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
                          <span className="truncate">FinTech SOC-2 Addendum</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-brand-700 border border-brand-200">
                          Approved
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        Legal &amp; Audit Annex • Approved
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-2">
                        Standard contractual liability annex covering real-time...
                      </p>
                      <button
                        onClick={() => setAttached2(!attached2)}
                        className="w-full py-1 text-[11px] font-mono font-semibold rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 flex items-center justify-center gap-1 transition-colors"
                      >
                        <Paperclip className="w-3 h-3 text-slate-400" />
                        <span>{attached2 ? 'Attached ✓' : 'Attach to Proposal'}</span>
                      </button>
                    </div>

                  </div>
                </div>

                {/* Card 3: Buying Committee */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-4 space-y-3">
                  <div className="text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase pb-2 border-b border-slate-100">
                    BUYING COMMITTEE
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700 text-[10px]">
                          ES
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">Evelyn Shaw</div>
                          <div className="text-[10px] text-slate-400">Chief Technology Officer</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-brand-700 border border-brand-200">
                        Sponsor
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700 text-[10px]">
                          MV
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">Marcus Vance</div>
                          <div className="text-[10px] text-slate-400">VP of Infrastructure</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        Reviewer
                      </span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
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
