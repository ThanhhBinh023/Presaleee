import React, { useState } from 'react';
import { 
  LayoutGrid, 
  FileText, 
  Sparkles, 
  BookOpen, 
  CreditCard, 
  Search, 
  SlidersHorizontal, 
  Plus, 
  Download, 
  CheckCircle2, 
  ArrowRight, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  ShieldCheck, 
  Cpu, 
  Bot, 
  Globe, 
  Building2, 
  Calendar, 
  Zap, 
  ArrowUpRight, 
  LogOut, 
  ChevronRight
} from 'lucide-react';

interface OverviewProps {
  onLogout: () => void;
  onNavigateAIWorkspace?: () => void;
  onNavigateRfps?: () => void;
  onNavigateVault?: () => void;
}

export const Overview: React.FC<OverviewProps> = ({ 
  onLogout, 
  onNavigateAIWorkspace,
  onNavigateRfps,
  onNavigateVault
}) => {
  const [activeNav, setActiveNav] = useState('Overview');
  const [recommendationDismissed, setRecommendationDismissed] = useState(false);
  const [synthesized, setSynthesized] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // 6 Pipeline stages
  const pipelineStages = [
    {
      name: 'INQUIRY',
      dealsCount: '14 deals',
      bigNumber: '14',
      value: '$680K Est.',
      health: '94%',
      tag: '+3 this wk',
      tagColor: 'text-brand-700 bg-emerald-50',
    },
    {
      name: 'QUALIFICATION',
      dealsCount: '9 deals',
      bigNumber: '9',
      value: '$1.15M Est.',
      health: '89%',
      tag: '+1 this wk',
      tagColor: 'text-brand-700 bg-emerald-50',
    },
    {
      name: 'DISCOVERY',
      dealsCount: '6 deals',
      bigNumber: '6',
      value: '$890K Est.',
      health: '91%',
      tag: 'On Track',
      tagColor: 'text-brand-700 bg-emerald-50',
    },
    {
      name: 'TECH DEEP DIVE',
      dealsCount: '5 deals',
      bigNumber: '5',
      value: '$920K Est.',
      health: '98%',
      tag: 'High Intent',
      tagColor: 'text-brand-700 bg-emerald-50',
    },
    {
      name: 'PROPOSAL REVIEW',
      dealsCount: '4 deals',
      bigNumber: '4',
      value: '$440K Est.',
      health: '78%',
      tag: 'Pending Legal',
      tagColor: 'text-amber-700 bg-amber-50',
    },
    {
      name: 'CLIENT PORTAL',
      dealsCount: '8 deals',
      bigNumber: '8',
      value: '$1.20M Est.',
      health: '96%',
      tag: 'Self-Servicing',
      tagColor: 'text-brand-700 bg-emerald-50',
    },
  ];

  // Active leads data
  const leads = [
    {
      title: 'Project Apollo - FinTech Solution',
      verified: true,
      client: 'Global Core Banking • $1.4M ARR',
      stage: 'TECH DEEP DIVE',
      matchScore: '96',
      matchStatus: 'High Fit',
      nextAction: 'Trigger Discovery SOW',
      actionIcon: Zap,
    },
    {
      title: 'Cloud Migration Wave 2',
      verified: false,
      client: 'Global Retail Corp • $750K ARR',
      stage: 'PROPOSAL REVIEW',
      matchScore: '88',
      matchStatus: 'Optimal Arch',
      nextAction: 'Review Cloud SLA Addendum',
      actionIcon: CheckCircle2,
    },
    {
      title: 'Omnichannel AI Assistant',
      verified: false,
      client: 'HealthFirst Systems • $920K ARR',
      stage: 'DISCOVERY',
      matchScore: '72',
      matchStatus: 'Moderate HIPAA',
      nextAction: 'Send architecture questionnaire',
      actionIcon: ArrowUpRight,
    },
    {
      title: 'Edge Real-Time Pipeline',
      verified: false,
      client: 'Automotive Dynamics • $520K ARR',
      stage: 'QUALIFICATION',
      matchScore: '91',
      matchStatus: 'Strong IoT Matrix',
      nextAction: 'Deploy synthetic PoC benchmark',
      actionIcon: Cpu,
    },
  ];

  // Asset Hub activity
  const assetItems = [
    {
      title: 'FinTech Architecture',
      badge: 'AI SYNCED',
      badgeStyle: 'text-brand-700 bg-emerald-50 border-brand-200',
      desc: 'Multi-region active-active topology',
      meta: 'Updated by Sarah K. • Used in 4 Proposals',
      icon: FileText,
    },
    {
      title: 'SOC-2 Compliance',
      badge: 'APPROVED',
      badgeStyle: 'text-brand-700 bg-emerald-50 border-brand-200',
      desc: 'Type II 2024 Audit Matrix & Controls',
      meta: 'Audited by Compliance Lead • Used in 11 RFPs',
      icon: ShieldCheck,
    },
    {
      title: 'Kubernetes Sizing Engine',
      badge: 'TOOL V1.9',
      badgeStyle: 'text-slate-600 bg-slate-100 border-slate-200',
      desc: 'Autoscale node & memory cost engine',
      meta: 'DevOps Presale SIG • Used in 6 Tech Reviews',
      icon: Cpu,
    },
    {
      title: 'AI Presale Copilot Prompts',
      badge: 'AI SYNCED',
      badgeStyle: 'text-brand-700 bg-emerald-50 border-brand-200',
      desc: 'Security-cleared prompt chaining library',
      meta: 'Auto-Indexed 40m ago • Global Scope',
      icon: Bot,
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] flex text-slate-900 font-sans">
      
      {/* 1. LEFT SIDEBAR */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 hidden md:flex">
        
        <div>
          {/* Logo & Demo Workspace Pill */}
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

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {[
              { name: 'Overview', icon: LayoutGrid },
              { name: 'RFPs & Specs', icon: FileText },
              { name: 'AI Workspace', icon: Sparkles, badge: 'New' },
              { name: 'Knowledge Vault', icon: BookOpen },
              { name: 'Plan & Quota', icon: CreditCard },
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
                      onNavigateVault();
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

        {/* User Profile & Logout at Bottom of Sidebar */}
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
              title="Sign out to Home"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

      </aside>

      {/* 2. MAIN WORKSPACE CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-4">
          
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-400">Workspace</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className="font-bold text-brand-700 bg-emerald-50 px-2 py-0.5 rounded border border-brand-200">
              Presaleee Workspace
            </span>
          </div>

          {/* Quick search & actions */}
          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Quick search schemas & RFPs..."
                className="w-full pl-8 pr-12 py-1.5 rounded-lg text-xs font-mono bg-slate-50 border border-slate-200 focus:outline-none focus:border-brand-500 focus:bg-white text-slate-800 placeholder:text-slate-400 transition-all"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 border border-slate-200 bg-white px-1.5 py-0.5 rounded">
                ⌘K
              </span>
            </div>

            <button className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white shadow-sm transition-all">
              <span>Contact sales</span>
            </button>

            <button 
              onClick={onLogout}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 sm:hidden"
            >
              Sign out
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
                    Workspace Overview
                  </h1>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-50 text-brand-700 border border-brand-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse"></span>
                    TELEMETRY LIVE
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 max-w-xl">
                  Real-time Presale pipeline acceleration, AI response quality scores, and multi-tenant solution architectures.
                </p>
              </div>

              {/* 3 Quick Stat Cards */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
                
                {/* ACTIVE DEALS */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 sm:p-4 min-w-[130px]">
                  <div className="text-[11px] font-mono text-slate-400 uppercase font-semibold">
                    ACTIVE DEALS
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="w-2 h-2 rounded-full bg-brand-500"></span>
                    <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900">24</span>
                  </div>
                </div>

                {/* PIPELINE VALUE */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 sm:p-4 min-w-[140px]">
                  <div className="text-[11px] font-mono text-slate-400 uppercase font-semibold">
                    PIPELINE VALUE
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-brand-700 font-bold font-mono text-xl sm:text-2xl">
                    <DollarSign className="w-4 h-4 text-brand-500" />
                    <span>$4.2M</span>
                  </div>
                </div>

                {/* AVG TURNAROUND */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 sm:p-4 min-w-[130px]">
                  <div className="text-[11px] font-mono text-slate-400 uppercase font-semibold">
                    AVG TURNAROUND
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-slate-900 font-bold font-mono text-xl sm:text-2xl">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>3.2 <span className="text-xs font-normal text-slate-500">days</span></span>
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
                  placeholder="Search Leads, RFPs, Tech Stacks, or Assets... [⌘K]"
                  className="w-full pl-9 pr-4 py-2 rounded-xl text-xs font-mono bg-slate-50 border border-slate-200 focus:outline-none focus:border-brand-500 focus:bg-white text-slate-800 placeholder:text-slate-400"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  <span>All Regions ▾</span>
                </button>

                <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Enterprise Tier ▾</span>
                </button>

                <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Q3 Deals ▾</span>
                </button>

                <button className="p-2 rounded-xl text-slate-600 bg-white border border-slate-200 hover:bg-slate-50">
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
              </div>

            </div>

          </div>

          {/* Presale Pipeline Status (6 Stages In-Flight) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Presale Pipeline Status
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-emerald-50 text-brand-700 border border-brand-200">
                  6 Stages In-Flight
                </span>
              </div>

              <a
                href="#velocity"
                className="text-xs font-semibold text-slate-500 hover:text-brand-600 transition-colors flex items-center gap-1"
              >
                <span>Stage Velocity Config</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* 6 Stage Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
              {pipelineStages.map((stage, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 flex flex-col justify-between hover:border-brand-300 hover:shadow-sm transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-400 mb-1">
                      <span className="truncate">{stage.name}</span>
                      <span>{stage.dealsCount.split(' ')[0]}</span>
                    </div>

                    <div className="text-2xl font-bold font-mono text-slate-900">
                      {stage.bigNumber}
                    </div>
                    <div className="text-xs font-mono text-slate-500 mt-0.5">
                      {stage.value}
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden my-3">
                      <div
                        className="h-full bg-brand-500 rounded-full"
                        style={{ width: stage.health }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono pt-1">
                    <span className="text-slate-400">Health {stage.health}</span>
                    <span className={`px-1.5 py-0.2 rounded font-semibold ${stage.tagColor}`}>
                      {stage.tag}
                    </span>
                  </div>
                </div>
              ))}
            </div>

          </div>

          {/* Split Content: Left (My Active Leads + 2 KPI Cards) & Right (Asset Hub & Copilot) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT COLUMN (8 cols): Active Leads Table & Quality Cards */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* My Active Leads Table Card */}
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-card overflow-hidden">
                
                {/* Table Header Action */}
                <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-base font-bold text-slate-900">
                      My Active Leads
                    </h3>
                    <span className="px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-slate-100 text-slate-700">
                      6 Priority
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white shadow-sm transition-all">
                      <Plus className="w-3.5 h-3.5" />
                      <span>New RFP Deal</span>
                    </button>
                    <button className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600">
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Table Content */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-3 px-5">LEAD &amp; CLIENT</th>
                        <th className="py-3 px-4">STAGE</th>
                        <th className="py-3 px-4">AI MATCH</th>
                        <th className="py-3 px-5 text-right">NEXT BEST ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {leads.map((lead, idx) => {
                        const ActionIcon = lead.actionIcon;
                        return (
                          <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                            {/* Lead & Client */}
                            <td className="py-4 px-5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 text-xs sm:text-sm">
                                  {lead.title}
                                </span>
                                {lead.verified && (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                                )}
                              </div>
                              <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                                {lead.client}
                              </div>
                            </td>

                            {/* Stage Badge */}
                            <td className="py-4 px-4 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-brand-500"></span>
                                {lead.stage}
                              </span>
                            </td>

                            {/* AI Match */}
                            <td className="py-4 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className="w-7 h-7 rounded-lg bg-emerald-50 border border-brand-200 text-brand-800 font-bold font-mono text-xs flex items-center justify-center">
                                  {lead.matchScore}
                                </span>
                                <div className="text-[11px] font-mono">
                                  <span className="font-semibold text-brand-700 block">Green</span>
                                  <span className="text-slate-400">{lead.matchStatus}</span>
                                </div>
                              </div>
                            </td>

                            {/* Next Best Action Button */}
                            <td className="py-4 px-5 text-right whitespace-nowrap">
                              <button 
                                onClick={() => {
                                  if (idx === 0 && onNavigateAIWorkspace) {
                                    onNavigateAIWorkspace();
                                  }
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-slate-700 hover:text-brand-700 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-brand-200 transition-all"
                              >
                                <ActionIcon className="w-3 h-3 text-brand-600" />
                                <span>{lead.nextAction}</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

              </div>

              {/* 2 Bottom Metric Quality Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* 94.8% AI Response Accuracy */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-brand-200 flex items-center justify-center text-brand-600 shrink-0">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xl font-bold font-mono text-slate-900">
                      94.8% AI Response Accuracy
                    </div>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                      Validated against 1,280 approved security &amp; RFP clauses.
                    </p>
                  </div>
                </div>

                {/* 18 Deals In Sandbox */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-brand-200 flex items-center justify-center text-brand-600 shrink-0">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xl font-bold font-mono text-slate-900">
                      18 Deals In Sandbox
                    </div>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                      Customers running test queries in dedicated interactive portals.
                    </p>
                  </div>
                </div>

              </div>

            </div>

            {/* RIGHT COLUMN (4 cols): Recent Asset Hub Activity & Copilot Box */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Recent Asset Hub Activity */}
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-card p-5 sm:p-6">
                
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 font-mono">
                    Recent Asset Hub Activity
                  </h3>
                  <a
                    href="#hub"
                    className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                  >
                    <span>View Hub</span>
                    <ArrowRight className="w-3 h-3" />
                  </a>
                </div>

                {/* Asset list */}
                <div className="mt-4 space-y-4">
                  {assetItems.map((asset, idx) => {
                    const AssetIcon = asset.icon;
                    return (
                      <div key={idx} className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/70 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <AssetIcon className="w-3.5 h-3.5 text-brand-600" />
                            <span className="text-xs font-bold text-slate-900 font-mono">
                              {asset.title}
                            </span>
                          </div>
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${asset.badgeStyle}`}>
                            {asset.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mb-1.5 font-mono">
                          {asset.desc}
                        </p>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {asset.meta}
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>

              {/* Copilot Recommendation Box */}
              {!recommendationDismissed && (
                <div className="rounded-3xl border border-brand-200 bg-gradient-to-b from-emerald-50/90 via-white to-slate-50 p-5 shadow-card relative">
                  
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-brand-600" />
                      <span className="text-xs font-bold text-slate-900 font-mono">
                        Copilot Recommendation
                      </span>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-brand-500 animate-ping"></span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed font-mono mb-4">
                    Client expanded inquiry to include multi-region disaster recovery. Auto-synthesize multi-cloud failover proof from indexed assets?
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSynthesized(true)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white shadow-sm transition-all"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>{synthesized ? 'Synthesized ✓' : 'Synthesize Artifact'}</span>
                    </button>

                    <button
                      onClick={() => setRecommendationDismissed(true)}
                      className="px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
                    >
                      Dismiss
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
