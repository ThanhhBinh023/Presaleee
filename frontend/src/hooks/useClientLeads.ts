import { useEffect, useState } from 'react';
import { clientService } from '../services/clientService';
import type { ClientLeadQuery } from '../services/clientService';
import type { ListMeta } from '../types/auth';
import type { ClientLeadSummary } from '../types/client';

export interface ClientLeadsState {
  leads: ClientLeadSummary[];
  meta: ListMeta | null;
  isLoading: boolean;
  error: string | null;
  reload: () => void;
}

/** Leads only exist once a client is selected, so a null clientId clears the state instead of fetching. */
export function useClientLeads(clientId: string | null, query: ClientLeadQuery = {}): ClientLeadsState {
  const { page = 1, limit = 10, status } = query;

  const [leads, setLeads] = useState<ClientLeadSummary[]>([]);
  const [meta, setMeta] = useState<ListMeta | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!clientId) {
      setLeads([]);
      setMeta(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    clientService
      .listClientLeads(clientId, { page, limit, status })
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
  }, [clientId, page, limit, status, reloadToken]);

  return {
    leads,
    meta,
    isLoading,
    error,
    reload: () => setReloadToken((value) => value + 1)
  };
}
