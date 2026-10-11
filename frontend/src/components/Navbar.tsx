import React, { useState } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';

interface NavbarProps {
  onSignInClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onSignInClick }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-white/85 border-b border-slate-200/70 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <a href="#" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-sm shadow-brand-500/30 group-hover:scale-105 transition-transform">
              <span className="font-bold font-mono text-base tracking-tighter">P</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-brand-600 transition-colors">
              Presaleee
            </span>
          </a>

          {/* Version badge */}
          <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-50 text-brand-700 border border-brand-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse"></span>
            V2.4 CORE
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <a href="#features" className="hover:text-slate-900 transition-colors">
            Features
          </a>
          <a href="#ai-capabilities" className="hover:text-slate-900 transition-colors flex items-center gap-1">
            <span>AI Capabilities</span>
            <span className="text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded bg-brand-100 text-brand-800">
              New
            </span>
          </a>
          <a href="#resources" className="hover:text-slate-900 transition-colors">
            Resources
          </a>
          <a href="#pricing" className="hover:text-slate-900 transition-colors">
            Pricing
          </a>
        </nav>

        {/* Right CTA Actions */}
        <div className="hidden sm:flex items-center gap-4">
          <button
            onClick={() => {
              if (onSignInClick) onSignInClick();
              else window.location.hash = '#signin';
            }}
            className="text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors px-2 py-1"
          >
            Sign in
          </button>
          <a
            href="#contact"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-brand-500 hover:bg-brand-600 text-white shadow-sm shadow-brand-500/25 hover:shadow-md hover:shadow-brand-500/30 transition-all active:scale-[0.98]"
          >
            <span>Contact sales</span>
            <ArrowRight className="w-4 h-4" />
          </a>

          {/* User Avatar preview */}
          <div className="w-8 h-8 rounded-full border border-slate-300 overflow-hidden bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-600">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&h=96&auto=format&fit=crop&crop=faces"
              alt="User Avatar"
              className="w-full h-full object-cover"
              onError={(e) => {
                // fallback if network is restricted
                e.currentTarget.style.display = 'none';
              }}
            />
            <span className="text-slate-700 font-semibold">SA</span>
          </div>
        </div>

        {/* Mobile menu trigger button */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white/95 px-4 pt-3 pb-6 space-y-3">
          <a
            href="#features"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
          >
            Features
          </a>
          <a
            href="#ai-capabilities"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
          >
            AI Capabilities
          </a>
          <a
            href="#resources"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
          >
            Resources
          </a>
          <a
            href="#pricing"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
          >
            Pricing
          </a>
          <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                if (onSignInClick) onSignInClick();
                else window.location.hash = '#signin';
              }}
              className="w-full text-center py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-lg"
            >
              Sign in
            </button>
            <a
              href="#contact"
              className="text-center py-2.5 text-sm font-semibold bg-brand-500 text-white rounded-lg shadow-sm"
            >
              Contact sales
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
