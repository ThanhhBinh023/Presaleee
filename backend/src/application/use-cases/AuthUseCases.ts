import { AuthenticationError, ConflictError, UnauthorizedError, ValidationError } from '../../domain/errors/AppError.js';
import { AuthSessionContext, PublicAuthUser } from '../../domain/entities/AuthUser.js';
import { IAuthRepository } from '../../domain/repositories/IAuthRepository.js';
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
}

export class LoginUseCase {
  constructor(private readonly authRepository: IAuthRepository) {}

  async execute(email: unknown, password: unknown, context: AuthSessionContext): Promise<AuthSessionResult> {
    const normalizedEmail = normalizeEmail(email);
    if (typeof password !== 'string' || password.length === 0 || password.length > PASSWORD_MAX_LENGTH) {
      throw new AuthenticationError(GENERIC_LOGIN_ERROR);
    }
    const user = await this.authRepository.findUserByEmail(normalizedEmail);
    const passwordMatches = user?.passwordHash
      ? await verifyPassword(password, user.passwordHash)
      : await verifyPassword(password, EMPTY_PASSWORD_HASH);
    if (!user || !passwordMatches || user.status !== 'ACTIVE') {
      throw new AuthenticationError(GENERIC_LOGIN_ERROR);
    }

    const refreshToken = createOpaqueToken();
    await this.authRepository.createRefreshToken(user.id, hashToken(refreshToken), refreshExpiry(), context);
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

