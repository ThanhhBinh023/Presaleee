import React, { useState } from 'react';
import {
  LayoutGrid,
  Globe,
  FileText,
  Sparkles,
  BookOpen,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Zap,
  List
} from 'lucide-react';
import { WorkspacePill } from './workspace/WorkspacePill';
import { UserCard } from './workspace/UserCard';
import { useClientDirectory } from '../hooks/useClientDirectory';
import { useMemberDirectory } from '../hooks/useMemberDirectory';
import { leadService } from '../services/leadService';
import { ApiError } from '../services/apiClient';
import { navigateTo } from '../navigation';
import { LEAD_SOURCES } from '../types/lead';
import type { LeadExtractedMetadata, LeadIntakeDraft, LeadSource } from '../types/lead';

const SAMPLE_RFP =
  'The customer needs an offline-capable retail POS and inventory synchronization. Target platforms are Web and Android. Peak load is 40,000 TPS during sales events. Compliance must include SOC-2 Type II. Delivery is requested within 20 weeks. Budget is not confirmed.';

interface RfpIntakeProps {
  onNavigateOverview: () => void;
  onNavigateAIWorkspace: () => void;
  onLogout: () => void;
  onNavigateVault?: () => void;
}

const emptyMetadata: LeadExtractedMetadata = {
  projectName: '',
  clientIndustry: '',
  businessGoal: '',
  timelineWeeks: null,
  budgetUsd: null,
  targetPlatforms: [],
  coreFunctionalModules: [],
  integrationsRequired: [],
  complianceAndSecurity: [],
  priorityLevel: null
};

function csv(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function text(value: unknown, fallback: string): string {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || fallback;
}

export const RfpIntake: React.FC<RfpIntakeProps> = ({
  onNavigateOverview,
  onNavigateAIWorkspace,
  onLogout
}) => {
  const clients = useClientDirectory({ page: 1, limit: 100 });
  const members = useMemberDirectory({ page: 1, limit: 50 });

  const [inquiryText, setInquiryText] = useState('');
  const [source, setSource] = useState<LeadSource>('MANUAL');
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [draft, setDraft] = useState<LeadIntakeDraft | null>(null);
  const [missing, setMissing] = useState<string[]>([]);

  const [title, setTitle] = useState('');
  const [metadata, setMetadata] = useState<LeadExtractedMetadata>(emptyMetadata);
  const [clientId, setClientId] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedLeadId, setSavedLeadId] = useState<string | null>(null);

  const handleRunIntake = async () => {
    setAnalyzing(true);
    setAnalyzeError(null);
    setSavedLeadId(null);
    try {
      const result = await leadService.analyzeIntake(inquiryText, source);
      setDraft(result.draft);
      setMissing(result.missingInformation ?? []);
      setTitle(result.draft.title || result.draft.extractedMetadata.projectName || '');
      setMetadata({ ...emptyMetadata, ...result.draft.extractedMetadata });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Intake failed.';
      setAnalyzeError(
        err instanceof ApiError && (err.status === 502 || err.status === 0)
          ? `${message} Start the AI service on port 8000, or paste structured fields after a failed analyze and save the lead manually.`
          : message
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleManualDraft = () => {
    setDraft({
      title: title || 'Untitled intake',
      source,
      rawRfpContent: inquiryText,
      extractedMetadata: metadata
    });
    setMissing([]);
    setAnalyzeError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const created = await leadService.createLead({
        title: title.trim() || 'Untitled intake',
        source,
        rawRfpContent: inquiryText.trim(),
        extractedMetadata: {
          ...metadata,
          projectName: metadata.projectName || title.trim(),
          targetPlatforms: Array.isArray(metadata.targetPlatforms) ? metadata.targetPlatforms : csv(String(metadata.targetPlatforms ?? '')),
          coreFunctionalModules: Array.isArray(metadata.coreFunctionalModules)
            ? metadata.coreFunctionalModules
            : csv(String(metadata.coreFunctionalModules ?? '')),
          integrationsRequired: Array.isArray(metadata.integrationsRequired)
            ? metadata.integrationsRequired
            : csv(String(metadata.integrationsRequired ?? '')),
          complianceAndSecurity: Array.isArray(metadata.complianceAndSecurity)
            ? metadata.complianceAndSecurity
            : csv(String(metadata.complianceAndSecurity ?? '')),
          missing_information: missing,
          target_sla: text(metadata.target_sla ?? metadata.targetSla, '< 100ms'),
          peak_workload: text(metadata.peak_workload ?? metadata.peakWorkload, 'Cao tải theo thời gian thực')
        },
        clientId: clientId || null,
        assignedTo: assignedTo || null
      });
      setSavedLeadId(created.id);
      localStorage.setItem('presaleee_active_lead_id', created.id);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save the lead.');
    } finally {
      setSaving(false);
    }
  };

  const listField = (value: string[] | undefined): string => (value ?? []).join(', ');

  return (
    <div className="min-h-screen bg-[#f8fafc] flex text-slate-900 font-sans">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 hidden md:flex">
        <div>
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-sm font-bold font-mono text-base">
                P
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">Presaleee</span>
            </div>
            <WorkspacePill />
          </div>

          <nav className="p-3 space-y-1">
            <button onClick={onNavigateOverview} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">
              <LayoutGrid className="w-4 h-4 text-slate-400" />
              <span>Overview</span>
            </button>
            <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold bg-brand-500 text-white shadow-sm">
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-white" />
                <span>RFPs &amp; Specs</span>
              </div>
            </button>
            <button onClick={onNavigateAIWorkspace} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">
              <Sparkles className="w-4 h-4 text-slate-400" />
              <span>AI Workspace</span>
            </button>
            <button onClick={() => navigateTo('leads')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">
              <Zap className="w-4 h-4 text-slate-400" />
              <span>Leads</span>
            </button>
            <button onClick={() => navigateTo('portal')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">
              <Globe className="w-4 h-4 text-slate-400" />
              <span>Client portal</span>
            </button>
          </nav>
        </div>
        <div className="p-3 border-t border-slate-100">
          <UserCard onLogout={onLogout} />
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-500">Presaleee</span>
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-brand-700">AI Intake</span>
          </div>
          <button
            onClick={() => (savedLeadId ? navigateTo('leads', { id: savedLeadId }) : navigateTo('leads'))}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold"
          >
            <span>Open leads</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </header>

        <div className="p-6 sm:p-8 max-w-7xl mx-auto w-full space-y-8">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">AI Intake &amp; qualification pipeline</h1>
            <p className="mt-1 text-sm text-slate-500 max-w-3xl">
              Analyze unstructured RFP text, edit the normalized draft, then persist a lead. Qualification is a separate step on the lead record.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-6 space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-emerald-50 text-brand-700 font-bold font-mono text-xs flex items-center justify-center border border-brand-200">01</span>
                    <h3 className="text-sm font-bold text-slate-900 font-mono">AI INTAKE</h3>
                  </div>
                  <select value={source} onChange={(e) => setSource(e.target.value as LeadSource)} className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-mono">
                    {LEAD_SOURCES.map((value) => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-700">Customer request / RFP brief</span>
                  <button
                    type="button"
                    onClick={() => setInquiryText(SAMPLE_RFP)}
                    className="text-[10px] text-brand-600 hover:underline font-mono"
                  >
                    Dán mẫu POS Retail RFP
                  </button>
                </div>
                <label className="text-xs font-semibold text-slate-700 block">
                  <textarea
                    rows={8}
                    value={inquiryText}
                    onChange={(e) => setInquiryText(e.target.value)}
                    placeholder="Dán hoặc nhập yêu cầu dự án / RFP brief từ khách hàng vào đây để AI phân tích..."
                    className="mt-1 w-full p-3 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-mono text-slate-800 focus:outline-none focus:border-brand-500"
                  />
                </label>
                <p className="text-[10px] font-mono text-slate-400">{inquiryText.length} / 50000 characters. File upload is not wired — the backend parser is still pending.</p>

                {analyzeError && <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{analyzeError}</p>}

                <div className="flex gap-2">
                  <button
                    onClick={() => void handleRunIntake()}
                    disabled={analyzing || !inquiryText.trim()}
                    className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold font-mono flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Zap className="w-3.5 h-3.5 text-brand-400" />
                    <span>{analyzing ? 'Analyzing RFP…' : 'Run AI intake parser'}</span>
                  </button>
                  <button onClick={handleManualDraft} className="px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600">
                    Skip AI
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-emerald-50 text-brand-700 font-bold font-mono text-xs flex items-center justify-center border border-brand-200">02</span>
                    <h3 className="text-sm font-bold text-slate-900 font-mono">REVIEW DRAFT</h3>
                  </div>
                  {draft && (
                    <span className="text-[10px] font-mono bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded font-bold">
                      Unsaved
                    </span>
                  )}
                </div>

                {!draft && (
                  <p className="text-sm text-slate-400">Run the parser or skip AI to edit a draft before saving.</p>
                )}

                {draft && (
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-600 block">
                      Title
                      <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={255} />
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-xs font-bold text-slate-600">
                        Industry
                        <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={String(metadata.clientIndustry ?? '')} onChange={(e) => setMetadata({ ...metadata, clientIndustry: e.target.value })} />
                      </label>
                      <label className="text-xs font-bold text-slate-600">
                        Timeline weeks
                        <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={metadata.timelineWeeks ?? ''} onChange={(e) => setMetadata({ ...metadata, timelineWeeks: e.target.value === '' ? null : Number(e.target.value) })} />
                      </label>
                      <label className="text-xs font-bold text-slate-600">
                        Budget USD
                        <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={metadata.budgetUsd ?? ''} onChange={(e) => setMetadata({ ...metadata, budgetUsd: e.target.value === '' ? null : Number(e.target.value) })} />
                      </label>
                      <label className="text-xs font-bold text-slate-600">
                        Priority
                        <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={metadata.priorityLevel ?? ''} onChange={(e) => setMetadata({ ...metadata, priorityLevel: (e.target.value || null) as LeadExtractedMetadata['priorityLevel'] })}>
                          <option value="">Unknown</option>
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                        </select>
                      </label>
                    </div>
                    <label className="text-xs font-bold text-slate-600 block">
                      Business goal
                      <textarea className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" rows={3} value={String(metadata.businessGoal ?? '')} onChange={(e) => setMetadata({ ...metadata, businessGoal: e.target.value })} />
                    </label>
                    <label className="text-xs font-bold text-slate-600 block">
                      Modules (comma separated)
                      <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={listField(metadata.coreFunctionalModules)} onChange={(e) => setMetadata({ ...metadata, coreFunctionalModules: csv(e.target.value) })} />
                    </label>
                    <label className="text-xs font-bold text-slate-600 block">
                      Platforms
                      <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={listField(metadata.targetPlatforms)} onChange={(e) => setMetadata({ ...metadata, targetPlatforms: csv(e.target.value) })} />
                    </label>
                    <label className="text-xs font-bold text-slate-600 block">
                      Compliance
                      <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={listField(metadata.complianceAndSecurity)} onChange={(e) => setMetadata({ ...metadata, complianceAndSecurity: csv(e.target.value) })} />
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-xs font-bold text-slate-600">
                        Client
                        <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                          <option value="">None</option>
                          {clients.clients.map((client) => (
                            <option key={client.id} value={client.id}>{client.companyName}</option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs font-bold text-slate-600">
                        Owner
                        <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
                          <option value="">Unassigned</option>
                          {members.members.map((member) => (
                            <option key={member.id} value={member.id}>{member.fullName}</option>
                          ))}
                        </select>
                      </label>
                    </div>

                    {missing.length > 0 && (
                      <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2 text-xs">
                        <div className="font-bold text-amber-800 flex items-center gap-1.5 font-mono text-[11px]">
                          <HelpCircle className="w-3.5 h-3.5" />
                          Missing information
                        </div>
                        <ul className="list-disc pl-4 space-y-1 text-slate-700">
                          {missing.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {saveError && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{saveError}</p>}

                    {savedLeadId ? (
                      <div className="flex flex-col gap-2.5 rounded-2xl border border-brand-200 bg-emerald-50/80 p-4 text-xs text-brand-900 shadow-sm">
                        <div className="flex items-center gap-2 font-bold text-sm text-brand-800">
                          <CheckCircle2 className="w-5 h-5 text-brand-600 shrink-0" />
                          <span>Dự án đã được lưu vào Database thành công!</span>
                        </div>
                        <p className="text-slate-600 leading-relaxed text-[11px]">
                          Thông số RFP đã được chuyển sang quy trình tiếp theo. Chuyển sang AI Workspace để thực hiện chấm điểm BANT, ghi nhận biên bản cuộc họp và xuất Proposal 10 Sheets.
                        </p>
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <button
                            onClick={() => {
                              localStorage.setItem('presaleee_active_lead_id', savedLeadId);
                              onNavigateAIWorkspace();
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold shadow-sm transition-all cursor-pointer"
                          >
                            <Sparkles className="w-4 h-4 text-white" />
                            <span>Chuyển sang AI Workspace (Chấm điểm &amp; Đề xuất) &rarr;</span>
                          </button>
                          <button
                            onClick={() => navigateTo('leads', { id: savedLeadId })}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-[11px]"
                          >
                            <span>Xem danh sách Leads</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => void handleSave()} disabled={saving || !inquiryText.trim() || !title.trim()} className="w-full py-2.5 rounded-xl bg-brand-500 text-white text-xs font-semibold disabled:opacity-50">
                        {saving ? 'Saving…' : 'Save lead'}
                      </button>
                    )}

                    <div className="flex items-start gap-2 text-[11px] text-slate-500">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                      Saving does not approve the deal. Run BANT from the lead page, then transition status through PATCH /leads/:id/status.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
