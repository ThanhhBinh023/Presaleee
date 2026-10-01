import React, { useState } from 'react';
import { 
  ArrowRight, 
  Mic, 
  CheckCircle2, 
  Play, 
  Pause, 
  Sparkles,
  AlertTriangle,
  Radio
} from 'lucide-react';

export const PillarTwo: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);

  // Frequency wave height bars
  const waveHeights = [
    8, 14, 22, 18, 10, 24, 28, 16, 12, 20, 26, 14, 8, 19, 25, 30, 22, 15, 11, 24, 18, 10, 16, 26, 20, 12, 8
  ];

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
                    <Mic className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-mono font-medium text-slate-500 block">
                      Discovery Session Analysis
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 font-mono">
                      48m 12s Audio Transcript
                    </h4>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-50 text-brand-700 border border-brand-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500"></span>
                  Complete
                </span>
              </div>

              {/* Audio Transcript snippet & Waveform */}
              <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="text-xs font-mono text-slate-800 font-semibold">
                    CTO [Prospect]:
                  </div>
                  <span className="self-start sm:self-auto text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-100 text-brand-800 border border-brand-200">
                    Highlight: Pain Point #1
                  </span>
                </div>

                <p className="text-xs sm:text-sm font-mono text-slate-700 leading-relaxed italic bg-white p-3 rounded-lg border border-slate-200 mb-4">
                  "Our primary hurdle is zero-downtime database replication during peak retail traffic."
                </p>

                {/* Audio Waveform Player */}
                <div className="bg-slate-900 rounded-lg p-3 flex items-center gap-3">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-8 h-8 rounded-full bg-brand-500 hover:bg-brand-400 text-white flex items-center justify-center shrink-0 shadow-sm transition-colors"
                    aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                  </button>

                  <div className="flex-1 flex items-center justify-between gap-1 h-8 overflow-hidden px-2">
                    {waveHeights.map((h, i) => (
                      <span
                        key={i}
                        className={`w-1 rounded-full transition-all duration-300 ${
                          isPlaying 
                            ? 'bg-brand-400' 
                            : 'bg-slate-600'
                        }`}
                        style={{
                          height: isPlaying ? `${Math.max(6, (h * ((i % 3) + 1)) % 32)}px` : `${h}px`
                        }}
                      />
                    ))}
                  </div>

                  <span className="text-[11px] font-mono text-slate-400 shrink-0">
                    12:44 / 48:12
                  </span>
                </div>

              </div>

              {/* 2 Side-by-side analysis cards */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                
                {/* Technical Constraint */}
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
                  <div className="text-[10px] font-mono font-bold tracking-wider text-brand-700 uppercase mb-1.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-500"></span>
                    HARD TECHNICAL CONSTRAINT
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Existing SQL Database must stay live during phase 1 dual-write validation.
                  </p>
                </div>

                {/* Stakeholder Risk */}
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
                  <div className="text-[10px] font-mono font-bold tracking-wider text-amber-600 uppercase mb-1.5 flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3 text-amber-500" />
                    STAKEHOLDER RISK IDENTIFIED
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Security VP expressed hesitation over multi-tenant cloud tenancy.
                  </p>
                </div>

              </div>

              {/* Bottom Architectural Hypothesis */}
              <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-brand-200/80">
                <div className="text-[11px] font-mono font-bold tracking-wider text-brand-700 uppercase mb-1.5 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                  AUTO-GENERATED ARCHITECTURAL HYPOTHESIS
                </div>
                <p className="text-xs sm:text-sm text-slate-800 font-mono leading-relaxed bg-white p-3 rounded-lg border border-slate-200">
                  Deploy CDC (Change Data Capture) directly to Kafka cluster; inject VPC peering to satisfy Security VP tenancy mandate.
                </p>
              </div>

            </div>
          </div>

          {/* Right Column: Narrative */}
          <div className="lg:col-span-5 space-y-6 order-1 lg:order-2">
            
            {/* Pillar Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-50 text-brand-700 border border-brand-200">
              <Radio className="w-3.5 h-3.5" />
              <span>PILLAR 02</span>
            </div>

            {/* Title */}
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Synthesize insights from every meeting, not just one.
            </h2>

            {/* Description */}
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
              Presale engineers participate in dozens of discovery hours each week.
              Presaleee's session model automatically stitches multiple technical discussions
              into unified architectural scopes without manual note re-formatting.
            </p>

            {/* Checklist */}
            <ul className="space-y-3.5 pt-2">
              <li className="flex items-start gap-3">
                <div className="mt-0.5 w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 text-brand-600">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-slate-700 leading-snug">
                  Real-time technical term and constraint extraction
                </span>
              </li>

              <li className="flex items-start gap-3">
                <div className="mt-0.5 w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 text-brand-600">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-slate-700 leading-snug">
                  Automated cross-referencing against internal engineering blueprints
                </span>
              </li>

              <li className="flex items-start gap-3">
                <div className="mt-0.5 w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 text-brand-600">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-slate-700 leading-snug">
                  Instant conversion of prospect objections into proposal mitigation clauses
                </span>
              </li>
            </ul>

            {/* Link */}
            <div className="pt-2">
              <a
                href="#discovery-intelligence"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700 group"
              >
                <span>See discovery intelligence in action</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
};
