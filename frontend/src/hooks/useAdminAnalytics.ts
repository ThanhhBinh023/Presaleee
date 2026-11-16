import { useCallback, useEffect, useState } from 'react';
import { dashboardService } from '../services/dashboardService';
import type { AdminPlatformAnalytics } from '../types/dashboard';

export function useAdminAnalytics(initialPeriod: string = '30d') {
  const [period, setPeriod] = useState<string>(initialPeriod);
  const [analytics, setAnalytics] = useState<AdminPlatformAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async (p: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await dashboardService.getAdminAnalytics(p);
      setAnalytics(data);
    } catch (err: any) {
      setError(err.message || 'Không thể tải dữ liệu thống kê nền tảng.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics(period);
  }, [fetchAnalytics, period]);

  const reload = () => fetchAnalytics(period);

  return {
    period,
    setPeriod,
    analytics,
    isLoading,
    error,
    reload
  };
}
