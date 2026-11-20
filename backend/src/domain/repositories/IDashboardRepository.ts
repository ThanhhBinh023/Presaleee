import { AdminPlatformAnalytics, DashboardActivity, DashboardLead, DashboardOverview } from '../entities/Dashboard.js';

export interface DashboardScope { 
  organizationId: string; 
  userId?: string;
  role?: string;
}

export interface IDashboardRepository {
  getOverview(scope: DashboardScope, leadLimit: number): Promise<DashboardOverview>;
  listLeads(scope: DashboardScope, limit: number): Promise<DashboardLead[]>;
  listActivity(scope: DashboardScope, limit: number): Promise<DashboardActivity[]>;
  getAdminAnalytics(scope: DashboardScope, period: string): Promise<AdminPlatformAnalytics>;
}
