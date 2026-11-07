import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLeadDirectory } from '../hooks/useLeadDirectory';
import { leadService } from '../services/leadService';
import { meetingService } from '../services/meetingService';
import { ApiError } from '../services/apiClient';
import { navigateTo, readHashQuery } from '../navigation';
import { formatDateTime } from '../utils/format';
import { isMeetingAnalysis, MEETING_TRANSITIONS } from '../types/meeting';
import type { MeetingRecord, MeetingStatus } from '../types/meeting';
import type { LeadListItem } from '../types/lead';

interface MeetingsWorkspaceProps {
  onBackToOverview: () => void;
}

function statusClass(status: MeetingStatus): string {
  if (status === 'INSPECTED') return 'bg-emerald-50 text-emerald-700';
  if (status === 'LOCKED') return 'bg-amber-50 text-amber-700';
  return 'bg-sky-50 text-sky-700';
}

export const MeetingsWorkspace: React.FC<MeetingsWorkspaceProps> = ({ onBackToOverview }) => {
  const { user } = useAuth();
  const { leads } = useLeadDirectory({ page: 1, limit: 100 });

  const [leadId, setLeadId] = useState('');
  const [meetings, setMeetings] = useState<MeetingRecord[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [isListing, setIsListing] = useState(false);

  const [detail, setDetail] = useState<MeetingRecord | null>(null);
  const [transcript, setTranscript] = useState('');
  const [append, setAppend] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [attendeeName, setAttendeeName] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  const selectedLead: LeadListItem | undefined = leads.find((lead) => lead.id === leadId);

  const loadMeetings = async (id: string) => {
    setIsListing(true);
    setListError(null);
    try {
      const rows = await leadService.listMeetings(id);
      setMeetings(rows as MeetingRecord[]);
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Failed to load meetings.');
      setMeetings([]);
    } finally {
      setIsListing(false);
    }
  };

  const openMeeting = async (id: string, announce?: string) => {
    setIsWorking(true);
    setActionError(null);
    if (announce) setNotice(announce);
    try {
      const meeting = await meetingService.getById(id);
      setDetail(meeting);
      setTranscript(meeting.rawTranscript ?? '');
      setAppend(false);
      navigateTo('meetings', { leadId: meeting.leadId, id: meeting.id });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to load the meeting.');
    } finally {
      setIsWorking(false);
    }
  };

  useEffect(() => {
    const query = readHashQuery();
    const fromHashLead = query.get('leadId') ?? '';
    const fromHashMeeting = query.get('id');
    if (fromHashLead) {
      setLeadId(fromHashLead);
      void loadMeetings(fromHashLead);
    }
    if (fromHashMeeting) void openMeeting(fromHashMeeting);
    // Deep-link once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectLead = (id: string) => {
    setLeadId(id);
    setDetail(null);
    navigateTo('meetings', id ? { leadId: id } : undefined);
    if (id) void loadMeetings(id);
    else setMeetings([]);
  };

  const createMeeting = async () => {
    if (!leadId || !newTitle.trim()) return;
    setIsWorking(true);
    setActionError(null);
    try {
      const created = await leadService.createMeeting(leadId, {
        title: newTitle.trim(),
        meetingDate: newDate || undefined,
        attendees: attendeeName.trim() ? [{ name: attendeeName.trim() }] : []
      });
      setNewTitle('');
      setNewDate('');
      setAttendeeName('');
      setNotice('Meeting created in OPEN.');
      await loadMeetings(leadId);
      await openMeeting(created.id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not create the meeting.');
    } finally {
      setIsWorking(false);
    }
  };

  const saveTranscript = async () => {
    if (!detail) return;
    setIsWorking(true);
    setActionError(null);
    try {
      const updated = await meetingService.saveTranscript(detail.id, transcript, append);
      setDetail(updated);
      setTranscript(updated.rawTranscript ?? '');
      setNotice(append ? 'Transcript appended. Previous analysis was cleared.' : 'Transcript replaced. Previous analysis was cleared.');
      await loadMeetings(detail.leadId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not save the transcript.');
    } finally {
      setIsWorking(false);
    }
  };

  const changeStatus = async (status: MeetingStatus) => {
    if (!detail) return;
    setIsWorking(true);
    setActionError(null);
    try {
      const updated = await meetingService.updateStatus(detail.id, status);
      setDetail(updated);
      setNotice(`Meeting is ${updated.status}.`);
      await loadMeetings(updated.leadId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Status change failed.');
    } finally {
      setIsWorking(false);
    }
  };

  const runAnalyze = async () => {
    if (!detail) return;
    setIsWorking(true);
    setActionError(null);
    try {
      const updated = await meetingService.analyze(detail.id);
      setDetail(updated);
      setNotice('Analysis saved. Status is INSPECTED.');
      await loadMeetings(updated.leadId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Analyze failed.';
      setActionError(
        err instanceof ApiError && (err.status === 502 || err.status === 0)
          ? `${message} Start the AI service on port 8000. Guards still require a transcript and a non-missing meeting.`
          : message
      );
    } finally {
      setIsWorking(false);
    }
  };

  const analysis = detail && isMeetingAnalysis(detail.analysis) ? detail.analysis : null;
  const allowedNext = detail ? MEETING_TRANSITIONS[detail.status] : [];
  const transcriptEditable = detail?.status === 'OPEN';

  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 py-8 font-sans text-slate-900 md:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <button onClick={onBackToOverview} className="text-xs font-mono font-bold text-brand-700 hover:underline">
              &larr; OVERVIEW
            </button>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Discovery meetings</h1>
            <p className="mt-1 text-sm text-slate-500">
              Lifecycle OPEN → LOCKED / INSPECTED. Transcript edits only while OPEN. INSPECTED is set by AI analysis.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigateTo('leads')} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600">
              Leads
            </button>
            <button onClick={() => navigateTo('proposals')} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600">
              Proposals
            </button>
          </div>
        </div>

        {!user?.organizationId && (
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Your account needs an organization before meeting APIs will accept requests.
          </p>
        )}

        {notice && <p className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>}
        {actionError && <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{actionError}</p>}
        {listError && <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{listError}</p>}

        <label className="mb-4 flex max-w-xl flex-col gap-1 text-xs font-bold text-slate-600">
          Lead
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={leadId} onChange={(e) => selectLead(e.target.value)}>
            <option value="">Select a lead</option>
            {leads.map((lead) => (
              <option key={lead.id} value={lead.id}>
                {lead.title} ({lead.status})
              </option>
            ))}
          </select>
        </label>

        {leadId && (
          <div className="mb-6 grid gap-2 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-4">
            <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2" placeholder="Meeting title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            <input type="datetime-local" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
            <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Attendee name (optional)" value={attendeeName} onChange={(e) => setAttendeeName(e.target.value)} />
            <button onClick={() => void createMeeting()} disabled={isWorking || !newTitle.trim()} className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50 sm:col-span-4">
              Create OPEN meeting
            </button>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-3 py-2 text-[10px] font-mono font-bold uppercase text-slate-400">
              {selectedLead ? selectedLead.title : 'Meetings'} {isListing ? '· loading' : `· ${meetings.length}`}
            </div>
            {meetings.length === 0 ? (
              <p className="px-3 py-6 text-sm text-slate-400">No meetings for this lead.</p>
            ) : (
              <ul>
                {meetings.map((meeting) => (
                  <li key={meeting.id}>
                    <button
                      onClick={() => void openMeeting(meeting.id)}
                      className={`w-full border-t border-slate-100 px-3 py-3 text-left text-sm hover:bg-emerald-50/40 ${detail?.id === meeting.id ? 'bg-emerald-50/70' : ''}`}
                    >
                      <div className="font-bold text-slate-800">{meeting.title}</div>
                      <div className="mt-1 flex items-center justify-between font-mono text-[10px] text-slate-400">
                        <span>{formatDateTime(meeting.meetingDate)}</span>
                        <span className={`rounded px-1.5 py-0.5 font-bold ${statusClass(meeting.status)}`}>{meeting.status}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="lg:col-span-8">
            {!detail ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
                Select a lead, then a meeting. Save a transcript while OPEN, lock it, or run AI analysis to reach INSPECTED.
              </div>
            ) : (
              <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-bold">{detail.title}</h2>
                    <p className="font-mono text-[10px] text-slate-400">
                      {formatDateTime(detail.meetingDate)} · {detail.attendees.map((item) => item.name).join(', ') || 'No attendees'}
                    </p>
                  </div>
                  <span className={`rounded px-2 py-0.5 text-[10px] font-mono font-bold ${statusClass(detail.status)}`}>{detail.status}</span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {allowedNext.map((next) => (
                    <button
                      key={next}
                      disabled={isWorking}
                      onClick={() => void changeStatus(next)}
                      className="rounded border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {next === 'OPEN' ? 'Reopen' : next === 'LOCKED' ? 'Lock' : next}
                    </button>
                  ))}
                  {allowedNext.length === 0 && <span className="text-xs text-slate-400">No manual transition from this status.</span>}
                </div>

                <label className="flex flex-col gap-1 text-xs font-bold text-slate-600">
                  Transcript {transcriptEditable ? '' : '(read-only until reopened)'}
                  <textarea
                    className="min-h-[160px] rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs disabled:bg-slate-50"
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    disabled={!transcriptEditable || isWorking}
                  />
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <input type="checkbox" checked={append} onChange={(e) => setAppend(e.target.checked)} disabled={!transcriptEditable} />
                  Append instead of replace
                </label>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => void saveTranscript()} disabled={isWorking || !transcriptEditable || !transcript.trim()} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                    Save transcript
                  </button>
                  <button onClick={() => void runAnalyze()} disabled={isWorking || !detail.rawTranscript} className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                    {isWorking ? 'Working…' : 'Analyze with AI'}
                  </button>
                </div>

                {detail.cleanNotes && (
                  <div>
                    <div className="text-[10px] font-mono font-bold uppercase text-slate-400">Clean notes</div>
                    <p className="mt-1 text-sm text-slate-700">{detail.cleanNotes}</p>
                  </div>
                )}

                {analysis && (
                  <div className="space-y-3 rounded-xl border border-brand-200 bg-emerald-50/50 p-3">
                    <div className="text-[10px] font-mono font-bold uppercase text-brand-800">Analysis · {formatDateTime(detail.analyzedAt)}</div>
                    <p className="text-sm text-slate-800">{analysis.summary}</p>
                    {analysis.technicalSummary && <p className="text-xs text-slate-600">{analysis.technicalSummary}</p>}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <div className="text-[10px] font-mono font-bold uppercase text-slate-400">Decisions</div>
                        <ul className="list-disc pl-4 text-xs">{analysis.decisions.map((item) => <li key={item}>{item}</li>)}</ul>
                      </div>
                      <div>
                        <div className="text-[10px] font-mono font-bold uppercase text-slate-400">Open questions</div>
                        <ul className="list-disc pl-4 text-xs">{analysis.openQuestions.map((item) => <li key={item}>{item}</li>)}</ul>
                      </div>
                      <div className="sm:col-span-2">
                        <div className="text-[10px] font-mono font-bold uppercase text-slate-400">Action items</div>
                        <ul className="list-disc pl-4 text-xs">
                          {analysis.actionItems.map((item) => (
                            <li key={item.task}>{item.task}{item.assignee ? ` — ${item.assignee}` : ''}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
