import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { WorkspacePill } from './WorkspacePill';
import { UserCard } from './UserCard';
import { navigateTo } from '../../navigation';
import {
  LayoutGrid,
  FileText,
  Sparkles,
  Zap,
  Globe,
  Settings,
  BarChart3,
  Users,
  History,
  Building2,
  FileSpreadsheet
} from 'lucide-react';

export type AppSidebarItem =
  | 'Overview'
  | 'Platform Analytics'
  | 'Members (RBAC)'
  | 'Audit Trail'
  | 'Clients'
  | 'RFPs & Specs'
  | 'AI Workspace'
  | 'Leads'
  | 'Proposals'
  | 'Client portal'
  | 'Role Pipelines';

export interface AppSidebarProps {
  activeItem?: AppSidebarItem | string;
  onLogout?: () => void;
  onNavigateOverview?: () => void;
  onNavigateAnalytics?: () => void;
  onNavigateRfps?: () => void;
  onNavigateAIWorkspace?: () => void;
  onNavigateLeads?: () => void;
  onNavigatePortal?: () => void;
  onNavigateMembers?: () => void;
  onNavigateAudit?: () => void;
  onNavigateClients?: () => void;
  onNavigateRateCards?: () => void;
  onNavigatePipelines?: () => void;
}

interface NavItem {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeItem = 'Overview',
  onLogout,
  onNavigateOverview,
  onNavigateAnalytics,
  onNavigateRfps,
  onNavigateAIWorkspace,
  onNavigateLeads,
  onNavigatePortal,
  onNavigateMembers,
  onNavigateAudit,
  onNavigateClients,
  onNavigateRateCards,
  onNavigatePipelines,
}) => {
  const { user, logout } = useAuth();
  const handleLogout = onLogout || logout;
  const isAdmin = user?.role === 'ADMIN';

  const handleNav = (itemName: string) => {
    switch (itemName) {
      case 'Overview':
        onNavigateOverview ? onNavigateOverview() : navigateTo('overview');
        break;
      case 'Platform Analytics':
        onNavigateAnalytics ? onNavigateAnalytics() : navigateTo('analytics');
        break;
      case 'Members (RBAC)':
      case 'Members':
        onNavigateMembers ? onNavigateMembers() : navigateTo('members');
        break;
      case 'Audit Trail':
        onNavigateAudit ? onNavigateAudit() : navigateTo('audit');
        break;
      case 'Clients':
        onNavigateClients ? onNavigateClients() : navigateTo('clients');
        break;
      case 'Rate Cards':
        onNavigateRateCards ? onNavigateRateCards() : navigateTo('rate-cards');
        break;
      case 'RFPs & Specs':
        onNavigateRfps ? onNavigateRfps() : navigateTo('rfps');
        break;
      case 'AI Workspace':
        onNavigateAIWorkspace ? onNavigateAIWorkspace() : navigateTo('ai-workspace');
        break;
      case 'Leads':
        onNavigateLeads ? onNavigateLeads() : navigateTo('leads');
        break;
      case 'Proposals':
        navigateTo('proposals');
        break;
      case 'Client portal':
        onNavigatePortal ? onNavigatePortal() : navigateTo('portal');
        break;
      case 'Role Pipelines':
        onNavigatePipelines ? onNavigatePipelines() : navigateTo('pipelines');
        break;
      default:
        navigateTo('overview');
        break;
    }
  };

  const adminNavItems: NavItem[] = [
    { name: 'Overview', icon: LayoutGrid },
    { name: 'Platform Analytics', icon: BarChart3 },
    { name: 'Members (RBAC)', icon: Users },
    { name: 'Audit Trail', icon: History },
    { name: 'Clients', icon: Building2 },
  ];

  const presaleNavItems: NavItem[] = [
    { name: 'Overview', icon: LayoutGrid },
    { name: 'RFPs & Specs', icon: FileText },
    { name: 'AI Workspace', icon: Sparkles, badge: 'Active' },
    { name: 'Leads', icon: Zap },
    { name: 'Proposals', icon: FileSpreadsheet },
    { name: 'Client portal', icon: Globe },
  ];

  const currentItems = isAdmin ? adminNavItems : presaleNavItems;

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 hidden md:flex min-h-screen">
      <div>
        {/* Logo & Workspace Pill */}
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5 mb-4">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm font-bold font-mono text-base ${
              isAdmin
                ? 'bg-gradient-to-br from-purple-700 to-indigo-900'
                : 'bg-gradient-to-br from-brand-500 to-brand-700'
            }`}>
              P
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              Presaleee
            </span>
          </div>
          <WorkspacePill />
        </div>

        {/* Navigation Items (All in English) */}
        <nav className="p-3 space-y-1">
          {currentItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.name;
            return (
              <button
                key={item.name}
                onClick={() => handleNav(item.name)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                  isActive
                    ? isAdmin
                      ? 'bg-purple-900 text-white font-semibold shadow-xs'
                      : 'bg-slate-900 text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${
                    isActive
                      ? isAdmin ? 'text-purple-300' : 'text-brand-400'
                      : 'text-slate-400'
                  }`} />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                    isActive ? 'bg-brand-500 text-white' : 'bg-emerald-50 text-brand-700 border border-brand-200'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer: Settings/Pipelines & UserCard */}
      <div className="p-3 border-t border-slate-100 space-y-1.5">
        <button
          onClick={() => navigateTo('profile')}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-all cursor-pointer"
          title="Cài đặt hệ thống & Tài khoản"
        >
          <div className="flex items-center gap-2.5">
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            <span>Cài đặt hệ thống</span>
          </div>
        </button>

        <UserCard onLogout={handleLogout} subtitle="role" />
      </div>
    </aside>
  );
};

export default AppSidebar;
