import { AuthSessionContext, AuthUser } from '../entities/AuthUser.js';

export interface IAuthRepository {
  findUserByEmail(email: string): Promise<AuthUser | null>;
  findUserById(id: string): Promise<AuthUser | null>;
  createRefreshToken(userId: string, tokenHash: string, expiresAt: Date, context: AuthSessionContext): Promise<void>;
  rotateRefreshToken(tokenHash: string, newTokenHash: string, newExpiresAt: Date, context: AuthSessionContext): Promise<AuthUser | null>;
  revokeRefreshToken(tokenHash: string): Promise<void>;
  createPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  resetPassword(tokenHash: string, newPasswordHash: string): Promise<boolean>;
}
