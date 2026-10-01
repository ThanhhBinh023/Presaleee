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

interface SignInProps {
  onBackToHome: () => void;
  onLoginSuccess?: () => void;
}

export const SignIn: React.FC<SignInProps> = ({ onBackToHome, onLoginSuccess }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setSubmitted(true);
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    }, 600);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#fafbfa] text-slate-900 relative selection:bg-brand-500 selection:text-white py-8 sm:py-12 px-4 sm:px-6">
      {/* Background subtle architectural grid & glow */}
      <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none -z-10" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-brand-200/40 via-emerald-100/30 to-transparent blur-3xl pointer-events-none rounded-full -z-10" />

      {/* Top Bar with Back Button & Presale Auth Badge */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between">
        <button
          onClick={onBackToHome}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors py-1.5 px-2.5 rounded-lg hover:bg-slate-100"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </button>

        {/* PRESALE AUTH CORE V2.4 pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-50 text-brand-800 border border-brand-200 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
          <span>PRESALE AUTH CORE V2.4</span>
        </div>
      </div>

      {/* Center Sign In Card */}
      <div className="my-auto max-w-md w-full mx-auto">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-elevated p-6 sm:p-9 relative">
          
          {/* Top Brand Icon */}
          <div className="flex justify-center mb-5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-md shadow-brand-500/25">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
          </div>

          {/* Heading & Subtitle */}
          <div className="text-center mb-7">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Sign in to Presaleee
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">
              Welcome back. Enter your credentials to access your presale workspace.
            </p>
          </div>

          {/* Social / SSO Auth Button */}
          <button
            type="button"
            onClick={onLoginSuccess}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-all shadow-sm group"
          >
            {/* Google SVG Icon */}
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.27 21.41 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.98 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.27 2.59 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Divider */}
          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <span className="relative px-3 bg-white text-[11px] font-mono font-semibold tracking-wider text-slate-400 uppercase">
              OR CONTINUE WITH EMAIL
            </span>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Work Email Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Work Email
                </label>
                <span className="text-[11px] font-mono text-slate-400">
                  corporate_id
                </span>
              </div>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@company.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white text-slate-900 text-sm font-mono placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-500 transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Password
                </label>
                <a
                  href="#forgot"
                  onClick={(e) => e.preventDefault()}
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline transition-colors"
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
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

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white text-sm font-semibold shadow-lg shadow-brand-500/25 hover:shadow-brand-500/35 transition-all disabled:opacity-70 active:scale-[0.99]"
              >
                {isLoading ? (
                  <span>Authenticating...</span>
                ) : submitted ? (
                  <span>Success! Entering Workspace...</span>
                ) : (
                  <>
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {/* SAML / Enterprise SSO Button (Excluding specific trademarked names) */}
            <div className="pt-1">
              <button
                type="button"
                onClick={onLoginSuccess}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/70 hover:bg-slate-100/70 text-slate-700 text-xs font-mono font-medium transition-all"
              >
                <KeyRound className="w-3.5 h-3.5 text-brand-600" />
                <span>Sign in with SAML / Enterprise SSO</span>
              </button>
            </div>

          </form>

          {/* Don't have an account */}
          <div className="mt-6 text-center text-xs text-slate-500">
            <span>Don't have an account? </span>
            <button
              onClick={onBackToHome}
              className="font-semibold text-brand-600 hover:text-brand-700 hover:underline transition-colors"
            >
              Get started
            </button>
          </div>

        </div>
      </div>

      {/* Bottom Compliance & Security Footer */}
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
