import { AppError, AuthenticationError, ConflictError, NotFoundError, ValidationError } from '../../domain/errors/AppError.js';
import { AuthUser, PublicAuthUser } from '../../domain/entities/AuthUser.js';
import { MemberDirectoryEntry, OrganizationSummary, USER_ROLES, USER_STATUSES, UserAccount, UserRole, UserStatus } from '../../domain/entities/User.js';
import { IAuthRepository } from '../../domain/repositories/IAuthRepository.js';
import { IUserRepository } from '../../domain/repositories/IUserRepository.js';
import { IAuditRepository } from '../../domain/repositories/IAuditRepository.js';
import { issueAccessToken, toPublicUser } from '../services/AuthTokenService.js';
import { hashPassword, validatePasswordStrength, verifyPassword } from '../services/AuthCredentialsService.js';
import { AuthenticatedScope } from '../dtos/AuthenticatedScope.js';
import {
  assignIfPresent,
  normalizeEmail,
  optionalEnum,
  pagination,
  requiredText,
  requiredUuid
} from '../services/RequestValidation.js';

const MAX_ORGANIZATION_NAME = 255;

function parseRole(value: unknown, field: string): UserRole {
  return optionalEnum(value, USER_ROLES, field)!;
}

export interface RegisterResult {
  user: PublicAuthUser;
  organization: OrganizationSummary | null;
  accessToken: string;
}

export class RegisterUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly authRepository: IAuthRepository,
    private readonly auditRepository: IAuditRepository
  ) {}

  async execute(dto: Record<string, unknown>): Promise<RegisterResult> {
    const email = normalizeEmail(dto.email);
    const fullName = requiredText(dto.fullName, 'fullName', 255);
    const organizationName = requiredText(dto.organizationName, 'organizationName', MAX_ORGANIZATION_NAME);
    const organizationDomain = dto.organizationDomain === undefined || dto.organizationDomain === null || dto.organizationDomain === ''
      ? null
      : requiredText(dto.organizationDomain, 'organizationDomain', 100);
    const password = validatePasswordStrength(dto.password);

    const existing = await this.authRepository.findUserByEmail(email);
    if (existing) throw new ConflictError('That email is already registered.');

    const registered = await this.userRepository.registerOrganization({
      organizationName,
      organizationDomain,
      email,
      fullName,
      passwordHash: await hashPassword(password)
    });
    if (!registered) throw new ConflictError('That email is already registered.');

    const organizations = await this.userRepository.listOrganizationsForUser(registered.user.id);
    const organization = organizations.find(item => item.id === registered.organization.id) || null;
    await this.auditRepository.record({
      organizationId: registered.organization.id,
      actorId: registered.user.id,
      action: 'USER_REGISTERED',
      entityType: 'user',
      entityId: registered.user.id,
      payload: { email, organizationName }
    });

    return {
      user: toPublicUser(toAuthUser(registered.user)),
      organization,
      accessToken: issueAccessToken(toAuthUser(registered.user))
    };
  }
}

/** `UserAccount` carries no credential; the auth mapping needs the AuthUser shape. */
function toAuthUser(user: UserAccount): AuthUser {
  return {
    id: user.id,
    organizationId: user.organizationId,
    email: user.email,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    role: user.role,
    status: user.status
  };
}

export class ListOrganizationsUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(scope: AuthenticatedScope): Promise<OrganizationSummary[]> {
    return this.userRepository.listOrganizationsForUser(scope.userId);
  }
}

export class ListMembersUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(scope: AuthenticatedScope, query: Record<string, unknown>) {
    const page = pagination(query.page, 'page', 100_000, 1);
    const limit = pagination(query.limit, 'limit', 100, 50);
    const allOrganizations = query.allOrganizations === 'true';
    let organizationIds = [scope.organizationId];
    if (allOrganizations) {
      if (scope.role !== 'ADMIN') throw new AppError('Only an organization ADMIN may browse the cross-organization directory.', 403);
      const organizations = await this.userRepository.listOrganizationsForUser(scope.userId);
      organizationIds = organizations.map(organization => organization.id);
      if (organizationIds.length === 0) organizationIds = [scope.organizationId];
    }
    const result = await this.userRepository.listMembers({
      organizationIds,
      page,
      limit,
      role: query.role === undefined || query.role === '' ? undefined : parseRole(query.role, 'role'),
      status: query.status === undefined || query.status === ''
        ? undefined
        : optionalEnum(query.status, USER_STATUSES, 'status'),
      search: query.search === undefined || query.search === '' ? undefined : requiredText(query.search, 'search', 200)
    });
    return {
      members: result.members,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit) || 1
    };
  }
}

export class GetMemberUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(scope: AuthenticatedScope, id: string): Promise<MemberDirectoryEntry> {
    const member = await this.userRepository.findById(requiredUuid(id, 'id'));
    if (!member || member.organizationId !== scope.organizationId) throw new NotFoundError('Member not found.');
    return member as MemberDirectoryEntry;
  }
}

export class AddMemberUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly authRepository: IAuthRepository,
    private readonly auditRepository: IAuditRepository
  ) {}

  async execute(scope: AuthenticatedScope, dto: Record<string, unknown>): Promise<UserAccount> {
    const email = normalizeEmail(dto.email);
    const fullName = requiredText(dto.fullName, 'fullName', 255);
    const password = validatePasswordStrength(dto.password);
    const role = dto.role === undefined ? 'VIEWER' : parseRole(dto.role, 'role');

    const existing = await this.authRepository.findUserByEmail(email);
    if (existing) throw new ConflictError('That email is already registered.');
    const member = await this.userRepository.create({
      organizationId: scope.organizationId,
      email,
      fullName,
      passwordHash: await hashPassword(password),
      role
    });
    if (!member) throw new ConflictError('That email is already registered.');
    await this.auditRepository.record({
      organizationId: scope.organizationId,
      actorId: scope.userId,
      action: 'USER_CREATED',
      entityType: 'user',
      entityId: member.id,
      payload: { email, role },
      ipAddress: scope.ipAddress
    });
    return member;
  }
}

export class UpdateMemberUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly auditRepository: IAuditRepository
  ) {}

  async execute(scope: AuthenticatedScope, id: string, dto: Record<string, unknown>): Promise<UserAccount> {
    const targetId = requiredUuid(id, 'id');
    const target = await this.userRepository.findById(targetId);
    if (!target || target.organizationId !== scope.organizationId) throw new NotFoundError('Member not found.');
    if (targetId === scope.userId && (dto.role !== undefined || dto.status !== undefined)) {
      throw new ValidationError('Change your own role or status from another administrator account.');
    }

    const updates: Parameters<IUserRepository['update']>[1] = {};
    assignIfPresent(dto, updates, 'fullName', value => requiredText(value, 'fullName', 255));
    assignIfPresent(dto, updates, 'role', value => parseRole(value, 'role'));
    assignIfPresent(dto, updates, 'status', value => optionalEnum(value, USER_STATUSES, 'status'));
    if (Object.keys(updates).length === 0) throw new ValidationError('At least one editable field is required.');

    const losesAdmin = target.role === 'ADMIN'
      && ((updates.role !== undefined && updates.role !== 'ADMIN') || (updates.status !== undefined && updates.status !== 'ACTIVE'));
    if (losesAdmin) {
      const { members } = await this.userRepository.listMembers({
        organizationIds: [scope.organizationId], page: 1, limit: 100, role: 'ADMIN', status: 'ACTIVE'
      });
      if (members.length <= 1) throw new ConflictError('The organization must keep at least one active ADMIN.');
    }

    const member = await this.userRepository.update(targetId, updates);
    if (!member) throw new NotFoundError('Member not found.');
    if (updates.status === 'DEACTIVATED') await this.userRepository.revokeSessions(targetId);
    await this.auditRepository.record({
      organizationId: scope.organizationId,
      actorId: scope.userId,
      action: 'USER_UPDATED',
      entityType: 'user',
      entityId: member.id,
      payload: { changedFields: Object.keys(updates) },
      ipAddress: scope.ipAddress
    });
    return member;
  }
}

export class UpdateOwnProfileUseCase {
  constructor(
    private readonly authRepository: IAuthRepository,
    private readonly userRepository: IUserRepository,
    private readonly auditRepository: IAuditRepository
  ) {}

  async execute(scope: AuthenticatedScope, dto: Record<string, unknown>): Promise<{ user: PublicAuthUser; passwordChanged: boolean }> {
    const current = await this.authRepository.findUserById(scope.userId);
    if (!current) throw new NotFoundError('User not found.');

    const updates: Parameters<IUserRepository['update']>[1] = {};
    assignIfPresent(dto, updates, 'fullName', value => requiredText(value, 'fullName', 255));
    assignIfPresent(dto, updates, 'avatarUrl', value =>
      value === null || value === '' ? null : requiredText(value, 'avatarUrl', 2000));
    if (Object.keys(updates).length === 0 && dto.password === undefined) {
      throw new ValidationError('At least one editable field is required.');
    }

    let passwordChanged = false;
    let passwordHash = current.passwordHash;
    if (dto.password !== undefined) {
      const currentPassword = dto.currentPassword;
      if (typeof currentPassword !== 'string' || !currentPassword.length) {
        throw new ValidationError('currentPassword is required to change your password.');
      }
      if (!current.passwordHash || !(await verifyPassword(currentPassword, current.passwordHash))) {
        throw new AuthenticationError('Current password is incorrect.');
      }
      passwordHash = await hashPassword(validatePasswordStrength(dto.password));
      passwordChanged = true;
    }

    const updated = await this.userRepository.update(scope.userId, updates);
    if (!updated) throw new NotFoundError('User not found.');
    if (passwordChanged && passwordHash !== current.passwordHash) {
      await this.userRepository.revokeSessions(scope.userId);
    }
    await this.auditRepository.record({
      organizationId: scope.organizationId,
      actorId: scope.userId,
      action: passwordChanged ? 'USER_PASSWORD_CHANGED' : 'USER_PROFILE_UPDATED',
      entityType: 'user',
      entityId: scope.userId,
      payload: { changedFields: Object.keys(updates).concat(passwordChanged ? ['password'] : []) },
      ipAddress: scope.ipAddress
    });

    return {
      user: toPublicUser(toAuthUser(updated)),
      passwordChanged
    };
  }
}
