import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from './common/Toast';
import { settingsService } from '../services/settingsService';
import { navigateTo, readHashQuery } from '../navigation';
import { formatDateTime, initialsOf } from '../utils/format';
import { AppSidebar } from './workspace/AppSidebar';
import type {
  AccountSettingsBundle,
  ExternalIntegrations,
  GlobalSystemUser,
  NotificationEventKey,
  NotificationPreferences,
  SystemAIConfig,
  SystemAuditLogEntry,
  SystemSecurityPolicy
} from '../types/settings';
import type { UserRole, UserStatus } from '../types/auth';
import {
  User,
  ShieldCheck,
  Bell,
  Plug,
  Server,
  Users,
  Cpu,
  History,
  KeyRound,
  Smartphone,
  Laptop,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  Copy,
  RefreshCw,
  Video,
  Layers,
  MailCheck,
  Upload,
  Trash2
} from 'lucide-react';

type AccountTab = 'profile' | 'security' | 'notifications' | 'integrations';
type SystemTab = 'system-users' | 'system-ai' | 'system-audit';
type SettingsTab = AccountTab | SystemTab;

const NOTIFICATION_GROUPS: Array<{
  group: string;
  items: Array<{ key: NotificationEventKey; label: string }>;
}> = [
  {
    group: 'Phân quyền & Dự án',
    items: [
      { key: 'project_invited', label: 'Được mời vào dự án mới' },
      { key: 'project_role_changed', label: 'Thay đổi Project Role' }
    ]
  },
  {
    group: 'Quy trình Phê duyệt Proposal',
    items: [
      { key: 'proposal_in_review', label: 'Proposal chuyển trạng thái Review' },
      { key: 'proposal_reviewed', label: 'Proposal được Approved / Rejected' }
    ]
  },
  {
    group: 'Tương tác từ Khách hàng (Client)',
    items: [
      { key: 'client_portal_opened', label: 'Khách hàng mở Portal / Xem tài liệu' },
      { key: 'client_comment_created', label: 'Khách hàng tạo Comment mới' },
      { key: 'client_ai_interaction', label: 'Khách hàng tương tác với AI Bot' }
    ]
  }
];

function summarizeUserAgent(ua: string | null): string {
  if (!ua) return 'Thiết bị / Trình duyệt không xác định';
  const browser = ua.includes('Edg/') ? 'Microsoft Edge' : ua.includes('Chrome/') ? 'Google Chrome' : ua.includes('Firefox/') ? 'Firefox' : ua.includes('Safari/') ? 'Safari' : 'HTTP Client';
  const os = ua.includes('Windows') ? 'Windows' : ua.includes('Mac OS') ? 'macOS' : ua.includes('Linux') ? 'Linux' : ua.includes('Android') ? 'Android' : ua.includes('iPhone') ? 'iOS' : 'OS';
  return `${browser} trên ${os}`;
}

export const SettingsCenter: React.FC = () => {
  const { user, syncUser, logout } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState<SettingsTab>(() => {
    const q = readHashQuery().get('tab');
    if (q && ['profile', 'security', 'notifications', 'integrations', 'system-users', 'system-ai', 'system-audit'].includes(q)) {
      return q as SettingsTab;
    }
    return 'profile';
  });

  // Account State
  const [account, setAccount] = useState<AccountSettingsBundle | null>(null);
  const [loadingAccount, setLoadingAccount] = useState(true);

  // Profile Form
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [displaySignature, setDisplaySignature] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Security Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [twoFactorSetup, setTwoFactorSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [disable2faPassword, setDisable2faPassword] = useState('');
  const [working2fa, setWorking2fa] = useState(false);

  // Notifications & Integrations
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences | null>(null);
  const [savingNotif, setSavingNotif] = useState(false);
  const [integrations, setIntegrations] = useState<ExternalIntegrations | null>(null);
  const [savingInteg, setSavingInteg] = useState(false);

  // System Admin State
  const [securityPolicy, setSecurityPolicy] = useState<SystemSecurityPolicy | null>(null);
  const [aiConfig, setAiConfig] = useState<SystemAIConfig | null>(null);
  const [newApiKey, setNewApiKey] = useState('');
  const [savingSystemPolicy, setSavingSystemPolicy] = useState(false);
  const [savingSystemAI, setSavingSystemAI] = useState(false);

  const [globalUsers, setGlobalUsers] = useState<GlobalSystemUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<UserRole | ''>('');
  const [userStatusFilter, setUserStatusFilter] = useState<UserStatus | ''>('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [emergencyResetResult, setEmergencyResetResult] = useState<{ email: string; resetUrl: string; expiresAt: string } | null>(null);

  const [auditLogs, setAuditLogs] = useState<SystemAuditLogEntry[]>([]);
  const [auditFilter, setAuditFilter] = useState('');
  const [loadingAudit, setLoadingAudit] = useState(false);

  const loadAccount = async () => {
    try {
      setLoadingAccount(true);
      const data = await settingsService.getAccountSettings();
      setAccount(data);
      setFullName(data.profile.fullName || '');
      setAvatarUrl(data.profile.avatarUrl || '');
      setJobTitle(data.profile.jobTitle || '');
      setPhone(data.profile.phone || '');
      setDisplaySignature(data.profile.displaySignature || '');
      setNotifPrefs(data.notifications);
      setIntegrations(data.integrations);
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tải cấu hình tài khoản.', 'Lỗi Settings');
    } finally {
      setLoadingAccount(false);
    }
  };

  const loadSystemData = async () => {
    if (!isAdmin) return;
    try {
      const sys = await settingsService.getSystemSettings();
      setSecurityPolicy(sys.securityPolicy);
      setAiConfig(sys.aiConfig);
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tải cấu hình hệ thống.', 'System Settings');
    }
  };

  const loadGlobalUsers = async () => {
    if (!isAdmin) return;
    try {
      setLoadingUsers(true);
      const res = await settingsService.listGlobalUsers({
        search: userSearch.trim() || undefined,
        role: userRoleFilter || undefined,
        status: userStatusFilter || undefined,
        limit: 50
      });
      setGlobalUsers(res.users);
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tải danh sách người dùng toàn hệ thống.', 'Users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadSystemAudit = async () => {
    if (!isAdmin) return;
    try {
      setLoadingAudit(true);
      const res = await settingsService.listSystemAuditLogs({
        action: auditFilter.trim() || undefined,
        limit: 40
      });
      setAuditLogs(res.logs);
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tải nhật ký hệ thống.', 'Audit Logs');
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    void loadAccount();
    if (isAdmin) {
      void loadSystemData();
      void loadGlobalUsers();
      void loadSystemAudit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // Handlers: Profile
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.warning('Vui lòng chọn tệp hình ảnh hợp lệ (.png, .jpg, .webp).', 'Ảnh đại diện');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxSide = 256;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL('image/jpeg', 0.85);
        setAvatarUrl(compressed);
        toast.info('Đã tải ảnh đại diện lên. Nhấn "Lưu Hồ sơ Cá nhân" để lưu thay đổi.', 'Ảnh đại diện');
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      const updated = await settingsService.updateAccountProfile({
        fullName: fullName.trim(),
        avatarUrl: avatarUrl.trim() || null,
        jobTitle: jobTitle.trim(),
        phone: phone.trim(),
        displaySignature: displaySignature.trim()
      });
      syncUser({
        id: updated.id,
        organizationId: updated.organizationId,
        email: updated.email,
        fullName: updated.fullName,
        avatarUrl: updated.avatarUrl,
        role: updated.role,
        status: updated.status
      });
      toast.success('Đã lưu thông tin Hồ sơ cá nhân & Chữ ký hiển thị.', 'Hồ sơ Cá nhân');
      await loadAccount();
    } catch (err: any) {
      toast.error(err?.message || 'Lưu hồ sơ thất bại.', 'Lỗi');
    } finally {
      setSavingProfile(false);
    }
  };

  // Handlers: Password & Sessions & 2FA
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.warning('Mật khẩu xác nhận không khớp.', 'Mật khẩu');
      return;
    }
    try {
      setChangingPassword(true);
      const res = await settingsService.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success(res.message, 'Đổi mật khẩu thành công');
      await loadAccount();
    } catch (err: any) {
      toast.error(err?.message || 'Không thể đổi mật khẩu.', 'Lỗi bảo mật');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleRevokeOtherSessions = async () => {
    try {
      const res = await settingsService.revokeOtherSessions();
      toast.success(`Đã đăng xuất khỏi ${res.revokedCount} thiết bị/phiên khác.`, 'Quản lý Phiên');
      await loadAccount();
    } catch (err: any) {
      toast.error(err?.message || 'Không thể thu hồi phiên khác.', 'Lỗi');
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await settingsService.revokeSession(sessionId);
      toast.info('Đã thu hồi phiên đăng nhập.', 'Active Sessions');
      await loadAccount();
    } catch (err: any) {
      toast.error(err?.message || 'Thu hồi phiên thất bại.', 'Lỗi');
    }
  };

  const handleStart2FASetup = async () => {
    try {
      setWorking2fa(true);
      const res = await settingsService.setupTwoFactor();
      setTwoFactorSetup(res);
    } catch (err: any) {
      toast.error(err?.message || 'Không thể khởi tạo 2FA.', 'Lỗi');
    } finally {
      setWorking2fa(false);
    }
  };

  const handleEnable2FA = async () => {
    try {
      setWorking2fa(true);
      await settingsService.enableTwoFactor(twoFactorCode.trim());
      setTwoFactorSetup(null);
      setTwoFactorCode('');
      toast.success('Đã kích hoạt Xác thực Hai Yếu tố (2FA) thành công!', 'Bảo mật 2FA');
      await loadAccount();
    } catch (err: any) {
      toast.error(err?.message || 'Mã xác thực 6 chữ số không đúng.', 'Lỗi 2FA');
    } finally {
      setWorking2fa(false);
    }
  };

  const handleDisable2FA = async () => {
    try {
      setWorking2fa(true);
      await settingsService.disableTwoFactor(disable2faPassword);
      setDisable2faPassword('');
      toast.info('Đã tắt xác thực 2FA trên tài khoản.', 'Bảo mật 2FA');
      await loadAccount();
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tắt 2FA.', 'Lỗi');
    } finally {
      setWorking2fa(false);
    }
  };

  // Handlers: Notifications
  const toggleNotif = (key: NotificationEventKey, channel: 'email' | 'inApp') => {
    if (!notifPrefs) return;
    setNotifPrefs({
      ...notifPrefs,
      [key]: {
        ...notifPrefs[key],
        [channel]: !notifPrefs[key][channel]
      }
    });
  };

  const handleSaveNotifications = async () => {
    if (!notifPrefs) return;
    try {
      setSavingNotif(true);
      const saved = await settingsService.updateNotifications(notifPrefs);
      setNotifPrefs(saved);
      toast.success('Đã lưu ma trận cấu hình Thông báo (Email & In-App).', 'Notifications');
    } catch (err: any) {
      toast.error(err?.message || 'Lưu cấu hình thông báo thất bại.', 'Lỗi');
    } finally {
      setSavingNotif(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await settingsService.markNotificationsRead();
      toast.info('Đã đánh dấu toàn bộ thông báo là đã đọc.');
      await loadAccount();
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi cập nhật thông báo.');
    }
  };

  // Handlers: Integrations
  const handleSaveIntegrations = async (nextInteg?: ExternalIntegrations) => {
    const payload = nextInteg || integrations;
    if (!payload) return;
    try {
      setSavingInteg(true);
      const saved = await settingsService.updateIntegrations(payload);
      setIntegrations(saved);
      toast.success('Đã cập nhật liên kết Công cụ ngoài (External Integrations).', 'Integrations');
    } catch (err: any) {
      toast.error(err?.message || 'Không thể lưu tích hợp.', 'Lỗi');
    } finally {
      setSavingInteg(false);
    }
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      const res = await settingsService.acceptInvitation(invitationId);
      toast.success(`Đã tham gia dự án với vai trò ${res.projectRole}!`, 'Lời mời Dự án');
      await loadAccount();
    } catch (err: any) {
      toast.error(err?.message || 'Không thể chấp nhận lời mời.', 'Lỗi');
    }
  };

  // Handlers: System Admin
  const handleSaveSecurityPolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!securityPolicy) return;
    try {
      setSavingSystemPolicy(true);
      const saved = await settingsService.updateSecurityPolicy(securityPolicy);
      setSecurityPolicy(saved);
      toast.success('Đã cập nhật Chính sách Bảo mật Toàn hệ thống.', 'Security Policy');
      void loadSystemAudit();
    } catch (err: any) {
      toast.error(err?.message || 'Cập nhật thất bại.', 'Lỗi');
    } finally {
      setSavingSystemPolicy(false);
    }
  };

  const handleSaveAIConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiConfig) return;
    try {
      setSavingSystemAI(true);
      const saved = await settingsService.updateAIConfig({
        activeProvider: aiConfig.activeProvider,
        defaultModel: aiConfig.defaultModel,
        fallbackEnabled: aiConfig.fallbackEnabled,
        requestsPerMinute: aiConfig.requestsPerMinute,
        dailyTokenQuota: aiConfig.dailyTokenQuota,
        maxProposalsPerDay: aiConfig.maxProposalsPerDay,
        ...(newApiKey.trim() ? { customApiKey: newApiKey.trim() } : {})
      });
      setAiConfig(saved);
      setNewApiKey('');
      toast.success('Đã cập nhật cấu hình AI Models & Quotas.', 'AI Infrastructure');
      void loadSystemAudit();
    } catch (err: any) {
      toast.error(err?.message || 'Cập nhật AI Config thất bại.', 'Lỗi');
    } finally {
      setSavingSystemAI(false);
    }
  };

  const handleToggleUserStatus = async (target: GlobalSystemUser) => {
    const nextStatus: UserStatus = target.status === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE';
    try {
      await settingsService.updateGlobalUserStatus(target.id, nextStatus);
      toast.success(
        nextStatus === 'DEACTIVATED'
          ? `Đã khóa tài khoản ${target.email} và thu hồi phiên đăng nhập.`
          : `Đã mở khóa kích hoạt tài khoản ${target.email}.`,
        'Quản lý Người dùng'
      );
      await loadGlobalUsers();
      void loadSystemAudit();
    } catch (err: any) {
      toast.error(err?.message || 'Không thể thay đổi trạng thái người dùng.', 'Lỗi');
    }
  };

  const handleEmergencyReset = async (target: GlobalSystemUser) => {
    try {
      const res = await settingsService.emergencyResetPassword(target.id);
      setEmergencyResetResult(res);
      toast.success(`Đã tạo liên kết khôi phục mật khẩu khẩn cấp cho ${target.email}.`, 'Emergency Reset');
      void loadSystemAudit();
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tạo liên kết khôi phục.', 'Lỗi');
    }
  };

  const accountTabs: Array<{ id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }> = [
    { id: 'profile', label: 'Hồ sơ Cá nhân', icon: User },
    { id: 'security', label: 'Bảo mật & Phiên (2FA)', icon: ShieldCheck },
    {
      id: 'notifications',
      label: 'Thông báo (Matrix)',
      icon: Bell,
      badge: account?.unreadNotificationCount || undefined
    },
    { id: 'integrations', label: 'Tích hợp Công cụ', icon: Plug }
  ];

  const systemTabs: Array<{ id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'system-users', label: 'Users & Security Policy', icon: Users },
    { id: 'system-ai', label: 'AI Models & Quotas', icon: Cpu },
    { id: 'system-audit', label: 'System Audit Logs', icon: History }
  ];

  // Render-blocking: wait for account settings before painting page
  if (loadingAccount && !account) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#f8fafc]">
        <span className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
        <span className="text-xs font-mono text-slate-500">Đang tải Trung tâm Cài đặt...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex text-slate-900 font-sans">
      <AppSidebar activeItem="Settings" onLogout={logout} onNavigateOverview={() => navigateTo('overview')} />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto px-4 py-8 md:px-10">
        <div className="mx-auto max-w-6xl w-full space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-500 mb-1">
                <button onClick={() => navigateTo('overview')} className="text-brand-700 font-bold hover:underline cursor-pointer">
                  ← OVERVIEW
                </button>
                <span>/</span>
                <span>SETTINGS ARCHITECTURE</span>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                Trung tâm Cài đặt (Settings Center)
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Quản trị <strong>Account Settings</strong> (Cài đặt cá nhân toàn cục){isAdmin ? ' và System Settings (Hạ tầng Multi-tenant, AI Models & Audit Logs)' : ''}.
              </p>
            </div>
          </div>

          {/* Pending Project Invitations Banner */}
          {account && account.pendingInvitations.length > 0 && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-900 uppercase">
                <MailCheck className="w-4 h-4 text-amber-700" />
                <span>Bạn có {account.pendingInvitations.length} lời mời tham gia dự án đang chờ xác nhận</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {account.pendingInvitations.map((inv) => (
                  <div key={inv.id} className="bg-white rounded-xl border border-amber-200 p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-900 truncate">{inv.projectTitle}</div>
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                        Vai trò: <strong className="text-brand-700">{inv.projectRole}</strong> · Từ: {inv.invitedByName || 'Presale Lead'}
                      </div>
                    </div>
                    <button
                      onClick={() => void handleAcceptInvitation(inv.id)}
                      className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shrink-0 cursor-pointer"
                    >
                      Chấp nhận
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <aside className="lg:col-span-3 space-y-4">
              {/* Tier: Account Settings */}
              <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-1 shadow-2xs">
                <div className="px-2.5 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  Account Settings (Cá nhân)
                </div>
                {accountTabs.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        active ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${active ? 'text-brand-400' : 'text-slate-400'}`} />
                        <span>{tab.label}</span>
                      </span>
                      {tab.badge && (
                        <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-mono font-bold">
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Tier: System Settings (ADMIN ONLY) */}
              {isAdmin && (
                <div className="bg-white rounded-2xl border border-purple-200 p-3 space-y-1 shadow-2xs">
                  <div className="px-2.5 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-purple-700 flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5" />
                    <span>System Settings (Admin)</span>
                  </div>
                  {systemTabs.map((tab) => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          active ? 'bg-purple-900 text-white shadow-xs' : 'text-purple-900/80 hover:bg-purple-50'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${active ? 'text-purple-300' : 'text-purple-500'}`} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </aside>

            {/* Main Panel */}
            <div className="lg:col-span-9 space-y-6">
              {loadingAccount && activeTab in { profile: 1, security: 1, notifications: 1, integrations: 1 } ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-400 font-mono">
                  Đang tải cấu hình...
                </div>
              ) : null}

              {/* ================================================================
                  3.1 PROFILE SETTINGS
              ================================================================ */}
              {activeTab === 'profile' && account && (
                <form onSubmit={handleSaveProfile} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3.5">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={fullName} className="w-14 h-14 rounded-2xl border border-slate-200 object-cover" />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-brand-600 text-white flex items-center justify-center font-bold text-lg shadow-xs">
                          {initialsOf(fullName || 'U')}
                        </div>
                      )}
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">{account.profile.fullName}</h2>
                        <p className="text-xs font-mono text-slate-500">{account.profile.email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="block space-y-1.5">
                      <span className="text-xs font-mono font-bold text-slate-600 uppercase">Họ và tên (Full Name)</span>
                      <input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        maxLength={255}
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
                      />
                    </label>
                    <label className="block space-y-1.5">
                      <span className="text-xs font-mono font-bold text-slate-600 uppercase">Chức danh chuyên môn (Job Title)</span>
                      <input
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        placeholder="Ví dụ: Senior Presale Consultant"
                        maxLength={150}
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
                      />
                    </label>
                    <label className="block space-y-1.5">
                      <span className="text-xs font-mono font-bold text-slate-600 uppercase">Số điện thoại liên hệ (Phone)</span>
                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+84 9xx xxx xxx"
                        maxLength={50}
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
                      />
                    </label>
                    <div className="block space-y-1.5">
                      <span className="text-xs font-mono font-bold text-slate-600 uppercase block">Ảnh đại diện (Tải từ máy)</span>
                      <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
                        <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer transition-colors">
                          <Upload className="w-3.5 h-3.5 text-brand-600" />
                          <span>Chọn ảnh từ máy</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarFileChange}
                            className="hidden"
                          />
                        </label>
                        {avatarUrl && (
                          <button
                            type="button"
                            onClick={() => setAvatarUrl('')}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Xóa ảnh</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <label className="block space-y-1.5">
                    <span className="text-xs font-mono font-bold text-slate-600 uppercase">
                      Mô tả bản thân
                    </span>
                    <textarea
                      value={displaySignature}
                      onChange={(e) => setDisplaySignature(e.target.value)}
                      rows={3}
                      maxLength={500}
                      placeholder="Giới thiệu ngắn gọn về bản thân, kinh nghiệm chuyên môn và lĩnh vực phụ trách..."
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
                    />
                  </label>

                  <div className="flex justify-end pt-2 border-t border-slate-100">
                    <button
                      type="submit"
                      disabled={savingProfile || !fullName.trim()}
                      className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      {savingProfile ? 'Đang lưu...' : 'Lưu Hồ sơ Cá nhân'}
                    </button>
                  </div>
                </form>
              )}

              {/* ================================================================
                  3.2 SECURITY (PASSWORD, ACTIVE SESSIONS, 2FA)
              ================================================================ */}
              {activeTab === 'security' && account && (
                <div className="space-y-6">
                  {/* Change Password */}
                  <form onSubmit={handleChangePassword} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-2xs">
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                      <KeyRound className="w-4 h-4 text-brand-600" />
                      <h2 className="text-base font-bold text-slate-900">Đổi mật khẩu tài khoản</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <label className="block space-y-1">
                        <span className="text-[11px] font-mono font-bold text-slate-500 uppercase">Mật khẩu hiện tại</span>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          required
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-[11px] font-mono font-bold text-slate-500 uppercase">Mật khẩu mới</span>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          minLength={8}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-[11px] font-mono font-bold text-slate-500 uppercase">Xác nhận mật khẩu mới</span>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                        />
                      </label>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={changingPassword || !currentPassword || !newPassword}
                        className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
                      >
                        {changingPassword ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                      </button>
                    </div>
                  </form>

                  {/* 2FA (Two-Factor Authentication) */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-2xs">
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <Smartphone className="w-5 h-5 text-brand-600" />
                        <div>
                          <h2 className="text-base font-bold text-slate-900">Xác thực Hai Yếu tố (2FA - Authenticator App)</h2>
                          <p className="text-xs text-slate-500">Bảo vệ tài khoản bằng mã OTP 6 chữ số từ Google Authenticator hoặc Authy.</p>
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-bold ${
                          account.security.twoFactorEnabled
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {account.security.twoFactorEnabled ? 'ĐANG BẬT 2FA' : 'CHƯA KÍCH HOẠT'}
                      </span>
                    </div>

                    {account.security.twoFactorEnabled ? (
                      <div className="flex flex-wrap items-end gap-3 bg-emerald-50/60 border border-emerald-200 rounded-xl p-4">
                        <div className="flex-1 min-w-[220px] space-y-1">
                          <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Tài khoản của bạn đang được bảo vệ bởi 2FA TOTP</span>
                          </div>
                          <input
                            type="password"
                            value={disable2faPassword}
                            onChange={(e) => setDisable2faPassword(e.target.value)}
                            placeholder="Nhập mật khẩu hiện tại nếu muốn tắt 2FA..."
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                          />
                        </div>
                        <button
                          onClick={handleDisable2FA}
                          disabled={working2fa || !disable2faPassword}
                          className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
                        >
                          Tắt 2FA
                        </button>
                      </div>
                    ) : twoFactorSetup ? (
                      <div className="rounded-xl border border-brand-200 bg-emerald-50/40 p-4 space-y-3">
                        <div className="text-xs font-bold text-slate-800">
                          Bước 1: Thêm khóa bí mật sau vào ứng dụng Google Authenticator / Authy:
                        </div>
                        <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 rounded-lg p-3 font-mono text-xs">
                          <span className="font-bold text-brand-700 select-all">{twoFactorSetup.secret}</span>
                          <button
                            type="button"
                            onClick={() => {
                              void navigator.clipboard.writeText(twoFactorSetup.secret);
                              toast.info('Đã sao chép khóa bí mật 2FA!');
                            }}
                            className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                          >
                            <Copy className="w-3 h-3" /> Copy Secret
                          </button>
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 break-all">
                          URI: {twoFactorSetup.otpauthUrl}
                        </div>
                        <div className="text-xs font-bold text-slate-800 pt-1">
                          Bước 2: Nhập mã OTP 6 chữ số hiển thị trên ứng dụng để kích hoạt:
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            value={twoFactorCode}
                            onChange={(e) => setTwoFactorCode(e.target.value)}
                            placeholder="123456"
                            maxLength={6}
                            className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono tracking-widest text-center"
                          />
                          <button
                            type="button"
                            onClick={handleEnable2FA}
                            disabled={working2fa || twoFactorCode.trim().length !== 6}
                            className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
                          >
                            Xác nhận &amp; Bật 2FA
                          </button>
                          <button
                            type="button"
                            onClick={() => setTwoFactorSetup(null)}
                            className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-600 cursor-pointer"
                          >
                            Hủy
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleStart2FASetup}
                        disabled={working2fa}
                        className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold cursor-pointer"
                      >
                        Thiết lập Xác thực 2 Yếu tố (2FA)
                      </button>
                    )}
                  </div>

                  {/* Active Sessions */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-2xs">
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <Laptop className="w-5 h-5 text-brand-600" />
                        <div>
                          <h2 className="text-base font-bold text-slate-900">
                            Quản lý Phiên đăng nhập (Active Sessions · {account.security.activeSessions.length})
                          </h2>
                          <p className="text-xs text-slate-500">Danh sách các thiết bị, trình duyệt và IP đang duy trì đăng nhập.</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRevokeOtherSessions}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Đăng xuất khỏi tất cả các thiết bị khác</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {account.security.activeSessions.length === 0 ? (
                        <p className="text-xs text-slate-400">Không có phiên hoạt động nào được ghi nhận.</p>
                      ) : (
                        account.security.activeSessions.map((sess) => (
                          <div key={sess.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3 text-xs">
                            <div className="space-y-0.5">
                              <div className="font-bold text-slate-800 flex items-center gap-2">
                                <span>{summarizeUserAgent(sess.userAgent)}</span>
                                {sess.isCurrent && (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold">
                                    THIẾT BỊ HIỆN TẠI
                                  </span>
                                )}
                              </div>
                              <div className="font-mono text-[11px] text-slate-500">
                                IP: {sess.ipAddress || '—'} · Đăng nhập: {formatDateTime(sess.createdAt)} · Hết hạn: {formatDateTime(sess.expiresAt)}
                              </div>
                            </div>
                            {!sess.isCurrent && (
                              <button
                                onClick={() => void handleRevokeSession(sess.id)}
                                className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                              >
                                Đăng xuất phiên này
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ================================================================
                  3.3 NOTIFICATIONS MATRIX & FEED
              ================================================================ */}
              {activeTab === 'notifications' && notifPrefs && account && (
                <div className="space-y-6">
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-2xs">
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div>
                        <h2 className="text-base font-bold text-slate-900">Cấu hình Nhận Thông báo (Email &amp; In-App Matrix)</h2>
                        <p className="text-xs text-slate-500">Tùy chỉnh kênh nhận thông báo cho từng sự kiện quan trọng trong hệ thống.</p>
                      </div>
                      <button
                        onClick={handleSaveNotifications}
                        disabled={savingNotif}
                        className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
                      >
                        {savingNotif ? 'Đang lưu...' : 'Lưu Cấu hình Thông báo'}
                      </button>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 font-mono text-[11px] font-bold text-slate-500 uppercase">
                          <tr>
                            <th className="px-4 py-3">Sự kiện Thông báo</th>
                            <th className="px-4 py-3 text-center">Email</th>
                            <th className="px-4 py-3 text-center">In-App</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {NOTIFICATION_GROUPS.map((grp) => (
                            <React.Fragment key={grp.group}>
                              <tr className="bg-slate-50/70">
                                <td colSpan={3} className="px-4 py-2 font-mono font-bold text-[11px] text-slate-700 uppercase">
                                  {grp.group}
                                </td>
                              </tr>
                              {grp.items.map((item) => {
                                const cfg = notifPrefs[item.key];
                                return (
                                  <tr key={item.key} className="hover:bg-slate-50/50">
                                    <td className="px-4 py-3 text-slate-700 font-medium">{item.label}</td>
                                    <td className="px-4 py-3 text-center">
                                      <input
                                        type="checkbox"
                                        checked={cfg.email}
                                        onChange={() => toggleNotif(item.key, 'email')}
                                        className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 cursor-pointer"
                                      />
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <input
                                        type="checkbox"
                                        checked={cfg.inApp}
                                        onChange={() => toggleNotif(item.key, 'inApp')}
                                        className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 cursor-pointer"
                                      />
                                    </td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Recent In-App Notification Feed */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-2xs">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <h3 className="text-sm font-bold text-slate-900">
                        Thông báo gần đây ({account.unreadNotificationCount} chưa đọc)
                      </h3>
                      {account.unreadNotificationCount > 0 && (
                        <button onClick={handleMarkAllRead} className="text-xs font-bold text-brand-700 hover:underline cursor-pointer">
                          Đánh dấu tất cả đã đọc
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {account.notificationFeed.length === 0 ? (
                        <p className="text-xs text-slate-400 py-4 text-center">Chưa có thông báo mới nào.</p>
                      ) : (
                        account.notificationFeed.map((n) => (
                          <div
                            key={n.id}
                            className={`p-3 rounded-xl border text-xs ${
                              n.isRead ? 'bg-white border-slate-100 text-slate-600' : 'bg-emerald-50/60 border-emerald-200 text-slate-900'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 font-bold">
                              <span>{n.title}</span>
                              <span className="font-mono text-[10px] text-slate-400">{formatDateTime(n.createdAt)}</span>
                            </div>
                            <p className="mt-1 text-slate-600">{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ================================================================
                  3.4 EXTERNAL INTEGRATIONS
              ================================================================ */}
              {activeTab === 'integrations' && integrations && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Tích hợp Công cụ Ngoài (External Integrations)</h2>
                      <p className="text-xs text-slate-500">
                        Liên kết tài khoản họp trực tuyến và thiết kế cá nhân để tự động đồng bộ transcript và UI prototype.
                      </p>
                    </div>
                    <button
                      onClick={() => void handleSaveIntegrations()}
                      disabled={savingInteg}
                      className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
                    >
                      {savingInteg ? 'Đang lưu...' : 'Lưu Tất Cả Liên Kết'}
                    </button>
                  </div>

                  {/* Online Meeting Platforms */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-mono font-bold uppercase text-slate-500 flex items-center gap-1.5">
                      <Video className="w-4 h-4 text-brand-600" />
                      <span>Công cụ Họp Trực tuyến (Google Meet, Zoom, Microsoft Teams)</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {(
                        [
                          { key: 'googleMeet', label: 'Google Meet' },
                          { key: 'zoom', label: 'Zoom Meetings' },
                          { key: 'microsoftTeams', label: 'Microsoft Teams' }
                        ] as const
                      ).map((platform) => {
                        const cfg = integrations[platform.key];
                        return (
                          <div key={platform.key} className="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50/50">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm text-slate-900">{platform.label}</span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                                  cfg.connected ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                                }`}
                              >
                                {cfg.connected ? 'CONNECTED' : 'DISCONNECTED'}
                              </span>
                            </div>
                            <input
                              type="email"
                              value={cfg.accountEmail}
                              onChange={(e) =>
                                setIntegrations({
                                  ...integrations,
                                  [platform.key]: { ...cfg, accountEmail: e.target.value }
                                })
                              }
                              placeholder="Email tài khoản liên kết..."
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                            />
                            <label className="flex items-center gap-2 text-[11px] text-slate-600 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={cfg.autoExtractTranscript}
                                onChange={(e) =>
                                  setIntegrations({
                                    ...integrations,
                                    [platform.key]: { ...cfg, autoExtractTranscript: e.target.checked }
                                  })
                                }
                              />
                              <span>Tự động rút trích ghi âm / transcript cho AI Intake</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                const nextConnected = !cfg.connected;
                                const nextEmail = cfg.accountEmail.trim() || (platform.key === 'googleMeet' && account?.profile.email ? account.profile.email : '');
                                const next = {
                                  ...integrations,
                                  [platform.key]: {
                                    ...cfg,
                                    accountEmail: nextEmail,
                                    connected: nextConnected,
                                    connectedAt: nextConnected ? new Date().toISOString() : null
                                  }
                                };
                                setIntegrations(next);
                                void handleSaveIntegrations(next);
                              }}
                              className={`w-full py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                                cfg.connected
                                  ? 'border border-rose-300 bg-white text-rose-600 hover:bg-rose-50'
                                  : 'bg-slate-900 text-white hover:bg-slate-800'
                              }`}
                            >
                              {cfg.connected ? 'Ngắt kết nối' : 'Kết nối tài khoản'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* UI/UX Design Tool: Figma */}
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <h3 className="text-xs font-mono font-bold uppercase text-slate-500 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-purple-600" />
                      <span>Công cụ Thiết kế (UI/UX Tools - Figma)</span>
                    </h3>
                    <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="font-bold text-sm text-slate-900">Figma Workspace Integration</div>
                          <div className="text-xs text-slate-500">
                            Chuyển đổi yêu cầu từ AI UI Design Brief thành khung Wireframe hoặc đồng bộ Prototype ngược lại Proposal.
                          </div>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold ${
                            integrations.figma.connected ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {integrations.figma.connected ? 'CONNECTED' : 'DISCONNECTED'}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          value={integrations.figma.workspaceName}
                          onChange={(e) =>
                            setIntegrations({
                              ...integrations,
                              figma: { ...integrations.figma, workspaceName: e.target.value }
                            })
                          }
                          placeholder="Figma Team / Workspace Name"
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                        />
                        <input
                          value={integrations.figma.accountHandle}
                          onChange={(e) =>
                            setIntegrations({
                              ...integrations,
                              figma: { ...integrations.figma, accountHandle: e.target.value }
                            })
                          }
                          placeholder="Figma Account Email / Handle"
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                        />
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={integrations.figma.syncDesignBriefToWireframe}
                            onChange={(e) =>
                              setIntegrations({
                                ...integrations,
                                figma: { ...integrations.figma, syncDesignBriefToWireframe: e.target.checked }
                              })
                            }
                          />
                          <span>Tự động đồng bộ AI UI Design Brief sang Wireframe &amp; Proposal Prototype</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const nextConnected = !integrations.figma.connected;
                            const next = {
                              ...integrations,
                              figma: {
                                ...integrations.figma,
                                connected: nextConnected,
                                connectedAt: nextConnected ? new Date().toISOString() : null
                              }
                            };
                            setIntegrations(next);
                            void handleSaveIntegrations(next);
                          }}
                          className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer ${
                            integrations.figma.connected
                              ? 'border border-rose-300 bg-white text-rose-600 hover:bg-rose-50'
                              : 'bg-purple-700 text-white hover:bg-purple-800'
                          }`}
                        >
                          {integrations.figma.connected ? 'Ngắt kết nối Figma' : 'Liên kết Figma'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ================================================================
                  4.1 SYSTEM ADMIN: GLOBAL USERS & SECURITY POLICY
              ================================================================ */}
              {activeTab === 'system-users' && isAdmin && (
                <div className="space-y-6">
                  {/* Global Security Policy */}
                  {securityPolicy && (
                    <form onSubmit={handleSaveSecurityPolicy} className="bg-white rounded-2xl border border-purple-200 p-6 space-y-4 shadow-2xs">
                      <div className="flex items-center justify-between pb-3 border-b border-purple-100">
                        <div>
                          <h2 className="text-base font-bold text-slate-900">Chính sách Bảo mật Toàn hệ thống (System Security Policy)</h2>
                          <p className="text-xs text-slate-500">Áp dụng cho mọi Tenant và tài khoản trong toàn bộ hạ tầng Presaleee.</p>
                        </div>
                        <button
                          type="submit"
                          disabled={savingSystemPolicy}
                          className="px-4 py-2 rounded-xl bg-purple-900 hover:bg-purple-800 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
                        >
                          {savingSystemPolicy ? 'Đang lưu...' : 'Lưu Chính sách'}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        <label className="space-y-1">
                          <span className="font-mono font-bold text-slate-600 block">Độ dài mật khẩu tối thiểu</span>
                          <input
                            type="number"
                            min={8}
                            max={64}
                            value={securityPolicy.minPasswordLength}
                            onChange={(e) => setSecurityPolicy({ ...securityPolicy, minPasswordLength: Number(e.target.value) })}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="font-mono font-bold text-slate-600 block">Session Timeout (phút)</span>
                          <input
                            type="number"
                            min={15}
                            max={43200}
                            value={securityPolicy.sessionTimeoutMinutes}
                            onChange={(e) => setSecurityPolicy({ ...securityPolicy, sessionTimeoutMinutes: Number(e.target.value) })}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="font-mono font-bold text-slate-600 block">Số lần sai tối đa (Lockout)</span>
                          <input
                            type="number"
                            min={3}
                            max={20}
                            value={securityPolicy.maxFailedLoginAttempts}
                            onChange={(e) => setSecurityPolicy({ ...securityPolicy, maxFailedLoginAttempts: Number(e.target.value) })}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="font-mono font-bold text-slate-600 block">Thời gian khóa (phút)</span>
                          <input
                            type="number"
                            min={1}
                            max={1440}
                            value={securityPolicy.lockoutDurationMinutes}
                            onChange={(e) => setSecurityPolicy({ ...securityPolicy, lockoutDurationMinutes: Number(e.target.value) })}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                          />
                        </label>
                      </div>
                    </form>
                  )}

                  {emergencyResetResult && (
                    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 space-y-2 text-xs">
                      <div className="font-bold text-amber-900">
                        Liên kết Đặt lại Mật khẩu Khẩn cấp cho {emergencyResetResult.email} (Hết hạn: {formatDateTime(emergencyResetResult.expiresAt)})
                      </div>
                      <div className="flex items-center gap-2 bg-white border border-amber-200 rounded-lg p-2 font-mono break-all">
                        <span className="flex-1">{emergencyResetResult.resetUrl}</span>
                        <button
                          onClick={() => {
                            void navigator.clipboard.writeText(emergencyResetResult.resetUrl);
                            toast.info('Đã copy link khôi phục mật khẩu khẩn cấp!');
                          }}
                          className="px-3 py-1 rounded bg-slate-900 text-white font-bold shrink-0 cursor-pointer"
                        >
                          Copy Link
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Global User Management */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-2xs">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-base font-bold text-slate-900">Quản lý Người dùng Toàn cục (Multi-tenant)</h2>
                        <p className="text-xs text-slate-500">Khóa/mở khóa tài khoản vi phạm hoặc tạo liên kết đặt lại mật khẩu khẩn cấp.</p>
                      </div>
                      <button
                        onClick={() => void loadGlobalUsers()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Tải lại
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <input
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        placeholder="Tìm theo email hoặc họ tên..."
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs flex-1 min-w-[200px]"
                      />
                      <select
                        value={userRoleFilter}
                        onChange={(e) => setUserRoleFilter(e.target.value as UserRole | '')}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                      >
                        <option value="">Tất cả Roles</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="PRESALE_LEAD">PRESALE_LEAD</option>
                        <option value="PRESALE_CONSULTANT">PRESALE_CONSULTANT</option>
                        <option value="SALES_REP">SALES_REP</option>
                        <option value="VIEWER">VIEWER</option>
                      </select>
                      <select
                        value={userStatusFilter}
                        onChange={(e) => setUserStatusFilter(e.target.value as UserStatus | '')}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                      >
                        <option value="">Tất cả Status</option>
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="DEACTIVATED">DEACTIVATED</option>
                      </select>
                      <button
                        onClick={() => void loadGlobalUsers()}
                        className="px-4 py-1.5 rounded-lg bg-purple-900 text-white text-xs font-bold cursor-pointer"
                      >
                        Lọc
                      </button>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 font-mono text-[10px] font-bold text-slate-500 uppercase">
                          <tr>
                            <th className="px-3 py-2.5">Người dùng</th>
                            <th className="px-3 py-2.5">Tổ chức</th>
                            <th className="px-3 py-2.5">Role</th>
                            <th className="px-3 py-2.5">Trạng thái</th>
                            <th className="px-3 py-2.5 text-right">Hành động</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {loadingUsers ? (
                            <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400">Đang tải...</td></tr>
                          ) : globalUsers.length === 0 ? (
                            <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400">Không tìm thấy người dùng nào.</td></tr>
                          ) : (
                            globalUsers.map((u) => (
                              <tr key={u.id} className="hover:bg-slate-50">
                                <td className="px-3 py-2.5">
                                  <div className="font-bold text-slate-900">{u.fullName}</div>
                                  <div className="font-mono text-[11px] text-slate-500">{u.email}</div>
                                  {u.lockedUntil && new Date(u.lockedUntil) > new Date() && (
                                    <span className="text-[10px] text-rose-600 font-bold">LOCKED ({u.failedLoginAttempts} fails)</span>
                                  )}
                                </td>
                                <td className="px-3 py-2.5 text-slate-600">{u.organizationName || '—'}</td>
                                <td className="px-3 py-2.5 font-mono font-bold text-slate-700">{u.role}</td>
                                <td className="px-3 py-2.5">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                                    u.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'
                                  }`}>
                                    {u.status}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5 text-right space-x-2">
                                  <button
                                    onClick={() => void handleEmergencyReset(u)}
                                    className="px-2.5 py-1 rounded border border-slate-300 hover:bg-slate-100 font-semibold text-slate-700 cursor-pointer"
                                  >
                                    Reset Password
                                  </button>
                                  {u.id !== user?.id && (
                                    <button
                                      onClick={() => void handleToggleUserStatus(u)}
                                      className={`px-2.5 py-1 rounded font-bold cursor-pointer ${
                                        u.status === 'ACTIVE'
                                          ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                      }`}
                                    >
                                      {u.status === 'ACTIVE' ? 'Block' : 'Activate'}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ================================================================
                  4.2 SYSTEM ADMIN: AI MODELS & QUOTAS CONFIG
              ================================================================ */}
              {activeTab === 'system-ai' && isAdmin && aiConfig && (
                <form onSubmit={handleSaveAIConfig} className="bg-white rounded-2xl border border-purple-200 p-6 space-y-6 shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-purple-100">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Cấu hình AI Models, API Key &amp; Rate Limiting Quotas</h2>
                      <p className="text-xs text-slate-500">Chuyển đổi model AI động, quản lý khóa API và kiểm soát hạn ngạch gọi AI toàn hệ thống.</p>
                    </div>
                    <button
                      type="submit"
                      disabled={savingSystemAI}
                      className="px-4 py-2 rounded-xl bg-purple-900 hover:bg-purple-800 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
                    >
                      {savingSystemAI ? 'Đang lưu...' : 'Lưu Cấu hình AI'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <label className="space-y-1.5">
                      <span className="font-mono font-bold text-slate-600 uppercase block">AI Provider Mặc định</span>
                      <select
                        value={aiConfig.activeProvider}
                        onChange={(e) => setAiConfig({ ...aiConfig, activeProvider: e.target.value as any })}
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-semibold"
                      >
                        <option value="GEMINI">Google Gemini</option>
                        <option value="OPENAI">OpenAI</option>
                        <option value="ANTHROPIC">Anthropic Claude</option>
                      </select>
                    </label>
                    <label className="space-y-1.5">
                      <span className="font-mono font-bold text-slate-600 uppercase block">Default Model (Dynamic Switching)</span>
                      <select
                        value={aiConfig.defaultModel}
                        onChange={(e) => setAiConfig({ ...aiConfig, defaultModel: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-mono"
                      >
                        <option value="gemini-2.5-flash">gemini-2.5-flash (Nhanh &amp; Tối ưu chi phí)</option>
                        <option value="gemini-2.5-pro">gemini-2.5-pro (Phân tích chuyên sâu)</option>
                        <option value="gemini-2.0-flash">gemini-2.0-flash</option>
                        <option value="gpt-4o">gpt-4o</option>
                        <option value="claude-3-7-sonnet">claude-3-7-sonnet</option>
                      </select>
                    </label>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-700 uppercase">Static / Custom API Key Override</span>
                      <span className="font-mono text-slate-500">
                        {aiConfig.hasCustomApiKey ? `Đã lưu: ${aiConfig.maskedApiKey}` : 'Đang dùng biến môi trường server (.env)'}
                      </span>
                    </div>
                    <input
                      type="password"
                      value={newApiKey}
                      onChange={(e) => setNewApiKey(e.target.value)}
                      placeholder="Nhập API Key mới để cập nhật (để trống nếu giữ nguyên)..."
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <label className="space-y-1">
                      <span className="font-mono font-bold text-slate-600 block">Rate Limit (Requests / phút)</span>
                      <input
                        type="number"
                        min={5}
                        max={5000}
                        value={aiConfig.requestsPerMinute}
                        onChange={(e) => setAiConfig({ ...aiConfig, requestsPerMinute: Number(e.target.value) })}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="font-mono font-bold text-slate-600 block">Daily Token Quota</span>
                      <input
                        type="number"
                        min={1000}
                        value={aiConfig.dailyTokenQuota}
                        onChange={(e) => setAiConfig({ ...aiConfig, dailyTokenQuota: Number(e.target.value) })}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="font-mono font-bold text-slate-600 block">Max Proposals AI / ngày</span>
                      <input
                        type="number"
                        min={1}
                        value={aiConfig.maxProposalsPerDay}
                        onChange={(e) => setAiConfig({ ...aiConfig, maxProposalsPerDay: Number(e.target.value) })}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                      />
                    </label>
                  </div>

                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={aiConfig.fallbackEnabled}
                      onChange={(e) => setAiConfig({ ...aiConfig, fallbackEnabled: e.target.checked })}
                    />
                    <span>Bật cơ chế tự động chuyển Model dự phòng khi đạt giới hạn hoặc quá tải</span>
                  </label>
                </form>
              )}

              {/* ================================================================
                  4.3 SYSTEM ADMIN: SYSTEM AUDIT LOGS (CONTEXT PRIVACY PROTECTED)
              ================================================================ */}
              {activeTab === 'system-audit' && isAdmin && (
                <div className="bg-white rounded-2xl border border-purple-200 p-6 space-y-4 shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-purple-100">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Nhật ký An ninh Hệ thống (System Audit Logs)</h2>
                      <p className="text-xs text-slate-500">
                        Ghi nhận hoạt động hạ tầng: Đăng nhập thất bại, thay đổi API Key, khóa/mở khóa người dùng, chính sách bảo mật.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        value={auditFilter}
                        onChange={(e) => setAuditFilter(e.target.value)}
                        placeholder="Lọc action (ví dụ: SYSTEM_, AUTH_)..."
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-mono"
                      />
                      <button
                        onClick={() => void loadSystemAudit()}
                        className="px-3 py-1.5 rounded-lg bg-purple-900 text-white text-xs font-bold cursor-pointer"
                      >
                        Tải lại
                      </button>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-purple-700 shrink-0" />
                    <span>
                      <strong>Nguyên tắc Bảo mật Ngữ cảnh Multi-tenant:</strong> Audit Logs tự động lọc bỏ toàn bộ nội dung cuộc hội thoại, nội dung Proposal và dữ liệu kinh doanh nhạy cảm bên trong từng Lead Workspace.
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 font-mono text-[10px] font-bold text-slate-500 uppercase">
                        <tr>
                          <th className="px-3 py-2.5">Thời gian</th>
                          <th className="px-3 py-2.5">Hành động</th>
                          <th className="px-3 py-2.5">Tác nhân (Actor)</th>
                          <th className="px-3 py-2.5">Trạng thái</th>
                          <th className="px-3 py-2.5">Chi tiết an ninh</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                        {loadingAudit ? (
                          <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400">Đang tải nhật ký...</td></tr>
                        ) : auditLogs.length === 0 ? (
                          <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400">Chưa có bản ghi phù hợp.</td></tr>
                        ) : (
                          auditLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-50">
                              <td className="px-3 py-2.5 whitespace-nowrap text-slate-500">{formatDateTime(log.createdAt)}</td>
                              <td className="px-3 py-2.5 font-bold text-purple-900">{log.action}</td>
                              <td className="px-3 py-2.5 text-slate-700">
                                {log.actorEmail || 'System'}
                                <div className="text-[10px] text-slate-400">{log.ipAddress || '—'}</div>
                              </td>
                              <td className="px-3 py-2.5">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  log.resultStatus === 'FAILED' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                                }`}>
                                  {log.resultStatus}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 max-w-xs truncate text-slate-500" title={JSON.stringify(log.payload)}>
                                {JSON.stringify(log.payload)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
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

export default SettingsCenter;
