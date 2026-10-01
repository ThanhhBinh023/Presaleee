import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-200 bg-white pt-16 pb-12 text-sm text-slate-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 pb-12 border-b border-slate-200/80">
          
          {/* Brand Info (2 columns span) */}
          <div className="lg:col-span-2 space-y-4">
            
            <div className="flex items-center gap-3">
              <a href="#" className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-sm font-bold font-mono text-sm">
                  P
                </div>
                <span className="text-xl font-bold tracking-tight text-slate-900">
                  Presaleee
                </span>
              </a>

              <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-emerald-50 text-brand-700 border border-brand-200">
                v2.4
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-500 max-w-sm leading-relaxed">
              The autonomous presale engineering platform engineered to ingest client briefs,
              automate discovery insights, and author winning IT proposals.
            </p>

            {/* Systems Operational Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono font-medium bg-slate-50 border border-slate-200 text-slate-700">
              <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
              <span>Systems Operational: <strong className="text-slate-900 font-semibold">99.99%</strong></span>
            </div>

          </div>

          {/* Column 1: PRODUCT */}
          <div>
            <h4 className="text-xs font-mono font-bold tracking-wider text-slate-900 uppercase mb-4">
              PRODUCT
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <a href="#intake" className="hover:text-brand-600 transition-colors">
                  AI Intake &amp; OCR
                </a>
              </li>
              <li>
                <a href="#discovery" className="hover:text-brand-600 transition-colors">
                  Audio Discovery
                </a>
              </li>
              <li>
                <a href="#proposal" className="hover:text-brand-600 transition-colors">
                  Proposal Engine
                </a>
              </li>
              <li>
                <a href="#winrate" className="hover:text-brand-600 transition-colors">
                  Win Rate Predictor
                </a>
              </li>
              <li>
                <a href="#integrations" className="hover:text-brand-600 transition-colors">
                  Integrations Matrix
                </a>
              </li>
            </ul>
          </div>

          {/* Column 2: RESOURCES */}
          <div>
            <h4 className="text-xs font-mono font-bold tracking-wider text-slate-900 uppercase mb-4">
              RESOURCES
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <a href="#docs" className="hover:text-brand-600 transition-colors">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#api" className="hover:text-brand-600 transition-colors">
                  REST &amp; GraphQL API
                </a>
              </li>
              <li>
                <a href="#sow" className="hover:text-brand-600 transition-colors">
                  SOW Templates
                </a>
              </li>
              <li>
                <a href="#playbooks" className="hover:text-brand-600 transition-colors">
                  Presale Playbooks
                </a>
              </li>
              <li>
                <a href="#changelog" className="hover:text-brand-600 transition-colors flex items-center gap-1.5">
                  <span>Changelog</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500"></span>
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: COMPANY */}
          <div>
            <h4 className="text-xs font-mono font-bold tracking-wider text-slate-900 uppercase mb-4">
              COMPANY
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <a href="#about" className="hover:text-brand-600 transition-colors">
                  About Presaleee
                </a>
              </li>
              <li>
                <a href="#security" className="hover:text-brand-600 transition-colors">
                  Security &amp; Trust
                </a>
              </li>
              <li>
                <a href="#careers" className="hover:text-brand-600 transition-colors flex items-center gap-1.5">
                  <span>Careers</span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-brand-100 text-brand-800">
                    Hiring
                  </span>
                </a>
              </li>
              <li>
                <a href="#contact-eng" className="hover:text-brand-600 transition-colors">
                  Contact Engineering
                </a>
              </li>
              <li>
                <a href="#privacy" className="hover:text-brand-600 transition-colors">
                  Privacy &amp; Compliance
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom copyright line */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-mono">
          <div>
            &copy; {new Date().getFullYear()} Presaleee, Inc. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <a href="#privacy" className="hover:text-slate-900 transition-colors">Privacy Policy</a>
            <a href="#terms" className="hover:text-slate-900 transition-colors">Terms of Service</a>
            <a href="#cookies" className="hover:text-slate-900 transition-colors">Security Overview</a>
          </div>
        </div>

      </div>
    </footer>
  );
};
