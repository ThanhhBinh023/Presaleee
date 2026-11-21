import React, { useState, useEffect } from 'react';
import type { LeadItem } from '../services/leadService';
import type { LeadQualification, LeadStatus } from '../types/lead';
import { LEAD_TRANSITIONS, isLeadQualification } from '../types/lead';
import { fetchLeads, getLeadById, qualifyLead, updateLead, updateLeadStatus, deleteLead } from '../services/leadService';
import { useAuth } from '../hooks/useAuth';
import { useOrganizations } from '../hooks/useOrganizations';
import { AppSidebar } from './workspace/AppSidebar';
import { 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  Zap, 
  Globe,
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
  Lock,
  FolderKanban,
  LayoutGrid,
  ChevronDown,
  Check,
  Search,
  Plus,
  Building2,
  XCircle,
  Send
} from 'lucide-react';
import { navigateTo } from '../navigation';
import { ClientPortalModal } from './ClientPortalModal';
import { ProjectMembersModal } from './ProjectMembersModal';
import { DiscoveryMeetingsTab } from './DiscoveryMeetingsTab';
import { ProposalStudioTab } from './ProposalStudioTab';
import { useToast } from './common/Toast';
import { portalStaffService } from '../services/portalService';
import type { PortalSessionDetail, PortalMaterialDetail } from '../types/portal';
import { fetchProposalByLead, updateProposalLifecycle, submitProposalForReview } from '../services/proposalService';
import type { ProposalItem } from '../services/proposalService';
import { formatDateTime } from '../utils/format';
import type { UserRole } from '../types/auth';

interface AIWorkspaceProps {
  onNavigateOverview: () => void;
  onLogout: () => void;
  onNavigateRfps?: () => void;
  onNavigateVault?: () => void;
  onNavigatePipelines?: () => void;
}

const BANT_PILLARS = ['budget', 'authority', 'need', 'timeline'] as const;

export const AIWorkspace: React.FC<AIWorkspaceProps> = ({ 
  onNavigateOverview, 
  onLogout,
  onNavigateRfps,
  onNavigateVault: _onNavigateVault,
  onNavigatePipelines
}) => {
  const toast = useToast();
  const { user } = useAuth();
  const { primary: organization } = useOrganizations();

  // Multi-project support & Block Manager
  const [projects, setProjects] = useState<LeadItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [loadingProjects, setLoadingProjects] = useState<boolean>(true);
  const [isProjectSelectorModalOpen, setIsProjectSelectorModalOpen] = useState(false);
  const [projectSearchTerm, setProjectSearchTerm] = useState('');
  const [isEditingRaw, setIsEditingRaw] = useState(false);
  const [editedRawContent, setEditedRawContent] = useState('');
  const [isSavingRaw, setIsSavingRaw] = useState(false);

  // PBAC Modal state
  const [isProjectMembersModalOpen, setIsProjectMembersModalOpen] = useState(false);

  // Requirement 2: Default subnav is 'Intake & Scope'
  const [activeSubnav, setActiveSubnav] = useState<'Intake & Scope' | 'Discovery Meetings' | 'Technical Sessions' | 'Proposal Builder v2.4' | 'Client Intelligence'>('Intake & Scope');

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

  const filteredProjects = React.useMemo(() => {
    const term = projectSearchTerm.trim().toLowerCase();
    if (!term) return projects;
    return projects.filter(p => {
      const meta = (p.extractedMetadata as any) || {};
      const industry = meta.clientIndustry || '';
      return p.title.toLowerCase().includes(term) ||
             p.status.toLowerCase().includes(term) ||
             industry.toLowerCase().includes(term);
    });
  }, [projects, projectSearchTerm]);

  // PBAC (Project-Based Access Control) calculation
  const isOrgAdmin = user?.role === 'ADMIN';

  // System Admin is separated: cannot access lead workspace unless invited by project leader
  const isAdminInvited = React.useMemo(() => {
    if (!isOrgAdmin || !selectedProject) return true;
    if (Array.isArray(selectedProject.projectMembers)) {
      return selectedProject.projectMembers.some(m => m.userId === user?.id);
    }
    return false;
  }, [isOrgAdmin, selectedProject, user]);

  const effectiveProjectRole: UserRole = React.useMemo(() => {
    if (!selectedProject) return (user?.role || 'VIEWER') as UserRole;
    if (isOrgAdmin) {
      if (isAdminInvited && selectedProject.myRoleInProject) {
        return selectedProject.myRoleInProject;
      }
      return 'VIEWER';
    }
    if (selectedProject.myRoleInProject) return selectedProject.myRoleInProject;
    if (selectedProject.createdBy === user?.id || selectedProject.assignedTo === user?.id) return 'PRESALE_LEAD';
    return (user?.role || 'VIEWER') as UserRole;
  }, [selectedProject, user, isOrgAdmin, isAdminInvited]);

  const isProjectLeader = !isOrgAdmin && effectiveProjectRole === 'PRESALE_LEAD';
  const isSalesRep = !isOrgAdmin && effectiveProjectRole === 'SALES_REP';
  const isPresaleConsultant = !isOrgAdmin && effectiveProjectRole === 'PRESALE_CONSULTANT';
  const isProjectViewer = isOrgAdmin || effectiveProjectRole === 'VIEWER';
  const isViewer = isProjectViewer;

  /**
   * The stored BANT result. `/qualify` and `/qualifications` both persist the canonical
   * `{score, criteria, …}` shape into `bant_details`, so one guard covers every saved row.
   */
  const storedDetails = selectedProject?.bantDetails;
  const storedQualification: LeadQualification | null = isLeadQualification(storedDetails) ? storedDetails : null;

  // Real Client Intelligence State (Không dùng dữ liệu giả định)
  const [realProposal, setRealProposal] = useState<ProposalItem | null>(null);
  const [realSessions, setRealSessions] = useState<PortalSessionDetail[]>([]);
  const [realMaterials, setRealMaterials] = useState<PortalMaterialDetail[]>([]);
  const [isLoadingIntelligence, setIsLoadingIntelligence] = useState<boolean>(false);

  // Completion check: Once a proposal/deal is approved, ONLY Presale Lead can edit
  const isDealCompleted = selectedProject?.status === 'APPROVED' || selectedProject?.status === 'WON' || realProposal?.status === 'APPROVED' || realProposal?.status === 'SENT_TO_CLIENT';
  const canEditLead = !isViewer && !isSalesRep && !isPresaleConsultant && (!isDealCompleted || isProjectLeader);

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

  // Load full lead details (including PBAC memberships & dynamic project role)
  useEffect(() => {
    if (!selectedProjectId) return;
    let isCancelled = false;
    async function loadLeadFullDetail() {
      try {
        const fullDetail = await getLeadById(selectedProjectId);
        if (fullDetail && !isCancelled) {
          setProjects(prev => prev.map(p => p.id === fullDetail.id ? { ...p, ...fullDetail } : p));
        }
      } catch (err) {
        console.error('Failed to load full lead details:', err);
      }
    }
    void loadLeadFullDetail();
    return () => { isCancelled = true; };
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
    setEditRfpContent(selectedProject.rawRfpContent || '');
    setEditSource(selectedProject.source || 'INBOUND_EMAIL');
    setEditStatus(selectedProject.status || 'NEW');
    setEditIndustry(selectedProject.extractedMetadata?.clientIndustry || '');
    setEditBudget(selectedProject.extractedMetadata?.budgetUsd || '');
    setEditTimeline(selectedProject.extractedMetadata?.timelineWeeks || '');
    setEditTargetSla(selectedProject.extractedMetadata?.target_sla || '');
    setEditPeakWorkload(selectedProject.extractedMetadata?.peak_workload || '');
    setIsEditModalOpen(true);
  };

  // Handle Update Lead
  const handleUpdateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    try {
      setIsSubmitting(true);
      const updatedMetadata = {
        ...(selectedProject.extractedMetadata || {}),
        clientIndustry: editIndustry || undefined,
        budgetUsd: editBudget ? Number(editBudget) : undefined,
        timelineWeeks: editTimeline ? Number(editTimeline) : undefined,
        target_sla: editTargetSla || undefined,
        peak_workload: editPeakWorkload || undefined
      };

      const updated = await updateLead(selectedProject.id, {
        title: editTitle.trim() || selectedProject.title,
        source: editSource || selectedProject.source,
        rawRfpContent: editRfpContent,
        extractedMetadata: updatedMetadata
      });

      const nextStatus = editStatus || updated.status;
      if (nextStatus === updated.status) {
        setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
        toast.success(`Đã cập nhật Intake "${updated.title}"!`, 'Cập nhật thành công');
        setIsEditModalOpen(false);
        return;
      }

      try {
        const statusUpdated = await updateLeadStatus(updated.id, nextStatus);
        setProjects(prev => prev.map(p => p.id === statusUpdated.id ? statusUpdated : p));
        toast.success(`Đã cập nhật Intake "${statusUpdated.title}"!`, 'Cập nhật thành công');
        setIsEditModalOpen(false);
      } catch (statusErr: any) {
        // The field edits are already stored; only the transition was refused by the backend state machine.
        setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
        toast.error(statusErr?.message || 'Backend từ chối chuyển trạng thái này.', `Nội dung đã lưu — trạng thái vẫn là ${updated.status}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi cập nhật Intake', 'Thất bại');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveRawContent = async () => {
    if (!selectedProject) return;
    try {
      setIsSavingRaw(true);
      const updated = await updateLead(selectedProject.id, {
        rawRfpContent: editedRawContent
      });
      setProjects(prev => prev.map(p => p.id === updated.id ? { ...p, rawRfpContent: updated.rawRfpContent } : p));
      setIsEditingRaw(false);
      toast.success('Đã lưu nội dung RFP thô! Bạn có thể bấm "Thẩm Định BANT AI" để cập nhật điểm mới.', 'Cập nhật RFP');
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi lưu nội dung thô', 'Lỗi');
    } finally {
      setIsSavingRaw(false);
    }
  };

  const handleDeleteLeadById = async (targetLeadId: string, leadTitle: string) => {
    const confirmDelete = window.confirm(`Bạn có chắc chắn muốn xóa dự án "${leadTitle}" và toàn bộ dữ liệu họp / đề xuất liên quan không?`);
    if (!confirmDelete) return;

    try {
      await deleteLead(targetLeadId);
      toast.success(`Đã xóa thành công dự án "${leadTitle}"`, 'Đã xóa');
      if (selectedProjectId === targetLeadId) {
        setSelectedProjectId('');
        localStorage.removeItem('presaleee_active_lead_id');
      }
      await loadProjects();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi xóa dự án', 'Thất bại');
    }
  };

  // Handle Delete Lead (PBAC: Only Project Leader or Org Admin)
  const handleDeleteLead = async () => {
    if (!selectedProject) return;
    await handleDeleteLeadById(selectedProject.id, selectedProject.title);
  };

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionFeedback, setRejectionFeedback] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Handle Submit Proposal for Review
  const handleSubmitProposalForReview = async () => {
    if (!realProposal?.id) return;
    try {
      const updated = await submitProposalForReview(realProposal.id);
      setRealProposal(prev => prev ? { ...prev, status: updated.status } : prev);
      toast.success('Đã gửi hồ sơ Proposal để Presale Lead phê duyệt (IN_REVIEW)!', 'Gửi duyệt');
    } catch (err: any) {
      toast.error(`Lỗi gửi duyệt: ${err.message}`, 'Lỗi');
    }
  };

  // Handle Reject Proposal (Presale Lead with feedback)
  const handleConfirmRejectProposal = async () => {
    if (!realProposal?.id) return;
    if (!rejectionFeedback.trim()) {
      toast.warning('Vui lòng nhập lý do từ chối hoặc yêu cầu chỉnh sửa.', 'Yêu cầu feedback');
      return;
    }
    try {
      setIsRejecting(true);
      const updated = await updateProposalLifecycle(realProposal.id, 'REJECTED', rejectionFeedback.trim());
      setRealProposal(prev => prev ? { ...prev, status: updated.status, reviewNotes: rejectionFeedback.trim() } : prev);
      setIsRejectModalOpen(false);
      setRejectionFeedback('');
      toast.warning('Đã từ chối Proposal và gửi phản hồi yêu cầu đội ngũ chỉnh sửa lại.', 'Từ Chối Proposal');
    } catch (err: any) {
      toast.error(`Lỗi từ chối: ${err.message}`, 'Lỗi');
    } finally {
      setIsRejecting(false);
    }
  };

  // Handle Approve Proposal (PBAC: Presale Lead)
  const handleApproveProposal = async () => {
    if (!realProposal?.id) return;
    if (realProposal.status !== 'IN_REVIEW') {
      toast.warning('Hồ sơ Proposal đang ở trạng thái DRAFT. Đội ngũ cần Submit for Review trước khi phê duyệt.', 'Cần Submit for Review');
      return;
    }
    try {
      const updated = await updateProposalLifecycle(realProposal.id, 'APPROVED');
      setRealProposal(prev => prev ? { ...prev, status: updated.status } : prev);
      toast.success('Đã phê duyệt hồ sơ Proposal (APPROVED)! Đề xuất sẵn sàng cấp phép lên Client Portal.', 'Phê Duyệt Proposal');
    } catch (err: any) {
      toast.error(`Lỗi phê duyệt: ${err.message}`, 'Lỗi');
    }
  };

  // Handle Qualify Active Lead
  const handleQualifyActiveLead = async () => {
    if (!selectedProject) return;
    try {
      setIsQualifying(true);
      const res = await qualifyLead(selectedProject.id);
      setProjects(prev => prev.map(p => p.id === res.lead.id ? res.lead : p));
      toast.success(`Thẩm định BANT thành công! Điểm: ${res.qualification.score}/100`, 'AI BANT Engine');
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
        proposal={realProposal}
        clientName={realSessions[0]?.clientName ?? null}
      />

      {/* 1. UNIFIED APP SIDEBAR */}
      <AppSidebar
        activeItem="AI Workspace"
        onLogout={onLogout}
        onNavigateOverview={onNavigateOverview}
        onNavigateRfps={onNavigateRfps}
        onNavigatePipelines={onNavigatePipelines}
      />

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
            <span className="font-bold text-slate-700">
              {selectedProject ? effectiveProjectRole.replace(/_/g, ' ') : (user?.role?.replace(/_/g, ' ') || 'PRESALE WORKSPACE')}
            </span>
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-brand-700 truncate max-w-xs sm:max-w-md">
              {selectedProject ? selectedProject.title : 'Chọn dự án làm việc'}
            </span>
          </div>

          {/* Quick Action - Only when project selected */}
          <div className="flex items-center gap-2">
            {selectedProject && (
              <button 
                onClick={() => setIsProjectMembersModalOpen(true)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs cursor-pointer transition-colors ${
                  isProjectLeader 
                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300' 
                    : isSalesRep
                    ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
                title={isProjectLeader ? "Quản lý thành viên và phân quyền trong dự án này (PBAC)" : "Xem danh sách thành viên phụ trách deal"}
              >
                <Users className={`w-3.5 h-3.5 ${isProjectLeader ? 'text-amber-700' : isSalesRep ? 'text-indigo-600' : 'text-slate-600'}`} />
                <span>{isProjectLeader ? 'Quản trị thành viên' : 'Thành viên deal'} ({selectedProject.projectMembers?.length || 1})</span>
              </button>
            )}
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

              {selectedProject && isViewer && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 border border-slate-200 text-xs font-mono font-semibold" title="Tài khoản VIEWER chỉ có quyền xem">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Chỉ đọc (Read-only)</span>
                </span>
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
                  Qualification Score: <strong>{selectedProject.bantScore == null ? 'Chờ thẩm định' : `${selectedProject.bantScore}/100`}</strong>
                </span>

                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  Est. Value: <strong>{selectedProject.extractedMetadata?.budgetUsd ? `$${selectedProject.extractedMetadata.budgetUsd.toLocaleString()} USD` : 'Chưa nhập'}</strong>
                </span>

                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  Target Timeline: <strong>{selectedProject.extractedMetadata?.timelineWeeks ? `${selectedProject.extractedMetadata.timelineWeeks} Weeks` : 'Chưa định'}</strong>
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
                      {selectedProject.status === 'APPROVED' || selectedProject.status === 'WON' || realProposal?.status === 'APPROVED' || realProposal?.status === 'SENT_TO_CLIENT'
                        ? '100%'
                        : selectedProject.status === 'QUALIFIED' ? '90%' : '50%'}
                    </div>
                    <div className="text-xs">
                      <div className="font-bold text-slate-800">Pipeline Status</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {selectedProject.status === 'APPROVED' || selectedProject.status === 'WON' || realProposal?.status === 'APPROVED' || realProposal?.status === 'SENT_TO_CLIENT'
                          ? 'COMPLETE'
                          : selectedProject.status}
                      </div>
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

            {/* Secondary Navigation Tabs matching PDF lifecycle with Direct Approval */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2 overflow-x-auto text-xs font-medium">
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

              {/* Direct Proposal Approval for Presale Lead */}
              {selectedProject && isProjectLeader && (
                <div className="flex items-center gap-2 shrink-0">
                  {realProposal?.status === 'APPROVED' ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Proposal Đã Phê Duyệt</span>
                      </span>
                      <button
                        onClick={() => setPortalModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                        title="Cấp phép Client Portal cho khách hàng"
                      >
                        <Eye className="w-3.5 h-3.5 text-brand-400" />
                        <span>Client Portal</span>
                      </button>
                    </div>
                  ) : realProposal?.status === 'IN_REVIEW' ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleApproveProposal}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                        title="Trưởng dự án phê duyệt đề xuất (APPROVED)"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Phê Duyệt Proposal</span>
                      </button>
                      <button
                        onClick={() => setIsRejectModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                        title="Từ chối đề xuất và yêu cầu chỉnh sửa"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Từ Chối (Yêu cầu sửa)</span>
                      </button>
                    </div>
                  ) : realProposal?.status === 'REJECTED' ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 text-xs font-semibold">
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Đã Từ Chối (Chờ sửa lại)</span>
                      </span>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Proposal Submit for Presale Consultant */}
              {selectedProject && isPresaleConsultant && (
                <div className="flex items-center gap-2 shrink-0">
                  {realProposal?.status === 'APPROVED' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Proposal Đã Phê Duyệt</span>
                    </span>
                  ) : realProposal?.status === 'IN_REVIEW' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 text-xs font-semibold">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      <span>Đang Chờ Lead Duyệt</span>
                    </span>
                  ) : realProposal?.status === 'REJECTED' ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 text-xs font-semibold">
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Cần Sửa Lại</span>
                      </span>
                      <button
                        onClick={handleSubmitProposalForReview}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Gửi Duyệt Lại</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSubmitProposalForReview}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                        title="Gửi hồ sơ lên Presale Lead để phê duyệt (Submit for Review)"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Submit for Review</span>
                      </button>
                      <span className="text-[11px] text-amber-700 font-mono hidden sm:inline" title="Hồ sơ đang ở trạng thái DRAFT">
                        (Cần Submit để Lead duyệt)
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Proposal Tracking & Client Portal initiation for Sales Rep */}
              {selectedProject && isSalesRep && (
                <div className="flex items-center gap-2 shrink-0">
                  {realProposal?.status === 'APPROVED' || realProposal?.status === 'SENT_TO_CLIENT' ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Proposal Đã Phê Duyệt</span>
                      </span>
                      <button
                        onClick={() => setPortalModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                        title="Khởi tạo Client Portal tương tác với khách hàng"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Khởi tạo Client Portal</span>
                      </button>
                    </div>
                  ) : (
                    <span 
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold"
                      title="Đang đợi Trưởng dự án (Presale Lead) duyệt Proposal trước khi bàn giao Client Portal"
                    >
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Chờ Presale Lead phê duyệt</span>
                    </span>
                  )}
                </div>
              )}
            </div>

          </div>

        </div>

        {/* 3. DYNAMIC CONTENT AREA BASED ON LIFECYCLE TAB */}
        <div className="p-6 sm:p-8 max-w-7xl mx-auto w-full space-y-6">

          {/* TAB 1: INTAKE & SCOPE with FULL CRUD (Requirement 3 & 4) */}
          {activeSubnav === 'Intake & Scope' && (
            <div className="space-y-6">
              
              {/* INTAKE SELECTOR (Modern Unified Control Bar) */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                
                {/* Project Block Selector Button */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => setIsProjectSelectorModalOpen(true)}
                    className="flex items-center gap-3 p-2 rounded-xl border border-slate-200/90 bg-slate-50 hover:bg-white hover:border-brand-300 hover:shadow-xs transition-all cursor-pointer text-left group min-w-0 max-w-xl"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-100/70 border border-brand-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <FolderKanban className="w-4 h-4 text-brand-700" />
                    </div>
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                          DỰ ÁN ĐANG CHỌN ({projects.length} DỰ ÁN)
                        </span>
                        {selectedProject && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-50 text-brand-700 font-semibold border border-brand-200/60">
                            {selectedProject.status}
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-bold text-slate-800 truncate flex items-center gap-1.5 mt-0.5">
                        <span className="truncate">
                          {selectedProject ? selectedProject.title : '-- Bấm để chọn dự án làm việc --'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 group-hover:border-brand-400 group-hover:text-brand-700 transition-colors shrink-0 shadow-2xs">
                      <LayoutGrid className="w-3.5 h-3.5 text-slate-500 group-hover:text-brand-600" />
                      <span>Chọn dự án</span>
                      <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-brand-600" />
                    </div>
                  </button>
                  {isProjectLeader && selectedProject && (
                    <button
                      onClick={handleDeleteLead}
                      title="Xóa Intake này (Chỉ dành cho Trưởng dự án)"
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
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
                      {selectedProject && !isPresaleConsultant && (
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
              {isOrgAdmin && !isAdminInvited && selectedProject ? (
                <div className="bg-white rounded-3xl border border-purple-200 shadow-card p-12 text-center space-y-4 max-w-2xl mx-auto my-6">
                  <div className="w-16 h-16 rounded-3xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center mx-auto">
                    <Lock className="w-8 h-8 text-purple-600" />
                  </div>
                  <div className="space-y-2">
                    <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-purple-100 text-purple-800 border border-purple-200">
                      CHÍNH SÁCH BẢO VỆ LEAD WORKSPACE (PBAC)
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">
                      Lead Workspace Đang Bị Khóa Đối Với System Admin
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed font-sans">
                      Tài khoản <strong>Quản trị hệ thống (System Admin)</strong> hoạt động tách biệt ở cấp độ hạ tầng, cấu hình workspace và bảo mật đa người dùng. Bạn không có quyền truy cập vào Lead Workspace của dự án <strong>"{selectedProject.title}"</strong> nếu không được Leader dự án mời tham gia.
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={() => navigateTo('overview')}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
                    >
                      Quay về Tổng quan Quản trị
                    </button>
                  </div>
                </div>
              ) : !selectedProject ? (
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
                      {/* Sales Rep indicator */}
                      {isSalesRep && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200" title="Đại diện kinh doanh (Sales Rep) chỉ theo dõi thông tin tổng quan">
                          Sales Rep (Chỉ xem)
                        </span>
                      )}
                      {/* Locked for non-leader when project completed */}
                      {!isProjectLeader && isDealCompleted && !isSalesRep && !isViewer && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1" title="Dự án đã được duyệt hoàn thành. Chỉ Presale Lead mới có quyền điều chỉnh.">
                          <Lock className="w-3 h-3 text-amber-600" />
                          <span>Đã duyệt (Khóa)</span>
                        </span>
                      )}
                      {/* Update button placed directly in the Lead Intake card */}
                      {canEditLead && (
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
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900 font-mono">
                            Raw Client Intake Extract
                          </h3>
                          {!isEditingRaw && canEditLead && (
                            <button
                              onClick={() => {
                                setEditedRawContent(selectedProject.rawRfpContent || '');
                                setIsEditingRaw(true);
                              }}
                              className="text-[11px] font-mono font-semibold text-brand-600 hover:text-brand-700 hover:underline flex items-center gap-1 cursor-pointer"
                              title="Chỉnh sửa nội dung RFP thô để thẩm định lại BANT"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Sửa Raw RFP</span>
                            </button>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                          Nguồn: {selectedProject.source || 'INBOUND_EMAIL'}
                        </span>
                      </div>

                      {isEditingRaw ? (
                        <div className="space-y-2">
                          <textarea
                            value={editedRawContent}
                            onChange={(e) => setEditedRawContent(e.target.value)}
                            rows={6}
                            placeholder="Nhập hoặc dán nội dung RFP thô từ khách hàng..."
                            className="w-full p-3 rounded-2xl bg-white border border-brand-300 focus:border-brand-500 font-mono text-xs text-slate-800 leading-relaxed outline-none shadow-xs"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setIsEditingRaw(false)}
                              disabled={isSavingRaw}
                              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                            >
                              Hủy
                            </button>
                            <button
                              onClick={() => void handleSaveRawContent()}
                              disabled={isSavingRaw}
                              className="px-4 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold cursor-pointer shadow-xs transition-all flex items-center gap-1.5"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>{isSavingRaw ? 'Đang lưu...' : 'Lưu nội dung Raw'}</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 font-mono text-xs text-slate-700 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                          {selectedProject.rawRfpContent || '(Không có nội dung mô tả thô)'}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="text-slate-400 text-[10px] block">CLIENT TIER / DOMAIN</span>
                          <span className="font-bold text-slate-800">
                            {selectedProject.extractedMetadata?.clientIndustry || 'Chưa xác định'}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="text-slate-400 text-[10px] block">EST. VALUE</span>
                          <span className="font-bold text-brand-700">
                            {selectedProject.extractedMetadata?.budgetUsd ? `$${selectedProject.extractedMetadata.budgetUsd.toLocaleString()} USD` : 'Chưa định'}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="text-slate-400 text-[10px] block">TARGET SLA</span>
                          <span className="font-bold text-slate-800">
                            {selectedProject.extractedMetadata?.target_sla || 'Chưa cấu hình'}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="text-slate-400 text-[10px] block">PEAK WORKLOAD</span>
                          <span className="font-bold text-brand-700">
                            {selectedProject.extractedMetadata?.peak_workload || 'Chưa cấu hình'}
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
                        {storedQualification && (
                          <span className="text-[10px] font-mono font-bold text-brand-700 bg-emerald-50 px-2 py-0.5 rounded border border-brand-200">
                            Đã Thẩm Định
                          </span>
                        )}
                      </div>

                      {storedQualification ? (
                        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-brand-200 space-y-2.5">
                          <div className="flex justify-between items-center text-xs font-mono">
                            <span className="font-bold text-brand-900 text-sm">
                              Score: {storedQualification.score} / 100
                            </span>
                            <span className="text-brand-700 font-bold">
                              {storedQualification.recommendation}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed">
                            {storedQualification.summary}
                          </p>

                          {/* BANT pillars, each scored 0-25 by the qualification service */}
                          <div className="space-y-1.5 pt-2 border-t border-brand-200/60">
                            {BANT_PILLARS.map(pillar => (
                              <div key={pillar} className="text-[11px] font-mono text-slate-700 flex items-start gap-1.5">
                                <span className="text-brand-600 font-bold">•</span>
                                <span>
                                  <strong className="capitalize">{pillar}</strong> ({storedQualification.criteria[pillar].score}/25):{' '}
                                  {storedQualification.criteria[pillar].assessment}
                                </span>
                              </div>
                            ))}
                          </div>

                          {storedQualification.risks.length > 0 && (
                            <div className="space-y-1 pt-2 border-t border-brand-200/60">
                              <span className="text-[10px] font-bold text-amber-700 block">RỦI RO CẦN LÀM RÕ</span>
                              {storedQualification.risks.map((risk, idx) => (
                                <div key={idx} className="text-[11px] font-mono text-slate-600 flex items-start gap-1.5">
                                  <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0 text-amber-600" />
                                  <span>{risk}</span>
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
                          {!isPresaleConsultant && (
                            <button
                              onClick={handleQualifyActiveLead}
                              disabled={isQualifying}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold transition-all shadow-xs"
                            >
                              <Zap className="w-3.5 h-3.5" />
                              <span>{isQualifying ? 'Đang thẩm định...' : 'Chạy AI Thẩm Định BANT'}</span>
                            </button>
                          )}
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
              <DiscoveryMeetingsTab 
                activeLeadId={selectedProjectId}
                currentUserProjectRole={effectiveProjectRole}
                isProjectLeader={isProjectLeader}
                isDealCompleted={isDealCompleted}
                onProceedToProposals={() => setActiveSubnav('Proposal Builder v2.4')} 
              />
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
                      Khung mẫu 6 mục cố định. Nội dung bên dưới là dữ liệu demo dựng sẵn trong trình duyệt — chưa được tổng hợp từ session kỹ thuật thật và không được lưu vào Proposal.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setActiveSubnav('Proposal Builder v2.4');
                      toast.info(
                        'Không có dữ liệu nào được đồng bộ. Nội dung 6 mục ở đây là mẫu tĩnh; hồ sơ 10 Sheets lấy từ API, không nhận thông tin này.',
                        'Mở Proposal Builder'
                      );
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-xs"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Mở Proposal Builder →</span>
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
                currentUserProjectRole={effectiveProjectRole}
                isProjectLeader={isProjectLeader}
                proposalStatus={realProposal?.status}
                onProposalUpdated={(p) => setRealProposal(p)}
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
              const meta = selectedProject.extractedMetadata || {};
              const checks = [
                Boolean(meta.budgetUsd),
                Boolean(meta.timelineWeeks),
                Boolean(meta.techStack && meta.techStack.length > 0),
                Boolean(meta.coreFunctionalModules?.length || meta.integrationsRequired?.length),
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
                            {organization?.name || 'Chưa rõ tổ chức'}
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
                          Dữ liệu Tương tác Thực tế từ Portal
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                          Live DB Signals
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mb-3">
                        Mỗi phiên portal chỉ lưu <strong>một timestamp lần truy cập gần nhất</strong> (giá trị
                        cũ bị ghi đè): hệ thống không đếm số lượt xem và không giữ lịch sử truy cập.
                      </p>

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
                                <div className="text-right shrink-0 space-y-1">
                                  <div>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      s.revokedAt 
                                        ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    }`}>
                                      {s.revokedAt ? 'Đã thu hồi' : 'Hoạt động'}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-end gap-1 text-[10px] text-slate-500">
                                    <MessageSquare className="w-3 h-3 text-slate-400" />
                                    <span>{s.commentCount || 0} feedback</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {realProposal && (
                              <button
                                onClick={() => navigateTo('portal', { proposalId: realProposal.id })}
                                className="w-full mt-1 py-2 px-3 rounded-xl bg-white hover:bg-emerald-50 border border-slate-200 text-brand-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <span>Xem &amp; quản lý phản hồi tại Client Portal Desk</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            )}
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
                        BANT Score: {selectedProject.bantScore == null ? 'Chưa thẩm định' : `${selectedProject.bantScore}/100`}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 text-xs font-mono">
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                        <span className="text-[10px] text-slate-400 block font-bold">1. LEAD HEALTH</span>
                        <div className="text-xl font-bold text-brand-700 mt-1">
                          {selectedProject.bantScore == null ? 'N/A' : `${selectedProject.bantScore}%`}
                        </div>
                        <span className="text-[10px] text-emerald-700 font-semibold mt-0.5 block">
                          {storedQualification ? storedQualification.recommendation : 'Chưa phân loại'}
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
                            <div><strong>TO:</strong> {realSessions[0]?.clientEmail || 'chưa có email khách hàng — hãy tạo phiên Portal'}</div>
                            <div><strong>SUBJECT:</strong> [Presaleee] Hồ sơ Kỹ thuật &amp; Kế hoạch phối hợp: {selectedProject.title}</div>
                          </div>
                          <div className="border-t border-slate-200 pt-2 space-y-2">
                            <p>Kính gửi Quý đối tác / Ban Quản lý dự án {realSessions[0]?.clientName || selectedProject.title},</p>
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
                    <option value={selectedProject.status}>{selectedProject.status} (giữ nguyên)</option>
                    {(LEAD_TRANSITIONS[selectedProject.status as LeadStatus] ?? []).map((next) => (
                      <option key={next} value={next}>{next}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-[10px] text-slate-400 font-sans">
                    Chỉ những bước hợp lệ theo state machine mới được liệt kê; APPROVED cần điểm BANT đã lưu.
                  </p>
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

      {/* PBAC: Project Members Modal */}
      {selectedProject && (
        <ProjectMembersModal
          isOpen={isProjectMembersModalOpen}
          onClose={() => setIsProjectMembersModalOpen(false)}
          leadId={selectedProject.id}
          leadTitle={selectedProject.title}
          currentUserProjectRole={effectiveProjectRole}
          isOrgAdmin={isOrgAdmin}
          onMembersUpdated={() => {
            loadProjects(selectedProject.id);
          }}
        />
      )}

      {/* GIAO DIỆN QUẢN LÝ DỰ ÁN KIỂU BLOCK (Project Block Manager Modal) */}
      {isProjectSelectorModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full p-6 space-y-5 max-h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-brand-200 text-brand-600 flex items-center justify-center">
                  <LayoutGrid className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>Quản lý &amp; Chọn Dự án Thao tác</span>
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {projects.length} dự án
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Chọn nhanh dự án dạng khối (block) để chuyển đổi không gian làm việc AI Workspace
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsProjectSelectorModalOpen(false);
                    onNavigateRfps?.();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer shadow-xs transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tiếp nhận RFP mới</span>
                </button>
                <button
                  onClick={() => setIsProjectSelectorModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Search filter */}
            <div className="relative shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm kiếm dự án theo tên, lĩnh vực hoặc trạng thái..."
                value={projectSearchTerm}
                onChange={(e) => setProjectSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-brand-500 text-xs font-medium text-slate-800 outline-none transition-all"
              />
            </div>

            {/* Grid of Project Blocks */}
            <div className="flex-1 overflow-y-auto min-h-0 pr-1">
              {filteredProjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {filteredProjects.map((p) => {
                    const isSelected = p.id === selectedProjectId;
                    const meta = (p.extractedMetadata as any) || {};
                    const industry = meta.clientIndustry || 'Chung';
                    const budget = meta.budgetUsd ? `$${Number(meta.budgetUsd).toLocaleString()} USD` : null;
                    const hasBant = p.bantScore !== null && p.bantScore !== undefined;
                    const canDeleteP = !isOrgAdmin && (p.myRoleInProject === 'PRESALE_LEAD' || p.createdBy === user?.id || p.assignedTo === user?.id);

                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          handleSelectProject(p.id);
                          setIsProjectSelectorModalOpen(false);
                        }}
                        className={`group relative p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between text-left ${
                          isSelected
                            ? 'bg-emerald-50/60 border-brand-500 shadow-md ring-2 ring-brand-500/20'
                            : 'bg-white border-slate-200 hover:border-brand-300 hover:shadow-sm'
                        }`}
                      >
                        {/* Top: Status & Active Indicator */}
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                              {p.status}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {isSelected && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-brand-700 bg-brand-100/70 px-2 py-0.5 rounded-full">
                                  <Check className="w-3 h-3 text-brand-700" />
                                  Đang chọn
                                </span>
                              )}
                              {canDeleteP && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void handleDeleteLeadById(p.id, p.title);
                                  }}
                                  title="Xóa dự án này (Chỉ dành cho Presale Lead)"
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Title */}
                          <h4 className="text-sm font-bold text-slate-900 group-hover:text-brand-600 transition-colors line-clamp-2 leading-snug">
                            {p.title}
                          </h4>

                          {/* Industry & Info */}
                          <div className="mt-2 space-y-1 text-xs text-slate-500 font-mono">
                            <div className="flex items-center gap-1.5 truncate">
                              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{industry}</span>
                            </div>
                            {budget && (
                              <div className="text-[11px] text-emerald-700 font-semibold">
                                Ngân sách: {budget}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Bottom: BANT & Select action */}
                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                          {hasBant ? (
                            <span className="text-[11px] font-mono font-bold text-brand-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-brand-200">
                              BANT: {p.bantScore}/100
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-slate-400">
                              Chưa chấm BANT
                            </span>
                          )}

                          <span className={`text-xs font-semibold flex items-center gap-1 ${
                            isSelected ? 'text-brand-700 font-bold' : 'text-slate-500 group-hover:text-brand-600'
                          }`}>
                            {isSelected ? 'Đang mở' : 'Chọn lead'}
                            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                  <p className="text-xs font-mono text-slate-500">
                    Không tìm thấy dự án nào phù hợp với từ khóa "{projectSearchTerm}".
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 flex justify-end shrink-0">
              <button
                onClick={() => setIsProjectSelectorModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-600 cursor-pointer transition-colors"
              >
                Đóng
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Rejection Feedback Modal for Presale Lead */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
                <XCircle className="w-5 h-5 text-rose-600" />
                <span>Từ Chối Proposal &amp; Yêu Cầu Chỉnh Sửa</span>
              </div>
              <button 
                onClick={() => setIsRejectModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Vui lòng cung cấp phản hồi (Feedback) chi tiết cho đội ngũ tư vấn (Presale Consultant). Nội dung này sẽ được ghim vào đầu Proposal để đội ngũ nắm bắt và sửa lại các sheet.
            </p>

            <div>
              <label className="text-xs font-mono font-bold text-slate-700 block mb-1">
                LÝ DO TỪ CHỐI &amp; YÊU CẦU CHỈNH SỬA:
              </label>
              <textarea
                rows={4}
                value={rejectionFeedback}
                onChange={(e) => setRejectionFeedback(e.target.value)}
                placeholder="Ví dụ: Cần rà soát lại WBS phân hệ thanh toán, bổ sung NFRs về SLA 99.999% và điều chỉnh ngân sách rate cards..."
                className="w-full text-xs font-sans p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-rose-500 bg-slate-50/50"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-600 cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmRejectProposal}
                disabled={isRejecting || !rejectionFeedback.trim()}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                {isRejecting ? 'Đang gửi...' : 'Xác Nhận Từ Chối'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
