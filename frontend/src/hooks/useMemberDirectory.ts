import { useCallback, useEffect, useRef, useState } from 'react';
import { userService } from '../services/userService';
import type { MemberListQuery } from '../services/userService';
import type { ListMeta } from '../types/auth';
import type { MemberDirectoryEntry } from '../types/user';

const POLL_INTERVAL_MS = 5000;

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

  const queryRef = useRef({ page, limit, role, status, search, allOrganizations });
  queryRef.current = { page, limit, role, status, search, allOrganizations };

  const fetchMembers = useCallback(async (isSilent = false) => {
    if (!isSilent) {
      setIsLoading(true);
      setError(null);
    }
    try {
      const result = await userService.listMembers(queryRef.current);
      setMembers(result.members);
      setMeta(result.meta);
      if (!isSilent) setError(null);
    } catch (err: unknown) {
      if (!isSilent) {
        setError(err instanceof Error ? err.message : 'Failed to load members.');
      }
    } finally {
      if (!isSilent) {
        setIsLoading(false);
      }
    }
  }, []);

  // Fetch when query filters or manual reload changes
  useEffect(() => {
    fetchMembers(false);
  }, [fetchMembers, page, limit, role, status, search, allOrganizations, reloadToken]);

  // Continuous background polling and window focus
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void fetchMembers(true);
      }
    }, POLL_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void fetchMembers(true);
      }
    };

    const onFocus = () => {
      void fetchMembers(true);
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchMembers]);

  return {
    members,
    meta,
    isLoading,
    error,
    reload: () => setReloadToken((value) => value + 1)
  };
}