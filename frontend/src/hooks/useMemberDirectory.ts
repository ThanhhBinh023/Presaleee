import { useEffect, useState } from 'react';
import { userService } from '../services/userService';
import type { MemberListQuery } from '../services/userService';
import type { ListMeta } from '../types/auth';
import type { MemberDirectoryEntry } from '../types/user';

export interface MemberDirectoryState {
  members: MemberDirectoryEntry[];
  meta: ListMeta | null;
  isLoading: boolean;
  error: string | null;
  reload: () => void;
}

export function useMemberDirectory(query: MemberListQuery = {}): MemberDirectoryState {
  const { page = 1, limit = 50, role, status, search, allOrganizations = false } = query;

  const [members, setMembers] = useState<MemberDirectoryEntry[]>([]);
  const [meta, setMeta] = useState<ListMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    userService
      .listMembers({ page, limit, role, status, search, allOrganizations })
      .then((result) => {
        if (cancelled) return;
        setMembers(result.members);
        setMeta(result.meta);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load members.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, limit, role, status, search, allOrganizations, reloadToken]);

  return {
    members,
    meta,
    isLoading,
    error,
    reload: () => setReloadToken((value) => value + 1)
  };
}