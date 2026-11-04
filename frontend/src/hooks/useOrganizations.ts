import { useEffect, useState } from 'react';
import { userService } from '../services/userService';
import type { OrganizationSummary } from '../types/user';

export interface OrganizationsState {
  organizations: OrganizationSummary[];
  primary: OrganizationSummary | null;
  isLoading: boolean;
  error: string | null;
  reload: () => void;
}

export function useOrganizations(): OrganizationsState {
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    userService
      .listOrganizations()
      .then((result) => {
        if (!cancelled) setOrganizations(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load organizations.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  return {
    organizations,
    primary: organizations[0] ?? null,
    isLoading,
    error,
    reload: () => setReloadToken((value) => value + 1)
  };
}