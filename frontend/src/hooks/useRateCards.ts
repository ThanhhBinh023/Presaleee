import { useEffect, useState } from 'react';
import { rateCardService } from '../services/rateCardService';
import type { RateCardListQuery } from '../services/rateCardService';
import type { ListMeta } from '../types/auth';
import type { RateCardRecord } from '../types/rateCard';

export function useRateCards(query: RateCardListQuery = {}) {
  const { page = 1, limit = 50, roleName, level, currency, includeInactive = false } = query;
  const [rateCards, setRateCards] = useState<RateCardRecord[]>([]);
  const [meta, setMeta] = useState<ListMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    rateCardService
      .list({ page, limit, roleName, level, currency, includeInactive })
      .then((result) => {
        if (cancelled) return;
        setRateCards(result.rateCards);
        setMeta(result.meta);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load rate cards.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, limit, roleName, level, currency, includeInactive, reloadToken]);

  return {
    rateCards,
    meta,
    isLoading,
    error,
    reload: () => setReloadToken((value) => value + 1)
  };
}
