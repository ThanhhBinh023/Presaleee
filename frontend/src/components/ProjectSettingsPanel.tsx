import React, { useEffect, useState } from 'react';
import { useToast } from './common/Toast';
import { settingsService } from '../services/settingsService';
import { addProjectMember, updateProjectMemberRole, removeProjectMember } from '../services/leadService';
import { rateCardService } from '../services/rateCardService';
import { formatDateTime, formatMoney } from '../utils/format';
import type {
  AccessLevel,
  ProjectAIInstructions,
  ProjectCommercialConfig,
  ProjectPortalConfig,
  ProjectQualificationRules,
  ProjectSettingsBundle
} from '../types/settings';
import type { UserRole } from '../types/auth';
import type { RateCardRecord } from '../types/rateCard';
import {
  Users,
  Sliders,
  DollarSign,
  Bot,
  Globe,
  Settings2,
  Trash2,
  Archive,
  RefreshCw,
  XCircle,
  ArrowRightLeft,
  Plus,
  X,
  Lock,
  Eye,
  ShieldCheck,
  Palette
} from 'lucide-react';

interface ProjectSettingsPanelProps {
  leadId: string;
  onProjectUpdated?: () => void;
  onProjectDeleted?: () => void;
}

type ProjectSettingsSection =
  | 'members'
  | 'qualification'
  | 'commercial'
  | 'ai'
  | 'portal'
  | 'general';

function AccessBadge({ level }: { level: AccessLevel }) {
  if (level === 'F') {
    return (
      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-mono font-bold">
        FULL ACCESS (F)
      </span>
    );
  }
  if (level === 'V') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-300 text-[10px] font-mono font-bold">
        <Eye className="w-3 h-3" /> VIEW ONLY (V)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-mono font-bold">
      <Lock className="w-3 h-3" /> NO ACCESS (NO)
    </span>
  );
}

export const ProjectSettingsPanel: React.FC<ProjectSettingsPanelProps> = ({
  leadId,
  onProjectUpdated,
  onProjectDeleted
}) => {
  const toast = useToast();
  const [bundle, setBundle] = useState<ProjectSettingsBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<ProjectSettingsSection>('members');

  // Section states
  const [inviteIdentifier, setInviteIdentifier] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('PRESALE_CONSULTANT');
  const [inviteMode, setInviteMode] = useState<'invite' | 'direct'>('invite');
  const [workingMember, setWorkingMember] = useState(false);

  const [qualRules, setQualRules] = useState<ProjectQualificationRules | null>(null);
  const [newQuestion, setNewQuestion] = useState('');
  const [savingQual, setSavingQual] = useState(false);

  const [commercial, setCommercial] = useState<ProjectCommercialConfig | null>(null);
  const [rateCards, setRateCards] = useState<RateCardRecord[]>([]);
  const [savingComm, setSavingComm] = useState(false);

  const [aiInst, setAiInst] = useState<ProjectAIInstructions | null>(null);
  const [newContextRule, setNewContextRule] = useState('');
  const [savingAI, setSavingAI] = useState(false);

  const [portalCfg, setPortalCfg] = useState<ProjectPortalConfig | null>(null);
  const [portalPasscodeInput, setPortalPasscodeInput] = useState('');
  const [allowedDomainsText, setAllowedDomainsText] = useState('');
  const [savingPortal, setSavingPortal] = useState(false);

  const [genTitle, setGenTitle] = useState('');
  const [genClientName, setGenClientName] = useState('');
  const [genIndustry, setGenIndustry] = useState('');
  const [genDesc, setGenDesc] = useState('');
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [archiveOutcome, setArchiveOutcome] = useState<'WON' | 'DECLINED'>('WON');
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [deletingProject, setDeletingProject] = useState(false);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const data = await settingsService.getProjectSettings(leadId);
      setBundle(data);
      setQualRules(data.settings.qualification);
      setCommercial(data.settings.commercial);
      setAiInst(data.settings.aiInstructions);
      setPortalCfg(data.settings.portalConfig);
      setAllowedDomainsText((data.settings.portalConfig.allowedDomains || []).join(', '));
      setGenTitle(data.general.title || '');
      setGenClientName(data.general.clientName || '');
      setGenIndustry(data.general.industry || '');
      setGenDesc(data.general.description || '');
      if (data.general.archiveOutcome === 'WON' || data.general.archiveOutcome === 'DECLINED') {
        setArchiveOutcome(data.general.archiveOutcome);
      }

      // Load org rate cards for reference
      rateCardService
        .list({ limit: 50, includeInactive: false })
        .then((res) => setRateCards(res.rateCards || []))
        .catch(() => {});
    } catch (err: any) {
      setLoadError(err?.message || 'Bạn không có quyền truy cập Project Settings của dự án này.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-sm font-mono text-slate-400">
        Đang tải Cài đặt Dự án (PBAC)...
      </div>
    );
  }

  if (loadError || !bundle) {
    return (
      <div className="bg-white rounded-3xl border border-rose-200 p-8 text-center space-y-2">
        <Lock className="w-8 h-8 text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-900">Không có quyền truy cập Project Settings</h3>
        <p className="text-xs text-slate-600 max-w-md mx-auto">{loadError}</p>
      </div>
    );
  }

  const perms = bundle.permissions;
  const isArchived = bundle.general.isArchived;

  // Handlers: Members & Invitations
  const handleInviteOrAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteIdentifier.trim()) return;
    try {
      setWorkingMember(true);
      if (inviteMode === 'invite') {
        await settingsService.createInvitation(leadId, inviteIdentifier.trim(), inviteRole);
        toast.success(`Đã gửi lời mời tới ${inviteIdentifier.trim()} (${inviteRole}).`, 'Lời mời Dự án');
      } else {
        await addProjectMember(leadId, inviteIdentifier.trim(), inviteRole);
        toast.success(`Đã bổ nhiệm ${inviteIdentifier.trim()} vào dự án (${inviteRole}).`, 'Nhân sự Dự án');
      }
      setInviteIdentifier('');
      await loadSettings();
    } catch (err: any) {
      toast.error(err?.message || 'Không thể mời / thêm thành viên.', 'Lỗi');
    } finally {
      setWorkingMember(false);
    }
  };

  const handleResendInvite = async (invId: string) => {
    try {
      await settingsService.resendInvitation(leadId, invId);
      toast.info('Đã gửi lại thông báo lời mời.', 'Pending Invitations');
      await loadSettings();
    } catch (err: any) {
      toast.error(err?.message || 'Không thể gửi lại lời mời.');
    }
  };

  const handleRevokeInvite = async (invId: string) => {
    try {
      await settingsService.revokeInvitation(leadId, invId);
      toast.info('Đã thu hồi lời mời.', 'Pending Invitations');
      await loadSettings();
    } catch (err: any) {
      toast.error(err?.message || 'Không thể thu hồi lời mời.');
    }
  };

  const handleRoleChange = async (userId: string, nextRole: UserRole) => {
    try {
      await updateProjectMemberRole(leadId, userId, nextRole);
      toast.success('Đã cập nhật Project Role.', 'Phân quyền');
      await loadSettings();
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi cập nhật vai trò.');
    }
  };

  const handleRemoveMember = async (userId: string, name: string) => {
    if (!window.confirm(`Xóa thành viên "${name}" khỏi dự án?`)) return;
    try {
      await removeProjectMember(leadId, userId);
      toast.info(`Đã xóa ${name} khỏi dự án.`);
      await loadSettings();
    } catch (err: any) {
      toast.error(err?.message || 'Không thể xóa thành viên.');
    }
  };

  const handleTransferOwnership = async (targetUserId: string, name: string) => {
    if (!window.confirm(`Xác nhận chuyển giao quyền PRESALE_LEAD (Trưởng dự án) cho "${name}"? Vai trò của bạn sẽ chuyển sang PRESALE_CONSULTANT.`)) {
      return;
    }
    try {
      await settingsService.transferLeadOwnership(leadId, targetUserId);
      toast.success(`Đã chuyển giao quyền Trưởng dự án cho ${name}.`, 'Chuyển giao Lead');
      await loadSettings();
      onProjectUpdated?.();
    } catch (err: any) {
      toast.error(err?.message || 'Chuyển giao quyền thất bại.');
    }
  };

  // Handlers: Qualification
  const handleSaveQualification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qualRules) return;
    const total = qualRules.budgetWeight + qualRules.authorityWeight + qualRules.needWeight + qualRules.timelineWeight;
    if (total !== 100) {
      toast.warning(`Tổng trọng số BANT hiện tại là ${total}%. Vui lòng điều chỉnh để tổng bằng đúng 100%.`, 'Trọng số BANT');
      return;
    }
    try {
      setSavingQual(true);
      const saved = await settingsService.updateQualification(leadId, qualRules);
      setQualRules(saved);
      toast.success('Đã lưu Cấu hình Qualification & BANT Rules.', 'BANT AI');
    } catch (err: any) {
      toast.error(err?.message || 'Lưu thất bại.');
    } finally {
      setSavingQual(false);
    }
  };

  // Handlers: Commercial
  const handleSaveCommercial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commercial) return;
    try {
      setSavingComm(true);
      const saved = await settingsService.updateCommercial(leadId, commercial);
      setCommercial(saved);
      toast.success('Đã lưu cấu hình Thương mại & Rate Cards.', 'Commercial');
    } catch (err: any) {
      toast.error(err?.message || 'Lưu thất bại.');
    } finally {
      setSavingComm(false);
    }
  };

  // Handlers: AI Instructions
  const handleSaveAIInstructions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInst) return;
    try {
      setSavingAI(true);
      const saved = await settingsService.updateAIInstructions(leadId, aiInst);
      setAiInst(saved);
      toast.success('Đã lưu Chỉ dẫn AI của Dự án.', 'Project AI Instructions');
    } catch (err: any) {
      toast.error(err?.message || 'Lưu thất bại.');
    } finally {
      setSavingAI(false);
    }
  };

  // Handlers: Portal Config
  const handleSavePortal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portalCfg) return;
    try {
      setSavingPortal(true);
      const domains = allowedDomainsText
        .split(',')
        .map((d) => d.trim().toLowerCase())
        .filter(Boolean);
      const saved = await settingsService.updatePortalConfig(leadId, {
        ...portalCfg,
        allowedDomains: domains,
        ...(portalPasscodeInput.trim() ? { passcode: portalPasscodeInput.trim() } : {})
      });
      setPortalCfg(saved);
      setPortalPasscodeInput('');
      toast.success('Đã lưu cấu hình Client Portal & White-label Branding.', 'Client Portal');
    } catch (err: any) {
      toast.error(err?.message || 'Lưu thất bại.');
    } finally {
      setSavingPortal(false);
    }
  };

  // Handlers: General & Archive & Delete
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingGeneral(true);
      await settingsService.updateProjectGeneral(leadId, {
        title: genTitle.trim(),
        clientName: genClientName.trim(),
        industry: genIndustry.trim(),
        description: genDesc.trim()
      });
      toast.success('Đã cập nhật thông tin định danh dự án.', 'General Settings');
      await loadSettings();
      onProjectUpdated?.();
    } catch (err: any) {
      toast.error(err?.message || 'Cập nhật thất bại.');
    } finally {
      setSavingGeneral(false);
    }
  };

  const handleToggleArchive = async () => {
    const nextArchived = !isArchived;
    try {
      setSavingGeneral(true);
      await settingsService.updateProjectGeneral(leadId, {
        isArchived: nextArchived,
        archiveOutcome: nextArchived ? archiveOutcome : null
      });
      toast.success(
        nextArchived
          ? `Đã lưu trữ dự án ở chế độ Read-Only (${archiveOutcome}).`
          : 'Đã mở khóa dự án khỏi chế độ lưu trữ.',
        'Vòng đời Dự án'
      );
      await loadSettings();
      onProjectUpdated?.();
    } catch (err: any) {
      toast.error(err?.message || 'Thao tác lưu trữ thất bại.');
    } finally {
      setSavingGeneral(false);
    }
  };

  const handleDeleteProject = async () => {
    try {
      setDeletingProject(true);
      await settingsService.deleteProject(leadId, deleteConfirmName);
      toast.success('Đã xóa vĩnh viễn dự án và toàn bộ dữ liệu liên quan.', 'Delete Project');
      onProjectDeleted?.();
    } catch (err: any) {
      toast.error(err?.message || 'Xóa dự án thất bại.');
    } finally {
      setDeletingProject(false);
    }
  };

  const navItems: Array<{
    id: ProjectSettingsSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    access: AccessLevel;
  }> = [
    { id: 'members', label: '2.1 Thành viên & Phân quyền', icon: Users, access: perms.members },
    { id: 'qualification', label: '2.2 Qualification & BANT AI', icon: Sliders, access: perms.qualification },
    { id: 'commercial', label: '2.3 Rate Cards & Commercial', icon: DollarSign, access: perms.rateCards },
    { id: 'ai', label: '2.4 Chỉ dẫn AI Dự án', icon: Bot, access: perms.aiInstructions },
    { id: 'portal', label: '2.5 Cấu hình Client Portal', icon: Globe, access: perms.portalConfig },
    { id: 'general', label: '2.6 Chung, Archive & Danger Zone', icon: Settings2, access: perms.generalArchive }
  ];

  const visibleNavItems = navItems.filter((item) => item.access !== 'NO');

  return (
    <div className="space-y-4">
      {/* Top PBAC Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900">
              Cài đặt Dự án (Project / Lead Workspace Settings)
            </div>
            <div className="text-xs text-slate-500">
              Project Role hiện tại của bạn: <strong className="font-mono text-brand-700">{bundle.callerProjectRole}</strong> · Dữ liệu cô lập tuyệt đối theo từng Lead Workspace.
            </div>
          </div>
        </div>
        {isArchived && (
          <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-mono font-bold">
            ARCHIVED READ-ONLY ({bundle.general.archiveOutcome || 'CLOSED'})
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Navigation */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-3 space-y-1 shadow-2xs">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  active ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${active ? 'text-brand-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </span>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                  item.access === 'F'
                    ? active ? 'bg-brand-500 text-white' : 'bg-emerald-100 text-emerald-800'
                    : active ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-500'
                }`}>
                  {item.access}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Section Content */}
        <div className="lg:col-span-8 space-y-5">
          {/* ================================================================
              2.1 MEMBERS & ROLES + PENDING INVITATIONS + TRANSFER OWNERSHIP
          ================================================================ */}
          {activeSection === 'members' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Thành viên &amp; Phân quyền Dự án</h3>
                  <p className="text-xs text-slate-500">Quản lý Project Roles, lời mời đang chờ và chuyển giao quyền Trưởng dự án.</p>
                </div>
                <AccessBadge level={perms.members} />
              </div>

              {perms.members === 'F' && (
                <form onSubmit={handleInviteOrAdd} className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-mono font-bold text-emerald-900 uppercase">Mời / Bổ nhiệm thành viên mới</span>
                    <div className="flex rounded-lg border border-emerald-300 bg-white overflow-hidden text-[11px] font-semibold">
                      <button
                        type="button"
                        onClick={() => setInviteMode('invite')}
                        className={`px-2.5 py-1 cursor-pointer ${inviteMode === 'invite' ? 'bg-brand-600 text-white' : 'text-slate-600'}`}
                      >
                        Gửi Lời mời (Pending)
                      </button>
                      <button
                        type="button"
                        onClick={() => setInviteMode('direct')}
                        className={`px-2.5 py-1 cursor-pointer ${inviteMode === 'direct' ? 'bg-brand-600 text-white' : 'text-slate-600'}`}
                      >
                        Thêm trực tiếp
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    <input
                      value={inviteIdentifier}
                      onChange={(e) => setInviteIdentifier(e.target.value)}
                      required
                      placeholder={inviteMode === 'invite' ? 'Email hoặc Họ tên thành viên trong tổ chức...' : 'Email thành viên...'}
                      className="sm:col-span-6 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
                    />
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as UserRole)}
                      className="sm:col-span-4 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold"
                    >
                      <option value="PRESALE_CONSULTANT">Presale Consultant</option>
                      <option value="SALES_REP">Sales Rep</option>
                      <option value="PRESALE_LEAD">Presale Lead</option>
                      <option value="VIEWER">Viewer (Chỉ xem)</option>
                    </select>
                    <button
                      type="submit"
                      disabled={workingMember}
                      className="sm:col-span-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold py-2 px-3 disabled:opacity-50 cursor-pointer"
                    >
                      {inviteMode === 'invite' ? 'Gửi mời' : 'Thêm'}
                    </button>
                  </div>
                </form>
              )}

              {/* Active Project Members */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-mono font-bold uppercase text-slate-500">Nhân sự tham gia ({bundle.members.length})</h4>
                {bundle.members.map((m) => (
                  <div key={m.userId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{m.fullName}</div>
                      <div className="font-mono text-[11px] text-slate-500">{m.email}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {perms.members === 'F' ? (
                        <>
                          <select
                            value={m.projectRole}
                            onChange={(e) => void handleRoleChange(m.userId, e.target.value as UserRole)}
                            className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold"
                          >
                            <option value="PRESALE_LEAD">Presale Lead</option>
                            <option value="PRESALE_CONSULTANT">Presale Consultant</option>
                            <option value="SALES_REP">Sales Rep</option>
                            <option value="VIEWER">Viewer</option>
                          </select>
                          {m.projectRole !== 'PRESALE_LEAD' && (
                            <button
                              type="button"
                              onClick={() => void handleTransferOwnership(m.userId, m.fullName)}
                              title="Chuyển giao quyền Trưởng dự án (PRESALE_LEAD)"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold cursor-pointer"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                              <span>Giao quyền Lead</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => void handleRemoveMember(m.userId, m.fullName)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                            title="Xóa khỏi dự án"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 font-mono font-bold text-slate-700">{m.projectRole}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pending Invitations Panel */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-mono font-bold uppercase text-slate-500">
                  Bảng điều khiển Lời mời (Pending Invitations · {bundle.invitations.filter(i => i.status === 'PENDING').length})
                </h4>
                {bundle.invitations.length === 0 ? (
                  <p className="text-xs text-slate-400">Chưa có lời mời nào được gửi cho dự án này.</p>
                ) : (
                  <div className="space-y-2">
                    {bundle.invitations.map((inv) => (
                      <div key={inv.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs">
                        <div>
                          <div className="font-bold text-slate-800">
                            {inv.invitedUserName ? `${inv.invitedUserName} (${inv.email})` : inv.email}
                          </div>
                          <div className="font-mono text-[11px] text-slate-400">
                            Role: {inv.projectRole} · Gửi lúc: {formatDateTime(inv.lastSentAt)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                            inv.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-800'
                              : inv.status === 'ACCEPTED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-600'
                          }`}>
                            {inv.status}
                          </span>
                          {perms.members === 'F' && inv.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => void handleResendInvite(inv.id)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer"
                              >
                                <RefreshCw className="w-3 h-3" /> Gửi lại
                              </button>
                              <button
                                onClick={() => void handleRevokeInvite(inv.id)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold cursor-pointer"
                              >
                                <XCircle className="w-3 h-3" /> Thu hồi
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================================
              2.2 QUALIFICATION & BANT AI RULES
          ================================================================ */}
          {activeSection === 'qualification' && qualRules && (
            <form onSubmit={handleSaveQualification} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Cấu hình Qualification &amp; BANT AI</h3>
                  <p className="text-xs text-slate-500">Trọng số khung BANT (tổng 100%), ngưỡng điểm tự động và bộ câu hỏi gợi ý Discovery.</p>
                </div>
                <AccessBadge level={perms.qualification} />
              </div>

              <fieldset disabled={perms.qualification !== 'F'} className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono font-bold">
                    <span className="text-slate-600 uppercase">Trọng số khung BANT (%)</span>
                    <span className={
                      qualRules.budgetWeight + qualRules.authorityWeight + qualRules.needWeight + qualRules.timelineWeight === 100
                        ? 'text-emerald-700'
                        : 'text-rose-600'
                    }>
                      Tổng: {qualRules.budgetWeight + qualRules.authorityWeight + qualRules.needWeight + qualRules.timelineWeight}%
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    {(
                      [
                        { key: 'budgetWeight', label: 'Budget (%)' },
                        { key: 'authorityWeight', label: 'Authority (%)' },
                        { key: 'needWeight', label: 'Need (%)' },
                        { key: 'timelineWeight', label: 'Timeline (%)' }
                      ] as const
                    ).map((item) => (
                      <label key={item.key} className="space-y-1">
                        <span className="font-mono text-slate-500">{item.label}</span>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={qualRules[item.key]}
                          onChange={(e) => setQualRules({ ...qualRules, [item.key]: Number(e.target.value) })}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono font-bold disabled:bg-slate-50"
                        />
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <label className="space-y-1 p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200">
                    <span className="font-mono font-bold text-emerald-900 block">Ngưỡng Chấp nhận (Auto-Approve Threshold /100)</span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={qualRules.autoApproveThreshold}
                      onChange={(e) => setQualRules({ ...qualRules, autoApproveThreshold: Number(e.target.value) })}
                      className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-2 font-mono font-bold disabled:bg-slate-50"
                    />
                  </label>
                  <label className="space-y-1 p-3.5 rounded-xl bg-rose-50/50 border border-rose-200">
                    <span className="font-mono font-bold text-rose-900 block">Ngưỡng Từ chối (Auto-Reject Threshold /100)</span>
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={qualRules.autoRejectThreshold}
                      onChange={(e) => setQualRules({ ...qualRules, autoRejectThreshold: Number(e.target.value) })}
                      className="w-full rounded-lg border border-rose-300 bg-white px-3 py-2 font-mono font-bold disabled:bg-slate-50"
                    />
                  </label>
                </div>

                {/* Intake Questions */}
                <div className="space-y-2.5">
                  <span className="text-xs font-mono font-bold uppercase text-slate-600 block">
                    Bộ câu hỏi gợi ý AI Intake ({qualRules.intakeQuestions.length})
                  </span>
                  <div className="space-y-2">
                    {qualRules.intakeQuestions.map((q, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          value={q}
                          onChange={(e) => {
                            const next = [...qualRules.intakeQuestions];
                            next[idx] = e.target.value;
                            setQualRules({ ...qualRules, intakeQuestions: next });
                          }}
                          className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs disabled:bg-slate-50"
                        />
                        {perms.qualification === 'F' && (
                          <button
                            type="button"
                            onClick={() =>
                              setQualRules({
                                ...qualRules,
                                intakeQuestions: qualRules.intakeQuestions.filter((_, i) => i !== idx)
                              })
                            }
                            className="p-2 rounded-lg text-slate-400 hover:text-rose-600 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {perms.qualification === 'F' && (
                    <div className="flex gap-2">
                      <input
                        value={newQuestion}
                        onChange={(e) => setNewQuestion(e.target.value)}
                        placeholder="Thêm câu hỏi chuẩn hóa Discovery mới..."
                        className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!newQuestion.trim()) return;
                          setQualRules({ ...qualRules, intakeQuestions: [...qualRules.intakeQuestions, newQuestion.trim()] });
                          setNewQuestion('');
                        }}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-bold cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Thêm câu hỏi
                      </button>
                    </div>
                  )}
                </div>
              </fieldset>

              {perms.qualification === 'F' && (
                <div className="flex justify-end pt-3 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={savingQual}
                    className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
                  >
                    {savingQual ? 'Đang lưu...' : 'Lưu Cấu hình BANT'}
                  </button>
                </div>
              )}
            </form>
          )}

          {/* ================================================================
              2.3 RATE CARDS & COMMERCIAL
          ================================================================ */}
          {activeSection === 'commercial' && commercial && (
            <form onSubmit={handleSaveCommercial} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Rate Cards &amp; Commercial Settings</h3>
                  <p className="text-xs text-slate-500">Đơn vị tiền tệ báo giá, thuế VAT, ngưỡng chiết khấu tối đa và bảng đơn giá nhân sự chuẩn.</p>
                </div>
                <AccessBadge level={perms.rateCards} />
              </div>

              <fieldset disabled={perms.rateCards !== 'F'} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className="space-y-1">
                    <span className="font-mono font-bold text-slate-600 uppercase block">Tiền tệ mặc định</span>
                    <select
                      value={commercial.defaultCurrency}
                      onChange={(e) => setCommercial({ ...commercial, defaultCurrency: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono font-bold disabled:bg-slate-50"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="VND">VND (₫)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="SGD">SGD (S$)</option>
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="font-mono font-bold text-slate-600 uppercase block">Thuế VAT / Tax (%)</span>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={commercial.taxRatePercent}
                      onChange={(e) => setCommercial({ ...commercial, taxRatePercent: Number(e.target.value) })}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono font-bold disabled:bg-slate-50"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="font-mono font-bold text-slate-600 uppercase block">Chiết khấu tối đa (%)</span>
                    <input
                      type="number"
                      min={0}
                      max={80}
                      value={commercial.maxDiscountPercent}
                      onChange={(e) => setCommercial({ ...commercial, maxDiscountPercent: Number(e.target.value) })}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono font-bold disabled:bg-slate-50"
                    />
                  </label>
                </div>
                <label className="block space-y-1">
                  <span className="font-mono font-bold text-slate-600 uppercase block">Điều khoản thanh toán chuẩn</span>
                  <textarea
                    rows={2}
                    value={commercial.paymentTermsNote}
                    onChange={(e) => setCommercial({ ...commercial, paymentTermsNote: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 disabled:bg-slate-50"
                  />
                </label>
              </fieldset>

              {perms.rateCards === 'F' && (
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={savingComm}
                    className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
                  >
                    {savingComm ? 'Đang lưu...' : 'Lưu Cấu hình Thương mại'}
                  </button>
                </div>
              )}

              {/* Organization Rate Cards Table Reference */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="text-xs font-mono font-bold text-slate-500 uppercase">Bảng đơn giá nhân sự đang áp dụng ({rateCards.length})</div>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 font-mono text-[10px] font-bold text-slate-500">
                      <tr>
                        <th className="px-3 py-2">VỊ TRÍ</th>
                        <th className="px-3 py-2">LEVEL</th>
                        <th className="px-3 py-2 text-right">HOURLY</th>
                        <th className="px-3 py-2 text-right">DAILY</th>
                        <th className="px-3 py-2 text-right">MONTHLY</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {rateCards.length === 0 ? (
                        <tr><td colSpan={5} className="px-3 py-4 text-center text-slate-400">Chưa có dữ liệu Rate Card.</td></tr>
                      ) : (
                        rateCards.map((rc) => (
                          <tr key={rc.id}>
                            <td className="px-3 py-2 font-sans font-semibold text-slate-800">{rc.roleName}</td>
                            <td className="px-3 py-2 text-slate-500">{rc.level}</td>
                            <td className="px-3 py-2 text-right">{formatMoney(rc.hourlyRateUsd, rc.currency)}</td>
                            <td className="px-3 py-2 text-right">{formatMoney(rc.dailyRateUsd, rc.currency)}</td>
                            <td className="px-3 py-2 text-right font-bold text-brand-700">{formatMoney(rc.monthlyRateUsd, rc.currency)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </form>
          )}

          {/* ================================================================
              2.4 PROJECT AI INSTRUCTIONS
          ================================================================ */}
          {activeSection === 'ai' && aiInst && (
            <form onSubmit={handleSaveAIInstructions} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Chỉ dẫn AI của Dự án (Project AI Instructions)</h3>
                  <p className="text-xs text-slate-500">Định hình ngôn ngữ, giọng điệu và quy tắc ngữ cảnh bắt buộc cho AI của dự án này.</p>
                </div>
                <AccessBadge level={perms.aiInstructions} />
              </div>

              <fieldset disabled={perms.aiInstructions !== 'F'} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="space-y-1">
                    <span className="font-mono font-bold text-slate-600 uppercase block">Ngôn ngữ đầu ra mặc định</span>
                    <select
                      value={aiInst.defaultLanguage}
                      onChange={(e) => setAiInst({ ...aiInst, defaultLanguage: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-semibold disabled:bg-slate-50"
                    >
                      <option value="Tiếng Việt">Tiếng Việt</option>
                      <option value="English">English</option>
                      <option value="Tiếng Nhật">Tiếng Nhật (Japanese)</option>
                      <option value="Song ngữ Việt - Anh">Song ngữ Việt - Anh</option>
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="font-mono font-bold text-slate-600 uppercase block">Văn phong &amp; Giọng điệu (Tone of Voice)</span>
                    <select
                      value={aiInst.toneOfVoice}
                      onChange={(e) => setAiInst({ ...aiInst, toneOfVoice: e.target.value as any })}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-semibold disabled:bg-slate-50"
                    >
                      <option value="PROFESSIONAL">Chuyên nghiệp &amp; Chuẩn mực</option>
                      <option value="TECHNICAL_DEEP_DIVE">Kỹ thuật Chuyên sâu (Technical Deep-dive)</option>
                      <option value="EXECUTIVE_PITCH">Thuyết phục Kinh doanh (Executive Pitch)</option>
                    </select>
                  </label>
                </div>

                <div className="space-y-2.5">
                  <span className="font-mono font-bold text-slate-600 uppercase block">
                    Quy tắc Ngữ cảnh Bắt buộc (Custom Context Rules)
                  </span>
                  <div className="space-y-2">
                    {aiInst.customContextRules.map((rule, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          value={rule}
                          onChange={(e) => {
                            const next = [...aiInst.customContextRules];
                            next[idx] = e.target.value;
                            setAiInst({ ...aiInst, customContextRules: next });
                          }}
                          className="flex-1 rounded-xl border border-slate-300 px-3 py-2 disabled:bg-slate-50"
                        />
                        {perms.aiInstructions === 'F' && (
                          <button
                            type="button"
                            onClick={() =>
                              setAiInst({
                                ...aiInst,
                                customContextRules: aiInst.customContextRules.filter((_, i) => i !== idx)
                              })
                            }
                            className="p-2 rounded-lg text-slate-400 hover:text-rose-600 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {perms.aiInstructions === 'F' && (
                    <div className="flex gap-2">
                      <input
                        value={newContextRule}
                        onChange={(e) => setNewContextRule(e.target.value)}
                        placeholder='Ví dụ: "Luôn nhấn mạnh tính năng bảo mật đạt chuẩn ISO 27001"...'
                        className="flex-1 rounded-xl border border-slate-300 px-3 py-2"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!newContextRule.trim()) return;
                          setAiInst({ ...aiInst, customContextRules: [...aiInst.customContextRules, newContextRule.trim()] });
                          setNewContextRule('');
                        }}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 font-bold cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Thêm quy tắc
                      </button>
                    </div>
                  )}
                </div>
              </fieldset>

              {perms.aiInstructions === 'F' && (
                <div className="flex justify-end pt-3 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={savingAI}
                    className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
                  >
                    {savingAI ? 'Đang lưu...' : 'Lưu Chỉ dẫn AI'}
                  </button>
                </div>
              )}
            </form>
          )}

          {/* ================================================================
              2.5 CLIENT PORTAL CONFIGURATION & WHITE-LABEL BRANDING
          ================================================================ */}
          {activeSection === 'portal' && portalCfg && (
            <form onSubmit={handleSavePortal} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Cấu hình Client Portal &amp; Thương hiệu</h3>
                  <p className="text-xs text-slate-500">Bật/tắt cổng khách hàng, mật khẩu Passcode, Domain Whitelist, AI Bot và White-label Branding.</p>
                </div>
                <AccessBadge level={perms.portalConfig} />
              </div>

              <fieldset disabled={perms.portalConfig !== 'F'} className="space-y-5 text-xs">
                {/* Master Status & Toggles */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <label className="flex items-center gap-2.5 p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={portalCfg.isEnabled}
                      onChange={(e) => setPortalCfg({ ...portalCfg, isEnabled: e.target.checked })}
                      className="w-4 h-4 rounded text-brand-600"
                    />
                    <div>
                      <div className="font-bold text-slate-900">Kích hoạt Client Portal</div>
                      <div className="text-[11px] text-slate-500">Cho phép khách mở liên kết</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-2.5 p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={portalCfg.aiAssistantEnabled}
                      onChange={(e) => setPortalCfg({ ...portalCfg, aiAssistantEnabled: e.target.checked })}
                      className="w-4 h-4 rounded text-brand-600"
                    />
                    <div>
                      <div className="font-bold text-slate-900">AI Assistant cho Khách</div>
                      <div className="text-[11px] text-slate-500">Chatbot hỏi đáp Proposal</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-2.5 p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={portalCfg.commentsEnabled}
                      onChange={(e) => setPortalCfg({ ...portalCfg, commentsEnabled: e.target.checked })}
                      className="w-4 h-4 rounded text-brand-600"
                    />
                    <div>
                      <div className="font-bold text-slate-900">Khu vực Thảo luận / Feedback</div>
                      <div className="text-[11px] text-slate-500">Cho phép khách gửi góp ý</div>
                    </div>
                  </label>
                </div>

                {/* Security: Passcode, Whitelist, Expiration */}
                <div className="p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="font-mono font-bold uppercase text-slate-700">Cấu hình Bảo mật Truy cập</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 font-semibold text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={portalCfg.passcodeEnabled}
                          onChange={(e) => setPortalCfg({ ...portalCfg, passcodeEnabled: e.target.checked })}
                        />
                        <span>Yêu cầu mật khẩu truy cập (Passcode Protection)</span>
                      </label>
                      {portalCfg.passcodeEnabled && (
                        <input
                          type="password"
                          value={portalPasscodeInput}
                          onChange={(e) => setPortalPasscodeInput(e.target.value)}
                          placeholder={portalCfg.hasPasscode ? 'Đã đặt Passcode (nhập để đổi mới)...' : 'Nhập Passcode (4–32 ký tự)...'}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                        />
                      )}
                    </div>
                    <label className="space-y-1">
                      <span className="font-semibold text-slate-700 block">Thời hạn link mặc định (giờ · 1–720)</span>
                      <input
                        type="number"
                        min={1}
                        max={720}
                        value={portalCfg.defaultExpirationHours}
                        onChange={(e) => setPortalCfg({ ...portalCfg, defaultExpirationHours: Number(e.target.value) })}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                      />
                    </label>
                  </div>
                  <label className="block space-y-1">
                    <span className="font-semibold text-slate-700 block">
                      Giới hạn tên miền Email (Domain Whitelist, phân tách bởi dấu phẩy — ví dụ: @client.com, @partner.vn)
                    </span>
                    <input
                      value={allowedDomainsText}
                      onChange={(e) => setAllowedDomainsText(e.target.value)}
                      placeholder="Để trống nếu không giới hạn tên miền email..."
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                    />
                  </label>
                </div>

                {/* White-label Branding */}
                <div className="p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="font-mono font-bold uppercase text-slate-700 flex items-center gap-1.5">
                    <Palette className="w-4 h-4 text-brand-600" />
                    <span>Tùy biến Thương hiệu (White-label Branding)</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <label className="md:col-span-2 space-y-1">
                      <span className="text-slate-600 font-semibold block">Logo URL doanh nghiệp</span>
                      <input
                        value={portalCfg.branding.logoUrl}
                        onChange={(e) =>
                          setPortalCfg({ ...portalCfg, branding: { ...portalCfg.branding, logoUrl: e.target.value } })
                        }
                        placeholder="https://..."
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-slate-600 font-semibold block">Màu sắc nhận diện (Primary Color)</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={portalCfg.branding.primaryColor}
                          onChange={(e) =>
                            setPortalCfg({ ...portalCfg, branding: { ...portalCfg.branding, primaryColor: e.target.value } })
                          }
                          className="h-9 w-12 rounded border border-slate-300 cursor-pointer"
                        />
                        <input
                          value={portalCfg.branding.primaryColor}
                          onChange={(e) =>
                            setPortalCfg({ ...portalCfg, branding: { ...portalCfg.branding, primaryColor: e.target.value } })
                          }
                          className="flex-1 rounded-lg border border-slate-300 px-2.5 py-2 font-mono"
                        />
                      </div>
                    </label>
                  </div>
                  <label className="block space-y-1">
                    <span className="text-slate-600 font-semibold block">Lời chào mừng trên giao diện khách hàng</span>
                    <textarea
                      rows={2}
                      value={portalCfg.branding.welcomeMessage}
                      onChange={(e) =>
                        setPortalCfg({ ...portalCfg, branding: { ...portalCfg.branding, welcomeMessage: e.target.value } })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </label>
                </div>
              </fieldset>

              {perms.portalConfig === 'F' && (
                <div className="flex justify-end pt-3 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={savingPortal}
                    className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
                  >
                    {savingPortal ? 'Đang lưu...' : 'Lưu Cấu hình Client Portal'}
                  </button>
                </div>
              )}
            </form>
          )}

          {/* ================================================================
              2.6 GENERAL, ARCHIVE PROJECT & DANGER ZONE (PRESALE_LEAD ONLY)
          ================================================================ */}
          {activeSection === 'general' && perms.generalArchive === 'F' && (
            <div className="space-y-5">
              {/* General Info */}
              <form onSubmit={handleSaveGeneral} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-2xs text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Thông tin Định danh Dự án</h3>
                    <p className="text-slate-500">Chỉnh sửa tên Lead/Dự án, tổ chức khách hàng, lĩnh vực và mô tả tóm tắt.</p>
                  </div>
                  <AccessBadge level={perms.generalArchive} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="space-y-1 md:col-span-2">
                    <span className="font-mono font-bold text-slate-600 uppercase block">Tên Lead / Dự án</span>
                    <input
                      value={genTitle}
                      onChange={(e) => setGenTitle(e.target.value)}
                      required
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-semibold"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="font-mono font-bold text-slate-600 uppercase block">Tên Tổ chức Khách hàng</span>
                    <input
                      value={genClientName}
                      onChange={(e) => setGenClientName(e.target.value)}
                      placeholder="Tên doanh nghiệp khách hàng..."
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="font-mono font-bold text-slate-600 uppercase block">Lĩnh vực hoạt động (Industry)</span>
                    <input
                      value={genIndustry}
                      onChange={(e) => setGenIndustry(e.target.value)}
                      placeholder="Fintech, Healthcare, Retail..."
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                    />
                  </label>
                  <label className="space-y-1 md:col-span-2">
                    <span className="font-mono font-bold text-slate-600 uppercase block">Mô tả vắn tắt</span>
                    <textarea
                      rows={3}
                      value={genDesc}
                      onChange={(e) => setGenDesc(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                    />
                  </label>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={savingGeneral || !genTitle.trim()}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold disabled:opacity-50 cursor-pointer"
                  >
                    {savingGeneral ? 'Đang lưu...' : 'Lưu Thông tin Chung'}
                  </button>
                </div>
              </form>

              {/* Archive Project */}
              <div className="bg-white rounded-2xl border border-amber-200 p-6 space-y-3 shadow-2xs text-xs">
                <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
                  <Archive className="w-4 h-4 text-amber-600" />
                  <span>Lưu trữ Dự án (Archive Project · Read-only Mode)</span>
                </div>
                <p className="text-slate-600">
                  Chuyển dự án sang trạng thái chỉ đọc (Read-only) khi đã ký kết thành công (Won) hoặc dừng theo đuổi (Declined). Toàn bộ dữ liệu được bảo lưu nguyên vẹn nhưng không thể chỉnh sửa.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {!isArchived && (
                    <select
                      value={archiveOutcome}
                      onChange={(e) => setArchiveOutcome(e.target.value as 'WON' | 'DECLINED')}
                      className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 font-mono font-bold text-amber-900"
                    >
                      <option value="WON">WON (Đã ký kết thành công)</option>
                      <option value="DECLINED">DECLINED (Dừng theo đuổi)</option>
                    </select>
                  )}
                  <button
                    type="button"
                    onClick={handleToggleArchive}
                    disabled={savingGeneral}
                    className={`px-4 py-2 rounded-xl font-bold cursor-pointer ${
                      isArchived
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-amber-600 hover:bg-amber-700 text-white'
                    }`}
                  >
                    {isArchived ? 'Mở lại dự án (Unarchive)' : 'Lưu trữ Dự án (Read-Only)'}
                  </button>
                </div>
              </div>

              {/* Danger Zone: Delete Project */}
              {perms.deleteProject === 'F' && (
                <div className="bg-rose-50/70 rounded-2xl border-2 border-rose-300 p-6 space-y-3 text-xs">
                  <div className="flex items-center gap-2 font-bold text-rose-900 text-sm">
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    <span>Danger Zone — Xóa Vĩnh Viễn Dự án (Delete Project)</span>
                  </div>
                  <p className="text-rose-800">
                    Hành động này sẽ xóa vĩnh viễn Lead Workspace, Proposal 10 Sheets, Discovery Meetings, Client Portal Sessions và toàn bộ dữ liệu AI liên quan. Không thể hoàn tác.
                  </p>
                  <div className="space-y-2 pt-1">
                    <div className="font-mono text-rose-900">
                      Để xác nhận, vui lòng nhập chính xác tên dự án: <strong className="select-all bg-white px-2 py-0.5 rounded border border-rose-200">{bundle.general.title}</strong>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <input
                        value={deleteConfirmName}
                        onChange={(e) => setDeleteConfirmName(e.target.value)}
                        placeholder="Nhập chính xác tên dự án để mở khóa nút xóa..."
                        className="flex-1 min-w-[240px] rounded-xl border border-rose-300 bg-white px-3.5 py-2 font-semibold"
                      />
                      <button
                        type="button"
                        onClick={handleDeleteProject}
                        disabled={deletingProject || deleteConfirmName.trim() !== bundle.general.title.trim()}
                        className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold disabled:opacity-40 cursor-pointer"
                      >
                        {deletingProject ? 'Đang xóa...' : 'Xóa Vĩnh Viễn Dự án'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
