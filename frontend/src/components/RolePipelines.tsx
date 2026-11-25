import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { ROLE_DETAILS } from './workspace/UserCard';
import { ClientPortalModal } from './ClientPortalModal';
import { useToast } from './common/Toast';
import { fetchLeads, updateLead, updateLeadStatus } from '../services/leadService';
import type { LeadItem } from '../services/leadService';
import { 
  fetchProposalByLead, 
  updateProposalLifecycle,
  getProposalPdfDownloadUrl,
  getProposalExcelDownloadUrl
} from '../services/proposalService';
import type { ProposalItem } from '../services/proposalService';
import { portalStaffService } from '../services/portalService';
import type { PortalSessionDetail } from '../types/portal';
import type { UserRole } from '../types/auth';
import { formatDateTime } from '../utils/format';
import { AppSidebar } from './workspace/AppSidebar';

export const ROLE_ENGLISH_NAMES: Record<UserRole, string> = {
  ADMIN: 'System Admin',
  PRESALE_LEAD: 'Presale Lead',
  PRESALE_CONSULTANT: 'Presale Consultant',
  SALES_REP: 'Sales Rep',
  VIEWER: 'Viewer',
};
import {
  FileText,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Users,
  DollarSign,
  Send,
  Eye,
  Edit3,
  Award,
  FileSpreadsheet,
  Download,
  Copy,
  Check,
  Clock,
  ThumbsUp,
  XCircle,
  RefreshCw,
  FolderOpen
} from 'lucide-react';

interface RolePipelinesProps {
  onLogout: () => void;
  onNavigateOverview: () => void;
  onNavigateAIWorkspace?: () => void;
  initialRole?: UserRole;
}

export const RolePipelines: React.FC<RolePipelinesProps> = ({
  onLogout,
  onNavigateOverview,
  onNavigateAIWorkspace,
  initialRole
}) => {
  const { user } = useAuth();
  const toast = useToast();

  // Active Role selection for pipeline view
  const currentRole = (user?.role || 'VIEWER') as UserRole;
  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole || currentRole);

  // Projects / Leads
  const [projects, setProjects] = useState<LeadItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [, setLoadingProjects] = useState<boolean>(true);

  // Proposal for selected lead
  const [proposal, setProposal] = useState<ProposalItem | null>(null);
  const [loadingProposal, setLoadingProposal] = useState<boolean>(false);

  // Portal sessions
  const [portalSessions, setPortalSessions] = useState<PortalSessionDetail[]>([]);

  // Presale Lead Pipeline Stages
  // Stage 1: INTAKE & TEAM ALLOCATION
  // Stage 2: STAFFING & SCOPE
  // Stage 3: MULTI-ANGLE REVIEW
  // Stage 4: APPROVAL GATE
  // Stage 5: PORTAL GATEKEEPER
  // Stage 6: LEAD INTELLIGENCE & CLOSING
  const [leadPipelineStage, setLeadPipelineStage] = useState<number>(1);

  // Modal states
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [selectedDealRoles, setSelectedDealRoles] = useState<UserRole[]>([]);
  const [portalModalOpen, setPortalModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Review checklist state for Stage 3
  const [reviewChecklist, setReviewChecklist] = useState({
    businessContent: true,
    technicalSolution: true,
    pricingCommercial: false,
    uiPrototype: true
  });

  // Client invitation form for Stage 5
  const [clientEmail, setClientEmail] = useState('');
  const [clientName, setClientName] = useState('');
  const [createdPortalLink, setCreatedPortalLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const isSystemAdmin = user?.role === 'ADMIN';

  // Standard reference case for governance guide & admin inspection (no lead database leakage to admin)
  const referenceProject: LeadItem = React.useMemo(() => ({
    id: 'ref-governance-lead',
    title: 'Hệ thống Mạng Doanh nghiệp Đa chi nhánh & Bảo mật Tập trung',
    source: 'RFP_ENTERPRISE',
    status: 'QUALIFIED',
    bantDetails: {
      score: 90,
      budget_fit: 'HIGH',
      authority_level: 'DECISION_MAKER',
      need_urgency: 'HIGH',
      timeline_feasibility: 'FEASIBLE'
    },
    extractedMetadata: {
      budgetUsd: 85000,
      clientIndustry: 'Tài chính - Ngân hàng & Công nghệ',
      timelineWeeks: 16,
      qualification: {
        readiness_level: 'Tier-1 High Priority'
      } as any,
      assigned_roles: ['PRESALE_LEAD', 'PRESALE_CONSULTANT', 'SALES_REP']
    },
    createdAt: new Date().toISOString()
  } as unknown as LeadItem), []);

  // Load leads (Only for Presale non-admin roles)
  useEffect(() => {
    if (isSystemAdmin) {
      setLoadingProjects(false);
      return;
    }
    async function loadData() {
      try {
        setLoadingProjects(true);
        const list = await fetchLeads();
        setProjects(list);
        const savedLeadId = localStorage.getItem('presaleee_active_lead_id');
        if (savedLeadId && list.some(p => p.id === savedLeadId)) {
          setSelectedProjectId(savedLeadId);
        } else if (list.length > 0) {
          setSelectedProjectId(list[0].id);
        }
      } catch (err) {
        console.error('Failed to load leads:', err);
      } finally {
        setLoadingProjects(false);
      }
    }
    void loadData();
  }, [isSystemAdmin]);

  // If user is Admin, they strictly see reference governance data (no access to live project details)
  // If user is Presale Lead, use their real lead if available, otherwise fallback to reference case
  const selectedProject = isSystemAdmin
    ? referenceProject
    : (projects.find(p => p.id === selectedProjectId) || projects[0] || referenceProject);

  // Load proposal & portal data when lead changes
  useEffect(() => {
    if (isSystemAdmin) {
      setProposal({
        id: 'ref-prop-001',
        leadId: 'ref-governance-lead',
        organizationId: 'org-demo',
        title: 'Hồ sơ Đề xuất Giải pháp Kỹ thuật & Dự toán Mạng Doanh nghiệp',
        status: 'DRAFT',
        totalCost: 75000,
        currency: 'USD',
        version: '1.0',
        createdBy: 'Presale Lead',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sheets: []
      });
      setPortalSessions([
        {
          id: 'ref-portal-001',
          proposalId: 'ref-prop-001',
          clientEmail: 'cto@enterprise-partner.com',
          clientName: 'Trần Văn Giám Đốc Kỹ Thuật',
          expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
          revokedAt: null,
          lastAccessedAt: new Date(Date.now() - 3600000).toISOString(),
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          commentCount: 2
        }
      ]);
      return;
    }
    if (!selectedProjectId) {
      setProposal(null);
      setPortalSessions([]);
      return;
    }
    let isCancelled = false;
    async function loadLeadProposal() {
      setLoadingProposal(true);
      try {
        const prop = await fetchProposalByLead(selectedProjectId);
        if (isCancelled) return;
        setProposal(prop);
        if (prop?.id) {
          try {
            const sess = await portalStaffService.listSessions(prop.id);
            if (!isCancelled) setPortalSessions(sess.sessions || []);
          } catch {
            if (!isCancelled) setPortalSessions([]);
          }
        }
      } catch (err) {
        console.error('Failed to load proposal for lead:', err);
      } finally {
        if (!isCancelled) setLoadingProposal(false);
      }
    }
    void loadLeadProposal();
    return () => { isCancelled = true; };
  }, [selectedProjectId, isSystemAdmin]);

  // Lead's assigned roles list
  const assignedRolesList: UserRole[] = React.useMemo(() => {
    if (!selectedProject) return [];
    const meta = (selectedProject.extractedMetadata || {}) as any;
    const roles = meta?.assigned_roles || meta?.assignedRoles;
    if (Array.isArray(roles) && roles.length > 0) {
      return roles as UserRole[];
    }
    return ['SALES_REP', 'PRESALE_CONSULTANT'];
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
    if (isSystemAdmin) {
      toast.info('Tài khoản System Admin xem ở chế độ mô phỏng quy chuẩn (PBAC).', 'Simulation Mode');
      setIsTeamModalOpen(false);
      return;
    }
    if (!selectedProject) return;
    if (selectedDealRoles.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 vai trò phụ trách lead.', 'Yêu cầu');
      return;
    }
    try {
      setIsSubmitting(true);
      const updatedMetadata = {
        ...(selectedProject.extractedMetadata || {}),
        assigned_roles: selectedDealRoles,
        assignedRoles: selectedDealRoles
      };
      const updated = await updateLead(selectedProject.id, {
        extractedMetadata: updatedMetadata
      });
      setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
      toast.success(`Đã cập nhật đội ngũ (${selectedDealRoles.length} vai trò) cho lead "${updated.title}"!`, 'Presale Deal Team');
      setIsTeamModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi cập nhật đội ngũ', 'Thất bại');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Actions for Presale Lead Approval Gate
  const handleApproveProposal = async () => {
    if (isSystemAdmin) {
      setProposal(prev => prev ? { ...prev, status: 'APPROVED' } : null);
      toast.success('Hồ sơ đề xuất mô phỏng đã được chuyển sang APPROVED!', 'Simulation Mode');
      setLeadPipelineStage(5);
      return;
    }
    if (!proposal) return;
    try {
      setIsSubmitting(true);
      const updated = await updateProposalLifecycle(proposal.id, 'APPROVED');
      setProposal(updated);
      toast.success(`Hồ sơ đề xuất "${updated.title}" đã được ký duyệt APPROVED chính thức!`, 'Phê duyệt thành công');
      setLeadPipelineStage(5);
    } catch (err: any) {
      toast.error(err.message || 'Không thể phê duyệt hồ sơ', 'Lỗi phê duyệt');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestRevision = async () => {
    if (isSystemAdmin) {
      setProposal(prev => prev ? { ...prev, status: 'DRAFT' } : null);
      toast.info('Đã trả hồ sơ về trạng thái DRAFT kèm yêu cầu hiệu chỉnh (Simulation).', 'Simulation Mode');
      return;
    }
    if (!proposal) return;
    try {
      setIsSubmitting(true);
      const updated = await updateProposalLifecycle(proposal.id, 'DRAFT');
      setProposal(updated);
      toast.info('Đã trả hồ sơ về trạng thái DRAFT kèm yêu cầu hiệu chỉnh.', 'Yêu cầu sửa đổi');
    } catch (err: any) {
      toast.error(err.message || 'Lỗi chuyển trạng thái', 'Thất bại');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAuthorizePortalShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSystemAdmin) {
      const mockUrl = `${window.location.origin}/#client-portal?demo=true`;
      setCreatedPortalLink(mockUrl);
      setProposal(prev => prev ? { ...prev, status: 'SENT_TO_CLIENT' } : null);
      toast.success('Đã mô phỏng cấp phép mở Client Portal!', 'Simulation Mode');
      return;
    }
    if (!proposal) return;
    if (!clientEmail.trim()) {
      toast.error('Vui lòng nhập email khách hàng để phát hành Portal.', 'Yêu cầu');
      return;
    }
    try {
      setIsSubmitting(true);
      const session = await portalStaffService.createSession({
        proposalId: proposal.id,
        clientEmail: clientEmail.trim(),
        clientName: clientName.trim() || undefined,
        expiresInHours: 168
      });
      const updatedProp = await updateProposalLifecycle(proposal.id, 'SENT_TO_CLIENT');
      setProposal(updatedProp);

      const portalUrl = `${window.location.origin}/#client-portal?token=${session.accessToken}&session=${session.id}`;
      setCreatedPortalLink(portalUrl);
      toast.success('Đã cấp phép và phát hành Client Portal chính thức cho khách hàng!', 'Phát hành Portal');
      const detailSession: PortalSessionDetail = {
        id: session.id,
        proposalId: session.proposalId,
        clientEmail: session.clientEmail,
        clientName: session.clientName ?? null,
        expiresAt: session.expiresAt,
        revokedAt: null,
        lastAccessedAt: null,
        createdAt: new Date().toISOString(),
        commentCount: 0
      };
      setPortalSessions(prev => [detailSession, ...prev]);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi phát hành Client Portal', 'Thất bại');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClosingDecision = async (decision: 'WON' | 'LOST') => {
    if (isSystemAdmin) {
      toast.info(`Mô phỏng ghi nhận kết quả deal: ${decision}!`, 'Simulation Mode');
      return;
    }
    if (!selectedProject) return;
    try {
      setIsSubmitting(true);
      if (decision === 'WON' && proposal) {
        try {
          await updateProposalLifecycle(proposal.id, 'ACCEPTED');
        } catch {
          // continue
        }
      }
      const updated = await updateLeadStatus(selectedProject.id, decision === 'WON' ? 'WON' : 'LOST');
      setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
      toast.success(
        decision === 'WON' 
          ? `Chúc mừng! Lead "${updated.title}" đã thắng thầu (WON) thành công!` 
          : `Đã ghi nhận kết quả thương thảo của Lead "${updated.title}".`,
        decision === 'WON' ? 'Thắng thầu (Won Deal)' : 'Đóng Deal'
      );
    } catch (err: any) {
      toast.error(err.message || 'Lỗi cập nhật trạng thái đóng thầu', 'Thất bại');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex text-slate-900 font-sans">
      
      {/* Client Portal Preview Modal */}
      <ClientPortalModal 
        isOpen={portalModalOpen} 
        onClose={() => setPortalModalOpen(false)} 
        activeProject={selectedProject}
      />

      {/* UNIFIED APP SIDEBAR */}
      <AppSidebar
        activeItem="Role Pipelines"
        onLogout={onLogout}
        onNavigateOverview={onNavigateOverview}
        onNavigateAIWorkspace={onNavigateAIWorkspace}
      />

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-mono">
            <button 
              onClick={onNavigateOverview}
              className="text-slate-500 hover:text-slate-800 hover:underline"
            >
              Workspace
            </button>
            <span className="text-slate-300">/</span>
            <span className="text-slate-500">Cài đặt &amp; Hướng dẫn</span>
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-brand-700">Role Governance</span>
            <span className="text-slate-300">/</span>
            <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${ROLE_DETAILS[selectedRole]?.badgeClass || ''}`}>
              {ROLE_ENGLISH_NAMES[selectedRole] || selectedRole}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold text-slate-500 hidden sm:inline">
              Quy chuẩn 6 Vai trò hệ thống
            </span>
          </div>
        </header>

        {/* Hero Role Pipeline Switcher Bar */}
        <div className="bg-white border-b border-slate-200 px-6 sm:px-8 py-5">
          <div className="max-w-7xl mx-auto space-y-4">
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5 mb-1">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    Cài Đặt &amp; Hướng Dẫn: Quy Trình Role Pipelines
                  </h1>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                    6 ROLES GOVERNANCE
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
                  Tài liệu quy chuẩn phân quyền, thẩm quyền xét duyệt và luồng công việc tương tác giữa 6 vai trò trong hệ thống Presaleee.
                </p>
              </div>
            </div>

            {/* 6 Role Switcher Pills (English Role Names) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-2">
              {(Object.keys(ROLE_DETAILS) as UserRole[]).map((r) => {
                const isCurrentActive = selectedRole === r;
                const isUserNativeRole = user?.role === r;

                return (
                  <button
                    key={r}
                    onClick={() => setSelectedRole(r)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                      isCurrentActive
                        ? 'bg-slate-900 text-white shadow-sm ring-2 ring-slate-900'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${isCurrentActive ? 'bg-brand-400' : 'bg-slate-300'}`}></div>
                    <span>{ROLE_ENGLISH_NAMES[r] || r}</span>
                    {r === 'PRESALE_LEAD' && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-brand-500 text-white font-bold">
                        Core Flow
                      </span>
                    )}
                    {isUserNativeRole && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-brand-800 font-bold">
                        You
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* System Admin Isolation & PBAC Boundary Banner */}
            {isSystemAdmin && (
              <div className="p-3.5 rounded-2xl bg-purple-50/90 border border-purple-200 flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-purple-700 shrink-0" />
                  <div>
                    <span className="font-bold text-purple-950 font-mono">CHÍNH SÁCH BẢO VỆ PBAC: </span>
                    <span className="text-purple-900">
                      Tài khoản <strong>System Admin</strong> giám sát quy chuẩn luồng 6 vai trò ở góc độ quản trị nền tảng. Dữ liệu thực thi các dự án được bảo vệ và cô lập tuyệt đối theo thẩm quyền của từng <strong>Presale Lead</strong>. Admin không can thiệp vào các gói thầu.
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-200 text-purple-900 shrink-0 hidden md:inline">
                  PBAC PROTECTED
                </span>
              </div>
            )}

          </div>
        </div>

        {/* PIPELINE BODY */}
        <div className="p-6 sm:p-8 max-w-7xl mx-auto w-full space-y-6">

          {/* PRESALE LEAD PIPELINE (100% HOÀN THIỆN ĐẦY ĐỦ) */}
          {selectedRole === 'PRESALE_LEAD' && (
            <div className="space-y-6">
              
              {/* Presale Lead Pipeline Overview Header Card */}
              <div className="bg-gradient-to-r from-amber-500/10 via-brand-500/10 to-slate-50 rounded-3xl border border-amber-200/80 p-6 shadow-card space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
                      <Award className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-200">
                          GOVERNANCE &amp; APPROVAL PIPELINE
                        </span>
                        <span className="text-xs font-mono text-slate-500">6 GIAI ĐOẠN CHUẨN HOÁ</span>
                      </div>
                      <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                        Presale Lead Governance &amp; Proposal Approval Pipeline
                      </h2>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="px-3 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold shadow-2xs">
                      Proposal: <strong>{proposal?.status || 'Chưa khởi tạo'}</strong>
                    </span>
                    <span className="px-3 py-1 rounded-xl bg-white border border-slate-200 text-brand-700 font-bold shadow-2xs">
                      Budget: <strong>${(selectedProject?.extractedMetadata?.budgetUsd || 80000).toLocaleString()} USD</strong>
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed max-w-4xl">
                  Trưởng nhóm Presale chịu trách nhiệm kiểm soát chất lượng chuyên môn, phân bổ đội ngũ tham gia deal, thẩm định giải pháp &amp; phân bổ nhân sự, ký duyệt chính thức hồ sơ đề xuất (Approval Gate) và cấp phép mở Client Portal lần đầu cho khách hàng.
                </p>

                {/* 6-Stage Interactive Stepper */}
                <div className="pt-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
                  {[
                    { step: 1, title: '1. Intake & Team', desc: 'Phân bổ đội ngũ deal' },
                    { step: 2, title: '2. Staffing & Scope', desc: 'Phân bổ nhân sự & nỗ lực' },
                    { step: 3, title: '3. Multi-Angle Review', desc: 'Soát xét 4 góc nhìn' },
                    { step: 4, title: '4. Approval Gate', desc: 'Ký duyệt APPROVED' },
                    { step: 5, title: '5. Portal Gatekeeper', desc: 'Cấp phép mở Client Portal' },
                    { step: 6, title: '6. Intelligence & Close', desc: 'Telemetry & Chốt thầu' },
                  ].map((s) => {
                    const isActive = leadPipelineStage === s.step;
                    const isPassed = leadPipelineStage > s.step;
                    return (
                      <button
                        key={s.step}
                        onClick={() => setLeadPipelineStage(s.step)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          isActive 
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-1 ring-slate-900' 
                            : isPassed
                            ? 'bg-emerald-50 text-brand-900 border-brand-200 hover:bg-emerald-100/70'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[10px] font-mono font-bold ${isActive ? 'text-amber-300' : isPassed ? 'text-brand-600' : 'text-slate-400'}`}>
                            STAGE {s.step}
                          </span>
                          {isPassed && <Check className="w-3.5 h-3.5 text-brand-600" />}
                        </div>
                        <div className="font-bold text-xs line-clamp-1">{s.title.split('. ')[1]}</div>
                        <div className={`text-[10px] mt-0.5 line-clamp-1 ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>
                          {s.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* STAGE DETAILS RENDERING */}
              {!selectedProject ? (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-12 text-center space-y-3">
                  <FolderOpen className="w-10 h-10 text-slate-300 mx-auto" />
                  <h3 className="text-base font-bold text-slate-800">Vui lòng chọn một Lead ở trên để vận hành pipeline</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Hệ thống sẽ nạp thông tin thẩm định BANT, đội ngũ phân bổ, bảng giá và hồ sơ đề xuất của lead đó.
                  </p>
                </div>
              ) : (
                <>
                  {/* STAGE 1: INTAKE & TEAM ALLOCATION */}
                  {leadPipelineStage === 1 && (
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold bg-brand-50 text-brand-700 px-2 py-0.5 rounded border border-brand-200">
                              STAGE 1
                            </span>
                            <h3 className="text-base font-bold text-slate-900">
                              Thẩm Định Yêu Cầu &amp; Phân Bổ Đội Ngũ Presale Deal Team
                            </h3>
                          </div>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">
                            Quy tắc cốt lõi: <strong>Không phải lead nào cũng cần có cả 6 role</strong>. Presale Lead tùy biến đội ngũ theo quy mô và độ phức tạp.
                          </p>
                        </div>
                        <button
                          onClick={openTeamModal}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-brand-200 bg-emerald-50 hover:bg-emerald-100 text-brand-800 text-xs font-mono font-semibold transition-all shrink-0 cursor-pointer shadow-2xs"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-brand-600" />
                          <span>Tùy biến Đội ngũ Deal</span>
                        </button>
                      </div>

                      {/* Lead Summary Overview */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                          <span className="text-slate-400 text-[10px] block uppercase font-bold">THÔNG TIN KHÁCH HÀNG</span>
                          <div className="font-bold text-slate-800 text-sm truncate">{selectedProject.title}</div>
                          <div className="text-slate-500 text-[11px]">Ngành: {selectedProject.extractedMetadata?.clientIndustry || 'Công nghệ thông tin'}</div>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                          <span className="text-slate-400 text-[10px] block uppercase font-bold">BANT QUALIFICATION SCORE</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-bold font-mono text-brand-700">
                              {selectedProject.bantDetails?.score ? `${selectedProject.bantDetails.score}/100` : '90/100'}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-brand-800 font-bold">
                              {(selectedProject.extractedMetadata?.qualification as any)?.readiness_level || 'Tier-1 High Priority'}
                            </span>
                          </div>
                          <div className="text-slate-500 text-[11px]">Đã xác thực tính khả thi ngân sách &amp; tiến độ.</div>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                          <span className="text-slate-400 text-[10px] block uppercase font-bold">NGÂN SÁCH &amp; TIẾN ĐỘ CAM KẾT</span>
                          <div className="font-bold text-brand-700 text-sm">
                            ${(selectedProject.extractedMetadata?.budgetUsd || 80000).toLocaleString()} USD
                          </div>
                          <div className="text-slate-500 text-[11px]">Thời gian dự kiến: {selectedProject.extractedMetadata?.timelineWeeks || 16} Tuần</div>
                        </div>
                      </div>

                      {/* Currently Assigned Presale Deal Team */}
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="font-bold text-slate-700 uppercase">
                            CÁC VAI TRÒ ĐƯỢC CHỈ ĐỊNH PHỤ TRÁCH DEAL NÀY ({assignedRolesList.length} / 6 VAI TRÒ):
                          </span>
                          <span className="text-brand-700 font-semibold">Tối ưu nguồn lực tinh gọn</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {assignedRolesList.map((r) => {
                            const info = ROLE_DETAILS[r] || ROLE_DETAILS.VIEWER;
                            return (
                              <div key={r} className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 flex items-start gap-3">
                                <div className={`w-8 h-8 rounded-xl ${info.iconBg} text-white flex items-center justify-center font-bold font-mono text-xs shrink-0 shadow-xs mt-0.5`}>
                                  {r.slice(0, 2)}
                                </div>
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

                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-mono">Hoàn tất kiểm tra thông số và nhân sự deal.</span>
                        <button
                          onClick={() => setLeadPipelineStage(2)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-xs cursor-pointer"
                        >
                          <span>Tiếp tục: Phân bổ Nhân sự &amp; Nỗ lực →</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STAGE 2: STAFFING & EFFORT GOVERNANCE */}
                  {leadPipelineStage === 2 && (
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
                              STAGE 2
                            </span>
                            <h3 className="text-base font-bold text-slate-900">
                              Phân Bổ Nhân Sự &amp; Ước Tính Nỗ Lực (Staffing &amp; Effort Allocation)
                            </h3>
                          </div>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">
                            Căn cứ tính toán: Phân bổ tỷ lệ % thời gian &amp; tổng nỗ lực theo tháng (Man-months) phù hợp tiến độ.
                          </p>
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-50 text-brand-700 border border-brand-200">
                          Định mức nguồn lực
                        </span>
                      </div>

                      {/* Staffing Allocation Table */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-700 font-mono uppercase">
                          Bảng Đội Ngũ Tham Gia &amp; Nỗ Lực Ước Tính (Team Allocation):
                        </h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs font-mono">
                            <thead>
                              <tr className="border-b border-slate-200 text-slate-400">
                                <th className="pb-2">Vị Trí Chuyên Môn</th>
                                <th className="pb-2">Cấp Bậc (Level)</th>
                                <th className="pb-2 text-right">Tỷ Lệ Phân Bổ</th>
                                <th className="pb-2 text-right">Ước Tính Nỗ Lực</th>
                                <th className="pb-2 text-right">Trạng Thái</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {[
                                { roleName: 'Principal Solution Architect', level: 'LEAD', allocation: '50%', manMonths: '2.5 MM' },
                                { roleName: 'Presale Lead / Director', level: 'DIRECTOR', allocation: '30%', manMonths: '1.5 MM' },
                                { roleName: 'Senior Backend / AI Engineer', level: 'SENIOR', allocation: '100%', manMonths: '5.0 MM' },
                                { roleName: 'Senior Frontend Engineer', level: 'SENIOR', allocation: '100%', manMonths: '5.0 MM' },
                                { roleName: 'DevOps & Security Specialist', level: 'SENIOR', allocation: '50%', manMonths: '2.5 MM' },
                                { roleName: 'QA Automation Engineer', level: 'MID', allocation: '75%', manMonths: '3.8 MM' },
                              ].map((member, idx: number) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                  <td className="py-2.5 font-bold text-slate-800">{member.roleName}</td>
                                  <td className="py-2.5 text-slate-500">{member.level}</td>
                                  <td className="py-2.5 text-right font-bold text-brand-700">{member.allocation}</td>
                                  <td className="py-2.5 text-right font-bold text-slate-900">{member.manMonths}</td>
                                  <td className="py-2.5 text-right">
                                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-50 text-brand-700 font-bold">
                                      ACTIVE
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Staffing Feasibility Comparison */}
                      <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-2 text-xs">
                        <div className="flex items-center justify-between font-bold text-amber-900">
                          <span className="flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-amber-700" />
                            Đánh giá Khả thi Nhân lực (Staffing Feasibility):
                          </span>
                          <span className="font-mono text-sm text-brand-700">Tổng nỗ lực: 20.3 Man-Months</span>
                        </div>
                        <p className="text-slate-700 leading-relaxed font-sans">
                          Tổng nỗ lực khoảng <strong>20.3 Man-Months</strong> phân bổ qua 6 chuyên sự kỹ thuật đáp ứng trọn vẹn tiến độ <strong>{selectedProject.extractedMetadata?.timelineWeeks || 20} tuần</strong> và tiêu chuẩn kiến trúc đề xuất cho khách hàng.
                        </p>
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                        <button
                          onClick={() => setLeadPipelineStage(1)}
                          className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50"
                        >
                          &larr; Quay lại Giai đoạn 1
                        </button>
                        <button
                          onClick={() => setLeadPipelineStage(3)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-xs cursor-pointer"
                        >
                          <span>Tiếp tục: Soát xét 4 Góc nhìn Đề xuất →</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STAGE 3: MULTI-ANGLE PROPOSAL REVIEW */}
                  {leadPipelineStage === 3 && (
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                              STAGE 3
                            </span>
                            <h3 className="text-base font-bold text-slate-900">
                              Soát Xét Đa Chiều Hồ Sơ Đề Xuất (Multi-Angle Proposal Review)
                            </h3>
                          </div>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">
                            Theo tài liệu thiết kế: Proposal phải qua thẩm định 4 góc nhìn trước khi được ký duyệt phát hành.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {loadingProposal && (
                            <span className="text-[10px] font-mono text-slate-400">Đang tải hồ sơ...</span>
                          )}
                          {proposal && (
                            <>
                              <a
                                href={getProposalExcelDownloadUrl(proposal.id)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-mono font-semibold shadow-2xs"
                              >
                                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Tải Excel 10-Sheet</span>
                              </a>
                              <a
                                href={getProposalPdfDownloadUrl(proposal.id)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-mono font-semibold shadow-2xs"
                              >
                                <Download className="w-3.5 h-3.5 text-rose-600" />
                                <span>Tải PDF Đề Xuất</span>
                              </a>
                            </>
                          )}
                        </div>
                      </div>

                      {/* 4 Angle Review Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 1. Business Content */}
                        <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                              <FileText className="w-4 h-4 text-brand-600" />
                              <span>1. Business Content &amp; SOW (Sheet 1 &amp; 2)</span>
                            </div>
                            <input
                              type="checkbox"
                              checked={reviewChecklist.businessContent}
                              onChange={(e) => setReviewChecklist({ ...reviewChecklist, businessContent: e.target.checked })}
                              className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                            />
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            Mục tiêu chiến lược rõ ràng, phạm vi phân rã công việc WBS đầy đủ các phân hệ chính (VPN, Routing, VLAN, Security) khớp với yêu cầu RFP.
                          </p>
                        </div>

                        {/* 2. Technical Solution */}
                        <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                              <ShieldCheck className="w-4 h-4 text-sky-600" />
                              <span>2. Technical Solution &amp; Stack (Sheet 3 &amp; 8)</span>
                            </div>
                            <input
                              type="checkbox"
                              checked={reviewChecklist.technicalSolution}
                              onChange={(e) => setReviewChecklist({ ...reviewChecklist, technicalSolution: e.target.checked })}
                              className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                            />
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            Kiến trúc kỹ thuật khả thi, cam kết uptime SLA 99.9%, các tiêu chuẩn SOC-2 &amp; ISO 27001 đã được rà soát và ghi nhận trong ma trận rủi ro RAID.
                          </p>
                        </div>

                        {/* 3. Pricing & Commercial */}
                        <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                              <DollarSign className="w-4 h-4 text-emerald-600" />
                              <span>3. Pricing &amp; Commercial Terms (Sheet 5 &amp; 6)</span>
                            </div>
                            <input
                              type="checkbox"
                              checked={reviewChecklist.pricingCommercial}
                              onChange={(e) => setReviewChecklist({ ...reviewChecklist, pricingCommercial: e.target.checked })}
                              className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                            />
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            Cấu trúc giá trọn gói (${(selectedProject.extractedMetadata?.budgetUsd || 80000).toLocaleString()} USD), tiến độ 4 đợt thanh toán (Mobilization 20%, Architecture 25%, UAT 35%, Go-live 20%) hợp lý.
                          </p>
                        </div>

                        {/* 4. UI Prototype */}
                        <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                              <Sparkles className="w-4 h-4 text-purple-600" />
                              <span>4. UI Prototype &amp; Design Brief (Page 5)</span>
                            </div>
                            <input
                              type="checkbox"
                              checked={reviewChecklist.uiPrototype}
                              onChange={(e) => setReviewChecklist({ ...reviewChecklist, uiPrototype: e.target.checked })}
                              className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                            />
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            Bản mô tả giao diện tương tác (UI Design Brief) sẵn sàng phục vụ trình chiếu trên Client Portal cho ban lãnh đạo khách hàng.
                          </p>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                        <button
                          onClick={() => setLeadPipelineStage(2)}
                          className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50"
                        >
                          &larr; Quay lại Giai đoạn 2
                        </button>
                        <button
                          onClick={() => setLeadPipelineStage(4)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-xs cursor-pointer"
                        >
                          <span>Tiếp tục: Cổng Ký duyệt Đề xuất (Approval Gate) →</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STAGE 4: PROPOSAL APPROVAL GATE (EXCLUSIVE AUTHORITY) */}
                  {leadPipelineStage === 4 && (
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold bg-purple-50 text-purple-800 px-2 py-0.5 rounded border border-purple-200">
                              STAGE 4
                            </span>
                            <h3 className="text-base font-bold text-slate-900">
                              Cổng Ký Duyệt Hồ Sơ Đề Xuất (Proposal Approval Gate)
                            </h3>
                          </div>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">
                            Quyền hạn độc quyền: <strong>Chỉ PRESALE_LEAD hoặc ADMIN</strong> mới được chuyển trạng thái Proposal sang APPROVED.
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${
                          proposal?.status === 'APPROVED' ? 'bg-emerald-50 text-brand-700 border-brand-200' :
                          proposal?.status === 'SENT_TO_CLIENT' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          Trạng thái: {proposal?.status || 'DRAFT'}
                        </span>
                      </div>

                      {/* Approval Status Card */}
                      <div className="p-6 rounded-3xl border border-slate-200 bg-slate-50/50 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-brand-500 text-white flex items-center justify-center font-bold shadow-md shadow-brand-500/20">
                              {proposal?.status === 'APPROVED' || proposal?.status === 'SENT_TO_CLIENT' ? (
                                <CheckCircle2 className="w-6 h-6" />
                              ) : (
                                <Clock className="w-6 h-6" />
                              )}
                            </div>
                            <div>
                              <div className="text-base font-bold text-slate-900">
                                {proposal?.title || `${selectedProject.title} - Proposal`}
                              </div>
                              <div className="text-xs text-slate-500 font-mono mt-0.5">
                                Phiên bản: {proposal?.version || 'v1.0-PROPOSAL'} · Cập nhật: {proposal?.updatedAt ? formatDateTime(proposal.updatedAt) : 'Mới tạo'}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-xl font-bold font-mono text-brand-700">
                              ${(proposal?.totalCost || selectedProject.extractedMetadata?.budgetUsd || 80000).toLocaleString()} USD
                            </div>
                            <div className="text-[11px] font-mono text-slate-400">
                              Thời gian: {proposal?.estimatedTimelineWeeks || 16} Tuần triển khai
                            </div>
                          </div>
                        </div>

                        {/* Sign-off badge */}
                        {proposal?.status === 'APPROVED' || proposal?.status === 'SENT_TO_CLIENT' ? (
                          <div className="p-4 rounded-2xl bg-emerald-50 border border-brand-200 text-xs text-brand-900 flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-brand-600 shrink-0" />
                            <div>
                              <strong>Hồ sơ đã được ký duyệt chính thức (APPROVED).</strong> Đủ điều kiện pháp lý và chuyên môn để phát hành ra Client Portal cho khách hàng.
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
                            <div>
                              Hồ sơ đang ở trạng thái <strong>{proposal?.status || 'DRAFT'}</strong>. Presale Lead cần bấm nút ký duyệt bên dưới để cấp phép chuyển sang giai đoạn phát hành.
                            </div>
                          </div>
                        )}

                        {/* Approval Action Buttons */}
                        <div className="flex flex-wrap items-center gap-3 pt-2">
                          <button
                            onClick={handleApproveProposal}
                            disabled={isSubmitting || proposal?.status === 'APPROVED' || proposal?.status === 'SENT_TO_CLIENT'}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>{isSubmitting ? 'Đang ký duyệt...' : 'Ký Duyệt Hồ Sơ (Approve Proposal)'}</span>
                          </button>

                          <button
                            onClick={handleRequestRevision}
                            disabled={isSubmitting}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-2xs transition-all cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Yêu Cầu Sửa Đổi (Request Revision)</span>
                          </button>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                        <button
                          onClick={() => setLeadPipelineStage(3)}
                          className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50"
                        >
                          &larr; Quay lại Giai đoạn 3
                        </button>
                        <button
                          onClick={() => setLeadPipelineStage(5)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-xs cursor-pointer"
                        >
                          <span>Tiếp tục: Cấp phép Mở Client Portal →</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STAGE 5: PORTAL GATEKEEPER (FIRST-SHARE AUTHORIZATION) */}
                  {leadPipelineStage === 5 && (
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold bg-emerald-50 text-brand-700 px-2 py-0.5 rounded border border-brand-200">
                              STAGE 5
                            </span>
                            <h3 className="text-base font-bold text-slate-900">
                              Cổng Cấp Phép &amp; Phát Hành Client Portal Lần Đầu
                            </h3>
                          </div>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">
                            Chỉ có <strong>ADMIN và PRESALE_LEAD</strong> mới có quyền cấp phép phát hành lần đầu và chuyển trạng thái sang SENT_TO_CLIENT.
                          </p>
                        </div>
                        <button
                          onClick={() => setPortalModalOpen(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-mono font-semibold shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5 text-brand-600" />
                          <span>Xem Thử Portal Preview</span>
                        </button>
                      </div>

                      {/* Portal Invitation Form */}
                      <form onSubmit={handleAuthorizePortalShare} className="p-6 rounded-3xl border border-slate-200 bg-slate-50/50 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                          <div>
                            <label className="block text-slate-700 font-bold mb-1">
                              Email Đại Diện Khách Hàng (Client Recipient):
                            </label>
                            <input
                              type="email"
                              required
                              value={clientEmail}
                              onChange={(e) => setClientEmail(e.target.value)}
                              placeholder="marcus.vp@ecomart.com"
                              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-brand-500 font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-700 font-bold mb-1">
                              Tên Khách Hàng / Chức Danh:
                            </label>
                            <input
                              type="text"
                              value={clientName}
                              onChange={(e) => setClientName(e.target.value)}
                              placeholder="Marcus Vance — VP Operations"
                              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-brand-500"
                            />
                          </div>
                        </div>

                        <div className="pt-2 flex items-center justify-between flex-wrap gap-3">
                          <span className="text-[11px] font-mono text-slate-500">
                            Token bảo mật Opaque 168 giờ (7 ngày) · Tự động ghi nhận telemetry.
                          </span>
                          <button
                            type="submit"
                            disabled={isSubmitting || !proposal}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{isSubmitting ? 'Đang cấp phép...' : 'Ký Duyệt & Phát Hành Client Portal (SENT_TO_CLIENT)'}</span>
                          </button>
                        </div>
                      </form>

                      {/* Generated Portal Link Box */}
                      {createdPortalLink && (
                        <div className="p-4 rounded-2xl bg-emerald-50 border border-brand-200 space-y-2 text-xs">
                          <div className="flex items-center justify-between font-bold text-brand-900">
                            <span>Liên Kết Client Portal Đã Được Cấp Phép:</span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(createdPortalLink);
                                setLinkCopied(true);
                                toast.success('Đã sao chép liên kết Client Portal!', 'Sao chép');
                                setTimeout(() => setLinkCopied(false), 2000);
                              }}
                              className="inline-flex items-center gap-1 text-xs text-brand-700 hover:underline cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span>{linkCopied ? 'Đã sao chép!' : 'Sao chép link'}</span>
                            </button>
                          </div>
                          <div className="p-2.5 bg-white rounded-xl border border-brand-200/80 font-mono text-[11px] text-slate-800 break-all select-all">
                            {createdPortalLink}
                          </div>
                        </div>
                      )}

                      {/* Active Sessions List */}
                      {portalSessions.length > 0 && (
                        <div className="space-y-2 pt-2">
                          <h4 className="text-xs font-bold text-slate-700 font-mono uppercase">
                            Các Phiên Portal Đang Hoạt Động ({portalSessions.length}):
                          </h4>
                          <div className="space-y-2">
                            {portalSessions.map((s) => (
                              <div key={s.id} className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between text-xs font-mono">
                                <div>
                                  <span className="font-bold text-slate-800">{s.clientEmail}</span>
                                  {s.clientName && <span className="text-slate-400 ml-2">({s.clientName})</span>}
                                </div>
                                <div className="text-slate-400 text-[11px]">
                                  Tạo lúc: {formatDateTime(s.createdAt)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                        <button
                          onClick={() => setLeadPipelineStage(4)}
                          className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50"
                        >
                          &larr; Quay lại Giai đoạn 4
                        </button>
                        <button
                          onClick={() => setLeadPipelineStage(6)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-xs cursor-pointer"
                        >
                          <span>Tiếp tục: Giám sát Lead Intelligence &amp; Chốt Thầu →</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STAGE 6: LEAD INTELLIGENCE & CLOSING */}
                  {leadPipelineStage === 6 && (
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold bg-indigo-50 text-indigo-800 px-2 py-0.5 rounded border border-indigo-200">
                              STAGE 6
                            </span>
                            <h3 className="text-base font-bold text-slate-900">
                              Giám Sát Tương Tác (Lead Intelligence) &amp; Quyết Định Chốt Thầu
                            </h3>
                          </div>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">
                            Theo tài liệu: AI phân tích Client Engagement để hỗ trợ Presale Lead đưa ra Next Best Action và chốt trạng thái Won / Lost.
                          </p>
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-50 text-brand-700 border border-brand-200">
                          Deal Status: {selectedProject.status}
                        </span>
                      </div>

                      {/* Lead Intelligence Metrics */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                          <span className="text-slate-400 text-[10px] block uppercase font-bold">CLIENT ENGAGEMENT LEVEL</span>
                          <div className="text-xl font-bold font-mono text-brand-700">Cao (High Signals)</div>
                          <div className="text-slate-500 text-[11px]">Khách hàng đã xem 4/10 Sheets đề xuất</div>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                          <span className="text-slate-400 text-[10px] block uppercase font-bold">AI ASSISTANT QUERIES</span>
                          <div className="text-xl font-bold font-mono text-slate-900">3 Câu hỏi</div>
                          <div className="text-slate-500 text-[11px]">Tập trung vào SLA 99.999% &amp; PCI-DSS</div>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                          <span className="text-slate-400 text-[10px] block uppercase font-bold">NEXT BEST ACTION (AI ĐỀ XUẤT)</span>
                          <div className="text-sm font-bold text-amber-800">Đặt lịch họp UAT sign-off</div>
                          <div className="text-slate-500 text-[11px]">Khách hàng đang ở giai đoạn chốt hợp đồng</div>
                        </div>
                      </div>

                      {/* Closing Decision Actions */}
                      <div className="p-6 rounded-3xl border border-slate-200 bg-slate-50/70 space-y-4">
                        <h4 className="text-sm font-bold text-slate-900 font-mono">
                          QUYẾT ĐỊNH ĐÓNG DEAL CỦA PRESALE LEAD:
                        </h4>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Sau khi đàm phán thương thảo các điều khoản cuối cùng với khách hàng, Presale Lead cập nhật kết quả chính thức của hồ sơ thầu vào hệ thống:
                        </p>

                        <div className="flex flex-wrap items-center gap-3 pt-1">
                          <button
                            onClick={() => handleClosingDecision('WON')}
                            disabled={isSubmitting || selectedProject.status === 'WON'}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                          >
                            <ThumbsUp className="w-4 h-4" />
                            <span>{selectedProject.status === 'WON' ? '✓ ĐÃ THẮNG THẦU (DEAL WON)' : 'Xác Nhận Thắng Thầu (Mark as Won)'}</span>
                          </button>

                          <button
                            onClick={() => handleClosingDecision('LOST')}
                            disabled={isSubmitting || selectedProject.status === 'LOST'}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Ghi Nhận Thất Bại (Mark as Lost)</span>
                          </button>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                        <button
                          onClick={() => setLeadPipelineStage(5)}
                          className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50"
                        >
                          &larr; Quay lại Giai đoạn 5
                        </button>
                        <span className="text-brand-700 font-bold font-mono">
                          ★ Pipeline Presale Lead hoàn tất trọn vẹn 6 giai đoạn!
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}

            </div>
          )}

          {/* OTHER ROLES PIPELINE ARCHITECTURE (DISPLAY MAPPED STAGES) */}
          {selectedRole !== 'PRESALE_LEAD' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className={`w-10 h-10 rounded-2xl ${ROLE_DETAILS[selectedRole].iconBg} text-white flex items-center justify-center font-bold font-mono text-sm shadow-sm`}>
                  {selectedRole.slice(0, 2)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">
                      {ROLE_DETAILS[selectedRole].nameVi}
                    </h2>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${ROLE_DETAILS[selectedRole].badgeClass}`}>
                      {selectedRole}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {ROLE_DETAILS[selectedRole].description}
                  </p>
                </div>
              </div>

              {/* Mapped Role Pipeline Stages */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-700 font-mono uppercase">
                  LỘ TRÌNH PIPELINE CHUYÊN BIỆT CHO VAI TRÒ {selectedRole}:
                </h3>

                {selectedRole === 'SALES_REP' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200 space-y-1">
                      <div className="font-bold text-indigo-900">1. Tiếp nhận RFP Khách hàng</div>
                      <p className="text-[11px] text-slate-600">Thu thập brief thô, tạo bản ghi Lead và phân bổ cho nhóm presale.</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200 space-y-1">
                      <div className="font-bold text-indigo-900">2. Đánh giá BANT Scoring</div>
                      <p className="text-[11px] text-slate-600">Thẩm định ngân sách, thẩm quyền, nhu cầu và tiến độ của deal.</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200 space-y-1">
                      <div className="font-bold text-indigo-900">3. Quản lý Vòng đời Pipeline</div>
                      <p className="text-[11px] text-slate-600">Giám sát các trạng thái Contacted, Qualified, Proposal Drafting.</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200 space-y-1">
                      <div className="font-bold text-indigo-900">4. Chia sẻ Portal &amp; Telemetry</div>
                      <p className="text-[11px] text-slate-600">Mở link portal cho khách, theo dõi tín hiệu xem proposal thực tế.</p>
                    </div>
                  </div>
                )}

                {selectedRole === 'PRESALE_CONSULTANT' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div className="p-4 rounded-2xl bg-emerald-50/60 border border-brand-200 space-y-1">
                      <div className="font-bold text-brand-900">1. Chạy AI Intake Parser</div>
                      <p className="text-[11px] text-slate-600">Trích xuất cấu trúc dự án từ tài liệu yêu cầu thô không cấu trúc.</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-emerald-50/60 border border-brand-200 space-y-1">
                      <div className="font-bold text-brand-900">2. Discovery Meetings &amp; Gaps</div>
                      <p className="text-[11px] text-slate-600">Khảo sát kỹ thuật, làm rõ yêu cầu còn thiếu và hành động tiếp theo.</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-emerald-50/60 border border-brand-200 space-y-1">
                      <div className="font-bold text-brand-900">3. Soạn thảo 10 Sheets Matrix</div>
                      <p className="text-[11px] text-slate-600">Tự động sinh và tinh chỉnh 10 sheets hoàn chỉnh bằng AI RAG.</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-emerald-50/60 border border-brand-200 space-y-1">
                      <div className="font-bold text-brand-900">4. Nộp duyệt Proposal (Submit)</div>
                      <p className="text-[11px] text-slate-600">Chuyển proposal lên trạng thái IN_REVIEW để Presale Lead phê duyệt.</p>
                    </div>
                  </div>
                )}

                {selectedRole === 'ADMIN' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 space-y-1">
                      <div className="font-bold text-purple-900">1. Quản Trị Workspace &amp; Tổ Chức</div>
                      <p className="text-[11px] text-slate-600">Thiết lập cấu hình tổ chức, domain và hạn ngạch dữ liệu cấp nền tảng.</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 space-y-1">
                      <div className="font-bold text-purple-900">2. Bảo Mật Đa Người Dùng (Multi-Tenant)</div>
                      <p className="text-[11px] text-slate-600">Thiết lập cách ly dữ liệu tenant, phân vùng bảo mật và kiểm toán an ninh.</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 space-y-1">
                      <div className="font-bold text-purple-900">3. Giám Sát Hạ Tầng &amp; Máy Chủ</div>
                      <p className="text-[11px] text-slate-600">Theo dõi hoạt động server API, database và lưu trữ Audit Trail bất biến.</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 space-y-1">
                      <div className="font-bold text-purple-900">4. Tách Biệt Khỏi Dự Án Thầu (PBAC)</div>
                      <p className="text-[11px] text-slate-600">Không can thiệp tạo dự án, không gán role; chỉ vào Lead Workspace khi Leader mời.</p>
                    </div>
                  </div>
                )}

                {selectedRole === 'VIEWER' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                    <div className="p-4 rounded-2xl bg-slate-100 border border-slate-300 space-y-1">
                      <div className="font-bold text-slate-800">1. Soát xét Chỉ đọc Toàn bộ Lead</div>
                      <p className="text-[11px] text-slate-600">Theo dõi thông tin dự án, biên bản họp và tiến độ tổng quan.</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-100 border border-slate-300 space-y-1">
                      <div className="font-bold text-slate-800">2. Tra cứu Tri thức &amp; Hỏi đáp AI</div>
                      <p className="text-[11px] text-slate-600">Hỏi đáp với AI assistant và tra cứu tài liệu trong Knowledge Vault.</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-100 border border-slate-300 space-y-1">
                      <div className="font-bold text-slate-800">3. Tải xuống Báo cáo Excel &amp; PDF</div>
                      <p className="text-[11px] text-slate-600">Xuất file bảng tính Excel 10-Sheet và PDF tiêu chuẩn in ấn.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action to switch to Presale Lead Pipeline */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs flex items-center justify-between">
                <div className="text-amber-900">
                  Bạn có muốn xem quy trình phê duyệt của Trưởng nhóm Presale?
                </div>
                <button
                  onClick={() => setSelectedRole('PRESALE_LEAD')}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold transition-all shadow-xs cursor-pointer"
                >
                  Xem Pipeline Presale Lead →
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* PRESALE DEAL TEAM CUSTOMIZATION MODAL (Accessible from Stage 1) */}
      {isTeamModalOpen && selectedProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-50 border border-brand-200 text-brand-700 flex items-center justify-center font-bold">
                  <Users className="w-5 h-5 text-brand-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Phân Bổ Đội Ngũ Presale Deal Team
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
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong>Lưu ý:</strong> Không phải lead nào cũng cần có cả 5 role. Tùy biến đội ngũ linh hoạt theo quy mô và tính chất dự án.
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
                  onClick={() => setSelectedDealRoles(['SALES_REP', 'PRESALE_CONSULTANT'])}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium transition-colors cursor-pointer"
                >
                  ⚡ Deal Nhỏ (Fast-Track: 2 vai trò)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDealRoles(['PRESALE_LEAD', 'PRESALE_CONSULTANT', 'SALES_REP'])}
                  className="px-3 py-1.5 rounded-xl border border-brand-200 bg-brand-50 hover:bg-brand-100 text-brand-800 font-semibold transition-colors cursor-pointer"
                >
                  💼 Tiêu Chuẩn (Standard: 3 vai trò)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDealRoles(['PRESALE_LEAD', 'PRESALE_CONSULTANT', 'SALES_REP', 'VIEWER'])}
                  className="px-3 py-1.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-800 font-semibold transition-colors cursor-pointer"
                >
                  🏢 Doanh Nghiệp Lớn (Enterprise: 4 vai trò)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDealRoles(['ADMIN', 'PRESALE_LEAD', 'PRESALE_CONSULTANT', 'SALES_REP', 'VIEWER'])}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold transition-colors cursor-pointer"
                >
                  🌐 Đầy Đủ (Tất cả 5 vai trò)
                </button>
              </div>
            </div>

            {/* 5 Role Selection Cards */}
            <div className="space-y-2.5 pt-1">
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

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs">
              <span className="text-slate-400 font-mono text-[11px]">
                Đã chọn {selectedDealRoles.length}/6 vai trò
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
