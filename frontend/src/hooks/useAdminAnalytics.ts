import { useCallback, useEffect, useRef, useState } from 'react';
import { dashboardService } from '../services/dashboardService';
import type { AdminPlatformAnalytics } from '../types/dashboard';

const POLL_INTERVAL_MS = 5000;

export function useAdminAnalytics(initialPeriod: string = '30d') {
  const [period, setPeriod] = useState<string>(initialPeriod);
  const [analytics, setAnalytics] = useState<AdminPlatformAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const periodRef = useRef(period);
  periodRef.current = period;

  const fetchAnalytics = useCallback(async (p: string, isSilent = false) => {
    if (!isSilent) {
      setIsLoading(true);
      setError(null);
    }
    try {
      const data = await dashboardService.getAdminAnalytics(p);
      setAnalytics(data);
      if (!isSilent) setError(null);
    } catch (err: any) {
      if (!isSilent) {
        setError(err.message || 'Không thể tải dữ liệu thống kê nền tảng.');
      }
    } finally {
      if (!isSilent) {
        setIsLoading(false);
      }
    }
  }, []);

  // Initial and on period change
  useEffect(() => {
    fetchAnalytics(period, false);
  }, [fetchAnalytics, period]);

  // Continuous background polling and focus refetch
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void fetchAnalytics(periodRef.current, true);
      }
    }, POLL_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void fetchAnalytics(periodRef.current, true);
      }
    };

    const onFocus = () => {
      void fetchAnalytics(periodRef.current, true);
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchAnalytics]);

  const reload = () => fetchAnalytics(period, false);

  return {
    period,
    setPeriod,
    analytics,
    isLoading,
    error,
    reload
  };
}
