export const USER_ROLES = [
  'ADMIN',
  'PRESALE_LEAD',
  'PRESALE_CONSULTANT',
  'SOLUTION_ARCHITECT',
  'SALES_REP',
  'VIEWER'
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ['ACTIVE', 'INVITED', 'DEACTIVATED'] as const;

export type UserStatus = (typeof USER_STATUSES)[number];

export interface AuthUser {
  id: string;
  organizationId: string | null;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: UserRole;
  status: UserStatus;
  passwordHash?: string;
}

/** Database and token payloads carry these as free strings, so unknown values fall back to the safest member. */
export function toUserRole(value: string): UserRole {
  return (USER_ROLES as readonly unknown[]).includes(value) ? (value as UserRole) : 'VIEWER';
}

export function toUserStatus(value: string): UserStatus {
  return (USER_STATUSES as readonly unknown[]).includes(value) ? (value as UserStatus) : 'DEACTIVATED';
}

export type PublicAuthUser = Omit<AuthUser, 'passwordHash'>;

export interface AuthSessionContext {
  userAgent?: string;
  ipAddress?: string;
}

export interface AuthRequestClaims {
  sub: string;
  email: string;
  organizationId: string | null;
  role: UserRole;
}
