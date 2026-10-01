import React from 'react';
import { 
  ArrowRight, 
  FileEdit, 
  CheckCircle2, 
  Eye, 
  RefreshCw, 
  Code2,
  FileCheck2
} from 'lucide-react';

export const PillarThree: React.FC = () => {

  return (
    <section className="py-20 lg:py-28 relative border-t border-slate-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          
          {/* Left Column: Narrative */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Pillar Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-50 text-brand-700 border border-brand-200">
              <FileEdit className="w-3.5 h-3.5" />
              <span>PILLAR 03</span>
            </div>

            {/* Title */}
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Generate data-driven proposals &amp; briefs with AI assistance.
            </h2>

            {/* Description */}
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
              Move from days of drafting to minutes of fine-tuning. Presaleee constructs
              comprehensive Statements of Work (SOW), high-fidelity technical proposals, effort
              estimations, and UI design briefs directly backed by discovery inputs.
            </p>

            {/* Checklist */}
            <ul className="space-y-3.5 pt-2">
              <li className="flex items-start gap-3">
                <div className="mt-0.5 w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 text-brand-600">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-slate-700 leading-snug">
                  Split Markdown authoring + client-ready live presentation canvas
                </span>
              </li>

              <li className="flex items-start gap-3">
                <div className="mt-0.5 w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 text-brand-600">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-slate-700 leading-snug">
                  Dynamic timeline, milestone &amp; FTE story point calculations
                </span>
              </li>

              <li className="flex items-start gap-3">
                <div className="mt-0.5 w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 text-brand-600">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-slate-700 leading-snug">
                  Export directly to PDF, Docs, web portal, or custom branded domains
                </span>
              </li>
            </ul>

            {/* Link */}
            <div className="pt-2">
              <a
                href="#proposal-studio"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700 group"
              >
                <span>Preview live proposal studio</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>

          </div>

          {/* Right Column: Dual-Pane Proposal Studio Mockup (Light Theme) */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-5 sm:p-7 relative transition-all hover:border-slate-300">
              
              {/* Studio Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-slate-700">
                    PREVIEW: SOW-2025-089 // Core Cloud Modernization
                  </span>
                </div>

                <div className="inline-flex items-center gap-1.5 text-xs font-mono text-brand-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-brand-200">
                  <RefreshCw className="w-3 h-3 text-brand-600 animate-spin" />
                  <span>Live Sync Enabled</span>
                </div>
              </div>

              {/* Dual-Pane Editor & Client Preview */}
              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Left Pane: Markdown Copilot Editor */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 font-mono text-xs flex flex-col justify-between">
                  <div>
                    <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-3 flex items-center justify-between">
                      <span>PRESALEEE COPILOT EDITOR</span>
                      <Code2 className="w-3.5 h-3.5 text-slate-400" />
                    </div>

                    <div className="space-y-1.5 text-slate-700 text-[11px] leading-relaxed">
                      <div className="text-brand-700 font-bold"># Scope of Work: Phase 1</div>
                      <div className="text-slate-800 font-semibold mt-2">## Deliverable 1.1 Architecture</div>
                      <div className="text-slate-600">- Zero-trust API Gateway</div>
                      <div className="text-slate-600">- Event bus deployment (Kafka)</div>
                      <div className="text-slate-600">- Multi-region RDS rollover</div>
                      
                      <div className="text-slate-800 font-semibold mt-3">## Effort Estimation:</div>
                      <div className="text-slate-600">- 2x Lead Cloud Architect (8 wks)</div>
                      <div className="text-slate-600">- 3x Senior Systems Eng (12 wks)</div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 text-brand-700 font-bold text-xs flex items-center justify-between">
                    <span>Total:</span>
                    <span className="bg-emerald-100 text-brand-800 px-2 py-0.5 rounded">480 Person-Hours</span>
                  </div>
                </div>

                {/* Right Pane: Client Interactive View */}
                <div className="rounded-xl border border-brand-200/80 bg-gradient-to-b from-white to-slate-50 p-4 flex flex-col justify-between shadow-sm">
                  <div>
                    <div className="flex items-center justify-between mb-3 text-[10px] font-mono font-bold">
                      <span className="text-brand-700 uppercase tracking-wider">CLIENT INTERACTIVE VIEW</span>
                      <span className="text-slate-900 bg-slate-100 px-2 py-0.5 rounded font-mono">$248,000 Est.</span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 mb-1.5">
                      Phase 1: Foundation
                    </h4>

                    <p className="text-xs text-slate-600 leading-relaxed mb-4">
                      Full infrastructure migration with automated rollback capabilities and 99.99% SLA commitment.
                    </p>

                    {/* Progress indicator */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-slate-500">Phase Progress</span>
                        <span className="font-semibold text-brand-600">75% Scoped</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-brand-500 rounded-full w-3/4 shadow-sm" />
                      </div>
                    </div>
                  </div>

                  {/* Sign-off ready footer */}
                  <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 font-mono">
                      <FileCheck2 className="w-3.5 h-3.5 text-brand-600" />
                      Sign-off Ready
                    </span>

                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white shadow-sm transition-all">
                      <Eye className="w-3 h-3" />
                      <span>Client View</span>
                    </button>
                  </div>

                </div>

              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
