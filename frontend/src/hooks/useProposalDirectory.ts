import { useEffect, useState } from 'react';
import { proposalService } from '../services/proposalService';
import type { ProposalListQuery } from '../services/proposalService';
import type { ListMeta } from '../types/auth';
import type { ProposalRecord } from '../types/proposal';

export function useProposalDirectory(query: ProposalListQuery = {}) {
  const { page = 1, limit = 20, status, search } = query;
  const [proposals, setProposals] = useState<ProposalRecord[]>([]);
  const [meta, setMeta] = useState<ListMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    proposalService
      .list({ page, limit, status, search })
      .then((result) => {
        if (cancelled) return;
        setProposals(result.proposals);
        setMeta(result.meta);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load proposals.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, limit, status, search, reloadToken]);

  return {
    proposals,
    meta,
    isLoading,
    error,
    reload: () => setReloadToken((value) => value + 1)
  };
}
