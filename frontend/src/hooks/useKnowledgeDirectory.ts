import { useEffect, useState } from 'react';
import { knowledgeService } from '../services/knowledgeService';
import type { KnowledgeListQuery } from '../services/knowledgeService';
import type { ListMeta } from '../types/auth';
import type { KnowledgeDocument } from '../types/knowledge';

export function useKnowledgeDirectory(query: KnowledgeListQuery = {}) {
  const { page = 1, limit = 20, category, domain, search } = query;
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [meta, setMeta] = useState<ListMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    knowledgeService
      .list({ page, limit, category, domain, search })
      .then((result) => {
        if (cancelled) return;
        setDocuments(result.documents);
        setMeta(result.meta);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load knowledge documents.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, limit, category, domain, search, reloadToken]);

  return {
    documents,
    meta,
    isLoading,
    error,
    reload: () => setReloadToken((token) => token + 1)
  };
}
