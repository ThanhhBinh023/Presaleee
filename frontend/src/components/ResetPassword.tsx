import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import { authService } from '../services/authService';

interface ResetPasswordProps {
  onBackToHome: () => void;
  onDone: () => void;
}

function readTokenFromHash(): string {
  const query = window.location.hash.split('?')[1] || '';
  return new URLSearchParams(query).get('token') || '';
}

export const ResetPassword: React.FC<ResetPasswordProps> = ({ onBackToHome, onDone }) => {
  const [token] = useState(readTokenFromHash);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (password !== confirm) {
      setFormError('Passwords do not match.');
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await authService.resetPassword(token, password);
      setDone(true);
      setFormError(result.message);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Reset failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const invalidToken = token.length === 0;

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#fafbfa] text-slate-900 relative py-8 sm:py-12 px-4 sm:px-6">
      <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none -z-10" />

      <div className="max-w-md w-full mx-auto">
        <button
          onClick={onBackToHome}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors py-1.5 px-2.5 rounded-lg hover:bg-slate-100"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </button>
      </div>

      <div className="my-auto max-w-md w-full mx-auto">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-elevated p-6 sm:p-9">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Set a new password</h1>
          <p className="mt-2 text-xs text-slate-500">
            {invalidToken
              ? 'This reset link is missing its token. Request a new one from the sign-in screen.'
              : 'Choose a new password between 12 and 128 characters. Your old sessions are revoked after reset.'}
          </p>

          {formError && (
            <div
              className={`mt-5 rounded-xl border px-3.5 py-2.5 text-xs ${done ? 'border-brand-200 bg-emerald-50 text-brand-800' : 'border-red-200 bg-red-50 text-red-700'}`}
              role={done ? 'status' : 'alert'}
            >
              {formError}
            </div>
          )}

          {!invalidToken && !done && (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="newPassword" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  New password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  required
                  minLength={12}
                  maxLength={128}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-500"
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Confirm password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-500"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold shadow-lg shadow-brand-500/25 disabled:opacity-70"
              >
                <span>{isSubmitting ? 'Updating...' : 'Reset password'}</span>
                {!isSubmitting && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          )}

          {done && (
            <button
              onClick={onDone}
              className="mt-6 w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold shadow-lg shadow-brand-500/25"
            >
              <span>Sign in with your new password</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-500 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
            <span>Token is single-use.</span>
          </div>
        </div>
      </div>

      <div />
    </div>
  );
};