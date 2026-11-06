import dotenv from 'dotenv';
import path from 'path';

// Support loading .env from current directory, backend/.env, or parent folder
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export interface AppConfig {
  port: number;
  databaseUrl: string;
  geminiApiKey: string;
  aiServiceUrl: string;
  nodeEnv: string;
  jwtAccessSecret: string;
  authCookieSecure: boolean;
  authCookieSameSite: 'strict' | 'lax' | 'none';
  frontendUrl: string;
  passwordResetTokenTtlMinutes: number;
}

const cookieSameSite = (process.env.AUTH_COOKIE_SAME_SITE || 'lax').toLowerCase();
if (!['strict', 'lax', 'none'].includes(cookieSameSite)) {
  throw new Error('AUTH_COOKIE_SAME_SITE must be strict, lax, or none.');
}

const jwtAccessSecret = process.env.JWT_ACCESS_SECRET || '';
if (jwtAccessSecret && Buffer.byteLength(jwtAccessSecret, 'utf8') < 32) {
  throw new Error('JWT_ACCESS_SECRET must contain at least 32 bytes.');
}

const passwordResetTokenTtlMinutes = Number.parseInt(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES || '30', 10);
if (!Number.isInteger(passwordResetTokenTtlMinutes) || passwordResetTokenTtlMinutes < 5 || passwordResetTokenTtlMinutes > 1440) {
  throw new Error('PASSWORD_RESET_TOKEN_TTL_MINUTES must be an integer from 5 to 1440.');
}

export const env: AppConfig = {
  port: parseInt(process.env.PORT || '5000', 10),
  databaseUrl: process.env.DATABASE_URL || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtAccessSecret,
  authCookieSecure: process.env.AUTH_COOKIE_SECURE === 'true',
  authCookieSameSite: cookieSameSite as AppConfig['authCookieSameSite'],
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  passwordResetTokenTtlMinutes
};

