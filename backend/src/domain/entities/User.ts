export const USER_ROLES = ['ADMIN', 'PRESALE_LEAD', 'SOLUTION_ARCHITECT', 'SALES_REP', 'VIEWER'] as const;
export type UserRole = typeof USER_ROLES[number];

/** Roles allowed to mutate shared reference data (clients, rate cards, members). */
export const ORGANIZATION_ADMIN_ROLES: readonly UserRole[] = ['ADMIN', 'PRESALE_LEAD'];

export const USER_STATUSES = ['ACTIVE', 'INVITED', 'DEACTIVATED'] as const;
export type UserStatus = typeof USER_STATUSES[number];

export interface Organization {
  id: string;
  name: string;
  domain: string | null;
  plan: string;
  createdAt: string;
}

export interface OrganizationSummary extends Organization {
  memberCount: number;
}

export interface UserAccount {
  id: string;
  organizationId: string | null;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MemberDirectoryEntry extends UserAccount {
  organizationName: string | null;
}
