import React, { useState, useEffect } from 'react';
import type { UserRole } from '../types/auth';
import { ROLE_DETAILS } from './workspace/UserCard';
import { fetchProjectMembers, addProjectMember, updateProjectMemberRole, removeProjectMember } from '../services/leadService';
import type { ProjectMember } from '../services/leadService';
import { useToast } from './common/Toast';
import { Users, X, Plus, Trash2, ShieldCheck, Mail, UserCheck } from 'lucide-react';

interface ProjectMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  leadTitle: string;
  currentUserProjectRole: UserRole;
  isOrgAdmin?: boolean;
  onMembersUpdated?: () => void;
}

export const ProjectMembersModal: React.FC<ProjectMembersModalProps> = ({
  isOpen,
  onClose,
  leadId,
  leadTitle,
  currentUserProjectRole,
  isOrgAdmin = false,
  onMembersUpdated
}) => {
  const toast = useToast();
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // New member form
  const [newEmail, setNewEmail] = useState<string>('');
  const [newRole, setNewRole] = useState<UserRole>('PRESALE_CONSULTANT');

  // PBAC: Chỉ Trưởng dự án (PRESALE_LEAD) mới có quyền quản lý thành viên. Admin không can thiệp.
  const canManage = currentUserProjectRole === 'PRESALE_LEAD';

  const loadMembers = async () => {
    try {
      setIsLoading(true);
      const data = await fetchProjectMembers(leadId);
      setMembers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load project members:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && leadId) {
      loadMembers();
    }
  }, [isOpen, leadId]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    try {
      setIsSubmitting(true);
      const added = await addProjectMember(leadId, newEmail.trim(), newRole);
      toast.success(`Đã thêm ${added.fullName || newEmail} vào dự án với vai trò ${ROLE_DETAILS[newRole]?.nameVi || newRole}!`, 'Thành công');
      setNewEmail('');
      await loadMembers();
      onMembersUpdated?.();
    } catch (err: any) {
      toast.error(err.message || 'Không thể thêm thành viên vào dự án.', 'Lỗi phân quyền');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async (userId: string, updatedRole: UserRole) => {
    try {
      await updateProjectMemberRole(leadId, userId, updatedRole);
      toast.success('Đã cập nhật vai trò thành viên trong dự án!', 'Cập nhật');
      await loadMembers();
      onMembersUpdated?.();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi cập nhật vai trò', 'Thất bại');
    }
  };

  const handleRemoveMember = async (userId: string, memberName: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ${memberName} khỏi dự án này?`)) return;
    try {
      await removeProjectMember(leadId, userId);
      toast.success(`Đã xóa ${memberName} khỏi dự án!`, 'Xóa thành viên');
      await loadMembers();
      onMembersUpdated?.();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi xóa thành viên', 'Thất bại');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-brand-200 text-brand-700 flex items-center justify-center font-bold">
              <Users className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Thành Viên Dự Án (Project Deal Team)
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-brand-700 border border-brand-200">
                  PBAC
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Dự án: <strong className="text-slate-800">{leadTitle}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current user's project role badge */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-brand-600" />
            <span className="text-slate-600">Vai trò của bạn trong dự án:</span>
          </div>
          <span className={`px-2.5 py-1 rounded-full font-bold border ${ROLE_DETAILS[currentUserProjectRole]?.badgeClass || 'bg-slate-100 text-slate-700'}`}>
            {ROLE_DETAILS[currentUserProjectRole]?.nameVi || currentUserProjectRole}
          </span>
        </div>

        {/* System Admin Audit Notice */}
        {isOrgAdmin && (
          <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200 text-purple-800 text-xs flex items-center gap-2">
            <span className="font-bold font-mono shrink-0">👑 System Admin:</span>
            <span className="leading-relaxed">Bạn đang xem danh sách nhân sự dự án ở chế độ Giám sát (Audit). Quyền điều phối và phân bổ vai trò do Trưởng dự án (Presale Lead) chịu trách nhiệm.</span>
          </div>
        )}

        {/* Add Member Form (Visible only to PRESALE_LEAD or ADMIN) */}
        {canManage ? (
          <form onSubmit={handleAddMember} className="p-4 rounded-2xl bg-brand-50/50 border border-brand-200 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-brand-900 font-mono">
              <Plus className="w-4 h-4 text-brand-600" />
              <span>MỜI THÀNH VIÊN VÀO DỰ ÁN (PROJECT ASSIGNMENT)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <div className="sm:col-span-6">
                <input
                  type="email"
                  required
                  placeholder="Nhập email thành viên trong tổ chức..."
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 font-mono"
                />
              </div>
              <div className="sm:col-span-4">
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-500"
                >
                  <option value="PRESALE_CONSULTANT">Presale Consultant</option>
                  <option value="SOLUTION_ARCHITECT">Solution Architect</option>
                  <option value="SALES_REP">Sales Rep</option>
                  <option value="PRESALE_LEAD">Presale Lead</option>
                  <option value="VIEWER">Viewer (Chỉ đọc)</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-full min-h-[36px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  <span>{isSubmitting ? '...' : 'Thêm'}</span>
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 font-sans leading-relaxed">
              Theo quy định PBAC: Chỉ người khởi tạo (hoặc Presale Lead) mới có thẩm quyền phân bổ và gán vai trò trong dự án này.
            </p>
          </form>
        ) : (
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
            <span>Theo chính sách phân quyền PBAC, việc bổ nhiệm và gán vai trò trong dự án do <strong>Trưởng dự án (PRESALE_LEAD)</strong> đảm nhận. Quản trị viên hệ thống quan sát nhân sự ở chế độ Giám sát.</span>
          </div>
        )}

        {/* Members List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-600 uppercase">
            <span>DANH SÁCH NHÂN SỰ PHỤ TRÁCH ({members.length})</span>
            <span className="text-[10px] text-slate-400">PBAC ENFORCED</span>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-xs text-slate-400 font-mono">Đang tải danh sách thành viên...</div>
          ) : members.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 font-mono border border-dashed border-slate-200 rounded-2xl">
              Chưa có thành viên nào được gán vào dự án này.
            </div>
          ) : (
            <div className="space-y-2">
              {members.map((m) => {
                const roleInfo = ROLE_DETAILS[m.projectRole] || ROLE_DETAILS.VIEWER;
                return (
                  <div
                    key={m.userId}
                    className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between gap-3 shadow-2xs hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl ${roleInfo.iconBg} text-white flex items-center justify-center font-bold text-xs shrink-0`}>
                        {m.fullName ? m.fullName.charAt(0).toUpperCase() : m.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {m.fullName || m.email}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 truncate flex items-center gap-1.5">
                          <Mail className="w-3 h-3" />
                          <span>{m.email}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {canManage ? (
                        <select
                          value={m.projectRole}
                          onChange={(e) => handleRoleChange(m.userId, e.target.value as UserRole)}
                          className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-500 transition-all"
                        >
                          <option value="PRESALE_LEAD">Presale Lead</option>
                          <option value="SALES_REP">Sales Rep</option>
                          <option value="PRESALE_CONSULTANT">Presale Consultant</option>
                          <option value="SOLUTION_ARCHITECT">Solution Architect</option>
                          <option value="VIEWER">Viewer</option>
                        </select>
                      ) : (
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-bold border ${roleInfo.badgeClass}`}>
                          {roleInfo.nameVi}
                        </span>
                      )}

                      {canManage && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(m.userId, m.fullName || m.email)}
                          title="Xóa khỏi dự án"
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-mono text-[11px]">
            * Không phải dự án nào cũng cần đủ 6 vai trò. Phân bổ linh hoạt theo quy mô deal.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-all cursor-pointer"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
