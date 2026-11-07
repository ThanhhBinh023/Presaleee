import { useEffect, useState } from 'react';
import { auditService } from '../services/auditService';
import type { AuditListQuery } from '../services/auditService';
import type { ListMeta } from '../types/auth';
import type { AuditEntry } from '../types/audit';

export interface AuditLogState {
  entries: AuditEntry[];
  meta: ListMeta | null;
  isLoading: boolean;
  error: string | null;
  reload: () => void;
}

export function useAuditLog(query: AuditListQuery = {}, enabled = true): AuditLogState {
  const { page = 1, limit = 50, action, entityType, entityId, actorId, resultStatus, from, to } = query;

  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [meta, setMeta] = useState<ListMeta | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setEntries([]);
      setMeta(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    auditService
      .listEntries({ page, limit, action, entityType, entityId, actorId, resultStatus, from, to })
      .then((result) => {
        if (cancelled) return;
        setEntries(result.entries);
        setMeta(result.meta);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load the audit trail.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, page, limit, action, entityType, entityId, actorId, resultStatus, from, to, reloadToken]);

  return {
    entries,
    meta,
    isLoading,
    error,
    reload: () => setReloadToken((value) => value + 1)
  };
}
