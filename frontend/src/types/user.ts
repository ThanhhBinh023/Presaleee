import type { Organization, UserRole, UserStatus } from './auth';

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

export interface OrganizationSummary extends Organization {
  memberCount: number;
}