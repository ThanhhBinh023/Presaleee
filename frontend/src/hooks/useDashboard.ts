import { useEffect, useState } from 'react';
import { dashboardService } from '../services/dashboardService';
import type { DashboardActivity, DashboardOverview } from '../types/dashboard';

export function useDashboardOverview(leadLimit = 8) {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [activity, setActivity] = useState<DashboardActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    Promise.all([dashboardService.getOverview(leadLimit), dashboardService.listActivity(20)])
      .then(([nextOverview, feed]) => {
        if (cancelled) return;
        setOverview(nextOverview);
        setActivity(feed.activity);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load the dashboard.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [leadLimit, reloadToken]);

  return {
    overview,
    activity,
    isLoading,
    error,
    reload: () => setReloadToken((token) => token + 1)
  };
}
