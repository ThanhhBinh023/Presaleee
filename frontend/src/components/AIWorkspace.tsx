import React, { useState, useEffect } from 'react';
import type { LeadItem } from '../services/leadService';
import { fetchLeads, qualifyLead, updateLead, deleteLead } from '../services/leadService';
import { useAuth } from '../hooks/useAuth';
import { useOrganizations } from '../hooks/useOrganizations';
import { WorkspacePill } from './workspace/WorkspacePill';
import { UserCard } from './workspace/UserCard';
import { 
  LayoutGrid, 
  FileText, 
  Sparkles, 
  BookOpen, 
  Send, 
  CheckCircle2, 
  ShieldCheck, 
  Zap, 
  Paperclip, 
  Check, 
  Layers, 
  Globe,
  Settings, 
  Cpu, 
  ArrowRight,
  Eye,
  Copy,
  AlertTriangle,
  HelpCircle,
  Edit3,
  Trash2,
  RefreshCw,
  X,
  Save,
  CreditCard,
  History,
  FolderOpen,
  Clock,
  MessageSquare,
  ShieldAlert,
  FileCheck
} from 'lucide-react';
import { useMemberDirectory } from '../hooks/useMemberDirectory';
import { navigateTo } from '../navigation';
import { initialsOf } from '../utils/format';
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
  const { user } = useAuth();
  const { primary: organization } = useOrganizations();

  // Multi-project support
  const [projects, setProjects] = useState<LeadItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [loadingProjects, setLoadingProjects] = useState<boolean>(true);

  // Requirement 2: Default subnav is 'Intake & Scope'
  const [activeSubnav, setActiveSubnav] = useState<'Intake & Scope' | 'Discovery Meetings' | 'Technical Sessions' | 'Proposal Builder v2.4' | 'Client Intelligence'>('Intake & Scope');

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
  const [emailCopied, setEmailCopied] = useState(false);

  // CRUD Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isQualifying, setIsQualifying] = useState(false);

  // Edit Form State
  const [editTitle, setEditTitle] = useState('');
  const [editRfpContent, setEditRfpContent] = useState('');
  const [editSource, setEditSource] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editIndustry, setEditIndustry] = useState('');
  const [editBudget, setEditBudget] = useState<number | string>('');
  const [editTimeline, setEditTimeline] = useState<number | string>('');
  const [editTargetSla, setEditTargetSla] = useState('');
  const [editPeakWorkload, setEditPeakWorkload] = useState('');

  // Load projects function
  const loadProjects = async (preferredLeadId?: string) => {
    try {
      setLoadingProjects(true);
      const list = await fetchLeads();
      setProjects(list);

      const savedLeadId = preferredLeadId;
      if (savedLeadId && list.some(p => p.id === savedLeadId)) {
        setSelectedProjectId(savedLeadId);
        localStorage.setItem('presaleee_active_lead_id', savedLeadId);
      } else {
        setSelectedProjectId('');
        localStorage.removeItem('presaleee_active_lead_id');
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoadingProjects(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const selectedProject = projects.find(p => p.id === selectedProjectId) || null;

  // Handle Select Change
  const handleSelectProject = (id: string) => {
    setSelectedProjectId(id);
    localStorage.setItem('presaleee_active_lead_id', id);
  };

  // Open Edit Modal with current project data
  const openEditModal = () => {
    if (!selectedProject) return;
    setEditTitle(selectedProject.title || '');
    setEditRfpContent(selectedProject.raw_rfp_content || '');
    setEditSource(selectedProject.source || 'INBOUND_EMAIL');
    setEditStatus(selectedProject.status || 'NEW');
    setEditIndustry(selectedProject.extracted_metadata?.clientIndustry || '');
    setEditBudget(selectedProject.extracted_metadata?.budgetUsd || '');
    setEditTimeline(selectedProject.extracted_metadata?.timelineWeeks || '');
    setEditTargetSla(selectedProject.extracted_metadata?.target_sla || '');
    setEditPeakWorkload(selectedProject.extracted_metadata?.peak_workload || '');
    setIsEditModalOpen(true);
  };

  // Handle Update Lead
  const handleUpdateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    try {
      setIsSubmitting(true);
      const updatedMetadata = {
        ...(selectedProject.extracted_metadata || {}),
        clientIndustry: editIndustry || undefined,
        budgetUsd: editBudget ? Number(editBudget) : undefined,
        timelineWeeks: editTimeline ? Number(editTimeline) : undefined,
        target_sla: editTargetSla || undefined,
        peak_workload: editPeakWorkload || undefined
      };

      const updated = await updateLead(selectedProject.id, {
        title: editTitle.trim() || selectedProject.title,
        source: editSource || selectedProject.source,
        status: editStatus || selectedProject.status,
        raw_rfp_content: editRfpContent,
        extracted_metadata: updatedMetadata
      });

      setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
      toast.success(`Đã cập nhật Intake "${updated.title}"!`, 'Cập nhật thành công');
      setIsEditModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi cập nhật Intake', 'Thất bại');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Lead
  const handleDeleteLead = async () => {
    if (!selectedProject) return;
    const confirmDelete = window.confirm(`Bạn có chắc chắn muốn xóa Intake "${selectedProject.title}" và toàn bộ dữ liệu họp / đề xuất liên quan không?`);
    if (!confirmDelete) return;

    try {
      await deleteLead(selectedProject.id);
      toast.success(`Đã xóa thành công Intake "${selectedProject.title}"`, 'Đã xóa');
      await loadProjects();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi xóa Intake', 'Thất bại');
    }
  };

  // Handle Qualify Active Lead
  const handleQualifyActiveLead = async () => {
    if (!selectedProject) return;
    try {
      setIsQualifying(true);
      const res = await qualifyLead(selectedProject.id, selectedProject.raw_rfp_content);
      setProjects(prev => prev.map(p => p.id === res.lead.id ? res.lead : p));
      toast.success(`Thẩm định BANT thành công! Điểm: ${res.qualification.qualification_score}/100`, 'AI BANT Engine');
    } catch (err: any) {
      toast.error(err.message || 'Lỗi thẩm định AI', 'Thất bại');
    } finally {
      setIsQualifying(false);
    }
  };

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
              onClick={() => navigateTo('leads')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all"
            >
              <Zap className="w-4 h-4 text-slate-400" />
              <span>Leads</span>
            </button>

            <button
              onClick={() => navigateTo('portal')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all"
            >
              <Globe className="w-4 h-4 text-slate-400" />
              <span>Client portal</span>
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
            <span className="text-slate-500">{user?.role?.replace(/_/g, ' ') || 'PRESALE WORKSPACE'}</span>
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-brand-700">
              {selectedProject ? selectedProject.title : 'Chưa có dự án nào'}
            </span>
          </div>

          {/* Quick search & Action */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setPortalModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-xs"
            >
              <Eye className="w-3.5 h-3.5 text-brand-400" />
              <span>Preview Client Portal</span>
            </button>
          </div>

        </header>

        {/* Lead Title & Metrics Bar (Dynamic for Logged-in User) */}
        <div className="bg-white border-b border-slate-200 px-6 sm:px-8 py-6">
          
          <div className="max-w-7xl mx-auto space-y-4">
            
            {/* Top Row: Path & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-slate-400">Tổ chức:</span>
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  {organization?.name || user?.fullName || 'My Organization'}
                  <span className={`w-2 h-2 rounded-full ${selectedProject ? 'bg-brand-500' : 'bg-slate-300'}`}></span>
                </span>
                {selectedProject && (
                  <span className="text-slate-400 ml-2">ID: {selectedProject.id.slice(0, 8)}...</span>
                )}
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
                  onClick={onNavigateRfps}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-2xs transition-all"
                  title="Chuyển tới RFPs & Specs để chạy AI Intake"
                >
                  <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                  <span>Chạy AI Intake</span>
                </button>

                {selectedProject && (
                  <button 
                    onClick={() => toast.info('Hồ sơ đề xuất đã gửi để xét duyệt nội bộ.', 'Trình duyệt')}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-sm transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit for Review</span>
                  </button>
                )}
              </div>
            </div>

            {/* Status Pills */}
            {selectedProject ? (
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-brand-700 border border-brand-200 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500"></span>
                  STAGE: {selectedProject.status}
                </span>

                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-brand-700 border border-brand-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500"></span>
                  Qualification Score: <strong>{selectedProject.extracted_metadata?.qualification?.qualification_score ? `${selectedProject.extracted_metadata.qualification.qualification_score}/100` : 'Chờ thẩm định'}</strong>
                </span>

                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  Est. Value: <strong>{selectedProject.extracted_metadata?.budgetUsd ? `$${selectedProject.extracted_metadata.budgetUsd.toLocaleString()} USD` : 'Chưa nhập'}</strong>
                </span>

                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  Target Timeline: <strong>{selectedProject.extracted_metadata?.timelineWeeks ? `${selectedProject.extracted_metadata.timelineWeeks} Weeks` : 'Chưa định'}</strong>
                </span>
              </div>
            ) : loadingProjects ? (
              <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand-600" />
                <span>Đang tải danh sách Intake của bạn...</span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 font-semibold">
                  CHƯA CÓ DỰ ÁN NÀO
                </span>
                <span className="text-slate-400 text-xs">
                  (Hãy tạo yêu cầu RFP đầu tiên để bắt đầu làm việc)
                </span>
              </div>
            )}

            {/* Title & SOW Completeness */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pt-1">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {selectedProject ? selectedProject.title : 'AI Presale Workspace'}
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-3xl leading-relaxed">
                  {selectedProject 
                    ? 'Không gian thẩm định giải pháp kỹ thuật, phân tích điểm BANT và xây dựng Proposal 10 Sheets.' 
                    : 'Vui lòng chọn một dự án trong ô chọn bên dưới để xem báo cáo thẩm định, cuộc họp và hồ sơ đề xuất.'}
                </p>
              </div>

              {selectedProject && (
                <div className="flex items-center gap-3 shrink-0">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border-4 border-brand-500 flex items-center justify-center font-mono font-bold text-xs text-brand-700">
                      {selectedProject.status === 'QUALIFIED' ? '90%' : '50%'}
                    </div>
                    <div className="text-xs">
                      <div className="font-bold text-slate-800">Pipeline Status</div>
                      <div className="text-[11px] text-slate-400 font-mono">{selectedProject.status}</div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3">
                    <ShieldCheck className="w-6 h-6 text-brand-600 shrink-0" />
                    <div className="text-xs">
                      <div className="font-bold text-slate-800">Multi-tenant</div>
                      <div className="text-[11px] text-slate-400 font-mono">Isolated Data</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Secondary Navigation Tabs matching PDF lifecycle */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 overflow-x-auto text-xs font-medium">
              {[
                { name: 'Intake & Scope' },
                { name: 'Discovery Meetings' },
                { name: 'Technical Sessions' },
                { name: 'Proposal Builder v2.4', icon: FileText },
                { name: 'Client Intelligence' },
              ].map((tab, idx) => {
                const isTabActive = activeSubnav === tab.name;
                const Icon = tab.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => setActiveSubnav(tab.name as any)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                      isTabActive
                        ? 'bg-slate-900 text-white font-semibold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {Icon && <Icon className="w-3.5 h-3.5 text-brand-400" />}
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </div>

          </div>

        </div>

        {/* 3. DYNAMIC CONTENT AREA BASED ON LIFECYCLE TAB */}
        <div className="p-6 sm:p-8 max-w-7xl mx-auto w-full">
          
          {/* TAB 1: INTAKE & SCOPE with FULL CRUD (Requirement 3 & 4) */}
          {activeSubnav === 'Intake & Scope' && (
            <div className="space-y-6">
              
              {/* INTAKE SELECTOR (Modern Unified Control Bar) */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                
                {/* Selector */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-brand-200 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-brand-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                        CHỌN INTAKE ĐANG THAO TÁC ({projects.length} DỰ ÁN)
                      </span>
                      {selectedProject && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-50 text-brand-700 font-semibold border border-brand-200/50">
                          {selectedProject.status}
                        </span>
                      )}
                    </div>
                    {projects.length > 0 ? (
                      <div className="flex items-center gap-2 max-w-xl">
                        <select
                          value={selectedProjectId}
                          onChange={(e) => handleSelectProject(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/60 text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-500 focus:bg-white truncate transition-colors"
                        >
                          <option value="">-- Chọn dự án cần làm việc ({projects.length} dự án) --</option>
                          {projects.map((p) => (
                            <option key={p.id} value={p.id}>
                              [{p.status}] {p.title}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={handleDeleteLead}
                          title="Xóa Intake này"
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs font-mono text-slate-400">
                        Chưa có Intake nào. Vui lòng chạy AI Intake để nạp dự án.
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Actions: Qualify BANT & Direct Link to AI Intake */}
                <div className="flex items-center gap-2 shrink-0">
                  {selectedProject && (
                    <button
                      onClick={handleQualifyActiveLead}
                      disabled={isQualifying}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-brand-200 bg-emerald-50 hover:bg-emerald-100 text-brand-800 text-xs font-mono font-semibold transition-all disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-brand-600 ${isQualifying ? 'animate-spin' : ''}`} />
                      <span>{isQualifying ? 'Đang chấm điểm...' : 'Thẩm Định BANT AI'}</span>
                    </button>
                  )}

                  <button
                    onClick={onNavigateRfps}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-mono font-semibold transition-all"
                    title="Chuyển sang RFPs & Specs để chạy AI Intake"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                    <span>Chạy AI Intake</span>
                  </button>
                </div>

              </div>

              {/* Detail View of Selected Project OR Empty State */}
              {!selectedProject ? (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-12 text-center space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center mx-auto">
                    <FolderOpen className="w-8 h-8 text-brand-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">
                    {projects.length > 0 ? 'Vui lòng chọn một dự án trước' : 'Chưa có dự án AI Intake nào'}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                    {projects.length > 0 
                      ? 'Hệ thống yêu cầu chọn dự án trước khi hiển thị kết quả phân tích yêu cầu (SOW), chấm điểm BANT và xây dựng tài liệu đề xuất.'
                      : 'Tài khoản của bạn chưa có dự án. Hãy bấm vào nút bên dưới để tạo yêu cầu RFP đầu tiên và chạy AI Intake.'}
                  </p>
                  {projects.length > 0 ? (
                    <div className="pt-1">
                      <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold">
                        &uarr; Hãy chọn một dự án từ menu chọn ở phía trên
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={onNavigateRfps}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-md transition-all mt-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Chuyển tới RFPs &amp; Specs để chạy AI Intake</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-6">
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        Lead Intake Extract &amp; Qualification Assessment
                      </h2>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        Dữ liệu thật từ AI Intake và kết quả chạy Qualification Engine cho dự án <strong className="text-slate-800">{selectedProject.title}</strong>.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                      <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-50 text-brand-700 border border-brand-200">
                        Lead Status: {selectedProject.status}
                      </span>
                      {/* Update button placed directly in the Lead Intake card */}
                      <button
                        onClick={openEditModal}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-mono font-semibold shadow-2xs transition-all"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-brand-600" />
                        <span>Chỉnh sửa (Update)</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left: Raw Intake */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-900 font-mono">
                          Raw Client Intake Extract
                        </h3>
                        <span className="text-[10px] font-mono text-slate-400">
                          Nguồn: {selectedProject.source || 'INBOUND_EMAIL'}
                        </span>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 font-mono text-xs text-slate-700 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                        {selectedProject.raw_rfp_content || '(Không có nội dung mô tả thô)'}
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="text-slate-400 text-[10px] block">CLIENT TIER / DOMAIN</span>
                          <span className="font-bold text-slate-800">
                            {selectedProject.extracted_metadata?.clientIndustry || 'Chưa xác định'}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="text-slate-400 text-[10px] block">EST. VALUE</span>
                          <span className="font-bold text-brand-700">
                            {selectedProject.extracted_metadata?.budgetUsd ? `$${selectedProject.extracted_metadata.budgetUsd.toLocaleString()} USD` : 'Chưa định'}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="text-slate-400 text-[10px] block">TARGET SLA</span>
                          <span className="font-bold text-slate-800">
                            {selectedProject.extracted_metadata?.target_sla || 'Chưa cấu hình'}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="text-slate-400 text-[10px] block">PEAK WORKLOAD</span>
                          <span className="font-bold text-brand-700">
                            {selectedProject.extracted_metadata?.peak_workload || 'Chưa cấu hình'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Qualification Engine */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-900 font-mono">
                          Qualification Engine Assessment
                        </h3>
                        {selectedProject.extracted_metadata?.qualification && (
                          <span className="text-[10px] font-mono font-bold text-brand-700 bg-emerald-50 px-2 py-0.5 rounded border border-brand-200">
                            Đã Thẩm Định
                          </span>
                        )}
                      </div>

                      {selectedProject.extracted_metadata?.qualification ? (
                        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-brand-200 space-y-2.5">
                          <div className="flex justify-between items-center text-xs font-mono">
                            <span className="font-bold text-brand-900 text-sm">
                              Score: {selectedProject.extracted_metadata.qualification.qualification_score} / 100
                            </span>
                            <span className="text-brand-700 font-bold">
                              {selectedProject.extracted_metadata.qualification.readiness_level}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed">
                            {selectedProject.extracted_metadata.qualification.project_brief}
                          </p>

                          {/* Breakdown tags */}
                          {selectedProject.extracted_metadata.qualification.breakdown && (
                            <div className="space-y-1.5 pt-2 border-t border-brand-200/60">
                              {selectedProject.extracted_metadata.qualification.breakdown.slice(0, 3).map((item, idx) => (
                                <div key={idx} className="text-[11px] font-mono text-slate-700 flex items-start gap-1.5">
                                  <span className="text-brand-600 font-bold">•</span>
                                  <span><strong>{item.title}:</strong> {item.detail}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
                          <div className="text-xs font-mono text-slate-500">
                            Dự án này chưa được chạy thẩm định Qualification Engine (BANT).
                          </div>
                          <button
                            onClick={handleQualifyActiveLead}
                            disabled={isQualifying}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold transition-all shadow-xs"
                          >
                            <Zap className="w-3.5 h-3.5" />
                            <span>{isQualifying ? 'Đang thẩm định...' : 'Chạy AI Thẩm Định BANT'}</span>
                          </button>
                        </div>
                      )}

                      <div className="pt-2 flex items-center gap-3">
                        <button
                          onClick={() => setActiveSubnav('Discovery Meetings')}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs cursor-pointer transition-all"
                        >
                          <span>Proceed to Discovery Meetings</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setActiveSubnav('Proposal Builder v2.4')}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs cursor-pointer transition-all"
                        >
                          <span>Open Proposal Studio</span>
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                      </div>

                    </div>
                  </div>

                </div>
              )}

            </div>
          )}

          {/* TAB 2: DISCOVERY MEETINGS */}
          {activeSubnav === 'Discovery Meetings' && (
            !selectedProject ? (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center mx-auto">
                  <FolderOpen className="w-8 h-8 text-brand-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">
                  Vui lòng chọn dự án trước
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Vui lòng chọn một dự án từ danh mục phía trên trước khi thực hiện ghi nhận biên bản cuộc họp Discovery.
                </p>
              </div>
            ) : (
              <DiscoveryMeetingsTab onProceedToProposals={() => setActiveSubnav('Proposal Builder v2.4')} />
            )
          )}

          {/* TAB 3: TECHNICAL SESSIONS */}
          {activeSubnav === 'Technical Sessions' && (
            !selectedProject ? (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center mx-auto">
                  <FolderOpen className="w-8 h-8 text-brand-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">
                  Vui lòng chọn dự án trước
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Vui lòng chọn một dự án từ danh mục phía trên trước khi xem tóm tắt phiên làm việc kỹ thuật.
                </p>
              </div>
            ) : (
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
            )
          )}

          {/* TAB 4: PROPOSAL BUILDER V2.4 (Real Database & AI Synthesis) */}
          {activeSubnav === 'Proposal Builder v2.4' && (
            !selectedProject ? (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center mx-auto">
                  <FolderOpen className="w-8 h-8 text-brand-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">
                  Vui lòng chọn dự án trước
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Vui lòng chọn một dự án từ danh mục phía trên trước khi mở Proposal Studio (10 Sheets).
                </p>
              </div>
            ) : (
              <ProposalStudioTab 
                leadId={selectedProjectId} 
                activeProject={selectedProject} 
              />
            )
          )}

          {/* TAB 5: CLIENT INTELLIGENCE (PDF Page 6 & 7) */}
          {activeSubnav === 'Client Intelligence' && (
            !selectedProject ? (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center mx-auto">
                  <FolderOpen className="w-8 h-8 text-brand-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">
                  Vui lòng chọn dự án trước
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Vui lòng chọn một dự án từ danh mục phía trên để theo dõi tín hiệu tương tác Client Portal (Signals) và phân tích Lead Intelligence.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* 1. Header Card with Portal Quick Launch */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-6">
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-200">
                          {selectedProject.organization || 'DUT'}
                        </span>
                        <span className="text-xs font-mono text-slate-400">
                          ID: {selectedProject.id.slice(0, 8)}...
                        </span>
                      </div>
                      <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                        Client Engagement Tracking &amp; Lead Intelligence
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Phân tích hành vi tương tác thời gian thực từ Client Portal (Signals) và tự động tính toán Next Best Action theo ngữ cảnh dự án "{selectedProject.title}".
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigateTo('portal')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs"
                      >
                        <Globe className="w-3.5 h-3.5 text-slate-500" />
                        <span>Client Portal Desk</span>
                      </button>
                      <button
                        onClick={() => setPortalModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview Client Portal</span>
                      </button>
                    </div>
                  </div>

                  {/* 4 Signals Cards from PDF Page 6 */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider">
                        Client Engagement Tracking Signals (PDF Page 6)
                      </span>
                      <span className="px-2 py-0.2 rounded-full text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                        Real-time Telemetry
                      </span>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 relative overflow-hidden">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">PORTAL OPENED</span>
                          <Eye className="w-4 h-4 text-brand-600" />
                        </div>
                        <div className="text-2xl font-bold font-mono text-slate-900 mt-1">16 Lượt xem</div>
                        <span className="text-[11px] text-brand-700 font-semibold block mt-1">
                          CTO &amp; Lead Architect active (45m trước)
                        </span>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 relative overflow-hidden">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">READING DURATION</span>
                          <Clock className="w-4 h-4 text-brand-600" />
                        </div>
                        <div className="text-2xl font-bold font-mono text-slate-900 mt-1">18m 42s</div>
                        <span className="text-[11px] text-brand-700 font-semibold block mt-1">
                          Xem lâu nhất: Scope (8m) &amp; Pricing (6m)
                        </span>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 relative overflow-hidden">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">AI QUERIES</span>
                          <HelpCircle className="w-4 h-4 text-brand-600" />
                        </div>
                        <div className="text-2xl font-bold font-mono text-slate-900 mt-1">3 Câu hỏi</div>
                        <span className="text-[11px] text-brand-700 font-semibold block mt-1">
                          Hỏi về SLA failover, RPO &amp; Bảo mật
                        </span>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 relative overflow-hidden">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">CLIENT COMMENTS</span>
                          <MessageSquare className="w-4 h-4 text-brand-600" />
                        </div>
                        <div className="text-2xl font-bold font-mono text-slate-900 mt-1">2 Phản hồi</div>
                        <span className="text-[11px] text-brand-700 font-semibold block mt-1">
                          Làm rõ tiêu chí bàn giao Phase 1
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Section Reading Breakdown & Portal AI Interactions */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
                    
                    {/* Left: Section Reading Duration breakdown */}
                    <div className="lg:col-span-6 space-y-3">
                      <div className="text-xs font-mono font-bold text-slate-800 uppercase flex items-center justify-between">
                        <span>SECTION READING DURATION &amp; INTENT:</span>
                        <span className="text-[10px] text-slate-400 font-normal">Tracking theo từng sheet</span>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-2.5 text-xs font-mono">
                        <div className="space-y-1">
                          <div className="flex justify-between text-slate-700">
                            <span>Sheet 2: Scope of Work &amp; Deliverables</span>
                            <span className="font-bold text-brand-700">8m 10s (High Attention)</span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-brand-500 h-full rounded-full" style={{ width: '85%' }}></div>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-slate-700">
                            <span>Sheet 6: Pricing &amp; Payment Milestones</span>
                            <span className="font-bold text-brand-700">6m 20s (Financial review)</span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-brand-500 h-full rounded-full" style={{ width: '68%' }}></div>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-slate-700">
                            <span>Sheet 9: SLA, Availability &amp; Maintenance</span>
                            <span className="font-bold text-slate-800">5m 12s (SLA verification)</span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-brand-400 h-full rounded-full" style={{ width: '55%' }}></div>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-slate-700">
                            <span>Sheet 3: Architecture &amp; Tech Stack</span>
                            <span className="font-bold text-slate-800">4m 30s</span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-brand-300 h-full rounded-full" style={{ width: '45%' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: AI Inquiries asked on Portal */}
                    <div className="lg:col-span-6 space-y-3">
                      <div className="text-xs font-mono font-bold text-slate-800 uppercase flex items-center justify-between">
                        <span>AI QUERIES FROM CLIENT (IN PORTAL):</span>
                        <span className="text-[10px] text-slate-400 font-normal">Trợ lý AI Portal giải đáp</span>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-3 text-xs">
                        <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-1">
                          <div className="font-semibold text-slate-800 text-[11px] flex items-center gap-1.5">
                            <HelpCircle className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                            <span>"Hệ thống có cơ chế sao lưu tự động và thời gian phục hồi RPO/RTO dưới bao lâu?"</span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-mono pl-5">
                            → AI Portal đã trả lời: Cam kết RPO &lt; 1 phút, RTO &lt; 15 phút với sao lưu tự động đa vùng (Sheet 3 &amp; 9).
                          </p>
                        </div>

                        <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-1">
                          <div className="font-semibold text-slate-800 text-[11px] flex items-center gap-1.5">
                            <HelpCircle className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                            <span>"Chi phí giai đoạn Phase 1 đã bao gồm chuyển giao tài liệu CI/CD và đào tạo chưa?"</span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-mono pl-5">
                            → AI Portal đã trả lời: Đã bao gồm trọn gói chuyển giao tài liệu vận hành và 12 tháng bảo trì (Sheet 5 &amp; 6).
                          </p>
                        </div>
                      </div>
                    </div>

                  </div>

                </div>

                {/* 2. LEAD INTELLIGENCE 5 DIMENSIONS (PDF Page 7) */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 font-mono uppercase tracking-wider flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-brand-600" />
                        <span>Lead Intelligence Assessment (5 Dimensions - PDF Page 7)</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Tổng hợp toàn diện từ RFP Intake, Discovery Meetings và tín hiệu tương tác thực tế từ Client Portal.
                      </p>
                    </div>
                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-xl bg-brand-50 text-brand-700 border border-brand-200">
                      Overall Health: {selectedProject.qualification_score || 88}%
                    </span>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 text-xs font-mono">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-400 block font-bold">1. LEAD HEALTH</span>
                      <div className="text-xl font-bold text-brand-700 mt-1">
                        {selectedProject.qualification_score || 88}%
                      </div>
                      <span className="text-[10px] text-emerald-700 font-semibold mt-0.5 block">Xác suất chốt: Cao</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-400 block font-bold">2. PROPOSAL READINESS</span>
                      <div className="text-xl font-bold text-slate-800 mt-1">95%</div>
                      <span className="text-[10px] text-slate-500 block mt-0.5">Đủ 10 sheets chuẩn</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-400 block font-bold">3. CLIENT ENGAGEMENT</span>
                      <div className="text-xl font-bold text-emerald-700 mt-1">High</div>
                      <span className="text-[10px] text-slate-500 block mt-0.5">16 sessions tương tác</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-400 block font-bold">4. INFO COMPLETENESS</span>
                      <div className="text-xl font-bold text-slate-800 mt-1">92%</div>
                      <span className="text-[10px] text-slate-500 block mt-0.5">RFP + Discovery rõ</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 col-span-2 lg:col-span-1">
                      <span className="text-[10px] text-slate-400 block font-bold">5. IDENTIFIED RISKS</span>
                      <div className="text-xl font-bold text-amber-700 mt-1">Low-Med</div>
                      <span className="text-[10px] text-amber-600 block mt-0.5">Phụ thuộc API bên thứ 3</span>
                    </div>
                  </div>

                  {/* Risks Alert Details */}
                  <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-start gap-3">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-0.5">
                      <div className="font-bold text-amber-900 font-mono">
                        Điểm lưu ý tiềm ẩn rủi ro (Friction Points):
                      </div>
                      <p className="text-slate-600">
                        Khách hàng đang phân vân giữa timeline bàn giao {selectedProject.extracted_metadata?.timelineWeeks || 20} tuần và tiến độ nghiệm thu Phase 1. Khuyến nghị chuẩn bị trước tiêu chí nghiệm thu UAT để thống nhất trong buổi gặp tới.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. AI RECOMMENDATIONS & NEXT BEST ACTIONS (PDF Page 7) */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-6">
                  
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 font-mono uppercase tracking-wider flex items-center gap-2">
                        <Zap className="w-4 h-4 text-brand-600" />
                        <span>AI Recommendations &amp; Next Best Actions (PDF Page 7)</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Gợi ý hành động tối ưu cho Presale Team. Quyết định cuối cùng thuộc về Presale Consultant.
                      </p>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      Advisory Only — Không tự động gửi
                    </span>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* Left: Next Best Action & Discussion Topics (5 cols) */}
                    <div className="lg:col-span-5 space-y-4">
                      
                      <div className="space-y-3">
                        <div className="text-xs font-mono font-bold text-slate-800 uppercase flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-brand-600" />
                          <span>RECOMMENDED NEXT BEST ACTIONS:</span>
                        </div>

                        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-brand-200 space-y-1.5">
                          <div className="font-bold text-xs text-brand-900">
                            1. Gửi phụ lục cam kết SLA 99.999% &amp; Tiêu chuẩn Bảo mật
                          </div>
                          <p className="text-[11px] text-slate-600 font-mono">
                            Dữ liệu portal cho thấy CTO đã đọc mục SLA &amp; Availability 3 lần trong 24 giờ qua.
                          </p>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                          <div className="font-bold text-xs text-slate-900">
                            2. Lên lịch làm rõ cơ chế bàn giao Phase 1 (15-20 phút)
                          </div>
                          <p className="text-[11px] text-slate-600 font-mono">
                            Giải tỏa lo lắng của khách hàng về tiến độ chuyển giao trước khi ký kết SOW.
                          </p>
                        </div>
                      </div>

                      {/* Suggested Discussion Topics */}
                      <div className="space-y-2 pt-2">
                        <div className="text-xs font-mono font-bold text-slate-800 uppercase">
                          SUGGESTED DISCUSSION TOPICS &amp; QUESTIONS:
                        </div>
                        <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 font-mono">
                          <li>"Xác nhận lại yêu cầu kết nối hạ tầng on-premise hay cloud sandbox phía khách hàng."</li>
                          <li>"Làm rõ các kịch bản kiểm thử tải trọng cao điểm (TPS) trước khi nghiệm thu Phase 1."</li>
                          <li>"Thống nhất quy trình Change Request (CR) khi có phát sinh ngoài WBS Sheet 2."</li>
                        </ul>
                      </div>

                      {/* Relevant Assets & Case Studies */}
                      <div className="space-y-2 pt-2">
                        <div className="text-xs font-mono font-bold text-slate-800 uppercase flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-brand-600" />
                          <span>RELEVANT ASSETS / CASE STUDIES ĐỀ XUẤT:</span>
                        </div>
                        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
                          <div className="font-semibold text-slate-800 text-[11px]">
                            • Case Study: Triển khai giải pháp phân tán chịu tải cao (EcoMart Retail)
                          </div>
                          <div className="font-semibold text-slate-800 text-[11px]">
                            • Whitepaper: Architecture Blueprint Multi-AZ Uptime 99.999%
                          </div>
                        </div>
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
                          className="inline-flex items-center gap-1 text-[11px] font-mono text-brand-700 bg-emerald-50 px-2 py-0.5 rounded border border-brand-200 hover:bg-emerald-100 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{emailCopied ? 'Copied ✓' : 'Copy Email'}</span>
                        </button>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 font-mono text-xs text-slate-700 leading-relaxed space-y-2">
                        <div className="text-slate-500 text-[10px] space-y-0.5">
                          <div><strong>TO:</strong> Ban Giám đốc Kỹ thuật &amp; CTO &lt;cto@{selectedProject.organization?.toLowerCase() || 'client'}.vn&gt;</div>
                          <div><strong>SUBJECT:</strong> [Presaleee] Phản hồi kỹ thuật &amp; Kế hoạch nghiệm thu dự án: {selectedProject.title}</div>
                        </div>
                        <div className="border-t border-slate-200 pt-2 space-y-2">
                          <p>Kính gửi Ban Giám đốc Kỹ thuật &amp; Ban Quản lý dự án,</p>
                          <p>
                            Đội ngũ Presale Solutions xin chân thành cảm ơn quý khách hàng đã dành thời gian nghiên cứu và thẩm định hồ sơ kỹ thuật của dự án <strong>"{selectedProject.title}"</strong> trên Client Portal.
                          </p>
                          <p>
                            Theo dõi sự quan tâm của quý công ty đối với các điều khoản SLA sẵn sàng 99.999% và phạm vi công việc trong Scope of Work, đội ngũ kiến trúc sư của chúng tôi đã chuẩn bị sẵn phụ lục bảo mật chi tiết, cùng kịch bản kiểm thử tải trọng thực tế để sẵn sàng chuyển giao.
                          </p>
                          <p>
                            Kính mời quý công ty sắp xếp một buổi thảo luận ngắn 15-20 phút vào thứ Năm tuần này để hai bên cùng thống nhất các tiêu chí nghiệm thu UAT cho Phase 1, tạo tiền đề thuận lợi cho việc ký kết hợp đồng chính thức.
                          </p>
                          <p>
                            Trân trọng,<br />
                            <strong>{user?.fullName || 'Presale Consultant'}</strong> — Đội ngũ Giải pháp Presaleee
                          </p>
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-100/80 border border-slate-200/80 text-[11px] font-mono text-slate-500 flex items-center justify-between">
                        <span>Lưu ý: AI chỉ tạo bản nháp. Presale team có toàn quyền tùy chỉnh nội dung trước khi gửi.</span>
                        <button
                          onClick={() => setPortalModalOpen(true)}
                          className="text-brand-700 hover:underline font-bold"
                        >
                          Xem Portal Preview →
                        </button>
                      </div>
                    </div>

                  </div>

                </div>

              </div>
            )
          )}

        </div>

      </div>

      {/* EDIT INTAKE MODAL (Updated from Lead Intake block) */}
      {isEditModalOpen && selectedProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-brand-600" />
                <h3 className="text-sm font-bold text-slate-900 font-mono">
                  CHỈNH SỬA THÔNG TIN INTAKE
                </h3>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateLead} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Tên Dự Án (Title):
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-brand-500 font-sans"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Trạng Thái (Status):
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="NEW">NEW</option>
                    <option value="QUALIFIED">QUALIFIED</option>
                    <option value="IN_REVIEW">IN_REVIEW</option>
                    <option value="APPROVED">APPROVED</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Ngành Khách Hàng (Industry):
                  </label>
                  <input
                    type="text"
                    value={editIndustry}
                    onChange={(e) => setEditIndustry(e.target.value)}
                    placeholder="FinTech, E-commerce, GIS..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-brand-500 font-sans"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Ngân Sách Ước Tính (USD):
                  </label>
                  <input
                    type="number"
                    value={editBudget}
                    onChange={(e) => setEditBudget(e.target.value)}
                    placeholder="150000"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Tiến Độ (Tuần):
                  </label>
                  <input
                    type="number"
                    value={editTimeline}
                    onChange={(e) => setEditTimeline(e.target.value)}
                    placeholder="20"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Target SLA:
                  </label>
                  <input
                    type="text"
                    value={editTargetSla}
                    onChange={(e) => setEditTargetSla(e.target.value)}
                    placeholder="< 200ms Map Latency"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-brand-500 font-sans"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Peak Workload:
                  </label>
                  <input
                    type="text"
                    value={editPeakWorkload}
                    onChange={(e) => setEditPeakWorkload(e.target.value)}
                    placeholder="10,000 concurrent users"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-brand-500 font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Nội Dung Yêu Cầu RFP Thô:
                </label>
                <textarea
                  rows={4}
                  value={editRfpContent}
                  onChange={(e) => setEditRfpContent(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-brand-500 text-slate-800 leading-relaxed font-sans text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold shadow-xs disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Đang lưu...' : 'Lưu Thay Đổi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
