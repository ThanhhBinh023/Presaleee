import { apiRequest } from './apiClient';
import type {
  ForgotPasswordData,
  MessageData,
  RegisterData,
  SessionData
} from '../types/auth';

const AUTH_PREFIX = '/api/v1/auth';

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  organizationName: string;
  organizationDomain?: string;
}

export const authService = {
  register: (input: RegisterInput) =>
    apiRequest<RegisterData>(`${AUTH_PREFIX}/register`, { method: 'POST', body: input }),

  login: (input: LoginInput) =>
    apiRequest<SessionData>(`${AUTH_PREFIX}/login`, { method: 'POST', body: input }),

  devLogin: (email: string = 'ntbinh1@gmail.com') =>
    apiRequest<SessionData>(`${AUTH_PREFIX}/dev-login`, { method: 'POST', body: { email } }),

  refresh: () => apiRequest<SessionData>(`${AUTH_PREFIX}/refresh`, { method: 'POST' }),

  logout: () => apiRequest<MessageData>(`${AUTH_PREFIX}/logout`, { method: 'POST' }),

  me: () => apiRequest<SessionData>(`${AUTH_PREFIX}/me`),

  forgotPassword: (email: string) =>
    apiRequest<ForgotPasswordData>(`${AUTH_PREFIX}/forgot-password`, { method: 'POST', body: { email } }),

  resetPassword: (token: string, password: string) =>
    apiRequest<MessageData>(`${AUTH_PREFIX}/reset-password`, { method: 'POST', body: { token, password } })
};