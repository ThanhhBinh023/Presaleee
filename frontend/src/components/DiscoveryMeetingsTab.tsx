import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Plus, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  Video, 
  ArrowRight, 
  FileText, 
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { 
  Meeting, 
  MeetingStatus, 
  MeetingSourceTool 
} from '../services/meetingService';
import { 
  fetchMeetingsByLead, 
  createMeeting, 
  inspectMeeting, 
  updateMeetingLifecycle, 
  updateMeeting 
} from '../services/meetingService';
import type { LeadItem } from '../services/leadService';
import { fetchLeads } from '../services/leadService';

const SAMPLE_ZOOM_TRANSCRIPT = `[00:01] Alex (Solution Architect): Um, hi Marcus. Thanks for joining the Zoom call today. So, uh, we received your RFP regarding the EcoMart 85 stores POS modernization.
[00:15] Marcus (EcoMart VP Operations): Hey Alex. Yeah, like, our biggest headache right now is network drops. Every time the internet fluctuates, our cashiers are stuck, lines get long, and customers complain. We absolutely need the POS to work offline and print thermal receipts without any lag.
[00:45] Alex: Understood. Offline-first with local SQLite caching and background reconciliation. What about the central inventory sync?
[00:58] Marcus: Right now our central ERP is SAP S/4HANA on AWS. We need the inventory delta to sync within 2 seconds once network is back. Also, regarding payments, we must support VNPay, MoMo QR, and mPOS card terminals. PCI-DSS compliance is mandatory because our bank audit is in October.
[01:30] Alex: Got it. Who on your side handles the SAP integration APIs?
[01:40] Marcus: That would be David Tran, our Lead SAP Architect. He can provide the OpenAPI specs by next Tuesday. Let's schedule a deep dive with David next week.`;

export const DiscoveryMeetingsTab: React.FC = () => {
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [isInspecting, setIsInspecting] = useState<boolean>(false);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  
  // Modal for new meeting
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newSourceTool, setNewSourceTool] = useState<MeetingSourceTool>('ZOOM');
  const [newTranscript, setNewTranscript] = useState<string>('');
  const [showTranscriptDetails, setShowTranscriptDetails] = useState<boolean>(false);

  // 1. Initial Load: Fetch Leads
  useEffect(() => {
    async function loadInitial() {
      try {
        setLoading(true);
        const leadList = await fetchLeads();
        setLeads(leadList);
        if (leadList.length > 0) {
          setSelectedLeadId(leadList[0].id);
        }
      } catch (err) {
        console.error('Failed to load leads:', err);
      } finally {
        setLoading(false);
      }
    }
    loadInitial();
  }, []);

  // 2. Load Meetings whenever selectedLeadId changes
  useEffect(() => {
    if (!selectedLeadId) return;
    loadMeetings(selectedLeadId);
  }, [selectedLeadId]);

  async function loadMeetings(leadId: string) {
    try {
      setLoading(true);
      const meetingList = await fetchMeetingsByLead(leadId);
      setMeetings(meetingList);
      if (meetingList.length > 0) {
        setSelectedMeetingId(prev => {
          if (prev && meetingList.some(m => m.id === prev)) return prev;
          return meetingList[meetingList.length - 1].id;
        });
      } else {
        setSelectedMeetingId(null);
      }
    } catch (err) {
      console.error('Failed to fetch meetings for lead:', err);
    } finally {
      setLoading(false);
    }
  }

  const selectedMeeting = meetings.find(m => m.id === selectedMeetingId) || meetings[0] || null;

  // Find previous meeting for inheritance info
  const previousMeeting = selectedMeeting 
    ? meetings.filter(m => m.meetingOrder < selectedMeeting.meetingOrder).pop() 
    : (meetings.length > 0 ? meetings[meetings.length - 1] : null);

  // Handle Lifecycle Transitions
  async function handleLifecycleChange(newStatus: MeetingStatus) {
    if (!selectedMeeting) return;
    try {
      setIsTransitioning(true);
      const updated = await updateMeetingLifecycle(selectedMeeting.id, newStatus);
      setMeetings(prev => prev.map(m => m.id === updated.id ? updated : m));
    } catch (err: any) {
      alert(`Lifecycle update failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsTransitioning(false);
    }
  }

  // Handle AI Inspection
  async function handleRunAIInspect() {
    if (!selectedMeeting) return;
    try {
      setIsInspecting(true);
      const updated = await inspectMeeting(selectedMeeting.id, selectedMeeting.rawTranscript);
      setMeetings(prev => prev.map(m => m.id === updated.id ? updated : m));
    } catch (err: any) {
      alert(`AI Inspect failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsInspecting(false);
    }
  }

  // Handle New Meeting Creation
  async function handleCreateMeeting(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedLeadId) {
      alert('Please select or create a Lead first.');
      return;
    }

    try {
      const order = meetings.length + 1;
      const titleToUse = newTitle.trim() || `Meeting #${order}: Technical Deep Dive`;
      const created = await createMeeting({
        leadId: selectedLeadId,
        title: titleToUse,
        sourceTool: newSourceTool,
        rawTranscript: newTranscript.trim()
      });

      setMeetings(prev => [...prev, created]);
      setSelectedMeetingId(created.id);
      setShowCreateModal(false);
      setNewTitle('');
      setNewTranscript('');
    } catch (err: any) {
      alert(`Create Meeting failed: ${err.message || 'Unknown error'}`);
    }
  }

  // Pre-fill next meeting based on suggested follow-up questions
  function openScheduleFollowupModal() {
    const nextOrder = (selectedMeeting?.meetingOrder || meetings.length) + 1;
    setNewTitle(`Meeting #${nextOrder}: Follow-up on Architecture & ERP Integration`);
    setNewSourceTool(selectedMeeting?.sourceTool || 'ZOOM');
    setNewTranscript('');
    setShowCreateModal(true);
  }

  // Toggle Action Item completion
  async function handleToggleActionItem(index: number) {
    if (!selectedMeeting || !selectedMeeting.actionItems) return;
    const updatedItems = [...selectedMeeting.actionItems];
    updatedItems[index] = {
      ...updatedItems[index],
      completed: !updatedItems[index].completed
    };

    try {
      const updated = await updateMeeting(selectedMeeting.id, {
        actionItems: updatedItems
      });
      setMeetings(prev => prev.map(m => m.id === updated.id ? updated : m));
    } catch (err: any) {
      console.error('Failed to toggle action item:', err);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-6">
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">
                Discovery Meeting Management
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Iterative Discovery
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Recorded transcripts from 3rd-party software (Zoom, Teams, Meet). AI accumulates context to generate sharp follow-up questions for subsequent meetings.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Lead Selector */}
            {leads.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs font-mono">
                <span className="text-slate-400">Lead:</span>
                <select
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-800 font-sans text-xs focus:outline-none focus:border-brand-500"
                >
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.title.length > 35 ? l.title.substring(0, 35) + '...' : l.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button 
              onClick={() => {
                const nextOrder = meetings.length + 1;
                setNewTitle(`Meeting #${nextOrder}: Solution Architecture Discovery`);
                setNewSourceTool('ZOOM');
                setNewTranscript(SAMPLE_ZOOM_TRANSCRIPT);
                setShowCreateModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Discovery Meeting</span>
            </button>
          </div>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Meeting List & Timeline */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-400 uppercase">
              <span>LỊCH SỬ DISCOVERY SESSIONS:</span>
              <span>{meetings.length} SESSIONS</span>
            </div>

            {loading && meetings.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 font-mono animate-pulse">
                Loading Discovery Meetings...
              </div>
            ) : meetings.length === 0 ? (
              <div className="p-6 rounded-2xl border border-dashed border-slate-200 text-center space-y-3 bg-slate-50/50">
                <Video className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500">Chưa có cuộc họp nào cho Lead này.</p>
                <button
                  onClick={() => {
                    setNewTitle('Meeting #1: Initial Business & Architecture Scope');
                    setNewTranscript(SAMPLE_ZOOM_TRANSCRIPT);
                    setShowCreateModal(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-semibold"
                >
                  + Khởi tạo Meeting #1
                </button>
              </div>
            ) : (
              meetings.map((m) => {
                const isSelected = selectedMeeting?.id === m.id;
                const statusStyles: Record<MeetingStatus, { bg: string; text: string; border: string }> = {
                  OPEN: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
                  LOCKED: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
                  INSPECTED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
                  REOPENED: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' }
                };
                const style = statusStyles[m.status] || statusStyles.OPEN;

                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMeetingId(m.id)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-emerald-50/70 border-brand-300 shadow-xs ring-1 ring-brand-300'
                        : 'bg-slate-50/70 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900 font-mono mb-1.5">
                      <span className="truncate pr-2">{m.title}</span>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">#{m.meetingOrder}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Video className="w-3 h-3 text-slate-400" />
                        {m.sourceTool}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${style.bg} ${style.text} ${style.border}`}>
                        {m.status}
                      </span>
                    </div>

                    {m.suggestedFollowupQuestions && m.suggestedFollowupQuestions.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center gap-1 text-[10px] font-mono text-brand-700">
                        <Sparkles className="w-3 h-3" />
                        <span>{m.suggestedFollowupQuestions.length} câu hỏi gợi ý cho meeting sau</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Carry forward alert for iterative depth */}
            <div className="p-3.5 rounded-2xl bg-slate-100/70 border border-slate-200 text-slate-600 text-xs font-mono space-y-1">
              <div className="font-bold text-slate-700 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-brand-600" />
                <span>Iterative Context Pipeline</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-500">
                Mỗi buổi Discovery sẽ kế thừa câu hỏi gợi ý từ buổi trước đó, giúp Presale Consultant khai thác sâu hơn và giải quyết các thông tin còn thiếu.
              </p>
            </div>
          </div>

          {/* Right Column: Selected Meeting Deep Dive & AI Inspect */}
          {selectedMeeting ? (
            <div className="lg:col-span-8 p-5 sm:p-6 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-6">
              
              {/* Meeting Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 font-mono">
                      Meeting #{selectedMeeting.meetingOrder}: {selectedMeeting.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-slate-500">
                    <span>Source: <strong>{selectedMeeting.sourceTool}</strong></span>
                    <span>•</span>
                    <span>{new Date(selectedMeeting.meetingDate).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${
                    selectedMeeting.status === 'INSPECTED' 
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : selectedMeeting.status === 'LOCKED'
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-blue-100 text-blue-800 border-blue-300'
                  }`}>
                    Status: {selectedMeeting.status}
                  </span>
                </div>
              </div>

              {/* Discussion Topics inherited from previous session */}
              {selectedMeeting.discussionTopics && selectedMeeting.discussionTopics.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/80 space-y-2">
                  <div className="text-xs font-bold text-amber-900 font-mono flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>CHỦ ĐỀ &amp; CÂU HỎI KẾ THỪA TỪ BUỔI TRƯỚC ĐÓ:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-xs text-amber-950 font-mono">
                    {selectedMeeting.discussionTopics.map((topic, i) => (
                      <li key={i} className="leading-relaxed">{topic}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Raw Transcript Section */}
              <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono font-bold text-slate-800 flex items-center gap-1.5">
                    <Video className="w-4 h-4 text-brand-600" />
                    <span>RAW TRANSCRIPT ({selectedMeeting.sourceTool})</span>
                  </div>
                  <button
                    onClick={() => setShowTranscriptDetails(!showTranscriptDetails)}
                    className="text-xs text-brand-600 font-mono hover:underline flex items-center gap-1"
                  >
                    <span>{showTranscriptDetails ? 'Collapse' : 'Expand'}</span>
                    {showTranscriptDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className={`font-mono text-xs text-slate-700 leading-relaxed overflow-y-auto whitespace-pre-wrap ${
                  showTranscriptDetails ? 'max-h-96' : 'max-h-24'
                } bg-slate-50 p-3 rounded-lg border border-slate-100`}>
                  {selectedMeeting.rawTranscript || '(No transcript provided)'}
                </div>
              </div>

              {/* AI INSPECTION OUTPUT */}
              {selectedMeeting.status === 'INSPECTED' || selectedMeeting.cleanNotes ? (
                <div className="space-y-5">
                  
                  {/* Clean Notes */}
                  {selectedMeeting.cleanNotes && (
                    <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
                      <div className="text-xs font-mono font-bold text-brand-700 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-brand-600" />
                        <span>EXECUTIVE CLEAN NOTES (Loại bỏ từ thừa, chuẩn hóa nội dung):</span>
                      </div>
                      <div className="text-xs sm:text-sm font-sans text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {selectedMeeting.cleanNotes}
                      </div>
                    </div>
                  )}

                  {/* Key Discussion Points & Clarified Requirements */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Key Discussion Points */}
                    <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
                      <div className="text-xs font-mono font-bold text-slate-800">
                        KEY DISCUSSION POINTS:
                      </div>
                      <ul className="space-y-1.5 text-xs text-slate-600 font-mono">
                        {selectedMeeting.keyDiscussionPoints?.map((pt, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-brand-500 font-bold">•</span>
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Clarified Requirements */}
                    <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
                      <div className="text-xs font-mono font-bold text-slate-800">
                        CLARIFIED REQUIREMENTS:
                      </div>
                      <ul className="space-y-1.5 text-xs text-slate-600 font-mono">
                        {selectedMeeting.clarifiedRequirements?.map((cr, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{cr}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Action Items & Ownership */}
                  {selectedMeeting.actionItems && selectedMeeting.actionItems.length > 0 && (
                    <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
                      <div className="text-xs font-mono font-bold text-slate-800 flex items-center justify-between">
                        <span>ACTION ITEMS &amp; OWNERSHIP:</span>
                        <span className="text-[11px] text-slate-400">Click để toggle hoàn thành</span>
                      </div>
                      <div className="space-y-2">
                        {selectedMeeting.actionItems.map((item, idx) => (
                          <div 
                            key={idx}
                            onClick={() => handleToggleActionItem(idx)}
                            className={`p-2.5 rounded-lg border text-xs font-mono cursor-pointer flex items-center justify-between transition-colors ${
                              item.completed ? 'bg-slate-50 border-slate-200 text-slate-400 line-through' : 'bg-white border-slate-200 hover:border-brand-300'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input 
                                type="checkbox" 
                                checked={!!item.completed} 
                                onChange={() => {}} 
                                className="rounded text-brand-600 cursor-pointer"
                              />
                              <span>{item.task}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] shrink-0 font-sans">
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                                {item.assignee}
                              </span>
                              {item.deadline && (
                                <span className="text-slate-400">
                                  Hạn: {item.deadline}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ⭐ CRITICAL FEATURE: SUGGESTED FOLLOW-UP QUESTIONS & DISCUSSION TOPICS FOR SUBSEQUENT MEETINGS */}
                  {selectedMeeting.suggestedFollowupQuestions && selectedMeeting.suggestedFollowupQuestions.length > 0 && (
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50/90 to-teal-50/70 border-2 border-emerald-300/80 space-y-4 shadow-xs">
                      
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-emerald-600" />
                          <h4 className="text-xs sm:text-sm font-bold font-mono text-emerald-950">
                            CÂU HỎI GỢI Ý CHO CÁC CUỘC HỌP TIẾP THEO (AI SUGGESTED FOLLOW-UP)
                          </h4>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-200/70 text-emerald-900 font-bold uppercase tracking-wide">
                          Kế thừa vào Meeting #{selectedMeeting.meetingOrder + 1}
                        </span>
                      </div>

                      <p className="text-xs text-emerald-800 leading-relaxed">
                        Từ transcript và các thông tin đã thống nhất ở meeting này, AI phát hiện các khoảng trống và đề xuất danh sách câu hỏi sắc bén để đào sâu trong phiên làm việc tiếp theo:
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                        {selectedMeeting.suggestedFollowupQuestions.map((q, idx) => (
                          <div key={idx} className="p-3.5 bg-white rounded-xl border border-emerald-200 shadow-2xs space-y-1">
                            <span className="font-bold text-emerald-900 block">Q{idx + 1}. Follow-up Discovery:</span>
                            <span className="text-slate-700 leading-relaxed block">{q}</span>
                          </div>
                        ))}
                      </div>

                      {/* Quick action: Propagate into next meeting */}
                      <div className="pt-2 flex justify-end">
                        <button
                          onClick={openScheduleFollowupModal}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold font-mono shadow-xs transition-colors"
                        >
                          <span>Tạo Meeting #{selectedMeeting.meetingOrder + 1} Kế Thừa Câu Hỏi Này</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>

                    </div>
                  )}

                </div>
              ) : (
                <div className="p-8 rounded-xl border border-dashed border-slate-200 text-center space-y-3 bg-white">
                  <Sparkles className="w-8 h-8 text-brand-400 mx-auto" />
                  <div className="text-xs font-mono text-slate-600">
                    Cuộc họp này chưa được chạy AI Inspect. Nhấn nút bên dưới để AI tự động lọc từ thừa, phân tích Action Items và sinh câu hỏi cho các buổi họp sau.
                  </div>
                </div>
              )}

              {/* Meeting Lifecycle Controls Bar */}
              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 font-mono text-slate-500">
                  <span>Lifecycle Management:</span>
                  <span className="text-slate-700 font-bold">{selectedMeeting.status}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {selectedMeeting.status === 'OPEN' && (
                    <button
                      onClick={() => handleLifecycleChange('LOCKED')}
                      disabled={isTransitioning}
                      className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 font-mono text-slate-700 flex items-center gap-1.5"
                    >
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Lock Meeting</span>
                    </button>
                  )}

                  {selectedMeeting.status === 'LOCKED' && (
                    <button
                      onClick={() => handleLifecycleChange('OPEN')}
                      disabled={isTransitioning}
                      className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 font-mono text-slate-700 flex items-center gap-1.5"
                    >
                      <Unlock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Reopen Meeting</span>
                    </button>
                  )}

                  {selectedMeeting.status === 'INSPECTED' && (
                    <button
                      onClick={() => handleLifecycleChange('REOPENED')}
                      disabled={isTransitioning}
                      className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 font-mono text-slate-700 flex items-center gap-1.5"
                    >
                      <Unlock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Reopen For Notes</span>
                    </button>
                  )}

                  {selectedMeeting.status === 'REOPENED' && (
                    <button
                      onClick={() => handleLifecycleChange('LOCKED')}
                      disabled={isTransitioning}
                      className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 font-mono text-slate-700 flex items-center gap-1.5"
                    >
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Re-lock Meeting</span>
                    </button>
                  )}

                  <button
                    onClick={handleRunAIInspect}
                    disabled={isInspecting}
                    className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-mono font-semibold flex items-center gap-2 shadow-xs transition-colors"
                  >
                    <Sparkles className={`w-4 h-4 ${isInspecting ? 'animate-spin' : ''}`} />
                    <span>{isInspecting ? 'AI Inspecting...' : 'Run AI Inspect'}</span>
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="lg:col-span-8 p-12 text-center text-xs text-slate-400 font-mono border border-dashed border-slate-200 rounded-2xl">
              Chọn hoặc tạo một cuộc họp Discovery để xem chi tiết.
            </div>
          )}

        </div>

      </div>

      {/* CREATE MEETING MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 font-mono flex items-center gap-2">
                <Video className="w-4 h-4 text-brand-600" />
                <span>New Discovery Meeting</span>
              </h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 font-mono text-sm"
              >
                ✕
              </button>
            </div>

            {/* Notice if inheriting follow-up questions from previous meeting */}
            {previousMeeting && previousMeeting.suggestedFollowupQuestions && previousMeeting.suggestedFollowupQuestions.length > 0 && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-mono text-emerald-950 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Kế thừa câu hỏi từ Meeting #{previousMeeting.meetingOrder}:</span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  Cuộc họp mới sẽ tự động nhận {previousMeeting.suggestedFollowupQuestions.length} câu hỏi gợi ý từ buổi trước làm chủ đề thảo luận chính.
                </p>
              </div>
            )}

            <form onSubmit={handleCreateMeeting} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  MEETING TITLE
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Meeting #2: SAP Architecture Deep Dive"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-sans text-xs focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  3RD-PARTY SOURCE TOOL
                </label>
                <select
                  value={newSourceTool}
                  onChange={(e) => setNewSourceTool(e.target.value as MeetingSourceTool)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-sans text-xs focus:outline-none focus:border-brand-500"
                >
                  <option value="ZOOM">Zoom Cloud Meeting</option>
                  <option value="GOOGLE_MEET">Google Meet</option>
                  <option value="TEAMS">Microsoft Teams</option>
                  <option value="FIREFLIES">Fireflies.ai</option>
                  <option value="OTTER">Otter.ai</option>
                  <option value="MANUAL">Manual / Recorded Session</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">
                    RAW AUDIO TRANSCRIPT (TỪ PHẦN MỀM THỨ 3)
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewTranscript(SAMPLE_ZOOM_TRANSCRIPT)}
                    className="text-[10px] text-brand-600 hover:underline"
                  >
                    Load mẫu EcoMart POS Zoom Transcript
                  </button>
                </div>
                <textarea
                  rows={6}
                  value={newTranscript}
                  onChange={(e) => setNewTranscript(e.target.value)}
                  placeholder="Dán bản ghi âm transcript từ Zoom / Meet / Teams vào đây..."
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-mono text-[11px] leading-relaxed focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold shadow-xs"
                >
                  Create &amp; Ingest Meeting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
