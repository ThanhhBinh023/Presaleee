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
  Send, 
  CheckCircle2, 
  ShieldCheck, 
  Zap, 
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
  FolderOpen,
  Clock,
  MessageSquare,
  ShieldAlert,
  FileCheck,
  Users,
  Lock
} from 'lucide-react';
import { navigateTo } from '../navigation';
import { ClientPortalModal } from './ClientPortalModal';
import { DiscoveryMeetingsTab } from './DiscoveryMeetingsTab';
import { ProposalStudioTab } from './ProposalStudioTab';
import { useToast } from './common/Toast';
import { portalStaffService } from '../services/portalService';
import type { PortalSessionDetail, PortalMaterialDetail } from '../types/portal';
import { fetchProposalByLead } from '../services/proposalService';
import type { ProposalItem } from '../services/proposalService';
import { formatDateTime } from '../utils/format';
import { ROLE_DETAILS } from './workspace/UserCard';
import type { UserRole } from '../types/auth';

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
  onNavigateVault: _onNavigateVault
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

  // Client Portal preview modal
  const [portalModalOpen, setPortalModalOpen] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);

  // CRUD Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isQualifying, setIsQualifying] = useState(false);

  // Role info & checks
  const isViewer = user?.role === 'VIEWER';
  const userRole = (user?.role || 'VIEWER') as UserRole;
  const roleInfo = ROLE_DETAILS[userRole] || ROLE_DETAILS.VIEWER;

  // Deal Team Allocation state (Requirement: not every lead needs all 6 roles)
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [selectedDealRoles, setSelectedDealRoles] = useState<UserRole[]>([]);

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

  const assignedRolesList: UserRole[] = React.useMemo(() => {
    if (!selectedProject) return [];
    const meta = selectedProject.extracted_metadata as any;
    const roles = meta?.assigned_roles || meta?.assignedRoles;
    if (Array.isArray(roles) && roles.length > 0) {
      return roles as UserRole[];
    }
    return ['SALES_REP', 'PRESALE_CONSULTANT', 'SOLUTION_ARCHITECT'];
  }, [selectedProject]);

  const openTeamModal = () => {
    setSelectedDealRoles([...assignedRolesList]);
    setIsTeamModalOpen(true);
  };

  const toggleDealRole = (role: UserRole) => {
    setSelectedDealRoles(prev => 
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  const handleSaveTeam = async () => {
    if (!selectedProject) return;
    if (selectedDealRoles.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 vai trò phụ trách lead.', 'Yêu cầu');
      return;
    }
    try {
      setIsSubmitting(true);
      const updatedMetadata = {
        ...(selectedProject.extracted_metadata || {}),
        assigned_roles: selectedDealRoles,
        assignedRoles: selectedDealRoles
      };
      const updated = await updateLead(selectedProject.id, {
        extracted_metadata: updatedMetadata
      });
      setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
      toast.success(`Đã cập nhật đội ngũ (${selectedDealRoles.length} vai trò) cho lead "${updated.title}"!`, 'Đội ngũ phụ trách');
      setIsTeamModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi cập nhật đội ngũ', 'Thất bại');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Real Client Intelligence State (Không dùng dữ liệu giả định)
  const [realProposal, setRealProposal] = useState<ProposalItem | null>(null);
  const [realSessions, setRealSessions] = useState<PortalSessionDetail[]>([]);
  const [realMaterials, setRealMaterials] = useState<PortalMaterialDetail[]>([]);
  const [isLoadingIntelligence, setIsLoadingIntelligence] = useState<boolean>(false);

  useEffect(() => {
    if (!selectedProjectId) {
      setRealProposal(null);
      setRealSessions([]);
      setRealMaterials([]);
      return;
    }

    let isCancelled = false;
    async function fetchRealData() {
      setIsLoadingIntelligence(true);
      try {
        const prop = await fetchProposalByLead(selectedProjectId);
        if (isCancelled) return;
        setRealProposal(prop);
        if (prop?.id) {
          try {
            const [sessRes, matRes] = await Promise.all([
              portalStaffService.listSessions(prop.id),
              portalStaffService.listMaterials(prop.id)
            ]);
            if (isCancelled) return;
            setRealSessions(sessRes.sessions || []);
            setRealMaterials(matRes.materials || []);
          } catch {
            if (!isCancelled) {
              setRealSessions([]);
              setRealMaterials([]);
            }
          }
        } else {
          setRealSessions([]);
          setRealMaterials([]);
        }
      } catch (err) {
        console.error('Failed to load real intelligence:', err);
      } finally {
        if (!isCancelled) setIsLoadingIntelligence(false);
      }
    }

    void fetchRealData();
    return () => {
      isCancelled = true;
    };
  }, [selectedProjectId]);

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
        activeProject={selectedProject}
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
              {selectedProject ? selectedProject.title : 'Chọn dự án làm việc'}
            </span>
          </div>

          {/* Quick Action - Only when project selected */}
          <div className="flex items-center gap-3">
            {selectedProject && (
              <button 
                onClick={() => setPortalModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-xs cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-brand-400" />
                <span>Preview Client Portal</span>
              </button>
            )}
          </div>

        </header>

        {/* Lead Title & Metrics Bar (Dynamic for Logged-in User) */}
        <div className="bg-white border-b border-slate-200 px-6 sm:px-8 py-5">
          
          <div className="max-w-7xl mx-auto space-y-3">
            
            {/* Dynamic Role Banner for All 6 Roles */}
            <div className={`px-4 py-2.5 rounded-2xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              userRole === 'ADMIN' ? 'bg-purple-50/70 border-purple-200 text-purple-900' :
              userRole === 'PRESALE_LEAD' ? 'bg-amber-50/70 border-amber-200 text-amber-900' :
              userRole === 'PRESALE_CONSULTANT' ? 'bg-emerald-50/70 border-brand-200 text-brand-950' :
              userRole === 'SOLUTION_ARCHITECT' ? 'bg-sky-50/70 border-sky-200 text-sky-950' :
              userRole === 'SALES_REP' ? 'bg-indigo-50/70 border-indigo-200 text-indigo-950' :
              'bg-slate-100 border-slate-300 text-slate-800'
            }`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`px-2 py-0.5 rounded-md font-mono font-bold text-[10px] uppercase border shrink-0 ${roleInfo.badgeClass}`}>
                  {userRole}
                </span>
                <span className="font-semibold text-xs truncate sm:whitespace-normal">
                  {userRole === 'ADMIN' && '👑 Quản trị viên: Toàn quyền phê duyệt, quản lý thành viên, cấu hình và xóa dữ liệu.'}
                  {userRole === 'PRESALE_LEAD' && '⭐ Presale Lead: Phê duyệt Proposal (DRAFT -> APPROVED), cấu hình Rate Cards, duyệt gửi Client Portal.'}
                  {userRole === 'PRESALE_CONSULTANT' && '💡 Presale Consultant: Tiếp nhận AI Intake, điều phối Discovery và hoàn thiện ma trận 10-Sheet Proposal.'}
                  {userRole === 'SOLUTION_ARCHITECT' && '📐 Solution Architect: Thiết kế Kiến trúc, Tech Stack, Technical Sessions và rà soát RAID Log.'}
                  {userRole === 'SALES_REP' && '🚀 Sales Rep: Tiếp nhận RFP ban đầu, thẩm định BANT AI, theo dõi Pipeline và chia sẻ Client Portal.'}
                  {userRole === 'VIEWER' && '🔒 Chế độ Chỉ đọc: Được phép xem mọi tài liệu và xuất Excel/PDF. Các thao tác chỉnh sửa/xóa bị khóa an toàn.'}
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-500 shrink-0 flex items-center gap-1.5">
                {isViewer ? (
                  <>
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Chỉ đọc (Read-Only)</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-brand-600" />
                    <span>Toàn quyền chỉnh sửa</span>
                  </>
                )}
              </div>
            </div>

            {/* Top Row: Path & Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-slate-400">Tổ chức:</span>
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  {organization?.name || user?.fullName || 'DUT'}
                  <span className={`w-2 h-2 rounded-full ${selectedProject ? 'bg-brand-500' : 'bg-slate-300'}`}></span>
                </span>
                {selectedProject && (
                  <span className="text-slate-400 ml-2">ID: {selectedProject.id.slice(0, 8)}...</span>
                )}
              </div>

              {selectedProject && (
                <div className="flex items-center gap-2">
                  {isViewer ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 border border-slate-200 text-xs font-mono font-semibold" title="Tài khoản VIEWER không có quyền nộp phê duyệt">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Submit for Review (Chỉ đọc)</span>
                    </span>
                  ) : (
                    <button 
                      onClick={() => toast.info('Hồ sơ đề xuất đã gửi để xét duyệt nội bộ.', 'Trình duyệt')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit for Review</span>
                    </button>
                  )}
                </div>
              )}
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
                  Qualification Score: <strong>{selectedProject.qualification_score ? `${selectedProject.qualification_score}/100` : 'Chờ thẩm định'}</strong>
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
            ) : projects.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-200 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse"></span>
                  HỆ THỐNG CÓ {projects.length} DỰ ÁN SẴN SÀNG
                </span>
                <span className="text-slate-500 text-xs">
                  (Vui lòng chọn một dự án ở danh mục bên dưới để bắt đầu làm việc)
                </span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 font-semibold">
                  CHƯA CÓ YÊU CẦU RFP NÀO
                </span>
                <button onClick={onNavigateRfps} className="text-brand-700 underline text-xs font-bold">
                  + Tạo yêu cầu RFP đầu tiên
                </button>
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
                        {!isViewer && (
                          <button
                            onClick={handleDeleteLead}
                            title="Xóa Intake này"
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
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
                  {isViewer ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 border border-slate-200 text-xs font-mono font-semibold">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Chế độ chỉ đọc</span>
                    </span>
                  ) : (
                    <>
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
                    </>
                  )}
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
                      {!isViewer && (
                        <button
                          onClick={openEditModal}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-mono font-semibold shadow-2xs transition-all cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-brand-600" />
                          <span>Chỉnh sửa (Update)</span>
                        </button>
                      )}
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

                  {/* PRESALE DEAL TEAM ALLOCATION CARD (Requirement: "Coding chức năng theo cả 6 role... Lưu ý: không phải lead nào cũng cần có cả 6 role") */}
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Users className="w-5 h-5 text-brand-600" />
                          <h3 className="text-base font-bold text-slate-900">
                            Đội ngũ Phụ trách Lead (Presale Deal Team)
                          </h3>
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                            {assignedRolesList.length} / 6 Vai trò
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-mono mt-1">
                          Lưu ý: Không phải lead nào cũng cần có cả 6 role. Tùy biến đội ngũ linh hoạt theo quy mô và tính chất dự án.
                        </p>
                      </div>
                      {!isViewer && (
                        <button
                          onClick={openTeamModal}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-brand-200 bg-emerald-50 hover:bg-emerald-100 text-brand-800 text-xs font-mono font-semibold transition-all shrink-0 cursor-pointer shadow-2xs"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-brand-600" />
                          <span>Tùy biến Đội ngũ</span>
                        </button>
                      )}
                    </div>

                    {/* Active Roles Display */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {assignedRolesList.map((r) => {
                        const info = ROLE_DETAILS[r as UserRole] || ROLE_DETAILS.VIEWER;
                        return (
                          <div key={r} className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/70 flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-xl ${info.iconBg} text-white flex items-center justify-center font-bold font-mono text-xs shrink-0 shadow-xs mt-0.5`}>
                              {r.slice(0, 2)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${info.badgeClass}`}>
                                  {r}
                                </span>
                              </div>
                              <div className="text-xs font-bold text-slate-800 line-clamp-1">{info.nameVi.split('(')[0]}</div>
                              <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-snug">
                                {info.description}
                              </p>
                            </div>
                          </div>
                        );
                      })}
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

          {/* TAB 5: CLIENT INTELLIGENCE (Real Data Only - Zero Mock) */}
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
                  Vui lòng chọn một dự án từ danh mục phía trên để theo dõi tín hiệu tương tác Client Portal (Signals) và phân tích Lead Intelligence thực tế.
                </p>
              </div>
            ) : (() => {
              const activeSessionsCount = realSessions.filter(s => !s.revokedAt).length;
              const lastAccessedSession = realSessions
                .filter(s => Boolean(s.lastAccessedAt))
                .sort((a, b) => new Date(b.lastAccessedAt!).getTime() - new Date(a.lastAccessedAt!).getTime())[0];
              const totalComments = realSessions.reduce((acc, s) => acc + (s.commentCount || 0), 0);

              // Calculate real info completeness
              const meta = selectedProject.extracted_metadata || {};
              const checks = [
                Boolean(meta.budgetUsd),
                Boolean(meta.timelineWeeks),
                Boolean(meta.techStack && meta.techStack.length > 0),
                Boolean(selectedProject.requirements_summary || selectedProject.client_request_raw),
                Boolean(realProposal)
              ];
              const completenessPercent = Math.round((checks.filter(Boolean).length / checks.length) * 100);

              // Real risks derived from database fields
              const realRisks: string[] = [];
              if (!meta.budgetUsd) realRisks.push('Ngân sách chưa được xác nhận trong yêu cầu RFP (Budget TBD).');
              if (!meta.timelineWeeks) realRisks.push('Chưa xác định thời hạn bàn giao mục tiêu (Target Timeline undefined).');
              if (!meta.complianceStandards || meta.complianceStandards.length === 0) {
                realRisks.push('Chưa làm rõ các tiêu chuẩn tuân thủ & bảo mật bắt buộc.');
              }
              if (!realProposal) {
                realRisks.push('Hồ sơ kỹ thuật Proposal 10 Sheets chưa được khởi tạo.');
              }
              if (realSessions.length === 0) {
                realRisks.push('Chưa cấp phiên truy cập Client Portal để khách hàng xem và phản hồi.');
              }

              // Real Next Best Actions
              const nextActions: { title: string; desc: string; isHighPriority?: boolean }[] = [];
              if (!realProposal) {
                nextActions.push({
                  title: '1. Khởi tạo Hồ sơ Đề xuất Kỹ thuật (10 Sheets)',
                  desc: 'Chuyển sang tab Proposal Builder v2.4 để AI tổng hợp thông số dự án thành bộ 10 sheets hoàn chỉnh.',
                  isHighPriority: true
                });
              } else if (realSessions.length === 0) {
                nextActions.push({
                  title: '1. Tạo phiên truy cập Client Portal',
                  desc: `Hồ sơ "${realProposal.title}" đã sẵn sàng (${realProposal.status}). Hãy tạo phiên portal để cấp link an toàn cho khách hàng.`,
                  isHighPriority: true
                });
              } else if (!lastAccessedSession) {
                nextActions.push({
                  title: '1. Theo dõi mở liên kết Client Portal',
                  desc: `Đã cấp ${realSessions.length} phiên truy cập nhưng khách hàng chưa mở link. Hãy gửi email nhắc nhở hoặc kiểm tra lại thông tin liên hệ.`,
                  isHighPriority: true
                });
              } else {
                nextActions.push({
                  title: '1. Họp thống nhất tiêu chí kỹ thuật & Phản hồi',
                  desc: `Khách hàng (${lastAccessedSession.clientEmail}) đã truy cập portal lúc ${formatDateTime(lastAccessedSession.lastAccessedAt!)}. Lên lịch Discovery/Technical meeting để chốt phạm vi.`,
                  isHighPriority: true
                });
              }

              if (realRisks.length > 0) {
                nextActions.push({
                  title: '2. Bổ sung làm rõ các thông số còn thiếu',
                  desc: realRisks[0]
                });
              }

              return (
                <div className="space-y-6">
                  {/* 1. Real Signals Header Card */}
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
                          {isLoadingIntelligence && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-brand-600 font-mono animate-pulse">
                              <RefreshCw className="w-3 h-3 animate-spin" /> Đang đồng bộ...
                            </span>
                          )}
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                          Client Engagement Tracking &amp; Lead Intelligence
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Dữ liệu thực tế 100% từ cơ sở dữ liệu hệ thống (Sessions, Materials, Proposals &amp; RFP). Tuyệt đối không dùng dữ liệu giả định.
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

                    {/* 4 Real Signals Cards */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider">
                          Dữ liệu Tương tác Thực tế (Portal Telemetry)
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                          Live DB Signals
                        </span>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 relative overflow-hidden">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">PORTAL SESSIONS</span>
                            <Globe className="w-4 h-4 text-brand-600" />
                          </div>
                          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                            {realSessions.length} Phiên
                          </div>
                          <span className="text-[11px] text-brand-700 font-semibold block mt-1">
                            {activeSessionsCount} phiên đang hiệu lực
                          </span>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 relative overflow-hidden">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">LẦN TRUY CẬP CUỐI</span>
                            <Clock className="w-4 h-4 text-brand-600" />
                          </div>
                          <div className="text-sm font-bold font-mono text-slate-900 mt-2 truncate">
                            {lastAccessedSession?.lastAccessedAt 
                              ? formatDateTime(lastAccessedSession.lastAccessedAt)
                              : 'Chưa truy cập'}
                          </div>
                          <span className="text-[11px] text-slate-500 font-semibold block mt-1 truncate">
                            {lastAccessedSession ? lastAccessedSession.clientEmail : 'Chưa phát sinh lượt truy cập'}
                          </span>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 relative overflow-hidden">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">TÀI LIỆU CHIA SẺ</span>
                            <FileCheck className="w-4 h-4 text-brand-600" />
                          </div>
                          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                            {realMaterials.length} File
                          </div>
                          <span className="text-[11px] text-brand-700 font-semibold block mt-1">
                            {realProposal ? `Proposal v${realProposal.version}` : 'Chưa gắn Proposal'}
                          </span>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 relative overflow-hidden">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">CLIENT COMMENTS</span>
                            <MessageSquare className="w-4 h-4 text-brand-600" />
                          </div>
                          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                            {totalComments} Phản hồi
                          </div>
                          <span className="text-[11px] text-brand-700 font-semibold block mt-1">
                            Từ các phiên Client Portal
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Real Session & Material Detail Tables */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
                      {/* Left: Active Portal Sessions list */}
                      <div className="lg:col-span-7 space-y-3">
                        <div className="text-xs font-mono font-bold text-slate-800 uppercase flex items-center justify-between">
                          <span>DANH SÁCH PHIÊN CLIENT PORTAL THỰC TẾ:</span>
                          <span className="text-[10px] text-slate-400 font-normal">Nguồn: portal_sessions</span>
                        </div>

                        {realSessions.length === 0 ? (
                          <div className="p-6 rounded-2xl bg-slate-50/70 border border-dashed border-slate-300 text-center space-y-2">
                            <Globe className="w-6 h-6 text-slate-400 mx-auto" />
                            <p className="text-xs font-semibold text-slate-700">Chưa có phiên Client Portal nào</p>
                            <p className="text-[11px] text-slate-500">
                              Dự án này chưa phát sinh liên kết truy cập an toàn cho khách hàng.
                            </p>
                            <button
                              onClick={() => navigateTo('portal')}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold cursor-pointer"
                            >
                              <span>Tạo phiên truy cập tại Client Portal Desk</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-2 text-xs font-mono">
                            {realSessions.map((s) => (
                              <div key={s.id} className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                                <div className="space-y-0.5 min-w-0">
                                  <div className="font-bold text-slate-800 truncate flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                                    <span>{s.clientEmail}</span>
                                    {s.clientName && <span className="text-slate-400 font-normal">({s.clientName})</span>}
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    Tạo: {formatDateTime(s.createdAt)} | Hết hạn: {formatDateTime(s.expiresAt)}
                                  </div>
                                  <div className="text-[10px] text-brand-700">
                                    {s.lastAccessedAt ? `Lần xem cuối: ${formatDateTime(s.lastAccessedAt)}` : 'Chưa mở link'}
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    s.revokedAt 
                                      ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  }`}>
                                    {s.revokedAt ? 'Đã thu hồi' : 'Hoạt động'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Right: Proposal & Materials Status */}
                      <div className="lg:col-span-5 space-y-3">
                        <div className="text-xs font-mono font-bold text-slate-800 uppercase flex items-center justify-between">
                          <span>HỒ SƠ ĐỀ XUẤT &amp; TÀI LIỆU KÈM THEO:</span>
                          <span className="text-[10px] text-slate-400 font-normal">Nguồn: proposals &amp; materials</span>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-3 text-xs font-mono">
                          <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Hồ sơ Proposal 10 Sheets</span>
                            {realProposal ? (
                              <div>
                                <div className="font-bold text-slate-800 text-[11px]">{realProposal.title}</div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-50 text-brand-700 border border-brand-200">
                                    Trạng thái: {realProposal.status}
                                  </span>
                                  <span className="text-[10px] text-slate-500">Phiên bản: v{realProposal.version}</span>
                                </div>
                              </div>
                            ) : (
                              <p className="text-[11px] text-amber-700">Chưa có bản ghi proposal trong cơ sở dữ liệu.</p>
                            )}
                          </div>

                          <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Tài liệu chia sẻ ({realMaterials.length})</span>
                            {realMaterials.length === 0 ? (
                              <p className="text-[11px] text-slate-500">Chưa có tài liệu bổ sung nào được tải lên portal.</p>
                            ) : (
                              <div className="space-y-1">
                                {realMaterials.map(m => (
                                  <div key={m.id} className="text-[11px] text-slate-700 flex items-center justify-between">
                                    <span className="truncate">{m.title || m.fileName}</span>
                                    <span className="text-slate-400 text-[10px]">{m.mimeType || 'Đính kèm'}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. LEAD INTELLIGENCE 5 DIMENSIONS (Derived From Real DB Fields) */}
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-5">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 font-mono uppercase tracking-wider flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-brand-600" />
                          <span>Lead Intelligence Assessment (5 Dimensions)</span>
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Đánh giá dựa 100% trên dữ liệu thực tế từ hồ sơ RFP, điểm thẩm định BANT và trạng thái hồ sơ trong hệ thống.
                        </p>
                      </div>
                      <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-xl bg-brand-50 text-brand-700 border border-brand-200">
                        BANT Score: {selectedProject.qualification_score !== null ? `${selectedProject.qualification_score}/100` : 'Chưa thẩm định'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 text-xs font-mono">
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                        <span className="text-[10px] text-slate-400 block font-bold">1. LEAD HEALTH</span>
                        <div className="text-xl font-bold text-brand-700 mt-1">
                          {selectedProject.qualification_score !== null ? `${selectedProject.qualification_score}%` : 'N/A'}
                        </div>
                        <span className="text-[10px] text-emerald-700 font-semibold mt-0.5 block">
                          {selectedProject.qualification_status || 'Chưa phân loại'}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                        <span className="text-[10px] text-slate-400 block font-bold">2. PROPOSAL READINESS</span>
                        <div className="text-xl font-bold text-slate-800 mt-1">
                          {realProposal ? '100%' : '0%'}
                        </div>
                        <span className="text-[10px] text-slate-500 block mt-0.5 truncate">
                          {realProposal ? `Đã có v${realProposal.version}` : 'Chưa lập hồ sơ'}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                        <span className="text-[10px] text-slate-400 block font-bold">3. CLIENT ENGAGEMENT</span>
                        <div className="text-xl font-bold text-emerald-700 mt-1">
                          {realSessions.length > 0 ? (lastAccessedSession ? 'Đã xem' : 'Đã cấp link') : 'Chưa cấp'}
                        </div>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          {realSessions.length} phiên portal
                        </span>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                        <span className="text-[10px] text-slate-400 block font-bold">4. INFO COMPLETENESS</span>
                        <div className="text-xl font-bold text-slate-800 mt-1">
                          {completenessPercent}%
                        </div>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          Độ khớp thông số RFP
                        </span>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 col-span-2 lg:col-span-1">
                        <span className="text-[10px] text-slate-400 block font-bold">5. IDENTIFIED RISKS</span>
                        <div className="text-xl font-bold text-amber-700 mt-1">
                          {realRisks.length === 0 ? 'Thấp' : `${realRisks.length} lưu ý`}
                        </div>
                        <span className="text-[10px] text-amber-600 block mt-0.5">
                          {realRisks.length === 0 ? 'Dữ liệu đầy đủ' : 'Cần bổ sung'}
                        </span>
                      </div>
                    </div>

                    {/* Risks Alert Details */}
                    {realRisks.length > 0 && (
                      <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-start gap-3">
                        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div className="text-xs space-y-1">
                          <div className="font-bold text-amber-900 font-mono">
                            Điểm lưu ý tiềm ẩn rủi ro dựa trên dữ liệu hiện có:
                          </div>
                          <ul className="text-slate-600 list-disc pl-4 space-y-0.5">
                            {realRisks.map((r, i) => (
                              <li key={i}>{r}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3. AI RECOMMENDATIONS & NEXT BEST ACTIONS (Real Project Context) */}
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-6">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 font-mono uppercase tracking-wider flex items-center gap-2">
                          <Zap className="w-4 h-4 text-brand-600" />
                          <span>Hành Động Khuyến Nghị &amp; Bước Tiếp Theo</span>
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Tự động tính toán theo trạng thái thực tế của dự án "{selectedProject.title}".
                        </p>
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        Tự động sinh theo dữ liệu
                      </span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      {/* Left: Next Best Action & Discussion Topics (5 cols) */}
                      <div className="lg:col-span-5 space-y-4">
                        <div className="space-y-3">
                          <div className="text-xs font-mono font-bold text-slate-800 uppercase flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-brand-600" />
                            <span>HÀNH ĐỘNG ĐỀ XUẤT HÀNG ĐẦU:</span>
                          </div>

                          {nextActions.map((act, i) => (
                            <div 
                              key={i} 
                              className={`p-4 rounded-2xl border space-y-1.5 ${
                                act.isHighPriority 
                                  ? 'bg-emerald-50/70 border-brand-200 text-brand-900' 
                                  : 'bg-slate-50 border-slate-200 text-slate-900'
                              }`}
                            >
                              <div className="font-bold text-xs">{act.title}</div>
                              <p className="text-[11px] text-slate-600 font-mono">{act.desc}</p>
                            </div>
                          ))}
                        </div>

                        {/* Suggested Discussion Topics */}
                        <div className="space-y-2 pt-2">
                          <div className="text-xs font-mono font-bold text-slate-800 uppercase">
                            NỘI DUNG TRAO ĐỔI VỚI KHÁCH HÀNG:
                          </div>
                          <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 font-mono">
                            <li>Làm rõ phạm vi và các mốc bàn giao kỹ thuật cho dự án "{selectedProject.title}".</li>
                            {meta.timelineWeeks && (
                              <li>Thống nhất lộ trình triển khai trong thời hạn {meta.timelineWeeks} tuần.</li>
                            )}
                            {meta.budgetUsd && (
                              <li>Xác nhận cơ cấu thanh toán tương ứng với ngân sách ${Number(meta.budgetUsd).toLocaleString()} USD.</li>
                            )}
                            <li>Khảo sát và xác thực lại môi trường hạ tầng trước khi ký kết SOW chính thức.</li>
                          </ul>
                        </div>
                      </div>

                      {/* Right: Suggested Follow-up Email Draft (7 cols) */}
                      <div className="lg:col-span-7 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-slate-800 uppercase">
                            EMAIL DRAFT GỬI KHÁCH HÀNG (THEO DỰ ÁN THẬT):
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
                            <div><strong>TO:</strong> {realSessions[0]?.clientEmail || `contact@${selectedProject.organization?.toLowerCase() || 'client'}.vn`}</div>
                            <div><strong>SUBJECT:</strong> [Presaleee] Hồ sơ Kỹ thuật &amp; Kế hoạch phối hợp: {selectedProject.title}</div>
                          </div>
                          <div className="border-t border-slate-200 pt-2 space-y-2">
                            <p>Kính gửi Quý đối tác / Ban Quản lý dự án {selectedProject.organization || ''},</p>
                            <p>
                              Đội ngũ Presale xin chân thành cảm ơn Quý đơn vị đã cùng phối hợp làm rõ các yêu cầu kỹ thuật cho dự án <strong>"{selectedProject.title}"</strong>.
                            </p>
                            {realProposal ? (
                              <p>
                                Hiện tại hồ sơ đề xuất giải pháp kỹ thuật (Proposal 10 Sheets phiên bản v{realProposal.version}) đã được hoàn thiện trên hệ thống Client Portal để Quý đối tác thẩm định trực tiếp và gửi các phản hồi kỹ thuật.
                              </p>
                            ) : (
                              <p>
                                Đội ngũ kỹ sư giải pháp đang hoàn tất các phân tích kỹ thuật và ma trận phạm vi công việc dựa trên yêu cầu RFP đã tiếp nhận để sớm bàn giao hồ sơ đề xuất hoàn chỉnh.
                              </p>
                            )}
                            <p>
                              Kính mời Quý công ty sắp xếp một buổi thảo luận ngắn (15-20 phút) để hai bên cùng rà soát các tiêu chí kỹ thuật và lộ trình triển khai phù hợp nhất.
                            </p>
                            <p>
                              Trân trọng,<br />
                              <strong>{user?.fullName || 'Presale Consultant'}</strong> — Presale Solutions Team
                            </p>
                          </div>
                        </div>

                        <div className="p-3 rounded-2xl bg-slate-100/80 border border-slate-200/80 text-[11px] font-mono text-slate-500 flex items-center justify-between">
                          <span>Nội dung được điền tự động từ dữ liệu dự án thực tế.</span>
                          <button
                            onClick={() => setPortalModalOpen(true)}
                            className="text-brand-700 hover:underline font-bold cursor-pointer"
                          >
                            Xem Portal Preview →
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()
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

      {/* PRESALE DEAL TEAM CUSTOMIZATION MODAL */}
      {isTeamModalOpen && selectedProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-50 border border-brand-200 text-brand-700 flex items-center justify-center font-bold">
                  <Users className="w-5 h-5 text-brand-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Tùy biến Đội ngũ Phụ trách Lead (Presale Deal Team)
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Lead: <strong className="text-slate-800">{selectedProject.title}</strong>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsTeamModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Note on 6 roles */}
            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong>Lưu ý quan trọng:</strong> Không phải lead nào cũng cần có cả 6 role. Hãy tùy chọn các vai trò tham gia phù hợp với quy mô cơ hội, tiến độ và ngân sách dự án.
              </div>
            </div>

            {/* Quick Presets */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                GỢI Ý PHÂN BỔ NHANH THEO QUY MÔ DEAL:
              </span>
              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedDealRoles(['SALES_REP', 'SOLUTION_ARCHITECT'])}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium transition-colors cursor-pointer"
                >
                  ⚡ Deal Nhỏ (Fast-Track: 2 vai trò)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDealRoles(['SALES_REP', 'PRESALE_CONSULTANT', 'SOLUTION_ARCHITECT'])}
                  className="px-3 py-1.5 rounded-xl border border-brand-200 bg-brand-50 hover:bg-brand-100 text-brand-800 font-semibold transition-colors cursor-pointer"
                >
                  💼 Tiêu Chuẩn (Standard: 3 vai trò)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDealRoles(['PRESALE_LEAD', 'PRESALE_CONSULTANT', 'SOLUTION_ARCHITECT', 'SALES_REP'])}
                  className="px-3 py-1.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-800 font-semibold transition-colors cursor-pointer"
                >
                  🏢 Doanh Nghiệp Lớn (Enterprise: 4 vai trò)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDealRoles(['ADMIN', 'PRESALE_LEAD', 'PRESALE_CONSULTANT', 'SOLUTION_ARCHITECT', 'SALES_REP', 'VIEWER'])}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold transition-colors cursor-pointer"
                >
                  🌐 Đầy Đủ (Tất cả 6 vai trò)
                </button>
              </div>
            </div>

            {/* 6 Role Selection Cards */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-slate-600 uppercase text-[10px]">
                  DANH SÁCH 6 VAI TRÒ HỆ THỐNG:
                </span>
                <span className="text-brand-700 font-bold">
                  Đã chọn: {selectedDealRoles.length} / 6 vai trò
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(Object.keys(ROLE_DETAILS) as UserRole[]).map((r) => {
                  const info = ROLE_DETAILS[r];
                  const isSelected = selectedDealRoles.includes(r);
                  return (
                    <div
                      key={r}
                      onClick={() => toggleDealRole(r)}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
                        isSelected
                          ? 'border-brand-500 bg-emerald-50/50 shadow-xs ring-1 ring-brand-500'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="mt-1 w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${info.badgeClass}`}>
                            {r}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-800">{info.nameVi.split('(')[0]}</div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                          {info.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs">
              <span className="text-slate-400 font-mono text-[11px]">
                Cập nhật vào metadata của Lead
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsTeamModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveTeam}
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Đang lưu...' : 'Lưu Đội Ngũ Lead'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
