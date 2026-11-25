import { AppError, AuthenticationError, ConflictError, UnauthorizedError, ValidationError } from '../../domain/errors/AppError.js';
import { AuthSessionContext, PublicAuthUser } from '../../domain/entities/AuthUser.js';
import { IAuthRepository } from '../../domain/repositories/IAuthRepository.js';
import { IAuditRepository } from '../../domain/repositories/IAuditRepository.js';
import { Pool } from 'pg';
import { verifyTotpCode } from '../services/TotpService.js';
import { env } from '../../infrastructure/config/env.js';
import {
  EMPTY_PASSWORD_HASH,
  PASSWORD_MAX_LENGTH,
  hashPassword,
  validatePasswordStrength,
  verifyPassword
} from '../services/AuthCredentialsService.js';
import {
  createOpaqueToken,
  hashToken,
  issueAccessToken,
  REFRESH_TOKEN_TTL_MS,
  toPublicUser
} from '../services/AuthTokenService.js';

const GENERIC_LOGIN_ERROR = 'Invalid email or password.';

function normalizeEmail(email: unknown): string {
  if (typeof email !== 'string') throw new ValidationError('A valid email is required.');
  const normalized = email.trim().toLowerCase();
  if (normalized.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new ValidationError('A valid email is required.');
  }
  return normalized;
}

function refreshExpiry(): Date {
  return new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
}

export interface AuthSessionResult {
  user: PublicAuthUser;
  accessToken: string;
  refreshToken: string;
  requires2FA?: boolean;
}

export class LoginUseCase {
  constructor(
    private readonly authRepository: IAuthRepository,
    private readonly dbPool?: Pool,
    private readonly auditRepository?: IAuditRepository
  ) {}

  async execute(
    email: unknown,
    password: unknown,
    context: AuthSessionContext,
    totpCode?: unknown
  ): Promise<AuthSessionResult> {
    const normalizedEmail = normalizeEmail(email);
    if (typeof password !== 'string' || password.length === 0 || password.length > PASSWORD_MAX_LENGTH) {
      throw new AuthenticationError(GENERIC_LOGIN_ERROR);
    }
    const user = await this.authRepository.findUserByEmail(normalizedEmail);

    // Check account lockout policy
    if (user && this.dbPool) {
      const lockRes = await this.dbPool.query<{
        failed_login_attempts: number;
        locked_until: string | null;
        two_factor_enabled: boolean;
        two_factor_secret: string | null;
      }>(
        `SELECT failed_login_attempts, locked_until, two_factor_enabled, two_factor_secret FROM users WHERE id = $1 LIMIT 1;`,
        [user.id]
      ).catch(() => ({ rows: [] as any[] }));
      const secRow = lockRes.rows[0];
      if (secRow?.locked_until && new Date(secRow.locked_until).getTime() > Date.now()) {
        const minsLeft = Math.max(1, Math.ceil((new Date(secRow.locked_until).getTime() - Date.now()) / 60_000));
        throw new AppError(`Tài khoản tạm thời bị khóa do đăng nhập sai nhiều lần. Vui lòng thử lại sau ${minsLeft} phút.`, 423);
      }
    }

    const passwordMatches = user?.passwordHash
      ? await verifyPassword(password, user.passwordHash)
      : await verifyPassword(password, EMPTY_PASSWORD_HASH);

    if (!user || !passwordMatches || user.status !== 'ACTIVE') {
      if (user && this.dbPool) {
        try {
          const policyRes = await this.dbPool.query<{ value: any }>(
            `SELECT value FROM system_settings WHERE key = 'security_policy' LIMIT 1;`
          );
          const policy = policyRes.rows[0]?.value || {};
          const maxAttempts = Number(policy.maxFailedLoginAttempts || 5);
          const lockMins = Number(policy.lockoutDurationMinutes || 15);
          await this.dbPool.query(
            `UPDATE users
             SET failed_login_attempts = failed_login_attempts + 1,
                 locked_until = CASE WHEN failed_login_attempts + 1 >= $1 THEN NOW() + ($2 || ' minutes')::interval ELSE locked_until END
             WHERE id = $3;`,
            [maxAttempts, String(lockMins), user.id]
          );
        } catch {
          // ignore if column/table not migrated yet
        }
        await this.auditRepository?.record({
          organizationId: user.organizationId || '00000000-0000-0000-0000-000000000000',
          actorId: user.id,
          action: 'AUTH_LOGIN_FAILED',
          entityType: 'user',
          entityId: user.id,
          payload: { reason: user.status !== 'ACTIVE' ? 'USER_NOT_ACTIVE' : 'BAD_PASSWORD' },
          resultStatus: 'FAILED',
          ipAddress: context.ipAddress
        }).catch(() => {});
      }
      throw new AuthenticationError(GENERIC_LOGIN_ERROR);
    }

    // Reset failed attempts & check 2FA
    let sessionTimeoutMinutes = 1440;
    if (this.dbPool) {
      try {
        await this.dbPool.query(`UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1;`, [user.id]);
        const [secRes, policyRes] = await Promise.all([
          this.dbPool.query<{ two_factor_enabled: boolean; two_factor_secret: string | null }>(
            `SELECT two_factor_enabled, two_factor_secret FROM users WHERE id = $1 LIMIT 1;`,
            [user.id]
          ),
          this.dbPool.query<{ value: any }>(`SELECT value FROM system_settings WHERE key = 'security_policy' LIMIT 1;`)
        ]);
        const policyVal = policyRes.rows[0]?.value;
        if (policyVal?.sessionTimeoutMinutes) {
          sessionTimeoutMinutes = Number(policyVal.sessionTimeoutMinutes);
        }
        const twoFactor = secRes.rows[0];
        if (twoFactor?.two_factor_enabled && twoFactor.two_factor_secret) {
          if (typeof totpCode !== 'string' || !totpCode.trim()) {
            return {
              user: toPublicUser(user),
              accessToken: '',
              refreshToken: '',
              requires2FA: true
            };
          }
          if (!verifyTotpCode(twoFactor.two_factor_secret, totpCode.trim())) {
            throw new AuthenticationError('Mã xác thực 2FA (6 chữ số) không chính xác hoặc đã hết hạn.');
          }
        }
      } catch (err) {
        if (err instanceof AppError) throw err;
      }
    }

    const refreshToken = createOpaqueToken();
    const expiry = new Date(Date.now() + Math.max(15, sessionTimeoutMinutes) * 60_000);
    await this.authRepository.createRefreshToken(user.id, hashToken(refreshToken), expiry > refreshExpiry() ? refreshExpiry() : expiry, context);
    return { user: toPublicUser(user), accessToken: issueAccessToken(user), refreshToken };
  }
}

export class RefreshSessionUseCase {
  constructor(private readonly authRepository: IAuthRepository) {}

  async execute(refreshToken: unknown, context: AuthSessionContext): Promise<AuthSessionResult> {
    if (typeof refreshToken !== 'string' || refreshToken.length < 32 || refreshToken.length > 256) {
      throw new UnauthorizedError('Invalid or expired refresh token.');
    }
    const nextRefreshToken = createOpaqueToken();
    const user = await this.authRepository.rotateRefreshToken(
      hashToken(refreshToken), hashToken(nextRefreshToken), refreshExpiry(), context
    );
    if (!user) throw new UnauthorizedError('Invalid or expired refresh token.');
    return { user: toPublicUser(user), accessToken: issueAccessToken(user), refreshToken: nextRefreshToken };
  }
}

export class LogoutUseCase {
  constructor(private readonly authRepository: IAuthRepository) {}

  async execute(refreshToken: unknown): Promise<void> {
    if (typeof refreshToken === 'string' && refreshToken.length >= 32 && refreshToken.length <= 256) {
      await this.authRepository.revokeRefreshToken(hashToken(refreshToken));
    }
  }
}

export class GetCurrentUserUseCase {
  constructor(private readonly authRepository: IAuthRepository) {}

  async execute(userId: string): Promise<PublicAuthUser> {
    const user = await this.authRepository.findUserById(userId);
    if (!user || user.status !== 'ACTIVE') throw new UnauthorizedError('User is not active.');
    return toPublicUser(user);
  }
}

export interface PasswordResetRequestResult {
  message: string;
  resetToken?: string;
  resetUrl?: string;
}

export class ForgotPasswordUseCase {
  constructor(private readonly authRepository: IAuthRepository) {}

  async execute(email: unknown): Promise<PasswordResetRequestResult> {
    const normalizedEmail = normalizeEmail(email);
    const user = await this.authRepository.findUserByEmail(normalizedEmail);
    const result: PasswordResetRequestResult = {
      message: 'If an active account exists for this email, password reset instructions will be sent.'
    };
    if (!user || user.status !== 'ACTIVE') return result;

    const token = createOpaqueToken();
    const expiresAt = new Date(Date.now() + env.passwordResetTokenTtlMinutes * 60_000);
    await this.authRepository.createPasswordResetToken(user.id, hashToken(token), expiresAt);

    // Until a mail provider is configured, expose the link only in non-production environments.
    if (env.nodeEnv !== 'production') {
      result.resetToken = token;
      result.resetUrl = `${env.frontendUrl.replace(/\/$/, '')}/#reset-password?token=${encodeURIComponent(token)}`;
    }
    return result;
  }
}

export class ResetPasswordUseCase {
  constructor(private readonly authRepository: IAuthRepository) {}

  async execute(token: unknown, password: unknown): Promise<void> {
    if (typeof token !== 'string' || token.length < 32 || token.length > 256) {
      throw new ValidationError('A valid password reset token is required.');
    }
    const newPassword = validatePasswordStrength(password);
    const passwordHash = await hashPassword(newPassword);
    const reset = await this.authRepository.resetPassword(hashToken(token), passwordHash);
    if (!reset) throw new ConflictError('Password reset token is invalid, expired, or already used.');
  }
}

