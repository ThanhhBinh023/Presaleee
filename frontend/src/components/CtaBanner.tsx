import React from 'react';
import { ArrowRight, Calendar, Sparkles } from 'lucide-react';

export const CtaBanner: React.FC = () => {
  return (
    <section className="py-20 lg:py-24 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Glow backdrop */}
        <div className="relative rounded-3xl bg-gradient-to-b from-emerald-50/80 via-white to-slate-50 border border-brand-200/90 shadow-elevated p-8 sm:p-14 lg:p-16 text-center overflow-hidden">
          
          {/* Subtle decorative radial gradients */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand-200/30 rounded-full blur-3xl pointer-events-none" />

          {/* Subtitle tag */}
          <div className="relative inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider text-brand-800 bg-white border border-brand-200 shadow-sm uppercase mb-6">
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
            <span>READY TO ACCELERATE PRESALE VELOCITY?</span>
          </div>

          {/* Title */}
          <h2 className="relative text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight max-w-3xl mx-auto leading-[1.15]">
            Transform your technical sales operations today.
          </h2>

          {/* Paragraph */}
          <p className="relative mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Join the modern engineering teams closing multi-million dollar contracts with
            structured, AI-orchestrated presale workflows.
          </p>

          {/* Action CTAs */}
          <div className="relative mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#trial"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-base font-semibold bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/25 hover:shadow-brand-500/35 transition-all active:scale-[0.98]"
            >
              <span>Start free trial</span>
              <ArrowRight className="w-4 h-4" />
            </a>

            <a
              href="#demo"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-base font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-sm transition-all"
            >
              <Calendar className="w-4 h-4 text-slate-500" />
              <span>Schedule architect demo</span>
            </a>
          </div>

        </div>

      </div>
    </section>
  );
};
