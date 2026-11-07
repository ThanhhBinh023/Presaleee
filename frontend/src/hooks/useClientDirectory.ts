import { useEffect, useState } from 'react';
import { clientService } from '../services/clientService';
import type { ClientListQuery } from '../services/clientService';
import type { ListMeta } from '../types/auth';
import type { ClientRecord } from '../types/client';

export interface ClientDirectoryState {
  clients: ClientRecord[];
  meta: ListMeta | null;
  isLoading: boolean;
  error: string | null;
  reload: () => void;
}

export function useClientDirectory(query: ClientListQuery = {}): ClientDirectoryState {
  const { page = 1, limit = 20, search, industry } = query;

  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [meta, setMeta] = useState<ListMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    clientService
      .listClients({ page, limit, search, industry })
      .then((result) => {
        if (cancelled) return;
        setClients(result.clients);
        setMeta(result.meta);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load clients.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, limit, search, industry, reloadToken]);

  return {
    clients,
    meta,
    isLoading,
    error,
    reload: () => setReloadToken((value) => value + 1)
  };
}
