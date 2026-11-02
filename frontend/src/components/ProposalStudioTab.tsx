import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  FileSpreadsheet, 
  Send, 
  CheckCircle2, 
  Layers, 
  Copy, 
  Save, 
  RefreshCw
} from 'lucide-react';
import type { LeadItem } from '../services/leadService';
import type { ProposalItem, UIDesignBrief } from '../services/proposalService';
import { 
  fetchProposalByLead, 
  generateProposalFromLead, 
  updateProposalSheet, 
  updateProposalLifecycle, 
  generateProposalUIDesignBrief,
  getProposalExcelDownloadUrl 
} from '../services/proposalService';

interface ProposalStudioTabProps {
  leadId: string;
  activeProject: LeadItem | null;
}

export const ProposalStudioTab: React.FC<ProposalStudioTabProps> = ({ leadId, activeProject }) => {
  const [proposal, setProposal] = useState<ProposalItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [customInstructions, setCustomInstructions] = useState<string>('');
  
  // Active sheet selection
  const [activeSheetName, setActiveSheetName] = useState<string>('Overview');
  const [editorMode, setEditorMode] = useState<'structured' | 'json'>('structured');
  const [jsonText, setJsonText] = useState<string>('');
  
  // UI Brief state
  const [uiBrief, setUiBrief] = useState<UIDesignBrief | null>(null);
  const [generatingBrief, setGeneratingBrief] = useState<boolean>(false);
  const [copiedBrief, setCopiedBrief] = useState<boolean>(false);

  // Load proposal for active lead
  useEffect(() => {
    if (!leadId) return;
    loadProposal(leadId);
  }, [leadId]);

  async function loadProposal(id: string) {
    try {
      setLoading(true);
      const data = await fetchProposalByLead(id);
      setProposal(data);
      if (data && data.sheets.length > 0) {
        const currentSheet = data.sheets.find(s => s.sheetName === activeSheetName) || data.sheets[0];
        setActiveSheetName(currentSheet.sheetName);
        setJsonText(JSON.stringify(currentSheet.sheetData, null, 2));

        // Load existing UI Brief if present in Overview sheet
        const overview = data.sheets.find(s => s.sheetName === 'Overview');
        if (overview?.sheetData?.uiDesignBrief) {
          setUiBrief(overview.sheetData.uiDesignBrief);
        }
      }
    } catch (err) {
      console.error('Failed to load proposal:', err);
    } finally {
      setLoading(false);
    }
  }

  // Handle generating proposal from lead context
  async function handleGenerateProposal() {
    if (!leadId) {
      alert('Vui lòng chọn hoặc khởi tạo một Dự án (Lead) trước.');
      return;
    }

    try {
      setGenerating(true);
      const created = await generateProposalFromLead(leadId, customInstructions.trim() || undefined);
      setProposal(created);
      setActiveSheetName('Overview');
      const overview = created.sheets.find(s => s.sheetName === 'Overview');
      if (overview) {
        setJsonText(JSON.stringify(overview.sheetData, null, 2));
        if (overview.sheetData?.uiDesignBrief) {
          setUiBrief(overview.sheetData.uiDesignBrief);
        }
      }
      alert('Đã tổng hợp thành công Hồ sơ Đề xuất (10 Sheets) bằng AI RAG từ dữ liệu Dự án!');
    } catch (err: any) {
      console.error('Generate proposal error:', err);
      alert(`Lỗi sinh proposal: ${err.message || 'Không thể tạo đề xuất'}`);
    } finally {
      setGenerating(false);
    }
  }

  // Select sheet
  function handleSelectSheet(sheetName: string) {
    setActiveSheetName(sheetName);
    if (proposal) {
      const sheet = proposal.sheets.find(s => s.sheetName === sheetName);
      if (sheet) {
        setJsonText(JSON.stringify(sheet.sheetData, null, 2));
      }
    }
  }

  // Save current sheet changes
  async function handleSaveCurrentSheet(customData?: Record<string, any>) {
    if (!proposal) return;

    try {
      setSaving(true);
      let dataToSave: Record<string, any> = customData || {};
      if (!customData) {
        if (editorMode === 'json') {
          dataToSave = JSON.parse(jsonText);
        } else {
          const sheet = proposal.sheets.find(s => s.sheetName === activeSheetName);
          dataToSave = sheet?.sheetData || {};
        }
      }

      const updatedSheet = await updateProposalSheet(proposal.id, activeSheetName, dataToSave);
      setProposal(prev => {
        if (!prev) return null;
        return {
          ...prev,
          sheets: prev.sheets.map(s => s.sheetName === activeSheetName ? updatedSheet : s)
        };
      });
      alert(`Đã lưu thành công nội dung Sheet '${activeSheetName}'!`);
    } catch (err: any) {
      alert(`Lỗi lưu sheet: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  // Handle Lifecycle Transition (DRAFT -> IN_REVIEW -> APPROVED)
  async function handleUpdateStatus(newStatus: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED') {
    if (!proposal) return;

    try {
      const updated = await updateProposalLifecycle(proposal.id, newStatus);
      setProposal(prev => prev ? { ...prev, status: updated.status } : null);
      alert(`Trạng thái Proposal đã cập nhật thành: ${newStatus}!`);
    } catch (err: any) {
      alert(`Lỗi cập nhật trạng thái: ${err.message}`);
    }
  }

  // Handle generating UI Design Brief (PDF Page 5)
  async function handleGenerateUIBrief() {
    if (!proposal) return;

    try {
      setGeneratingBrief(true);
      const brief = await generateProposalUIDesignBrief(proposal.id);
      setUiBrief(brief);
      alert('Đã khởi tạo thành công AI UI Design Brief cho dự án!');
    } catch (err: any) {
      alert(`Lỗi tạo UI Brief: ${err.message}`);
    } finally {
      setGeneratingBrief(false);
    }
  }

  // Copy UI Brief to Clipboard for Figma
  function handleCopyBrief() {
    if (!uiBrief) return;
    const text = `
=== AI UI DESIGN BRIEF (Presaleee) ===
Dự án: ${proposal?.title || 'Dự án'}
Mục tiêu giao diện: ${uiBrief.title}
Người dùng mục tiêu: ${uiBrief.target_users?.join(', ')}
Các màn hình chính:
${uiBrief.key_screens?.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Style Guide & Phong cách:
${uiBrief.ui_style_guide}

Luồng tương tác chính:
${uiBrief.interaction_flow}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopiedBrief(true);
    setTimeout(() => setCopiedBrief(false), 2500);
  }

  const activeSheet = proposal?.sheets.find(s => s.sheetName === activeSheetName) || proposal?.sheets[0];

  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
        <RefreshCw className="w-6 h-6 text-brand-600 animate-spin mx-auto" />
        <p className="text-xs font-mono text-slate-500">Đang tải hồ sơ Proposal của dự án...</p>
      </div>
    );
  }

  // Empty state: No proposal generated yet
  if (!proposal) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-8 sm:p-12 text-center max-w-3xl mx-auto space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto border border-brand-200">
          <Layers className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Khởi tạo Hồ sơ Đề xuất Kỹ thuật (10 Sheets Proposal)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto leading-relaxed">
            Hồ sơ sẽ được AI tổng hợp trực tiếp từ thông số dự án <span className="font-semibold text-slate-800">"{activeProject?.title || 'Hiện tại'}"</span>, 
            kết hợp biên bản cuộc họp Discovery và tri thức RAG trong Knowledge Vault.
          </p>
        </div>

        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left space-y-2">
          <label className="text-xs font-mono font-bold text-slate-700 block">
            CHỈ ĐẠO ĐẶC BIỆT CỦA PRESALE CONSULTANT (TÙY CHỌN):
          </label>
          <textarea
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            placeholder="Ví dụ: Nhấn mạnh giải pháp bản đồ GIS độ trễ dưới 200ms, tuân thủ chứng chỉ an ninh mạng quốc gia, chia 5 giai đoạn nghiệm thu..."
            rows={3}
            className="w-full text-xs font-mono p-3 rounded-xl border border-slate-300 focus:outline-none focus:border-brand-500 bg-white"
          />
        </div>

        <button
          onClick={handleGenerateProposal}
          disabled={generating}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold shadow-md shadow-brand-500/20 transition-all cursor-pointer disabled:opacity-50"
        >
          {generating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>AI Đang Tổng Hợp 10 Sheets Proposal...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Tạo Hồ sơ Đề xuất Bằng AI RAG</span>
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* 1. TOP HEADER & PROPOSAL TOOLBAR */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-200">
              {proposal.version}
            </span>
            <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border ${
              proposal.status === 'APPROVED' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : proposal.status === 'IN_REVIEW'
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-slate-100 text-slate-700 border-slate-300'
            }`}>
              STATUS: {proposal.status}
            </span>
            <span className="text-xs font-mono text-slate-500">
              10 Sheets Tiêu chuẩn
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {proposal.title}
          </h1>
        </div>

        {/* Toolbar Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {proposal.status === 'DRAFT' && (
            <button
              onClick={() => handleUpdateStatus('IN_REVIEW')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit for Review</span>
            </button>
          )}

          {proposal.status === 'IN_REVIEW' && (
            <button
              onClick={() => handleUpdateStatus('APPROVED')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Approve Proposal</span>
            </button>
          )}

          <a
            href={getProposalExcelDownloadUrl(proposal.id)}
            download
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-sm shadow-brand-500/20 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export to Excel (.xlsx)</span>
          </a>

          <button
            onClick={handleGenerateProposal}
            disabled={generating}
            title="Sinh lại toàn bộ 10 sheets bằng AI RAG"
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          >
            <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
          </button>
        </div>

      </div>

      {/* 2. THREE-COLUMN PROPOSAL STUDIO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* COLUMN A (3 cols): 10-Sheet Document Outline */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-4 space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-600" />
                <h3 className="text-xs font-bold text-slate-900 font-mono uppercase">
                  10-Sheet Matrix
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-brand-700 border border-brand-200">
                100% Synced
              </span>
            </div>

            <div className="space-y-1">
              {proposal.sheets.map((sheet) => {
                const isSelected = activeSheetName === sheet.sheetName;
                return (
                  <button
                    key={sheet.id}
                    onClick={() => handleSelectSheet(sheet.sheetName)}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between text-xs cursor-pointer ${
                      isSelected 
                        ? 'bg-brand-50 border border-brand-300 text-brand-900 font-bold shadow-xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 font-mono text-[10px] flex items-center justify-center shrink-0">
                        {sheet.sheetOrder}
                      </span>
                      <span className="truncate">{sheet.sheetName}</span>
                    </div>

                    {sheet.aiGenerated && (
                      <span className="text-[9px] font-mono font-bold px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 shrink-0">
                        AI
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Stats Widget */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-4 space-y-3 text-xs font-mono">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">
              COMMERCIAL SUMMARY
            </span>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Tổng Ngân Sách:</span>
              <span className="font-bold text-brand-700">
                ${proposal.totalCost?.toLocaleString()} {proposal.currency}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Tiến Độ Dự Kiến:</span>
              <span className="font-bold text-slate-800">
                {proposal.estimatedTimelineWeeks} Tuần
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Excel Export:</span>
              <span className="font-semibold text-emerald-700">10 Tabs Hoàn Hảo</span>
            </div>
          </div>
        </div>

        {/* COLUMN B (6 cols): Active Sheet Editor Canvas */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6 space-y-6">
            
            {/* Editor Canvas Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  Sheet #{activeSheet?.sheetOrder}
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  {activeSheet?.sheetName}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-mono">
                  <button
                    onClick={() => setEditorMode('structured')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      editorMode === 'structured'
                        ? 'bg-white text-slate-900 font-bold shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Structured View
                  </button>
                  <button
                    onClick={() => setEditorMode('json')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      editorMode === 'json'
                        ? 'bg-white text-slate-900 font-bold shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Raw JSON
                  </button>
                </div>

                <button
                  onClick={() => handleSaveCurrentSheet()}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : 'Save'}</span>
                </button>
              </div>
            </div>

            {/* Structured Content Renderers */}
            {editorMode === 'structured' && activeSheet && (
              <div className="space-y-6">
                
                {/* 1. Overview Sheet */}
                {activeSheet.sheetName === 'Overview' && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-mono font-bold text-slate-400 uppercase block mb-1">
                        Executive Summary
                      </label>
                      <textarea
                        rows={6}
                        defaultValue={activeSheet.sheetData?.executiveSummary || ''}
                        onChange={(e) => {
                          activeSheet.sheetData.executiveSummary = e.target.value;
                          setJsonText(JSON.stringify(activeSheet.sheetData, null, 2));
                        }}
                        className="w-full text-xs font-sans text-slate-800 p-3.5 rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-slate-50/50 leading-relaxed"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-mono font-bold text-slate-400 uppercase block mb-2">
                        Key Objectives
                      </label>
                      <div className="space-y-2">
                        {(activeSheet.sheetData?.keyObjectives || []).map((obj: string, i: number) => (
                          <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                            <CheckCircle2 className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                            <span>{obj}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono flex items-center justify-between">
                      <span className="text-slate-500">Delivery Methodology:</span>
                      <span className="font-bold text-slate-800">{activeSheet.sheetData?.deliveryMethodology}</span>
                    </div>
                  </div>
                )}

                {/* 2. Scope of Work (WBS) */}
                {activeSheet.sheetName === 'Scope of Work' && (
                  <div className="space-y-3">
                    <div className="text-xs font-mono font-bold text-slate-400 uppercase mb-2">
                      Work Breakdown Structure (WBS)
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-400">
                            <th className="pb-2">WBS</th>
                            <th className="pb-2">Phân Hệ (Module)</th>
                            <th className="pb-2">Mức Độ</th>
                            <th className="pb-2">Ưu Tiên</th>
                            <th className="pb-2 text-right">Ngày Công</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(activeSheet.sheetData?.modules || []).map((m: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-2.5 font-bold text-brand-700">{m.wbs}</td>
                              <td className="py-2.5 pr-2">
                                <div className="font-semibold text-slate-800">{m.module}</div>
                                <div className="text-[11px] text-slate-400 font-sans">{m.feature}</div>
                              </td>
                              <td className="py-2.5">
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]">
                                  {m.complexity}
                                </span>
                              </td>
                              <td className="py-2.5">
                                <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] font-bold">
                                  {m.priority}
                                </span>
                              </td>
                              <td className="py-2.5 text-right font-bold text-slate-800">
                                {m.estimatedDays} d
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 3. Architecture & Tech Stack */}
                {activeSheet.sheetName === 'Architecture & Tech Stack' && (
                  <div className="space-y-4">
                    <div className="text-xs font-mono font-bold text-slate-400 uppercase mb-1">
                      Kiến Trúc &amp; Khung Công Nghệ
                    </div>
                    <div className="space-y-2.5">
                      {(activeSheet.sheetData?.stack || []).map((item: any, idx: number) => (
                        <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                          <div className="flex items-center justify-between font-mono mb-1">
                            <span className="font-bold text-brand-700">{item.layer}</span>
                            <span className="px-2 py-0.5 rounded bg-brand-100 text-brand-800 font-bold text-[10px]">
                              {item.technology}
                            </span>
                          </div>
                          <p className="text-slate-600 text-[11px] leading-relaxed">
                            {item.rationale}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2">
                      <div className="text-xs font-mono font-bold text-slate-400 uppercase mb-2">
                        Yêu cầu Phi Chức Năng (NFRs)
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        {(activeSheet.sheetData?.nonFunctionalRequirements || []).map((nfr: any, idx: number) => (
                          <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                            <span className="text-[10px] text-slate-400 block">{nfr.category}</span>
                            <span className="font-semibold text-slate-800">{nfr.requirement}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Timeline & Milestones */}
                {activeSheet.sheetName === 'Timeline & Milestones' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono pb-2 border-b border-slate-100">
                      <span className="font-bold text-slate-700 uppercase">Lộ trình triển khai</span>
                      <span className="font-bold text-brand-700">Tổng: {activeSheet.sheetData?.totalWeeks} Tuần</span>
                    </div>

                    <div className="space-y-2.5">
                      {(activeSheet.sheetData?.milestones || []).map((m: any, idx: number) => (
                        <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                          <div>
                            <div className="font-mono font-bold text-slate-800">
                              {m.phase}: {m.milestone}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Deliverables: {m.deliverables}
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-mono font-bold text-brand-700 text-xs shrink-0">
                            {m.durationWeeks} tuần
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. Team & Rate Cards */}
                {activeSheet.sheetName === 'Team & Rate Cards' && (
                  <div className="space-y-3">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-400">
                            <th className="pb-2">Vị Trí (Role)</th>
                            <th className="pb-2">Level</th>
                            <th className="pb-2 text-right">Phân Bổ</th>
                            <th className="pb-2 text-right">Man-Month</th>
                            <th className="pb-2 text-right">Rate/Tháng</th>
                            <th className="pb-2 text-right">Chi Phí</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(activeSheet.sheetData?.roles || []).map((r: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-2.5 font-bold text-slate-800">{r.role}</td>
                              <td className="py-2.5 text-slate-500">{r.level}</td>
                              <td className="py-2.5 text-right">{r.allocation}</td>
                              <td className="py-2.5 text-right font-bold text-brand-700">{r.manMonths} MM</td>
                              <td className="py-2.5 text-right">${r.monthlyRate?.toLocaleString()}</td>
                              <td className="py-2.5 text-right font-bold text-slate-900">${r.totalCost?.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-slate-200 font-bold">
                            <td colSpan={3} className="py-2.5">Tổng Nhân Lực</td>
                            <td className="py-2.5 text-right text-brand-700">{activeSheet.sheetData?.totalEffortManMonths} MM</td>
                            <td></td>
                            <td className="py-2.5 text-right text-slate-900">${activeSheet.sheetData?.totalTeamCost?.toLocaleString()}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {/* 6. Pricing & Quotation */}
                {activeSheet.sheetName === 'Pricing & Quotation' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3 text-xs font-mono">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-[10px] text-slate-400 block">CHI PHÍ NHÂN SỰ</span>
                        <span className="font-bold text-slate-800 text-sm">
                          ${activeSheet.sheetData?.teamCost?.toLocaleString()}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-[10px] text-slate-400 block">HẠ TẦNG &amp; CÔNG CỤ</span>
                        <span className="font-bold text-slate-800 text-sm">
                          ${activeSheet.sheetData?.infrastructureCost?.toLocaleString()}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-emerald-50 border border-brand-200">
                        <span className="text-[10px] text-brand-700 block">TỔNG GIÁ TRỊ (GRAND TOTAL)</span>
                        <span className="font-bold text-brand-900 text-sm">
                          ${activeSheet.sheetData?.grandTotal?.toLocaleString()} {activeSheet.sheetData?.currency}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2">
                      <div className="text-xs font-mono font-bold text-slate-400 uppercase">
                        Các Đợt Thanh Toán Theo Mốc (Payment Milestones)
                      </div>
                      <div className="space-y-2">
                        {(activeSheet.sheetData?.paymentMilestones || []).map((pm: any, idx: number) => (
                          <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono flex items-center justify-between">
                            <span className="text-slate-800 font-semibold">{pm.milestone}</span>
                            <div className="text-right">
                              <span className="font-bold text-brand-700">${pm.amount?.toLocaleString()}</span>
                              <span className="text-slate-400 ml-1.5">({pm.percentage}%)</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 7. Assumptions & Dependencies */}
                {activeSheet.sheetName === 'Assumptions & Dependencies' && (
                  <div className="space-y-2.5">
                    {(activeSheet.sheetData?.items || []).map((item: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                        <span className="font-mono font-bold text-brand-700 block mb-1">{item.category}</span>
                        <p className="text-slate-700 leading-relaxed">{item.description}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* 8. Risk Management (RAID) */}
                {activeSheet.sheetName === 'Risk Management (RAID)' && (
                  <div className="space-y-3">
                    {(activeSheet.sheetData?.risks || []).map((r: any, idx: number) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                        <div className="flex items-center justify-between font-mono">
                          <span className="font-bold text-slate-900">{r.risk}</span>
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 font-bold text-[10px]">
                              Impact: {r.impact}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-bold text-[10px]">
                              Prob: {r.probability}
                            </span>
                          </div>
                        </div>
                        <div className="text-slate-600 text-[11px] leading-relaxed">
                          <strong>Biện pháp giảm thiểu:</strong> {r.mitigation}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 9. SLA & Maintenance */}
                {activeSheet.sheetName === 'SLA & Maintenance' && (
                  <div className="space-y-2.5">
                    {(activeSheet.sheetData?.metrics || []).map((m: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono flex items-center justify-between">
                        <span className="text-slate-700">{m.metric}</span>
                        <span className="font-bold text-brand-700">{m.target}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* 10. Appendices & Case Studies */}
                {activeSheet.sheetName === 'Appendices & Case Studies' && (
                  <div className="space-y-3">
                    {(activeSheet.sheetData?.caseStudies || []).map((cs: any, idx: number) => (
                      <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                        <div className="font-mono font-bold text-brand-700 text-sm">{cs.client}</div>
                        <p className="text-slate-700 leading-relaxed">{cs.result}</p>
                        <div className="text-[11px] font-mono text-slate-400">
                          Architecture: {cs.referenceArchitecture}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            )}

            {/* Raw JSON View */}
            {editorMode === 'json' && (
              <div className="space-y-2">
                <textarea
                  rows={18}
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  className="w-full text-xs font-mono p-4 rounded-xl border border-slate-300 focus:outline-none focus:border-brand-500 bg-slate-900 text-emerald-400 leading-relaxed"
                />
              </div>
            )}

          </div>
        </div>

        {/* COLUMN C (3 cols): AI UI Design Brief & Proposal Assistant */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* AI UI Design Brief Card (PDF Page 5) */}
          <div className="bg-white rounded-2xl border border-brand-200 shadow-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold tracking-wider text-brand-700 uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                AI UI DESIGN BRIEF
              </span>
              <span className="text-[10px] font-mono bg-emerald-100 text-brand-800 px-1.5 py-0.2 rounded font-bold">
                PDF Page 5
              </span>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed">
              AI dựa trên project context để tạo brief mô tả UI/UX, hỗ trợ đội ngũ Design dựng clickable prototype.
            </p>

            {uiBrief ? (
              <div className="space-y-3 pt-2 text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] text-slate-400 block font-bold">NGƯỜI DÙNG MỤC TIÊU:</span>
                  <div className="text-slate-800 text-[11px]">{uiBrief.target_users?.join(', ')}</div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] text-slate-400 block font-bold">CÁC MÀN HÌNH CHÍNH:</span>
                  <ul className="list-disc pl-3 text-slate-700 text-[11px] space-y-0.5">
                    {uiBrief.key_screens?.map((scr, idx) => (
                      <li key={idx}>{scr}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] text-slate-400 block font-bold">LUỒNG TƯƠNG TÁC (FLOW):</span>
                  <p className="text-slate-600 text-[11px] leading-relaxed">{uiBrief.interaction_flow}</p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleCopyBrief}
                    className="flex-1 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedBrief ? 'Đã sao chép ✓' : 'Copy cho Figma'}</span>
                  </button>

                  <button
                    onClick={handleGenerateUIBrief}
                    disabled={generatingBrief}
                    title="Làm mới UI Brief"
                    className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${generatingBrief ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleGenerateUIBrief}
                disabled={generatingBrief}
                className="w-full py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-brand-700 border border-brand-200 text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                <span>{generatingBrief ? 'Đang tạo Brief...' : 'Tạo AI UI Design Brief'}</span>
              </button>
            )}
          </div>

          {/* SOW & Project Context Verification Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-4 space-y-3 text-xs font-mono">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">
              DỰ ÁN LIÊN KẾT (CONTEXT)
            </span>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-400 block">DỰ ÁN:</span>
              <span className="font-bold text-slate-800 block truncate">{proposal.title}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-400 block">SLA CAM KẾT:</span>
              <span className="font-bold text-brand-700 block">
                {activeProject?.extracted_metadata?.target_sla || '< 200ms Latency'}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-400 block">TẢI ĐỈNH (PEAK WORKLOAD):</span>
              <span className="font-bold text-brand-700 block">
                {activeProject?.extracted_metadata?.peak_workload || '10,000+ Concurrent Requests'}
              </span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
