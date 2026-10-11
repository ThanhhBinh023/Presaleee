import React, { useState } from 'react';
import { 
  ArrowRight, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Users
} from 'lucide-react';

export const PillarFour: React.FC = () => {
  const [deployed, setDeployed] = useState(false);
  const [invited, setInvited] = useState(false);

  return (
    <section className="py-20 lg:py-28 bg-slate-50/50 relative border-t border-slate-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          
          {/* Left Column: Interactive Mockup Card (Light Theme) */}
          <div className="lg:col-span-7 order-2 lg:order-1">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-5 sm:p-7 relative transition-all hover:border-slate-300">
              
              {/* Card Header */}
              <div className="flex items-center justify-between pb-5 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-brand-200 flex items-center justify-center text-brand-600">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-mono font-medium text-slate-500 block">
                      Deal Prognosis
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 font-mono">
                      Predictive Win Rate
                    </h4>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-50 text-brand-700 border border-brand-200">
                  WIN PROBABILITY: 87%
                </span>
              </div>

              {/* Stakeholder Sentiment Matrix Card */}
              <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between mb-3.5">
                  <span className="text-xs font-bold text-slate-800 font-mono flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    Stakeholder Sentiment Matrix
                  </span>
                  <span className="text-[11px] font-mono font-bold text-brand-700 bg-emerald-100 px-2 py-0.5 rounded border border-brand-200">
                    +14% vs Benchmark
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  
                  {/* CTO */}
                  <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm text-left">
                    <div className="text-[11px] text-slate-500 font-medium">CTO (Decision Maker)</div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-xs font-bold text-brand-700 font-mono">Positive (88%)</span>
                      <span className="w-2 h-2 rounded-full bg-brand-500"></span>
                    </div>
                  </div>

                  {/* InfoSec */}
                  <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm text-left">
                    <div className="text-[11px] text-slate-500 font-medium">Head of InfoSec</div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-600 font-mono">Neutral (52%)</span>
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    </div>
                  </div>

                  {/* VP of Finance */}
                  <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm text-left">
                    <div className="text-[11px] text-slate-500 font-medium">VP of Finance</div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-xs font-bold text-brand-700 font-mono">Supportive (91%)</span>
                      <span className="w-2 h-2 rounded-full bg-brand-500"></span>
                    </div>
                  </div>

                </div>
              </div>

              {/* Recommended Next Best Actions */}
              <div className="mt-5">
                <div className="text-[11px] font-mono font-bold tracking-wider text-slate-400 uppercase mb-3">
                  RECOMMENDED NEXT BEST ACTIONS
                </div>

                <div className="space-y-2.5">
                  
                  {/* Action 1 */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-md bg-emerald-50 text-brand-600 flex items-center justify-center shrink-0 border border-brand-200">
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-medium text-slate-800">
                        Send SOC2 Type II compliance addendum to InfoSec
                      </span>
                    </div>

                    <button
                      onClick={() => setDeployed(true)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all self-end sm:self-auto ${
                        deployed 
                          ? 'bg-slate-100 text-slate-600 border border-slate-200' 
                          : 'bg-brand-500 hover:bg-brand-600 text-white shadow-sm'
                      }`}
                    >
                      {deployed ? 'Deployed ✓' : 'Deploy'}
                    </button>
                  </div>

                  {/* Action 2 */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200">
                        <Clock className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-medium text-slate-800">
                        Schedule 15-min sizing clarification with Lead DevOps
                      </span>
                    </div>

                    <button
                      onClick={() => setInvited(true)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all self-end sm:self-auto ${
                        invited 
                          ? 'bg-slate-100 text-slate-600 border border-slate-200' 
                          : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 shadow-sm'
                      }`}
                    >
                      {invited ? 'Invited ✓' : 'Invite'}
                    </button>
                  </div>

                </div>
              </div>

            </div>
          </div>

          {/* Right Column: Narrative */}
          <div className="lg:col-span-5 space-y-6 order-1 lg:order-2">
            
            {/* Pillar Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-50 text-brand-700 border border-brand-200">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>PILLAR 04</span>
            </div>

            {/* Title */}
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Predict client reactions and recommend next best actions.
            </h2>

            {/* Description */}
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
              Presaleee analyzes behavioral subtext, stakeholder participation density, and
              competitive intelligence across thousands of historical engagements to guide your
              solution team across the finish line.
            </p>

            {/* Checklist */}
            <ul className="space-y-3.5 pt-2">
              <li className="flex items-start gap-3">
                <div className="mt-0.5 w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 text-brand-600">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-slate-700 leading-snug">
                  Predictive win-probability calculated per revision
                </span>
              </li>

              <li className="flex items-start gap-3">
                <div className="mt-0.5 w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 text-brand-600">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-slate-700 leading-snug">
                  Stakeholder sentiment tracking across technical &amp; financial leads
                </span>
              </li>

              <li className="flex items-start gap-3">
                <div className="mt-0.5 w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 text-brand-600">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-slate-700 leading-snug">
                  Automated prescriptive actions that remove deal friction
                </span>
              </li>
            </ul>

            {/* Link */}
            <div className="pt-2">
              <a
                href="#predictive-intelligence"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700 group"
              >
                <span>Explore predictive intelligence</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
};
