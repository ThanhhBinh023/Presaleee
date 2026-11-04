import { MemberDirectoryEntry, Organization, OrganizationSummary, UserAccount, UserRole, UserStatus } from '../entities/User.js';

export interface RegisterOrganizationInput {
  organizationName: string;
  organizationDomain: string | null;
  email: string;
  fullName: string;
  passwordHash: string;
}

export interface ListMemberFilters {
  /** Organizations the caller is allowed to read; never empty, so the directory stays tenant-scoped. */
  organizationIds: string[];
  page: number;
  limit: number;
  search?: string;
  role?: UserRole;
  status?: UserStatus;
}

export interface CreateUserInput {
  organizationId: string;
  email: string;
  fullName: string;
  passwordHash: string;
  role: UserRole;
}

export interface UpdateUserInput {
  fullName?: string;
  avatarUrl?: string | null;
  role?: UserRole;
  status?: UserStatus;
  passwordHash?: string;
}

export interface IUserRepository {
  registerOrganization(input: RegisterOrganizationInput): Promise<{ user: UserAccount; organization: Organization } | null>;
  listOrganizationsForUser(userId: string): Promise<OrganizationSummary[]>;
  listMembers(filters: ListMemberFilters): Promise<{ members: MemberDirectoryEntry[]; total: number }>;
  findById(id: string): Promise<UserAccount | null>;
  create(input: CreateUserInput): Promise<UserAccount | null>;
  update(id: string, input: UpdateUserInput): Promise<UserAccount | null>;
  revokeSessions(userId: string): Promise<void>;
}
