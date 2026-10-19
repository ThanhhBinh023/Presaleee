export interface AuthUser {
  id: string;
  organizationId: string | null;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: string;
  status: string;
  passwordHash?: string;
}

export type PublicAuthUser = Omit<AuthUser, 'passwordHash'>;

export interface AuthSessionContext {
  userAgent?: string;
  ipAddress?: string;
}
