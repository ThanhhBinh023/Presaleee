import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { Pool } from 'pg';
import { AppError, ForbiddenError, UnauthorizedError, ValidationError } from '../../domain/errors/AppError.js';
import { GetCurrentUserUseCase, LoginUseCase, RefreshSessionUseCase, LogoutUseCase, ForgotPasswordUseCase, ResetPasswordUseCase } from '../../application/use-cases/AuthUseCases.js';
import { RegisterUseCase } from '../../application/use-cases/UserUseCases.js';
import { AuthSessionContext } from '../../domain/entities/AuthUser.js';
import { IAuthRepository } from '../../domain/repositories/IAuthRepository.js';
import { createOpaqueToken, hashToken, issueAccessToken, toPublicUser, REFRESH_TOKEN_TTL_MS } from '../../application/services/AuthTokenService.js';
import { env } from '../../infrastructure/config/env.js';

const ACCESS_COOKIE = 'presaleee_access';
const REFRESH_COOKIE = 'presaleee_refresh';
const ACCESS_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
// The access cookie must accompany every protected route; only the refresh cookie is auth-endpoint scoped.
const ACCESS_COOKIE_PATH = '/api/v1';
const REFRESH_COOKIE_PATH = '/api/v1/auth';

function cookieOptions(maxAge: number, path: string) {
  return {
    httpOnly: true,
    secure: env.authCookieSecure,
    sameSite: env.authCookieSameSite,
    path,
    maxAge
  };
}

function sessionContext(req: Request): AuthSessionContext {
  return {
    userAgent: req.get('user-agent')?.slice(0, 1000),
    ipAddress: req.socket.remoteAddress
  };
}

function cookieValue(req: Request, cookieName: string): string | undefined {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0 || part.slice(0, separator).trim() !== cookieName) continue;
    const value = part.slice(separator + 1).trim();
    try {
      return decodeURIComponent(value);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function setSessionCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie(ACCESS_COOKIE, accessToken, cookieOptions(ACCESS_TTL_MS, ACCESS_COOKIE_PATH));
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions(REFRESH_TTL_MS, REFRESH_COOKIE_PATH));
}

function clearSessionCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, cookieOptions(0, ACCESS_COOKIE_PATH));
  res.clearCookie(REFRESH_COOKIE, cookieOptions(0, REFRESH_COOKIE_PATH));
}

function validateCsrfOrigin(req: Request): void {
  const origin = req.get('origin');
  if (!origin) return;
  let requestOrigin: string;
  try {
    requestOrigin = new URL(origin).origin;
  } catch {
    throw new ValidationError('Invalid request origin.');
  }
  const expectedOrigin = new URL(env.frontendUrl).origin;
  if (requestOrigin !== expectedOrigin) throw new ForbiddenError('Request origin is not allowed.');
  if (env.authCookieSameSite === 'none' && !env.authCookieSecure) {
    throw new AppError('Secure cookies are required for cross-site authentication.', 503);
  }
}

export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshUseCase: RefreshSessionUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly currentUserUseCase: GetCurrentUserUseCase,
    private readonly forgotPasswordUseCase: ForgotPasswordUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly registerUseCase: RegisterUseCase,
    private readonly authRepository?: IAuthRepository,
    private readonly dbPool?: Pool
  ) {}

  devLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (env.nodeEnv === 'production') {
        throw new ForbiddenError('Dev login is disabled in production.');
      }
      validateCsrfOrigin(req);
      const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : 'ntbinh1@gmail.com';
      if (!this.authRepository) {
        throw new AppError('Dev login not configured.', 500);
      }
      const user = await this.authRepository.findUserByEmail(email);
      if (!user) {
        throw new UnauthorizedError(`User ${email} not found.`);
      }
      const refreshToken = createOpaqueToken();
      const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
      await this.authRepository.createRefreshToken(user.id, hashToken(refreshToken), expiresAt, sessionContext(req));
      setSessionCookies(res, issueAccessToken(user), refreshToken);
      res.status(200).json({ success: true, data: { user: toPublicUser(user) } });
    } catch (error) { next(error); }
  };

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      validateCsrfOrigin(req);
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const { accessToken, ...session } = await this.registerUseCase.execute(body);
      res.cookie(ACCESS_COOKIE, accessToken, cookieOptions(ACCESS_TTL_MS, ACCESS_COOKIE_PATH));
      res.status(201).json({ success: true, data: session });
    } catch (error) { next(error); }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      validateCsrfOrigin(req);
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const session = await this.loginUseCase.execute(body.email, body.password, sessionContext(req), body.totpCode);
      if (session.requires2FA) {
        res.status(200).json({ success: true, data: { requires2FA: true, email: session.user.email } });
        return;
      }
      setSessionCookies(res, session.accessToken, session.refreshToken);
      res.status(200).json({ success: true, data: { user: session.user } });
    } catch (error) { next(error); }
  };

  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      validateCsrfOrigin(req);
      const refreshToken = cookieValue(req, REFRESH_COOKIE);
      const session = await this.refreshUseCase.execute(refreshToken, sessionContext(req));
      setSessionCookies(res, session.accessToken, session.refreshToken);
      res.status(200).json({ success: true, data: { user: session.user } });
    } catch (error) {
      clearSessionCookies(res);
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      validateCsrfOrigin(req);
      const refreshToken = cookieValue(req, REFRESH_COOKIE);
      await this.logoutUseCase.execute(refreshToken);
      clearSessionCookies(res);
      res.status(200).json({ success: true, data: { message: 'Signed out successfully.' } });
    } catch (error) { next(error); }
  };

  me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.auth?.sub) throw new UnauthorizedError();
      const user = await this.currentUserUseCase.execute(req.auth.sub);
      if (req.auth.organizationId !== user.organizationId) {
        res.cookie(ACCESS_COOKIE, issueAccessToken(user as any), cookieOptions(ACCESS_TTL_MS, ACCESS_COOKIE_PATH));
      }
      res.status(200).json({ success: true, data: { user } });
    } catch (error) { next(error); }
  };

  forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      validateCsrfOrigin(req);
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const result = await this.forgotPasswordUseCase.execute(body.email);
      res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      validateCsrfOrigin(req);
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      await this.resetPasswordUseCase.execute(body.token, body.password);
      clearSessionCookies(res);
      res.status(200).json({ success: true, data: { message: 'Password reset successfully. Please sign in.' } });
    } catch (error) { next(error); }
  };

  getGoogleAuthUrl = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const redirectTo = typeof req.query.redirectTo === 'string' && req.query.redirectTo.trim()
        ? req.query.redirectTo.trim()
        : env.frontendUrl;
      if (!env.supabaseUrl) {
        throw new AppError('Chưa cấu hình SUPABASE_URL cho đăng nhập Gmail.', 503);
      }
      const url = `${env.supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`;
      res.status(200).json({ success: true, data: { url } });
    } catch (error) { next(error); }
  };

  exchangeGoogleToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      validateCsrfOrigin(req);
      if (!this.authRepository) throw new AppError('Auth repository unavailable.', 500);
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const supabaseAccessToken = typeof body.accessToken === 'string' ? body.accessToken.trim() : '';
      if (!supabaseAccessToken) throw new ValidationError('Google/Supabase access token is required.');
      if (!env.supabaseUrl || !env.supabaseAnonKey) {
        throw new AppError('SUPABASE_URL / SUPABASE_ANON_KEY chưa được cấu hình trên server.', 503);
      }

      let supaUser: any;
      try {
        const resp = await axios.get(`${env.supabaseUrl}/auth/v1/user`, {
          headers: {
            apikey: env.supabaseAnonKey,
            Authorization: `Bearer ${supabaseAccessToken}`
          },
          timeout: 8000
        });
        supaUser = resp.data;
      } catch {
        throw new UnauthorizedError('Không thể xác thực phiên đăng nhập Gmail từ Supabase.');
      }

      const email = typeof supaUser?.email === 'string' ? supaUser.email.trim().toLowerCase() : '';
      if (!email) throw new UnauthorizedError('Tài khoản Gmail không cung cấp địa chỉ email hợp lệ.');

      let user = await this.authRepository.findUserByEmail(email);
      if (!user && this.dbPool) {
        const fullName =
          supaUser?.user_metadata?.full_name ||
          supaUser?.user_metadata?.name ||
          email.split('@')[0];
        const avatarUrl = supaUser?.user_metadata?.avatar_url || supaUser?.user_metadata?.picture || null;

        // Provision user inside default/first organization or create personal org
        const orgRes = await this.dbPool.query<{ id: string }>(
          `SELECT id FROM organizations ORDER BY created_at ASC LIMIT 1;`
        );
        let orgId = orgRes.rows[0]?.id;
        if (!orgId) {
          const newOrg = await this.dbPool.query<{ id: string }>(
            `INSERT INTO organizations (name, domain, plan) VALUES ($1, $2, 'FREE') RETURNING id;`,
            [`${fullName}'s Workspace`, email.split('@')[1] || null]
          );
          orgId = newOrg.rows[0].id;
        }
        await this.dbPool.query(
          `INSERT INTO users (supabase_auth_id, organization_id, email, full_name, avatar_url, role, status)
           VALUES ($1, $2, $3, $4, $5, 'VIEWER', 'ACTIVE')
           ON CONFLICT (email) DO UPDATE SET supabase_auth_id = EXCLUDED.supabase_auth_id, updated_at = NOW();`,
          [supaUser.id || null, orgId, email, fullName, avatarUrl]
        );
        user = await this.authRepository.findUserByEmail(email);
      }

      if (!user || user.status !== 'ACTIVE') {
        throw new UnauthorizedError('Tài khoản Gmail này chưa được kích hoạt hoặc đã bị khóa.');
      }

      const refreshToken = createOpaqueToken();
      const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
      await this.authRepository.createRefreshToken(user.id, hashToken(refreshToken), expiresAt, sessionContext(req));
      setSessionCookies(res, issueAccessToken(user), refreshToken);
      res.status(200).json({ success: true, data: { user: toPublicUser(user) } });
    } catch (error) { next(error); }
  };
}
