import { useEffect, useState } from 'react';
import { leadService } from '../services/leadService';
import type { LeadListQuery } from '../services/leadService';
import type { ListMeta } from '../types/auth';
import type { LeadListItem } from '../types/lead';

export function useLeadDirectory(query: LeadListQuery = {}) {
  const { page = 1, limit = 20, status, source, search, assignedTo, clientId } = query;
  const [leads, setLeads] = useState<LeadListItem[]>([]);
  const [meta, setMeta] = useState<ListMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    leadService
      .listLeads({ page, limit, status, source, search, assignedTo, clientId })
      .then((result) => {
        if (cancelled) return;
        setLeads(result.leads);
        setMeta(result.meta);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load leads.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, limit, status, source, search, assignedTo, clientId, reloadToken]);

  return {
    leads,
    meta,
    isLoading,
    error,
    reload: () => setReloadToken((value) => value + 1)
  };
}
