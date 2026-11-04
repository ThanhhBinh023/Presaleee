import React, { useState } from 'react';
import {
  ArrowRight,
  Sparkles,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowLeft,
  KeyRound
} from 'lucide-react';
import { authService } from '../services/authService';
import { useAuth } from '../hooks/useAuth';

interface SignInProps {
  onBackToHome: () => void;
  onLoginSuccess?: () => void;
}

type AuthMode = 'signin' | 'register' | 'forgot';

const modeCopy: Record<AuthMode, { title: string; subtitle: string; submit: string }> = {
  signin: {
    title: 'Sign in to Presaleee',
    subtitle: 'Welcome back. Enter your credentials to access your presale workspace.',
    submit: 'Continue'
  },
  register: {
    title: 'Create your workspace',
    subtitle: 'Set up your organization and first admin account. Password needs 12-128 characters.',
    submit: 'Create account'
  },
  forgot: {
    title: 'Reset your password',
    subtitle: 'Enter your work email and we will send reset instructions.',
    submit: 'Send reset link'
  }
};

export const SignIn: React.FC<SignInProps> = ({ onBackToHome, onLoginSuccess }) => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [organizationDomain, setOrganizationDomain] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setFormError(null);
    setNotice(null);
    setDevResetUrl(null);
    setPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    setNotice(null);

    try {
      if (mode === 'signin') {
        await login({ email, password });
        if (onLoginSuccess) onLoginSuccess();
      } else if (mode === 'register') {
        await register({ email, password, fullName, organizationName, organizationDomain });
        if (onLoginSuccess) onLoginSuccess();
      } else {
        const result = await authService.forgotPassword(email);
        setNotice(result.message);
        if (result.resetUrl) setDevResetUrl(result.resetUrl);
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openResetLink = () => {
    if (!devResetUrl) return;
    const hash = devResetUrl.split('#')[1];
    if (hash) window.location.hash = hash;
  };

  const copy = modeCopy[mode];
  const busyLabel = mode === 'signin' ? 'Signing in...' : mode === 'register' ? 'Creating account...' : 'Sending...';

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#fafbfa] text-slate-900 relative selection:bg-brand-500 selection:text-white py-8 sm:py-12 px-4 sm:px-6">
      <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none -z-10" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-brand-200/40 via-emerald-100/30 to-transparent blur-3xl pointer-events-none rounded-full -z-10" />

      {/* Top Bar */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between">
        <button
          onClick={onBackToHome}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors py-1.5 px-2.5 rounded-lg hover:bg-slate-100"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </button>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-50 text-brand-800 border border-brand-200 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
          <span>PRESALE AUTH CORE V2.4</span>
        </div>
      </div>

      {/* Card */}
      <div className="my-auto max-w-md w-full mx-auto">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-elevated p-6 sm:p-9 relative">

          <div className="flex justify-center mb-5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-md shadow-brand-500/25">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
          </div>

          <div className="text-center mb-7">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{copy.title}</h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">{copy.subtitle}</p>
          </div>

          {/* Inline feedback */}
          {formError && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700" role="alert">
              {formError}
            </div>
          )}
          {notice && (
            <div className="mb-5 rounded-xl border border-brand-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-brand-800" role="status">
              <p>{notice}</p>
              {devResetUrl && (
                <button
                  onClick={openResetLink}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-brand-700 hover:text-brand-900 hover:underline"
                >
                  [dev] Open reset link
                </button>
              )}
            </div>
          )}

          {/* SSO: not implemented yet */}
          {mode === 'signin' && (
            <button
              type="button"
              disabled
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-400 text-sm font-medium cursor-not-allowed"
            >
              <svg className="w-4 h-4 shrink-0 opacity-40" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.27 21.41 7.33 24 12 24z" />
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.98 0 12s.46 3.84 1.26 5.42l4.02-3.15z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.27 2.59 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
              </svg>
              <span>Continue with Google - chưa hỗ trợ</span>
            </button>
          )}

          {mode === 'signin' && (
            <div className="relative my-6 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <span className="relative px-3 bg-white text-[11px] font-mono font-semibold tracking-wider text-slate-400 uppercase">
                OR CONTINUE WITH EMAIL
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="fullName" className="text-xs font-semibold text-slate-700">Full name</label>
                  <span className="text-[11px] font-mono text-slate-400">fullName</span>
                </div>
                <input
                  id="fullName"
                  required
                  maxLength={255}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alex Nguyen"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-500 transition-all"
                />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="email" className="text-xs font-semibold text-slate-700">Work Email</label>
                <span className="text-[11px] font-mono text-slate-400">email</span>
              </div>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@company.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white text-slate-900 text-sm font-mono placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-500 transition-all"
              />
            </div>

            {mode === 'register' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="orgName" className="text-xs font-semibold text-slate-700">Organization</label>
                  <span className="text-[11px] font-mono text-slate-400">required</span>
                </div>
                <input
                  id="orgName"
                  required
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder="Acme Presales"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-500 transition-all"
                />
              </div>
            )}

            {mode === 'register' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="orgDomain" className="text-xs font-semibold text-slate-700">Domain (optional)</label>
                  <span className="text-[11px] font-mono text-slate-400">acme.com</span>
                </div>
                <input
                  id="orgDomain"
                  value={organizationDomain}
                  onChange={(e) => setOrganizationDomain(e.target.value)}
                  placeholder="acme.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white text-slate-900 text-sm font-mono placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-500 transition-all"
                />
              </div>
            )}

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="text-xs font-semibold text-slate-700">Password</label>
                  {mode === 'signin' ? (
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline transition-colors"
                    >
                      Forgot password?
                    </button>
                  ) : (
                    <span className="text-[11px] font-mono text-slate-400">12-128 chars</span>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={mode === 'register' ? 12 : undefined}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white text-slate-900 text-sm font-mono placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white text-sm font-semibold shadow-lg shadow-brand-500/25 hover:shadow-brand-500/35 transition-all disabled:opacity-70 active:scale-[0.99]"
              >
                <span>{isSubmitting ? busyLabel : copy.submit}</span>
                {!isSubmitting && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>

            {mode === 'signin' && (
              <div className="pt-1">
                <button
                  type="button"
                  disabled
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-400 text-xs font-mono cursor-not-allowed"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>SAML / Enterprise SSO - chưa hỗ trợ</span>
                </button>
              </div>
            )}
          </form>

          {/* Mode switch */}
          <div className="mt-6 text-center text-xs text-slate-500">
            {mode === 'signin' && (
              <>
                <span>Don&apos;t have an account? </span>
                <button onClick={() => switchMode('register')} className="font-semibold text-brand-600 hover:text-brand-700 hover:underline transition-colors">
                  Get started
                </button>
              </>
            )}
            {mode === 'register' && (
              <>
                <span>Already have an account? </span>
                <button onClick={() => switchMode('signin')} className="font-semibold text-brand-600 hover:text-brand-700 hover:underline transition-colors">
                  Sign in
                </button>
              </>
            )}
            {mode === 'forgot' && (
              <button onClick={() => switchMode('signin')} className="font-semibold text-brand-600 hover:text-brand-700 hover:underline transition-colors">
                Back to sign in
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-md w-full mx-auto text-center mt-8 space-y-3">
        <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
          <span>Protected by SOC-2 Type II enterprise encryption.</span>
        </div>
        <div className="flex items-center justify-center gap-4 text-[11px] font-mono text-slate-400">
          <a href="#privacy" className="hover:text-slate-700 transition-colors">PRIVACY</a>
          <span>•</span>
          <a href="#terms" className="hover:text-slate-700 transition-colors">TERMS OF SERVICE</a>
          <span>•</span>
          <a href="#whitepaper" className="hover:text-slate-700 transition-colors">SECURITY WHITEPAPER</a>
        </div>
      </div>
    </div>
  );
};