import React, { useState } from 'react';
import { 
  LogOut, 
  ChevronRight, 
  X, 
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { navigateTo } from '../../navigation';
import { initialsOf } from '../../utils/format';
import type { UserRole } from '../../types/auth';

interface UserCardProps {
  onLogout: () => void;
  subtitle?: 'email' | 'role';
  logoutTitle?: string;
}

export const ROLE_DETAILS: Record<UserRole, {
  nameVi: string;
  badgeClass: string;
  colorClass: string;
  iconBg: string;
  description: string;
  keyPermissions: string[];
}> = {
  ADMIN: {
    nameVi: 'Quản trị viên Hệ thống (System Admin)',
    badgeClass: 'bg-purple-100 text-purple-700 border-purple-200',
    colorClass: 'text-purple-700',
    iconBg: 'bg-purple-600',
    description: 'Tài khoản quản trị hệ thống hoạt động tách biệt, chỉ tập trung vào cấp độ hạ tầng, cấu hình workspace và bảo mật đa người dùng (Multi-tenant). Tuyệt đối không can thiệp vào các vai trò hay việc tạo dự án.',
    keyPermissions: [
      'Quản trị cấp độ hệ thống & thiết lập chung của workspace',
      'Cấu hình bảo mật đa người dùng & cách ly dữ liệu Multi-tenant',
      'Giám sát hạ tầng máy chủ & nhật ký kiểm toán bất biến (Audit Trail)',
      'Hoạt động tách biệt: Không can thiệp tạo dự án & không có quyền trong Lead Workspace nếu không được Leader mời'
    ]
  },
  PRESALE_LEAD: {
    nameVi: 'Trưởng nhóm Tiền bán hàng (Presale Lead)',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    colorClass: 'text-amber-800',
    iconBg: 'bg-amber-500',
    description: 'Chịu trách nhiệm quản lý quy trình đề xuất, phân bổ đội ngũ chuyên môn và phê duyệt gửi khách hàng.',
    keyPermissions: [
      'Phê duyệt proposal (DRAFT -> APPROVED -> SENT)',
      'Phân bổ đội ngũ nhân sự chuyên môn Sheet 5',
      'Phê duyệt chia sẻ Client Portal lần đầu',
      'Điều phối đội ngũ Presale cho từng Lead'
    ]
  },
  PRESALE_CONSULTANT: {
    nameVi: 'Chuyên viên Tư vấn (Presale Consultant)',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    colorClass: 'text-emerald-800',
    iconBg: 'bg-brand-500',
    description: 'Chuyên trách tự đánh giá 10 sheets proposal, rà soát bôi đen phần sai/thừa do Server AI sinh ra và chỉnh sửa với sự hỗ trợ của Chatbot AI Copilot tích hợp.',
    keyPermissions: [
      'Tiến hành tự đánh giá 10 sheets proposal dự án',
      'Bôi đen loại bỏ nội dung sai hoặc không cần thiết do Server AI sinh ra',
      'Tích hợp Chatbot AI Copilot hỗ trợ chỉnh sửa và áp dụng 1-click vào proposal',
      'Tổ chức và điều phối các cuộc họp Discovery Meetings'
    ]
  },
  SOLUTION_ARCHITECT: {
    nameVi: 'Kiến trúc sư Giải pháp (Solution Architect)',
    badgeClass: 'bg-sky-100 text-sky-800 border-sky-200',
    colorClass: 'text-sky-800',
    iconBg: 'bg-sky-500',
    description: 'Thiết kế kiến trúc hệ thống, lựa chọn Tech Stack, thẩm định rủi ro RAID và kiến tạo UI Design Brief.',
    keyPermissions: [
      'Xây dựng kiến trúc giải pháp & Tech Stack (Sheet 3)',
      'Điều phối các phiên Technical Deep Dive Sessions',
      'Đánh giá rủi ro dự án trong ma trận RAID Log',
      'Nạp tài liệu kỹ thuật & tạo AI UI Design Brief'
    ]
  },
  SALES_REP: {
    nameVi: 'Đại diện Kinh doanh (Sales Rep)',
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    colorClass: 'text-indigo-800',
    iconBg: 'bg-indigo-500',
    description: 'Tiếp nhận RFP ban đầu, đánh giá điểm BANT, theo dõi phễu Pipeline và phân tích tương tác khách hàng.',
    keyPermissions: [
      'Tiếp nhận RFP khách hàng & chấm điểm BANT AI',
      'Theo dõi tiến độ chuyển đổi cơ hội (Pipeline Stage)',
      'Tạo phiên Client Portal & gửi bản tóm tắt cho khách',
      'Theo dõi chỉ số Client Intelligence & Telemetry'
    ]
  },
  VIEWER: {
    nameVi: 'Quan sát viên / Khách xem (Viewer)',
    badgeClass: 'bg-slate-200 text-slate-700 border-slate-300',
    colorClass: 'text-slate-700',
    iconBg: 'bg-slate-500',
    description: 'Chế độ an toàn CHỈ ĐỌC (Read-Only). Xem mọi dữ liệu dự án, hỏi đáp trợ lý AI và xuất báo cáo.',
    keyPermissions: [
      'Xem toàn bộ tài liệu đề xuất, cuộc họp và lead',
      'Tra cứu và hỏi đáp AI trong Knowledge Vault',
      'Xuất bản đề xuất hoàn chỉnh dạng Excel (.xlsx)',
      'Xuất bản proposal tiêu chuẩn chuyên nghiệp dạng PDF (.pdf)'
    ]
  }
};

export const UserCard: React.FC<UserCardProps> = ({ onLogout, logoutTitle = 'Sign out' }) => {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);

  const roleName = user?.role || 'VIEWER';
  const roleInfo = ROLE_DETAILS[roleName] || ROLE_DETAILS.VIEWER;

  return (
    <>
      <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors">
        <button
          onClick={() => setShowModal(true)}
          title="Xem tài khoản & phân quyền vai trò"
          className="flex items-center gap-2.5 overflow-hidden min-w-0 text-left hover:opacity-80 transition-opacity flex-1"
        >
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.fullName}
              className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
            />
          ) : (
            <div className={`w-8 h-8 rounded-full ${roleInfo.iconBg} text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs`}>
              {initialsOf(user?.fullName || 'SE')}
            </div>
          )}
          <div className="truncate min-w-0">
            <div className="text-xs font-bold text-slate-800 truncate flex items-center gap-1.5">
              <span>{user?.fullName || 'Not signed in'}</span>
            </div>
            {roleName === 'ADMIN' && (
              <div className="flex items-center gap-1 mt-0.5">
                <span className={`inline-block px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase rounded border ${roleInfo.badgeClass}`}>
                  ADMIN
                </span>
              </div>
            )}
          </div>
        </button>

        <button
          onClick={onLogout}
          title={logoutTitle}
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 ml-1"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* ACCOUNT & ROLES MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl ${roleInfo.iconBg} text-white flex items-center justify-center font-bold font-mono text-sm shadow-sm`}>
                  {initialsOf(user?.fullName || 'SE')}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Thông tin Tài khoản &amp; Vai trò</h3>
                  <p className="text-xs text-slate-500 font-mono">{user?.email || '—'}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Role Governance Policy Note (Strictly governed - No arbitrary role switcher) */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 font-bold font-mono text-xs text-slate-800">
                <ShieldCheck className="w-4 h-4 text-brand-600 shrink-0" />
                <span>Chính sách phân quyền bảo mật &amp; Ranh giới hệ thống</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-sans">
                Hệ thống áp dụng cơ chế phân quyền bảo mật nghiêm ngặt. <strong>Tài khoản Quản trị hệ thống (System Admin)</strong> hoạt động hoàn toàn tách biệt, chuyên trách hạ tầng máy chủ, cấu hình workspace và bảo mật đa người dùng (Multi-tenant), không can thiệp vào các vai trò hay việc tạo dự án. Mọi quyền hạn trong từng dự án cụ thể (PBAC) do <strong>Trưởng dự án (PRESALE_LEAD)</strong> của dự án đó toàn quyền phân bổ. Admin không thể truy cập vào Lead Workspace nếu không được Leader dự án mời tham gia.
              </p>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
              <button
                onClick={() => {
                  setShowModal(false);
                  navigateTo('profile');
                }}
                className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
              >
                <span>Hồ sơ chi tiết &amp; Đổi mật khẩu</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => {
                  setShowModal(false);
                  onLogout();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 font-semibold transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Đăng xuất</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default UserCard;
