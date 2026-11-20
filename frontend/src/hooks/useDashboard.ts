import { useCallback, useEffect, useRef, useState } from 'react';
import { dashboardService } from '../services/dashboardService';
import type { DashboardActivity, DashboardOverview } from '../types/dashboard';

const POLL_INTERVAL_MS = 5000;

export function useDashboardOverview(leadLimit = 8) {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [activity, setActivity] = useState<DashboardActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const leadLimitRef = useRef(leadLimit);
  leadLimitRef.current = leadLimit;

  const fetchOverview = useCallback(async (isSilent = false) => {
    if (!isSilent) {
      setIsLoading(true);
      setError(null);
    }
    try {
      const [nextOverview, feed] = await Promise.all([
        dashboardService.getOverview(leadLimitRef.current),
        dashboardService.listActivity(20)
      ]);
      setOverview(nextOverview);
      setActivity(feed.activity);
      if (!isSilent) setError(null);
    } catch (err: unknown) {
      if (!isSilent) {
        setError(err instanceof Error ? err.message : 'Failed to load the dashboard.');
      }
    } finally {
      if (!isSilent) {
        setIsLoading(false);
      }
    }
  }, []);

  // Initial and on leadLimit / reloadToken change
  useEffect(() => {
    fetchOverview(false);
  }, [fetchOverview, leadLimit, reloadToken]);

  // Continuous background polling and window focus
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void fetchOverview(true);
      }
    }, POLL_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void fetchOverview(true);
      }
    };

    const onFocus = () => {
      void fetchOverview(true);
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchOverview]);

  return {
    overview,
    activity,
    isLoading,
    error,
    reload: () => setReloadToken((token) => token + 1)
  };
}
