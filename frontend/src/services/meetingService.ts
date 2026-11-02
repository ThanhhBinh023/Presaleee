export interface ActionItem {
  task: string;
  assignee: string;
  deadline?: string;
  completed?: boolean;
}

export interface GapAnalysis {
  missing_parameters?: string[];
  proactive_questions?: string[];
  presale_recommendations?: string[];
}

export type MeetingStatus = 'OPEN' | 'LOCKED' | 'INSPECTED' | 'REOPENED';
export type MeetingSourceTool = 'ZOOM' | 'GOOGLE_MEET' | 'TEAMS' | 'FIREFLIES' | 'OTTER' | 'MANUAL';

export interface Meeting {
  id: string;
  leadId: string;
  title: string;
  meetingDate: string;
  meetingOrder: number;
  sourceTool: MeetingSourceTool;
  status: MeetingStatus;
  rawTranscript: string;
  cleanNotes: string;
  keyDiscussionPoints: string[];
  clarifiedRequirements: string[];
  actionItems: ActionItem[];
  suggestedFollowupQuestions: string[];
  discussionTopics: string[];
  gapAnalysis: GapAnalysis | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateMeetingPayload {
  leadId: string;
  title: string;
  sourceTool?: MeetingSourceTool;
  rawTranscript?: string;
  meetingDate?: string;
}

const API_BASE = '/api/v1/meetings';

export async function fetchMeetingsByLead(leadId: string): Promise<Meeting[]> {
  const response = await fetch(`${API_BASE}/lead/${leadId}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch meetings: ${response.statusText}`);
  }
  const data = await response.json();
  return data.data || [];
}

export async function createMeeting(payload: CreateMeetingPayload): Promise<Meeting> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to create meeting: ${response.statusText}`);
  }
  const data = await response.json();
  return data.data;
}

export async function inspectMeeting(meetingId: string, rawTranscript?: string): Promise<Meeting> {
  const response = await fetch(`${API_BASE}/${meetingId}/inspect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawTranscript })
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to inspect meeting: ${response.statusText}`);
  }
  const data = await response.json();
  return data.data;
}

export async function updateMeetingLifecycle(meetingId: string, status: MeetingStatus): Promise<Meeting> {
  const response = await fetch(`${API_BASE}/${meetingId}/lifecycle`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to update lifecycle: ${response.statusText}`);
  }
  const data = await response.json();
  return data.data;
}

export async function updateMeeting(meetingId: string, payload: Partial<Meeting>): Promise<Meeting> {
  const response = await fetch(`${API_BASE}/${meetingId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to update meeting: ${response.statusText}`);
  }
  const data = await response.json();
  return data.data;
}

export async function deleteMeeting(meetingId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${meetingId}`, {
    method: 'DELETE'
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to delete meeting: ${response.statusText}`);
  }
}
