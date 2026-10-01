import React, { useState } from 'react';
import { 
  ArrowRight, 
  Mail, 
  CheckCircle2, 
  Compass, 
  FileText
} from 'lucide-react';

export const Hero: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(0);

  const steps = [
    {
      num: '01 INTAKE',
      icon: Mail,
      title: 'AI Ingestion',
      desc: 'Multi-channel RFP, Slack brief & email parsing',
      metricLabel: 'Latency',
      metricValue: '180ms',
      highlightColor: 'text-brand-600 bg-brand-50 border-brand-200'
    },
    {
      num: '02 SCORING',
      icon: CheckCircle2,
      title: 'Lead Qualification',
      desc: 'Budget, BANT & architecture feasibility index',
      metricLabel: 'Match Index',
      metricValue: '96.8 / 100',
      highlightColor: 'text-brand-600 bg-brand-50 border-brand-200'
    },
    {
      num: '03 SYNTHESIS',
      icon: Compass,
      title: 'Deep Discovery',
      desc: 'Auto-synthesis of client calls, constraints & risks',
      metricLabel: 'Extracted Points',
      metricValue: '14 pts / 7 reqs',
      highlightColor: 'text-brand-600 bg-brand-50 border-brand-200'
    },
    {
      num: '04 COMPOSE',
      icon: FileText,
      title: 'Proposal Engine',
      desc: 'SOW, UI briefs, timeline & effort matrices ready',
      metricLabel: 'Generation Time',
      metricValue: '4.2 min',
      highlightColor: 'text-brand-600 bg-brand-50 border-brand-200'
    }
  ];

  return (
    <section className="relative pt-12 pb-20 md:pt-16 md:pb-28 overflow-hidden">
      {/* Background radial gradient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-brand-200/40 via-emerald-100/30 to-transparent blur-3xl pointer-events-none rounded-full -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Announce Pill */}
        <div className="flex justify-center mb-6">
          <a
            href="#ai-capabilities"
            className="group inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium bg-emerald-50/90 hover:bg-emerald-100/90 text-brand-900 border border-brand-200 shadow-sm transition-all"
          >
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
            <span className="font-semibold tracking-wide uppercase text-[11px] text-brand-700">
              Announcing Presaleee 2.0
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-700 font-normal">The Next-Gen Presale Engine</span>
            <ArrowRight className="w-3.5 h-3.5 text-brand-600 group-hover:translate-x-0.5 transition-transform" />
          </a>
        </div>

        {/* Main Title & Subtitle */}
        <div className="text-center max-w-4xl mx-auto mb-10">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.12]">
            The AI workspace that transforms inquiries into{' '}
            <span className="text-brand-600 underline decoration-brand-300 decoration-wavy decoration-2 underline-offset-4">
              winning proposals.
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed font-normal">
            From intake to engagement, Presaleee powers your entire IT presale pipeline with integrated AI,
            technical discovery intelligence, and automated architectural drafting.
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#contact"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-base font-semibold bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/25 hover:shadow-brand-500/35 transition-all active:scale-[0.98]"
            >
              <span>Get started</span>
              <ArrowRight className="w-4 h-4" />
            </a>

            <a
              href="#signin"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-base font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-300/90 shadow-sm transition-all"
            >
              <Mail className="w-4 h-4 text-slate-500" />
              <span>Sign up with Work Email</span>
            </a>
          </div>
        </div>

        {/* 4 Metric Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-5xl mx-auto mb-14">
          <div className="bg-white/90 backdrop-blur border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md hover:border-brand-300 transition-all text-left">
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              74<span className="text-brand-600">%</span>
            </div>
            <div className="mt-2 text-xs sm:text-sm font-medium text-slate-500">
              Faster proposal turnaround
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md hover:border-brand-300 transition-all text-left">
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              98.4<span className="text-brand-600">%</span>
            </div>
            <div className="mt-2 text-xs sm:text-sm font-medium text-slate-500">
              Qualification precision rate
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md hover:border-brand-300 transition-all text-left">
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              3.2<span className="text-brand-600">×</span>
            </div>
            <div className="mt-2 text-xs sm:text-sm font-medium text-slate-500">
              Presale engineering capacity
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md hover:border-brand-300 transition-all text-left">
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              <span className="text-brand-600 font-bold">$</span>18.4M
            </div>
            <div className="mt-2 text-xs sm:text-sm font-medium text-slate-500">
              ARR won via Presaleee AI
            </div>
          </div>
        </div>

        {/* Telemetry Stream Interactive Card */}
        <div className="max-w-5xl mx-auto rounded-2xl bg-white border border-slate-300/80 shadow-card overflow-hidden">
          
          {/* Telemetry Window Header */}
          <div className="bg-slate-50/90 px-4 sm:px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-400 inline-block border border-rose-500/20"></span>
                <span className="w-3 h-3 rounded-full bg-amber-400 inline-block border border-amber-500/20"></span>
                <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block border border-emerald-500/20"></span>
              </div>
              <span className="font-mono text-xs sm:text-sm font-semibold text-slate-700">
                pipeline_engine_v2.4 // active telemetry stream
              </span>
            </div>

            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-emerald-100/70 text-brand-800 border border-brand-200">
              <span className="w-2 h-2 rounded-full bg-brand-500 animate-ping"></span>
              <span>AUTONOMOUS ORCHESTRATOR LIVE</span>
            </div>
          </div>

          {/* 4 Pipeline Stages Cards */}
          <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50/30">
            {steps.map((step, idx) => {
              const StepIcon = step.icon;
              const isSelected = activeStep === idx;
              return (
                <div
                  key={idx}
                  onClick={() => setActiveStep(idx)}
                  className={`cursor-pointer rounded-xl p-4 transition-all border ${
                    isSelected
                      ? 'bg-white border-brand-400 shadow-md ring-2 ring-brand-100'
                      : 'bg-white/80 hover:bg-white border-slate-200/90 hover:border-slate-300 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-mono font-bold tracking-wider text-brand-700 bg-emerald-50 border border-brand-200 px-2 py-0.5 rounded">
                      {step.num}
                    </span>
                    <StepIcon className={`w-4 h-4 ${isSelected ? 'text-brand-600' : 'text-slate-400'}`} />
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mb-1">
                    {step.title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4 min-h-[32px]">
                    {step.desc}
                  </p>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-500">{step.metricLabel}</span>
                    <span className="font-semibold text-brand-700 bg-emerald-50 px-2 py-0.5 rounded border border-brand-200">
                      {step.metricValue}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Execution Log bar */}
          <div className="bg-slate-900 px-4 sm:px-6 py-3 text-xs font-mono text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-slate-800">
            <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap">
              <span className="text-brand-400 font-bold">&gt;</span>
              <span className="text-slate-400">exec:</span>
              <span className="text-emerald-300">
                presaleee.dispatch({'{'} client: "Global Enterprise", budget: "$450k", deadline: "Q3-GoLive" {'}'})
              </span>
            </div>

            <div className="flex items-center gap-3 shrink-0 text-slate-400 text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="text-emerald-400 font-semibold">Status: 200 OK</span>
              </span>
              <span>Latency: <strong className="text-slate-200 font-mono">14ms</strong></span>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
