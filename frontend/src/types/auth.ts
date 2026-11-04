export type UserRole = 'ADMIN' | 'PRESALE_LEAD' | 'SOLUTION_ARCHITECT' | 'SALES_REP' | 'VIEWER';

export type UserStatus = 'ACTIVE' | 'INVITED' | 'DEACTIVATED';

export interface AuthUser {
  id: string;
  organizationId: string | null;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: UserRole;
  status: UserStatus;
}

export interface Organization {
  id: string;
  name: string;
  domain: string | null;
  plan: string;
  createdAt: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

export interface RegisterData {
  user: AuthUser;
  organization: Organization | null;
}

export interface SessionData {
  user: AuthUser;
}

export interface ForgotPasswordData {
  message: string;
  resetToken?: string;
  resetUrl?: string;
}

export interface MessageData {
  message: string;
}