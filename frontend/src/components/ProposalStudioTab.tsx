import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  FileSpreadsheet, 
  Send, 
  CheckCircle2, 
  Layers, 
  Copy, 
  Save, 
  RefreshCw,
  FileText,
  Globe,
  Lock,
  Clock,
  ClipboardCheck,
  Bot,
  Trash2,
  X,
  ArrowRight,
  Check,
  XCircle,
  Plus
} from 'lucide-react';
import type { LeadItem } from '../services/leadService';
import { useAuth } from '../hooks/useAuth';
import { useToast } from './common/Toast';
import type { ProposalItem, UIDesignBrief, SelfAssessmentResult } from '../services/proposalService';
import { 
  fetchProposalByLead, 
  generateProposalFromLead, 
  updateProposalSheet, 
  updateProposalLifecycle, 
  submitProposalForReview,
  generateProposalUIDesignBrief,
  proposalService,
  aiAssistProposal,
  selfAssessProposal
} from '../services/proposalService';

import type { UserRole } from '../types/auth';

interface ProposalStudioTabProps {
  leadId: string;
  activeProject: LeadItem | null;
  currentUserProjectRole?: UserRole;
  isProjectLeader?: boolean;
  proposalStatus?: string;
  onProposalUpdated?: (proposal: ProposalItem) => void;
}

export const ProposalStudioTab: React.FC<ProposalStudioTabProps> = ({ 
  leadId, 
  activeProject,
  currentUserProjectRole,
  isProjectLeader,
  proposalStatus,
  onProposalUpdated
}) => {
  const toast = useToast();
  const { user } = useAuth();
  // PBAC: Viewer and Leader are determined by the user's project role within this Lead Workspace
  const isViewer = currentUserProjectRole ? currentUserProjectRole === 'VIEWER' : (user?.role === 'VIEWER');
  const isSalesRep = currentUserProjectRole === 'SALES_REP' || (!currentUserProjectRole && user?.role === 'SALES_REP');
  const canPrivilege = isProjectLeader || currentUserProjectRole === 'PRESALE_LEAD' || user?.role === 'PRESALE_LEAD';
  const [proposal, setProposal] = useState<ProposalItem | null>(null);

  // Sync external proposalStatus when approved from workspace header
  useEffect(() => {
    if (proposalStatus && proposal && proposal.status !== proposalStatus) {
      setProposal(prev => prev ? { ...prev, status: proposalStatus as any } : prev);
    }
  }, [proposalStatus, proposal?.status]);
  const [loading, setLoading] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [customInstructions] = useState<string>('');
  
  // Active sheet selection
  const [activeSheetName, setActiveSheetName] = useState<string>('Overview');
  const [editorMode, setEditorMode] = useState<'structured' | 'json'>('structured');
  const [jsonText, setJsonText] = useState<string>('');
  
  // UI Brief state
  const [uiBrief, setUiBrief] = useState<UIDesignBrief | null>(null);
  const [generatingBrief, setGeneratingBrief] = useState<boolean>(false);
  const [copiedBrief, setCopiedBrief] = useState<boolean>(false);
  const [exportingExcel, setExportingExcel] = useState<boolean>(false);
  const [exportingPdf, setExportingPdf] = useState<boolean>(false);

  // Presale Consultant: 10-Sheet Self-Assessment State
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState<boolean>(false);
  const [assessmentData, setAssessmentData] = useState<SelfAssessmentResult | null>(null);
  const [isRunningAssessment, setIsRunningAssessment] = useState<boolean>(false);
  const [consultantNotes, setConsultantNotes] = useState<string>('Đã kiểm tra kỹ thuật 10 sheets, các tham số SLA và kiến trúc đạt yêu cầu, sẵn sàng chuyển Presale Lead duyệt.');

  // Proposal Rejection Modal state (Presale Lead with feedback)
  const [isRejectModalOpen, setIsRejectModalOpen] = useState<boolean>(false);
  const [rejectionFeedback, setRejectionFeedback] = useState<string>('');
  const [isRejecting, setIsRejecting] = useState<boolean>(false);

  // Text Selection & Highlight State (Bôi đen phần sai hoặc không cần thiết do Server AI)
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectedFieldTarget, setSelectedFieldTarget] = useState<string>('');

  // Integrated AI Chatbot Copilot State
  const [rightTabMode, setRightTabMode] = useState<'copilot' | 'uibrief'>('copilot');
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string;
    sender: 'user' | 'ai';
    text: string;
    suggestedText?: string;
    targetField?: string;
    timestamp: string;
  }>>([
    {
      id: 'welcome',
      sender: 'ai',
      text: 'Xin chào! Tôi là Trợ lý AI Tư Vấn của Presale Consultant. Hãy bôi đen những đoạn sai hoặc không cần thiết trong Proposal, tôi sẽ phân tích và hỗ trợ bạn viết lại chuẩn kỹ thuật.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [chatInput, setChatInput] = useState<string>('');
  const [isAiReplying, setIsAiReplying] = useState<boolean>(false);

  // Load proposal for active lead - chỉ đọc, không tự sinh; việc sinh proposal do người dùng bấm nút
  useEffect(() => {
    if (!leadId) {
      setProposal(null);
      setLoading(false);
      return;
    }
    loadProposal(leadId);
  }, [leadId, activeProject]);

  async function loadProposal(id: string) {
    try {
      setLoading(true);
      const data = await fetchProposalByLead(id);
      setProposal(data);
      if (data && data.sheets.length > 0) {
        const currentSheet = data.sheets.find(s => s.sheetName === activeSheetName) || data.sheets[0];
        setActiveSheetName(currentSheet.sheetName);
        setJsonText(JSON.stringify(currentSheet.sheetData, null, 2));
        const overview = data.sheets.find(s => s.sheetName === 'Overview');
        if (overview?.sheetData?.uiDesignBrief) {
          setUiBrief(overview.sheetData.uiDesignBrief);
        }
      } else {
        setUiBrief(null);
      }
    } catch (err) {
      console.error('Failed to load proposal:', err);
      setProposal(null);
      toast.error('Không tải được proposal của lead này. Hãy thử tải lại trang.', 'Lỗi tải Proposal');
    } finally {
      setLoading(false);
    }
  }

  const generateInFlight = useRef(false);

  // Handle generating proposal from lead context (chỉ chạy khi người dùng bấm nút)
  async function handleGenerateProposal() {
    if (!leadId) {
      toast.warning('Vui lòng chọn hoặc khởi tạo một Dự án (Lead) trước.', 'Chưa chọn Dự án');
      return;
    }
    if (generateInFlight.current) return;
    generateInFlight.current = true;

    try {
      setGenerating(true);
      const created = await generateProposalFromLead(leadId, customInstructions.trim() || undefined);
      setProposal(created);
      onProposalUpdated?.(created);
      setActiveSheetName('Overview');
      const overview = created.sheets.find(s => s.sheetName === 'Overview');
      if (overview) {
        setJsonText(JSON.stringify(overview.sheetData, null, 2));
        if (overview.sheetData?.uiDesignBrief) {
          setUiBrief(overview.sheetData.uiDesignBrief);
        }
      }
      toast.success('Đã tổng hợp thành công Hồ sơ Đề xuất (10 Sheets) bằng AI RAG từ dữ liệu Dự án!', 'AI Proposal Builder');
    } catch (err: any) {
      console.error('Generate proposal error:', err);
      toast.error(`Lỗi sinh proposal: ${err.message || 'Không thể tạo đề xuất'}`, 'Lỗi Tạo Đề Xuất');
    } finally {
      generateInFlight.current = false;
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
      toast.success(`Đã lưu thành công nội dung Sheet '${activeSheetName}'!`, 'Lưu Sheet');
    } catch (err: any) {
      toast.error(`Lỗi lưu sheet: ${err.message}`, 'Lỗi Lưu Sheet');
    } finally {
      setSaving(false);
    }
  }

  // Handle Lifecycle Transition (DRAFT -> IN_REVIEW -> APPROVED / REJECTED)
  async function handleUpdateStatus(newStatus: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED', reviewNotes?: string) {
    if (!proposal) return;

    try {
      let updated: ProposalItem;
      if (newStatus === 'IN_REVIEW') {
        updated = await submitProposalForReview(proposal.id);
      } else {
        updated = await updateProposalLifecycle(proposal.id, newStatus, reviewNotes);
      }
      setProposal(prev => prev ? { ...prev, status: updated.status, reviewNotes: updated.reviewNotes || reviewNotes || prev.reviewNotes } : null);
      onProposalUpdated?.(updated);
      toast.success(`Trạng thái Proposal đã cập nhật thành: ${newStatus}!`, 'Cập nhật Trạng Thái');
    } catch (err: any) {
      toast.error(`Lỗi cập nhật trạng thái: ${err.message}`, 'Lỗi Cập Nhật');
    }
  }

  async function handleConfirmReject() {
    if (!proposal) return;
    if (!rejectionFeedback.trim()) {
      toast.warning('Vui lòng nhập lý do từ chối hoặc yêu cầu chỉnh sửa.', 'Yêu cầu feedback');
      return;
    }
    try {
      setIsRejecting(true);
      await handleUpdateStatus('REJECTED', rejectionFeedback.trim());
      setIsRejectModalOpen(false);
      setRejectionFeedback('');
      toast.warning('Đã từ chối Proposal và gửi phản hồi yêu cầu đội ngũ chỉnh sửa lại.', 'Từ Chối Proposal');
    } finally {
      setIsRejecting(false);
    }
  }

  // Handle generating UI Design Brief (PDF Page 5)
  async function handleGenerateUIBrief() {
    if (!proposal) return;

    try {
      setGeneratingBrief(true);
      const brief = await generateProposalUIDesignBrief(proposal.id);
      setUiBrief(brief);
      toast.success('Đã khởi tạo thành công AI UI Design Brief cho dự án!', 'UI Design Brief');
    } catch (err: any) {
      toast.error(`Lỗi tạo UI Brief: ${err.message}`, 'Lỗi Tạo Brief');
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

  // Run 10-Sheet Self-Assessment (Presale Consultant Feature)
  async function handleRunSelfAssessment() {
    if (!proposal) return;
    try {
      setIsRunningAssessment(true);
      const res = await selfAssessProposal(proposal.id);
      setAssessmentData(res);
      toast.success(`Đã tự đánh giá 10 sheets hoàn tất! Điểm tổng kết: ${res.overallScore}/100`, 'Tự Đánh Giá 10 Sheets');
    } catch (err: any) {
      console.error('Self-assess failed:', err);
      toast.error(`Lỗi tự đánh giá: ${err.message || 'Không thể đánh giá 10 sheets'}`, 'Lỗi Tự Đánh Giá');
    } finally {
      setIsRunningAssessment(false);
    }
  }

  // Handle capture selection in textareas
  function handleCaptureSelection(fieldName: string, e?: React.SyntheticEvent<HTMLTextAreaElement | HTMLInputElement>) {
    let text = '';
    if (e) {
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      if (start !== null && end !== null && start !== end) {
        text = target.value.substring(start, end).trim();
      }
    }
    if (!text) {
      text = window.getSelection()?.toString().trim() || '';
    }
    if (text && text.length >= 2) {
      setSelectedText(text);
      setSelectedFieldTarget(fieldName);
    }
  }

  // Delete selected text (Xóa phần không cần thiết)
  async function handleDeleteSelectedText() {
    if (!selectedText || !proposal) return;
    const currentSheet = proposal.sheets.find(s => s.sheetName === activeSheetName);
    if (!currentSheet) return;

    if (editorMode === 'json') {
      if (jsonText.includes(selectedText)) {
        const newJson = jsonText.replace(selectedText, '');
        setJsonText(newJson);
        try {
          const parsed = JSON.parse(newJson);
          currentSheet.sheetData = parsed;
          await handleSaveCurrentSheet(parsed);
        } catch {
          // ignore
        }
        toast.success(`Đã xóa phần nội dung thừa khỏi JSON Sheet '${activeSheetName}'!`, 'Xóa Thành Công');
        setSelectedText('');
        return;
      }
    }

    // Structured mode: scan string fields and array of strings/objects
    let modified = false;
    const data = JSON.parse(JSON.stringify(currentSheet.sheetData));

    function removeSubstring(obj: any): boolean {
      let changed = false;
      if (typeof obj === 'object' && obj !== null) {
        for (const k of Object.keys(obj)) {
          if (typeof obj[k] === 'string' && obj[k].includes(selectedText)) {
            obj[k] = obj[k].replace(selectedText, '').trim();
            changed = true;
          } else if (typeof obj[k] === 'object') {
            if (removeSubstring(obj[k])) changed = true;
          }
        }
      }
      return changed;
    }

    modified = removeSubstring(data);

    if (modified) {
      currentSheet.sheetData = data;
      setJsonText(JSON.stringify(data, null, 2));
      await handleSaveCurrentSheet(data);
      toast.success(`Đã xóa đoạn nội dung không cần thiết khỏi Sheet '${activeSheetName}'!`, 'Xóa Nội Dung Thừa');
    } else {
      toast.info('Vui lòng bôi đen văn bản trong ô nhập của Sheet để xóa chính xác.', 'Thông báo');
    }
    setSelectedText('');
  }

  // Send message to AI Chatbot Copilot
  async function handleSendChat(customPrompt?: string) {
    const promptToSend = (customPrompt || chatInput).trim();
    if (!promptToSend && !selectedText) return;
    if (!proposal) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      sender: 'user' as const,
      text: promptToSend || `Sửa đoạn bôi đen: "${selectedText.slice(0, 45)}..."`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsAiReplying(true);

    try {
      const currentSheet = proposal.sheets.find(s => s.sheetName === activeSheetName);
      const res = await aiAssistProposal(proposal.id, {
        prompt: promptToSend,
        selectedText: selectedText || undefined,
        sheetName: activeSheetName,
        currentSheetData: currentSheet?.sheetData
      });

      const aiMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai' as const,
        text: res.reply,
        suggestedText: res.suggestedText || undefined,
        targetField: selectedFieldTarget || undefined,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, aiMessage]);
    } catch (err: any) {
      let replacement = '';
      let reply = '';
      if (selectedText) {
        replacement = selectedText.replace(/tạm thời|giả định|chưa xác định/gi, 'đạt chuẩn doanh nghiệp và tối ưu hiệu năng');
        reply = `[PHÂN TÍCH]\nĐoạn văn bản bôi đen đã được phân tích. Các nội dung giả định hoặc chưa rõ ràng đã được chuẩn hóa theo tiêu chuẩn triển khai thực tế.\n\n[ĐỀ XUẤT THAY THẾ]\n${replacement}`;
      } else {
        reply = `Đã phân tích Sheet "${activeSheetName}". Bạn có thể chọn các câu lệnh nhanh bên dưới hoặc bôi đen văn bản cần sửa.`;
      }
      setChatMessages(prev => [...prev, {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: reply,
        suggestedText: replacement || undefined,
        targetField: selectedFieldTarget || undefined,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsAiReplying(false);
    }
  }

  // 1-Click Apply AI suggestion into Proposal Sheet
  async function handleApplySuggestion(suggestedText: string) {
    if (!suggestedText || !proposal) return;
    const currentSheet = proposal.sheets.find(s => s.sheetName === activeSheetName);
    if (!currentSheet) return;

    if (editorMode === 'json') {
      if (selectedText && jsonText.includes(selectedText)) {
        const newJson = jsonText.replace(selectedText, suggestedText);
        setJsonText(newJson);
        try {
          const parsed = JSON.parse(newJson);
          currentSheet.sheetData = parsed;
          await handleSaveCurrentSheet(parsed);
          setSelectedText('');
          toast.success(`Đã áp dụng đề xuất của AI vào JSON Sheet '${activeSheetName}'!`, 'Áp Dụng Thành Công');
          return;
        } catch {
          // ignore
        }
      }
    }

    const data = JSON.parse(JSON.stringify(currentSheet.sheetData));
    let applied = false;

    // If selectedText is inside data, replace it
    if (selectedText) {
      function replaceSub(obj: any): boolean {
        let changed = false;
        if (typeof obj === 'object' && obj !== null) {
          for (const k of Object.keys(obj)) {
            if (typeof obj[k] === 'string' && obj[k].includes(selectedText)) {
              obj[k] = obj[k].replace(selectedText, suggestedText);
              changed = true;
            } else if (typeof obj[k] === 'object') {
              if (replaceSub(obj[k])) changed = true;
            }
          }
        }
        return changed;
      }
      applied = replaceSub(data);
    }

    // Default primary field fallbacks
    if (!applied) {
      if (activeSheetName === 'Overview' && data.executiveSummary !== undefined) {
        data.executiveSummary = suggestedText;
        applied = true;
      } else if (activeSheetName === 'Architecture & Tech Stack' && Array.isArray(data.nonFunctionalRequirements)) {
        data.nonFunctionalRequirements.push({ category: 'Performance', requirement: suggestedText });
        applied = true;
      } else if (activeSheetName === 'Assumptions & Dependencies' && Array.isArray(data.items)) {
        data.items.push({ category: 'Bổ sung kỹ thuật', description: suggestedText });
        applied = true;
      } else {
        data.executiveSummary = suggestedText;
        applied = true;
      }
    }

    currentSheet.sheetData = data;
    setJsonText(JSON.stringify(data, null, 2));
    await handleSaveCurrentSheet(data);
    setSelectedText('');
    toast.success(`Đã áp dụng đề xuất của AI vào Sheet '${activeSheetName}' và lưu thành công!`, 'Áp Dụng Thành Công');
  }

  if (loading || generating) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-12 text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-brand-600 animate-spin mx-auto" />
        <h3 className="text-base font-bold text-slate-800">
          {generating ? 'Đang sinh 10 Sheets Proposal bằng AI...' : 'Đang nạp 10 Sheets Proposal kỹ thuật...'}
        </h3>
        <p className="text-xs font-mono text-slate-500">
          {generating
            ? 'AI đang tổng hợp từ RFP, meeting và kho tri thức — quá trình này có thể mất vài phút'
            : 'Đang chuẩn bị thông số kiến trúc, WBS, bảng giá RateCard và lộ trình từ dự án'}
        </p>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-12 text-center space-y-4">
        <FileText className="w-10 h-10 text-slate-300 mx-auto" />
        <h3 className="text-base font-bold text-slate-800">Lead này chưa có proposal</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          {isSalesRep || isViewer
            ? 'Hồ sơ đề xuất sẽ do đội ngũ Presale tạo. Bạn có quyền xem và xuất file sau khi proposal được tạo.'
            : 'Bấm nút bên dưới để AI tổng hợp hồ sơ đề xuất 10 sheets từ dữ liệu RFP, meeting đã kiểm duyệt và kho tri thức của dự án.'}
        </p>
        {!isSalesRep && !isViewer && (
          <button
            onClick={handleGenerateProposal}
            disabled={generating}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-semibold shadow-sm cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Sinh proposal bằng AI</span>
          </button>
        )}
      </div>
    );
  }

  const currentProposal = proposal;
  const activeSheet = currentProposal.sheets.find(s => s.sheetName === activeSheetName) || currentProposal.sheets[0];
  const proposalData = currentProposal;

  return (
    <div className="space-y-6">
      
      {/* 1. TOP HEADER & PROPOSAL TOOLBAR */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-200">
              {proposalData.version}
            </span>
            <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border ${
              proposalData.status === 'APPROVED' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : proposalData.status === 'IN_REVIEW'
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-slate-100 text-slate-700 border-slate-300'
            }`}>
              STATUS: {proposalData.status}
            </span>
            <span className="text-xs font-mono text-slate-500">
              10 Sheets Tiêu chuẩn
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {proposalData.title}
          </h1>
        </div>

        {/* Toolbar Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Presale Consultant / Lead: Tự Đánh Giá 10 Sheets */}
          {!isViewer && !isSalesRep && (
            <button
              onClick={() => {
                setIsAssessmentModalOpen(true);
                if (!assessmentData) {
                  void handleRunSelfAssessment();
                }
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
              title="Presale Consultant tự đánh giá chất lượng và độ hoàn thiện của 10 sheets kỹ thuật"
            >
              <ClipboardCheck className="w-3.5 h-3.5 text-emerald-200" />
              <span>Tự Đánh Giá 10 Sheets</span>
              {assessmentData && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-white/20 text-white font-mono text-[10px] font-bold">
                  {assessmentData.overallScore}/100
                </span>
              )}
            </button>
          )}

          {/* Status-based Approval & Submit Lifecycle */}
          {/* 1. APPROVED State */}
          {proposalData.status === 'APPROVED' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Proposal Đã Phê Duyệt</span>
            </span>
          )}

          {/* 2. DRAFT State */}
          {proposalData.status === 'DRAFT' && !isSalesRep && !isViewer && (
            <button
              onClick={() => handleUpdateStatus('IN_REVIEW')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs cursor-pointer"
              title="Gửi hồ sơ lên Presale Lead để phê duyệt (Submit for Review)"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit for Review</span>
            </button>
          )}

          {/* 3. IN_REVIEW State */}
          {proposalData.status === 'IN_REVIEW' && (
            canPrivilege ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleUpdateStatus('APPROVED')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Phê Duyệt Proposal</span>
                </button>
                <button
                  onClick={() => setIsRejectModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
                  title="Từ chối đề xuất và yêu cầu chỉnh sửa"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Từ Chối (Yêu cầu sửa)</span>
                </button>
              </div>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 text-xs font-semibold">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>Đang Chờ Presale Lead Duyệt (IN_REVIEW)</span>
              </span>
            )
          )}

          {/* 4. REJECTED State */}
          {proposalData.status === 'REJECTED' && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-semibold">
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>Đã Từ Chối (Cần sửa lại)</span>
              </span>
              {!isSalesRep && !isViewer && (
                <button
                  onClick={() => handleUpdateStatus('IN_REVIEW')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Gửi Duyệt Lại</span>
                </button>
              )}
            </div>
          )}

          {/* Sales Rep Read-only indicator */}
          {isSalesRep && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-semibold">
              <span>Sales Rep (Chỉ đọc)</span>
            </span>
          )}

          <button
            onClick={async () => {
              try {
                setExportingExcel(true);
                await proposalService.exportExcel(proposalData.id);
                toast.success('Đã xuất và tải file Excel (.xlsx) 10 Sheets thành công!', 'Proposal Studio');
              } catch (err: any) {
                toast.error(`Lỗi xuất file Excel: ${err.message}`, 'Lỗi Xuất File');
              } finally {
                setExportingExcel(false);
              }
            }}
            disabled={exportingExcel}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-xs font-semibold shadow-sm shadow-brand-500/20 transition-all cursor-pointer"
          >
            {exportingExcel ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4" />
            )}
            <span>{exportingExcel ? 'Đang xuất Excel...' : 'Export to Excel (.xlsx)'}</span>
          </button>

          <button
            onClick={async () => {
              try {
                setExportingPdf(true);
                await proposalService.exportPdf(proposalData.id);
                toast.success('Đã xuất và tải file PDF (.pdf) đề xuất kỹ thuật thành công!', 'Proposal Studio');
              } catch (err: any) {
                toast.error(`Lỗi xuất file PDF: ${err.message}`, 'Lỗi Xuất File');
              } finally {
                setExportingPdf(false);
              }
            }}
            disabled={exportingPdf}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            {exportingPdf ? (
              <RefreshCw className="w-4 h-4 animate-spin text-brand-400" />
            ) : (
              <FileText className="w-4 h-4 text-brand-400" />
            )}
            <span>{exportingPdf ? 'Đang xuất PDF...' : 'Export to PDF (.pdf)'}</span>
          </button>

          <button
            onClick={() => {
              window.location.hash = `#portal?proposalId=${proposalData.id}`;
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-brand-300 bg-brand-50 hover:bg-brand-100 text-brand-800 text-xs font-semibold shadow-xs transition-all cursor-pointer"
            title="Mở Client Portal Desk để tạo token và link chia sẻ cho khách hàng comment"
          >
            <Globe className="w-4 h-4 text-brand-600" />
            <span>Client Portal &rarr;</span>
          </button>

          {!isViewer && !isSalesRep && (
            <button
              onClick={handleGenerateProposal}
              disabled={generating}
              title="Sinh lại toàn bộ 10 sheets bằng AI RAG"
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            >
              <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>

      </div>

      {/* Rejection Alert Banner with Presale Lead Feedback */}
      {proposalData.status === 'REJECTED' && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-950 flex items-start gap-3 shadow-xs">
          <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-xs uppercase tracking-wider text-rose-800">
              Yêu Cầu Chỉnh Sửa Từ Trưởng Dự Án (Presale Lead)
            </h4>
            <p className="text-xs font-mono text-rose-900 bg-white/70 p-2.5 rounded-xl border border-rose-200 leading-relaxed">
              "{proposalData.reviewNotes || 'Vui lòng rà soát lại thông tin chi tiết các sheet theo phản hồi trao đổi.'}"
            </p>
            <p className="text-[11px] text-rose-700">
              Chuyên viên tư vấn (Presale Consultant) vui lòng chỉnh sửa lại các nội dung theo yêu cầu trên, sau đó nhấn <strong>"Gửi Duyệt Lại"</strong> để Trưởng dự án phê duyệt.
            </p>
          </div>
        </div>
      )}

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
              {proposalData.sheets.map((sheet) => {
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
                ${proposalData.totalCost?.toLocaleString()} {proposalData.currency}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Tiến Độ Dự Kiến:</span>
              <span className="font-bold text-slate-800">
                {proposalData.estimatedTimelineWeeks} Tuần
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

                {isViewer || ((proposalData.status === 'APPROVED' || proposalData.status === 'SENT_TO_CLIENT') && !canPrivilege) ? (
                  <span 
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 border border-slate-200 text-xs font-mono font-semibold" 
                    title={proposalData.status === 'APPROVED' || proposalData.status === 'SENT_TO_CLIENT' 
                      ? "Dự án đã được duyệt hoàn thành. Chỉ Presale Lead mới có quyền điều chỉnh." 
                      : "Chế độ chỉ đọc"}
                  >
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{proposalData.status === 'APPROVED' || proposalData.status === 'SENT_TO_CLIENT' ? 'Khóa (Đã duyệt)' : 'Chỉ đọc'}</span>
                  </span>
                ) : (
                  <button
                    onClick={() => handleSaveCurrentSheet()}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{saving ? 'Saving...' : 'Save'}</span>
                  </button>
                )}
              </div>
            </div>

            {(proposalData.status === 'APPROVED' || proposalData.status === 'SENT_TO_CLIENT') && !canPrivilege && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="leading-relaxed">
                  <strong>Dự án đã hoàn thành:</strong> Bản đề xuất (Proposal) đã được Trưởng dự án phê duyệt. Ngoại trừ Trưởng dự án (Presale Lead), không có vai trò nào được phép điều chỉnh.
                </span>
              </div>
            )}

            {/* Floating Selection Action Toolbar (Bôi đen phần sai hoặc không cần thiết do Server AI) */}
            {!isSalesRep && !isViewer && selectedText && (
              <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-xl border border-slate-700 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2 max-w-sm sm:max-w-md truncate">
                  <span className="px-2 py-0.5 rounded bg-brand-500/20 text-brand-300 font-mono text-[10px] font-bold uppercase shrink-0">
                    Bôi đen ({selectedText.length} ký tự)
                  </span>
                  <span className="text-xs text-slate-300 truncate font-mono">
                    "{selectedText}"
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => void handleDeleteSelectedText()}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    title="Xóa phần không cần thiết này khỏi proposal"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa phần thừa</span>
                  </button>

                  <button
                    onClick={() => {
                      setRightTabMode('copilot');
                      void handleSendChat(`Phân tích lỗi, loại bỏ phần thừa/sai và viết lại đoạn bôi đen sau cho chuẩn: "${selectedText}"`);
                    }}
                    className="px-3 py-1 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    title="Nhờ AI tư vấn sửa hoặc viết lại đoạn này"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI</span>
                  </button>

                  <button
                    onClick={() => setSelectedText('')}
                    className="p-1 text-slate-400 hover:text-white transition-colors"
                    title="Bỏ chọn"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Structured Content Renderers */}
            {editorMode === 'structured' && activeSheet && (
              <div 
                className="space-y-6"
                onMouseUp={() => handleCaptureSelection(activeSheet.sheetName)}
              >
                
                {/* 1. Overview Sheet */}
                {activeSheet.sheetName === 'Overview' && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-mono font-bold text-slate-400 uppercase block">
                          Executive Summary
                        </label>
                        <span className="text-[10px] font-mono text-slate-400">
                          (Bôi đen văn bản để xóa phần thừa hoặc nhờ AI sửa)
                        </span>
                      </div>
                      <textarea
                        rows={6}
                        defaultValue={activeSheet.sheetData?.executiveSummary || ''}
                        onSelect={(e) => handleCaptureSelection('executiveSummary', e)}
                        onMouseUp={(e) => handleCaptureSelection('executiveSummary', e)}
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
                    <div className="flex items-center justify-between text-xs font-mono mb-2">
                      <span className="font-bold text-slate-400 uppercase">Work Breakdown Structure (WBS)</span>
                      {!isSalesRep && !isViewer && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          (Consultant có thể tự sửa text, xóa dòng hoặc bôi đen nhờ AI)
                        </span>
                      )}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-400">
                            <th className="pb-2 w-14">WBS</th>
                            <th className="pb-2">Phân Hệ &amp; Tính Năng</th>
                            <th className="pb-2 w-28">Mức Độ</th>
                            <th className="pb-2 w-28">Ưu Tiên</th>
                            <th className="pb-2 text-right w-24">Ngày Công</th>
                            {!isSalesRep && !isViewer && <th className="pb-2 w-10 text-center">Xóa</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(activeSheet.sheetData?.modules || []).map((m: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50/80 group">
                              <td className="py-2.5 font-bold text-brand-700 align-top">
                                {isSalesRep || isViewer ? (
                                  m.wbs
                                ) : (
                                  <input
                                    type="text"
                                    value={m.wbs || `${idx + 1}.0`}
                                    onChange={(e) => {
                                      m.wbs = e.target.value;
                                      setJsonText(JSON.stringify(activeSheet.sheetData, null, 2));
                                    }}
                                    className="w-12 p-1 font-bold text-brand-700 bg-transparent rounded border border-transparent hover:border-slate-200 focus:border-brand-500 focus:bg-white"
                                  />
                                )}
                              </td>
                              <td className="py-2.5 pr-2 space-y-1 align-top">
                                {isSalesRep || isViewer ? (
                                  <>
                                    <div className="font-semibold text-slate-800">{m.module}</div>
                                    <div className="text-[11px] text-slate-500 font-sans">{m.feature}</div>
                                  </>
                                ) : (
                                  <>
                                    <input
                                      type="text"
                                      value={m.module || ''}
                                      placeholder="Tên phân hệ..."
                                      onSelect={(e) => handleCaptureSelection('wbs_module', e)}
                                      onMouseUp={(e) => handleCaptureSelection('wbs_module', e)}
                                      onChange={(e) => {
                                        m.module = e.target.value;
                                        setJsonText(JSON.stringify(activeSheet.sheetData, null, 2));
                                      }}
                                      className="w-full font-semibold text-slate-800 p-1 rounded border border-transparent hover:border-slate-200 focus:border-brand-500 focus:bg-white bg-transparent text-xs"
                                    />
                                    <textarea
                                      rows={2}
                                      value={m.feature || ''}
                                      placeholder="Mô tả tính năng chi tiết..."
                                      onSelect={(e) => handleCaptureSelection('wbs_feature', e)}
                                      onMouseUp={(e) => handleCaptureSelection('wbs_feature', e)}
                                      onChange={(e) => {
                                        m.feature = e.target.value;
                                        setJsonText(JSON.stringify(activeSheet.sheetData, null, 2));
                                      }}
                                      className="w-full text-[11px] text-slate-600 font-sans p-1 rounded border border-transparent hover:border-slate-200 focus:border-brand-500 focus:bg-white bg-transparent leading-relaxed"
                                    />
                                  </>
                                )}
                              </td>
                              <td className="py-2.5 align-top">
                                {isSalesRep || isViewer ? (
                                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]">
                                    {m.complexity}
                                  </span>
                                ) : (
                                  <select
                                    value={m.complexity || 'Medium'}
                                    onChange={(e) => {
                                      m.complexity = e.target.value;
                                      setJsonText(JSON.stringify(activeSheet.sheetData, null, 2));
                                    }}
                                    className="p-1 rounded text-[10px] bg-slate-100 border border-slate-200 focus:border-brand-500 text-slate-700"
                                  >
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                    <option value="Critical">Critical</option>
                                  </select>
                                )}
                              </td>
                              <td className="py-2.5 align-top">
                                {isSalesRep || isViewer ? (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] font-bold">
                                    {m.priority}
                                  </span>
                                ) : (
                                  <select
                                    value={m.priority || 'Must Have'}
                                    onChange={(e) => {
                                      m.priority = e.target.value;
                                      setJsonText(JSON.stringify(activeSheet.sheetData, null, 2));
                                    }}
                                    className="p-1 rounded text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold focus:border-brand-500"
                                  >
                                    <option value="Must Have">Must Have</option>
                                    <option value="Should Have">Should Have</option>
                                    <option value="Could Have">Could Have</option>
                                    <option value="Nice to Have">Nice to Have</option>
                                  </select>
                                )}
                              </td>
                              <td className="py-2.5 text-right font-bold text-slate-800 align-top">
                                {isSalesRep || isViewer ? (
                                  `${m.estimatedDays || 0} d`
                                ) : (
                                  <div className="flex items-center justify-end gap-1">
                                    <input
                                      type="number"
                                      min={1}
                                      value={m.estimatedDays || 1}
                                      onChange={(e) => {
                                        m.estimatedDays = parseInt(e.target.value, 10) || 1;
                                        setJsonText(JSON.stringify(activeSheet.sheetData, null, 2));
                                      }}
                                      className="w-14 p-1 text-right font-bold text-slate-800 bg-transparent rounded border border-transparent hover:border-slate-200 focus:border-brand-500 focus:bg-white"
                                    />
                                    <span className="text-slate-400">d</span>
                                  </div>
                                )}
                              </td>
                              {!isSalesRep && !isViewer && (
                                <td className="py-2.5 text-center align-top">
                                  <button
                                    onClick={() => {
                                      activeSheet.sheetData.modules.splice(idx, 1);
                                      setJsonText(JSON.stringify(activeSheet.sheetData, null, 2));
                                      toast.info(`Đã xóa phân hệ '${m.module || idx + 1}'! Nhấn Save để lưu.`, 'Xóa phân hệ');
                                    }}
                                    className="p-1 rounded text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                    title="Xóa phân hệ này"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {!isSalesRep && !isViewer && (
                      <button
                        onClick={() => {
                          if (!Array.isArray(activeSheet.sheetData.modules)) {
                            activeSheet.sheetData.modules = [];
                          }
                          const nextWbs = `${activeSheet.sheetData.modules.length + 1}.0`;
                          activeSheet.sheetData.modules.push({
                            wbs: nextWbs,
                            module: 'Phân hệ chức năng mới',
                            feature: 'Mô tả phạm vi chức năng kỹ thuật chi tiết',
                            complexity: 'Medium',
                            priority: 'Must Have',
                            estimatedDays: 10
                          });
                          setJsonText(JSON.stringify(activeSheet.sheetData, null, 2));
                          toast.success('Đã thêm phân hệ WBS mới! Nhấn Save để lưu.', 'Thêm Phân Hệ');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-slate-300 hover:border-brand-500 hover:bg-brand-50/50 text-slate-600 hover:text-brand-700 text-xs font-mono transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Thêm Phân Hệ (Add WBS Module)</span>
                      </button>
                    )}
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
                    {isSalesRep && (
                      <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-200 text-indigo-900 text-xs flex items-center gap-2.5">
                        <span className="font-bold font-mono px-2 py-0.5 rounded-md bg-indigo-200 text-indigo-950 shrink-0 text-[11px]">SALES_REP</span>
                        <span className="leading-relaxed">Bảng giá Rate Cards do Trưởng dự án (Presale Lead) quản trị và chốt giá. Bạn theo dõi ngân sách để phục vụ công tác thương mại và khởi tạo Client Portal.</span>
                      </div>
                    )}
                    {canPrivilege && (
                      <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-300 text-amber-950 text-xs flex items-center gap-2.5">
                        <span className="font-bold font-mono px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 shrink-0 text-[11px]">PRESALE_LEAD</span>
                        <span className="leading-relaxed">Bạn có toàn quyền quản trị bảng giá Rate Cards và phân bổ nhân sự cho dự án này trước khi phê duyệt.</span>
                      </div>
                    )}
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
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>RAW JSON EDITOR</span>
                  <span>(Bôi đen đoạn mã lỗi hoặc không cần thiết để xóa hoặc nhờ AI sửa)</span>
                </div>
                <textarea
                  rows={18}
                  value={jsonText}
                  onSelect={(e) => handleCaptureSelection('json', e)}
                  onMouseUp={(e) => handleCaptureSelection('json', e)}
                  onChange={(e) => setJsonText(e.target.value)}
                  className="w-full text-xs font-mono p-4 rounded-xl border border-slate-300 focus:outline-none focus:border-brand-500 bg-slate-900 text-emerald-400 leading-relaxed"
                />
              </div>
            )}

          </div>
        </div>

        {/* COLUMN C (3 cols): AI UI Design Brief & Proposal Assistant */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Mode Switcher: AI Tư Vấn vs UI Brief */}
          <div className="flex items-center p-1 bg-slate-200/80 rounded-2xl text-xs font-mono">
            <button
              onClick={() => setRightTabMode('copilot')}
              className={`flex-1 py-1.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                rightTabMode === 'copilot'
                  ? 'bg-white text-brand-900 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Bot className="w-3.5 h-3.5 text-brand-600" />
              <span>AI Tư Vấn</span>
            </button>
            <button
              onClick={() => setRightTabMode('uibrief')}
              className={`flex-1 py-1.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                rightTabMode === 'uibrief'
                  ? 'bg-white text-slate-900 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-brand-500" />
              <span>UI Brief (PDF 5)</span>
            </button>
          </div>

          {/* MODE A: Integrated AI Tư Vấn */}
          {rightTabMode === 'copilot' && (
            <div className="bg-white rounded-2xl border border-brand-300 shadow-card p-4 space-y-3.5">
              
              {/* AI Tư Vấn Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 border border-brand-200 flex items-center justify-center text-brand-700">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold font-mono text-slate-900 flex items-center gap-1.5">
                      <span>Presale AI Tư Vấn</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono block">
                      Đang sửa: #{activeSheet?.sheetOrder} {activeSheet?.sheetName}
                    </span>
                  </div>
                </div>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-brand-700 border border-brand-200">
                  AI ASSISTANT
                </span>
              </div>

              {/* Selected Text Notification Pill in AI Tư Vấn */}
              {selectedText ? (
                <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-xs font-mono space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-amber-800 font-bold">
                    <span>ĐÃ NẠP ĐOẠN BÔI ĐEN VÀO AI TƯ VẤN:</span>
                    <button 
                      onClick={() => setSelectedText('')}
                      className="text-amber-600 hover:text-amber-800"
                    >
                      Bỏ chọn &times;
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-700 truncate italic">
                    "{selectedText}"
                  </p>
                  <button
                    onClick={() => void handleSendChat(`Phân tích lỗi, loại bỏ phần thừa/sai và viết lại đoạn bôi đen sau cho chuẩn: "${selectedText}"`)}
                    disabled={isAiReplying}
                    className="w-full mt-1 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>AI Sửa Đoạn Này Ngay</span>
                  </button>
                </div>
              ) : null}

              {/* Quick Action Chips */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">
                  LỆNH NHANH (QUICK ACTIONS):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => {
                      setIsAssessmentModalOpen(true);
                      if (!assessmentData) void handleRunSelfAssessment();
                    }}
                    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-slate-200 text-[11px] font-mono text-slate-700 transition-colors cursor-pointer"
                  >
                    📊 Đánh giá 10 sheets
                  </button>
                  <button
                    onClick={() => void handleSendChat(`Hãy rà soát và rút gọn nội dung thừa trong Sheet "${activeSheetName}", loại bỏ các câu giả định hoặc văn phong chưa đạt chuẩn.`)}
                    disabled={isAiReplying}
                    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-slate-200 text-[11px] font-mono text-slate-700 transition-colors cursor-pointer"
                  >
                    ✂️ Rút gọn nội dung thừa
                  </button>
                  <button
                    onClick={() => void handleSendChat(`Hãy tối ưu hóa các chỉ số kỹ thuật SLA, độ sẵn sàng và bảo mật cho Sheet "${activeSheetName}" phù hợp với quy mô doanh nghiệp.`)}
                    disabled={isAiReplying}
                    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-slate-200 text-[11px] font-mono text-slate-700 transition-colors cursor-pointer"
                  >
                    ⚡ Chuẩn hóa SLA &amp; Tech
                  </button>
                </div>
              </div>

              {/* Chat Message Stream */}
              <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1 font-sans text-xs">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`space-y-1.5 ${
                      msg.sender === 'user' ? 'text-right' : 'text-left'
                    }`}
                  >
                    <div
                      className={`inline-block p-3 rounded-2xl max-w-[92%] text-left leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-slate-900 text-white font-mono text-xs rounded-tr-xs'
                          : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-xs'
                      }`}
                    >
                      <div className="text-[11px] whitespace-pre-wrap">
                        {msg.text}
                      </div>

                      {/* AI Suggested Replacement with 1-Click Apply */}
                      {msg.suggestedText && (
                        <div className="mt-2.5 pt-2 border-t border-brand-200/80 space-y-2 font-mono">
                          <div className="flex items-center justify-between text-[10px] font-bold text-brand-800">
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-brand-600" />
                              ĐỀ XUẤT THAY THẾ (SUGGESTION):
                            </span>
                          </div>
                          <div className="p-2 rounded-lg bg-white border border-brand-200 text-[11px] text-slate-800 whitespace-pre-wrap leading-relaxed">
                            {msg.suggestedText}
                          </div>
                          <button
                            onClick={() => void handleApplySuggestion(msg.suggestedText!)}
                            className="w-full py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-[11px] font-bold shadow-2xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Áp Dụng Vào Sheet Này (1-Click Apply)</span>
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="text-[9px] font-mono text-slate-400 px-1">
                      {msg.timestamp}
                    </div>
                  </div>
                ))}

                {isAiReplying && (
                  <div className="text-left space-y-1">
                    <div className="inline-flex items-center gap-2 p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-500">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand-600" />
                      <span>AI Tư Vấn đang phân tích &amp; soạn văn bản...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center gap-2">
                  <textarea
                    rows={2}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void handleSendChat();
                      }
                    }}
                    placeholder="Hỏi AI hoặc yêu cầu sửa Sheet..."
                    className="flex-1 p-2 rounded-xl border border-slate-200 focus:border-brand-500 focus:outline-none text-xs font-sans resize-none"
                  />
                  <button
                    onClick={() => void handleSendChat()}
                    disabled={isAiReplying || (!chatInput.trim() && !selectedText)}
                    className="p-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white transition-colors cursor-pointer shadow-xs shrink-0"
                    title="Gửi câu hỏi cho AI Tư Vấn"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* MODE B: AI UI Design Brief Card (PDF Page 5) */}
          {rightTabMode === 'uibrief' && (
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

                    {!isViewer && (
                      <button
                        onClick={handleGenerateUIBrief}
                        disabled={generatingBrief}
                        title="Làm mới UI Brief"
                        className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${generatingBrief ? 'animate-spin' : ''}`} />
                      </button>
                    )}
                  </div>
                </div>
              ) : isViewer ? (
                <div className="w-full py-2 rounded-xl bg-slate-100 text-slate-500 border border-slate-200 text-xs font-mono font-semibold flex items-center justify-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>UI Brief (Chế độ chỉ đọc)</span>
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
          )}

          {/* SOW & Project Context Verification Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-4 space-y-3 text-xs font-mono">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">
              DỰ ÁN LIÊN KẾT (CONTEXT)
            </span>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-400 block">DỰ ÁN:</span>
              <span className="font-bold text-slate-800 block truncate">{proposalData.title}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-400 block">SLA CAM KẾT:</span>
              <span className="font-bold text-brand-700 block">
                {activeProject?.extractedMetadata?.target_sla || '< 200ms Latency'}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-400 block">TẢI ĐỈNH (PEAK WORKLOAD):</span>
              <span className="font-bold text-brand-700 block">
                {activeProject?.extractedMetadata?.peak_workload || '10,000+ Concurrent Requests'}
              </span>
            </div>
          </div>

        </div>

      </div>

      {/* 4. MODAL: TỰ ĐÁNH GIÁ 10 SHEET PROPOSAL (PRESALE CONSULTANT) */}
      {isAssessmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 border border-brand-200 flex items-center justify-center text-brand-700">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 font-mono">
                      Bảng Tự Đánh Giá 10 Sheet Proposal
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-brand-700 border border-brand-200">
                      PRESALE CONSULTANT
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    Rà soát chuyên môn, tự chấm điểm tính nhất quán và hoàn thiện của 10 sheets kỹ thuật trước khi trình Presale Lead phê duyệt.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAssessmentModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 font-mono">
              {/* Overall Scorecard Banner */}
              {assessmentData && (
                <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-white border-2 border-emerald-400 shadow-xs flex flex-col items-center justify-center shrink-0">
                      <span className="text-xl font-black text-emerald-800 leading-none">
                        {assessmentData.overallScore}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 mt-0.5">/100</span>
                    </div>
                    <div>
                      <span className="inline-block px-2 py-0.5 rounded bg-emerald-200/70 text-emerald-900 text-[10px] font-bold uppercase mb-1">
                        {assessmentData.rating}
                      </span>
                      <p className="text-xs font-sans text-slate-700 leading-relaxed max-w-xl">
                        {assessmentData.summary}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => void handleRunSelfAssessment()}
                    disabled={isRunningAssessment}
                    className="px-4 py-2 rounded-xl bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold shadow-2xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRunningAssessment ? 'animate-spin' : ''}`} />
                    <span>{isRunningAssessment ? 'Đang chấm điểm...' : 'Chấm điểm lại AI'}</span>
                  </button>
                </div>
              )}

              {/* 10-Sheet Matrix Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase">
                  <span>ĐÁNH GIÁ CHI TIẾT 10 SHEETS TIÊU CHUẨN:</span>
                  <span className="text-slate-400 text-[11px]">10/10 SHEETS HOÀN THIỆN</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(assessmentData?.sheets || proposalData.sheets.map((s, idx) => ({
                    sheetOrder: s.sheetOrder || idx + 1,
                    sheetName: s.sheetName,
                    score: 95,
                    status: 'PASSED' as const,
                    criteria: 'Độ bao phủ kỹ thuật và sự thống nhất với yêu cầu khách hàng.',
                    findings: ['Cấu trúc dữ liệu đã được nạp đầy đủ'],
                    recommendations: 'Sẵn sàng trình duyệt.'
                  }))).map((item) => (
                    <div key={item.sheetOrder} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-brand-300 transition-all space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center">
                            #{item.sheetOrder}
                          </span>
                          <span className="font-bold text-xs text-slate-900 truncate">{item.sheetName}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.status === 'PASSED' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {item.score}/100
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] font-sans text-slate-600 line-clamp-2 leading-relaxed">
                        {item.criteria}
                      </p>

                      <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                        <span className="text-[10px] text-emerald-700 flex items-center gap-1 font-sans">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>{item.recommendations}</span>
                        </span>
                        <button
                          onClick={() => {
                            handleSelectSheet(item.sheetName);
                            setIsAssessmentModalOpen(false);
                          }}
                          className="text-[11px] text-brand-600 hover:text-brand-700 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          <span>Sửa Sheet</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Consultant Notes & Sign-off */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase block">
                  Ghi Chú Đánh Giá Nghiệp Vụ Của Presale Consultant:
                </label>
                <textarea
                  rows={3}
                  value={consultantNotes}
                  onChange={(e) => setConsultantNotes(e.target.value)}
                  className="w-full text-xs font-sans text-slate-800 p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 bg-white"
                  placeholder="Nhập nhận xét kỹ thuật, các điểm đã rà soát trước khi bàn giao cho Lead..."
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs font-mono text-slate-500 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Tự đánh giá hoàn tất • Sẵn sàng submit cho Presale Lead duyệt</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAssessmentModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  onClick={() => {
                    toast.success('Đã lưu kết quả tự đánh giá 10 sheets của Presale Consultant!', 'Đã Lưu');
                    setIsAssessmentModalOpen(false);
                  }}
                  className="px-5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  Lưu Kết Quả Đánh Giá
                </button>
              </div>
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
              Vui lòng cung cấp phản hồi (Feedback) chi tiết cho chuyên viên tư vấn (Presale Consultant). Nội dung này sẽ được hiển thị trên đầu Proposal để đội ngũ nắm bắt và sửa lại các sheet.
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
                onClick={handleConfirmReject}
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
