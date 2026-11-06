import { apiRequest } from './apiClient';
import type { MeetingAttendee } from '../types/lead';
import type { MeetingRecord, MeetingStatus } from '../types/meeting';

const PREFIX = '/api/v1/meetings';
const AI_TIMEOUT_MS = 90_000;

export const meetingService = {
  getById: (id: string) => apiRequest<MeetingRecord>(`${PREFIX}/${encodeURIComponent(id)}`),

  saveTranscript: (id: string, transcript: string, append = false) =>
    apiRequest<MeetingRecord>(`${PREFIX}/${encodeURIComponent(id)}/transcript`, {
      method: 'POST',
      body: { transcript, append }
    }),

  analyze: (id: string) =>
    apiRequest<MeetingRecord>(`${PREFIX}/${encodeURIComponent(id)}/analyze`, {
      method: 'POST',
      timeoutMs: AI_TIMEOUT_MS
    }),

  updateStatus: (id: string, status: MeetingStatus) =>
    apiRequest<MeetingRecord>(`${PREFIX}/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: { status }
    })
};

export type { MeetingAttendee };
