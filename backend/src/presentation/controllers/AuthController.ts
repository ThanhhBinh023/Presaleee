import { Request, Response, NextFunction } from 'express';
import { AppError, UnauthorizedError, ValidationError } from '../../domain/errors/AppError.js';
import { GetCurrentUserUseCase, LoginUseCase, RefreshSessionUseCase, LogoutUseCase, ForgotPasswordUseCase, ResetPasswordUseCase } from '../../application/use-cases/AuthUseCases.js';
import { AuthSessionContext } from '../../domain/entities/AuthUser.js';
import { env } from '../../infrastructure/config/env.js';

const ACCESS_COOKIE = 'presaleee_access';
const REFRESH_COOKIE = 'presaleee_refresh';
const ACCESS_TTL_MS = 15 * 60 * 1000;
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
  if (requestOrigin !== expectedOrigin) throw new AppError('Request origin is not allowed.', 403);
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
    private readonly resetPasswordUseCase: ResetPasswordUseCase
  ) {}

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      validateCsrfOrigin(req);
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const session = await this.loginUseCase.execute(body.email, body.password, sessionContext(req));
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
}
