import React from 'react';
import { useOrganizations } from '../../hooks/useOrganizations';
import { navigateTo } from '../../navigation';

export const WorkspacePill: React.FC = () => {
  const { primary: organization, isLoading, error } = useOrganizations();

  const label = organization
    ? organization.name.toUpperCase()
    : isLoading
      ? 'LOADING'
      : error
        ? 'ORGANIZATION UNAVAILABLE'
        : 'NO ORGANIZATION';

  return (
    <button
      onClick={() => navigateTo('members')}
      title="Open member list"
      className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100/70 transition-colors"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse shrink-0"></span>
        <span className="text-xs font-mono font-bold text-slate-700 truncate">{label}</span>
      </div>
      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-brand-100 text-brand-800 shrink-0">
        {organization ? organization.plan : 'FREE'}
      </span>
    </button>
  );
};

export default WorkspacePill;
