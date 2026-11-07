export const AUDIT_RESULT_STATUSES = ['SUCCESS', 'FAILED'] as const;

export type AuditResultStatus = (typeof AUDIT_RESULT_STATUSES)[number];

/** Read-only audit trail row from /api/v1/audit-logs. */
export interface AuditEntry {
  id: string;
  organizationId: string;
  userId: string | null;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  payload: Record<string, unknown>;
  resultStatus: AuditResultStatus;
  createdAt: string;
}
