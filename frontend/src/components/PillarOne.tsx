import { 
  ArrowRight, 
  Mail, 
  Layers, 
  CheckCircle,
  CheckCircle2
} from 'lucide-react';

export const PillarOne: React.FC = () => {
  return (
    <section className="py-20 lg:py-28 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          
          {/* Left Column: Narrative */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Pillar Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-50 text-brand-700 border border-brand-200">
              <Layers className="w-3.5 h-3.5" />
              <span>PILLAR 01</span>
            </div>

            {/* Title */}
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Automate client inquiry processing and lead scoring.
            </h2>

            {/* Description */}
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
              Stop manually untangling 40-page RFP PDFs and fragmented prospect emails.
              Presaleee's intake neural network parses, categorizes technical constraints,
              and scores deal viability within seconds.
            </p>

            {/* Checklist */}
            <ul className="space-y-3.5 pt-2">
              <li className="flex items-start gap-3">
                <div className="mt-0.5 w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 text-brand-600">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-slate-700 leading-snug">
                  Zero-touch multi-source ingestion (Email, Slack, Custom Portal)
                </span>
              </li>

              <li className="flex items-start gap-3">
                <div className="mt-0.5 w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 text-brand-600">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-slate-700 leading-snug">
                  Automated stack compatibility matching (Modern Cloud, Microservices, React)
                </span>
              </li>

              <li className="flex items-start gap-3">
                <div className="mt-0.5 w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 text-brand-600">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-slate-700 leading-snug">
                  Real-time BANT feasibility scoring with confidence metrics
                </span>
              </li>
            </ul>

            {/* Link */}
            <div className="pt-2">
              <a
                href="#rfp-parsing"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700 group"
              >
                <span>Explore automated RFP parsing</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>

          </div>

          {/* Right Column: Interactive Mockup Card (Light Theme) */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-5 sm:p-7 relative transition-all hover:border-slate-300">
              
              {/* Card Header */}
              <div className="flex items-center justify-between pb-5 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-brand-200 flex items-center justify-center text-brand-600">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-mono font-medium text-slate-500 block">
                      Incoming RFP Ingestion
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 font-mono">
                      Global Core Banking Modernization
                    </h4>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-50 text-brand-700 border border-brand-200">
                  MATCH: 94 / 100
                </span>
              </div>

              {/* Raw Client Extract */}
              <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="text-[11px] font-mono font-bold tracking-wider text-slate-400 uppercase mb-2">
                  RAW CLIENT INTAKE EXTRACT:
                </div>
                <p className="text-xs sm:text-sm text-slate-700 font-mono leading-relaxed italic bg-white p-3 rounded-lg border border-slate-200">
                  "We need to migrate our legacy payment ledger to an event-driven architecture running on Kubernetes with sub-50ms transaction finality and SOC2 compliance."
                </p>

                {/* 3 Metrics Pills */}
                <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
                    <span className="text-slate-400 block font-mono text-[10px]">Domain</span>
                    <span className="font-semibold text-slate-800">Fintech / Ledger</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
                    <span className="text-slate-400 block font-mono text-[10px]">Compliance</span>
                    <span className="font-semibold text-slate-800">SOC2 Type II</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
                    <span className="text-slate-400 block font-mono text-[10px]">Target SLA</span>
                    <span className="font-semibold text-brand-700">&lt; 50ms Latency</span>
                  </div>
                </div>
              </div>

              {/* Architecture Matrix */}
              <div className="mt-5">
                <div className="text-[11px] font-mono font-bold tracking-wider text-slate-400 uppercase mb-2.5">
                  DETECTED ARCHITECTURE MATRIX:
                </div>
                <div className="flex flex-wrap gap-2">
                  {['Apache Kafka', 'Kubernetes / EKS', 'Rust / Go Core', 'PostgreSQL Citus', 'Redis Cluster'].map(
                    (tech, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 text-xs font-mono font-medium rounded-md bg-slate-100 text-slate-700 border border-slate-200 hover:bg-emerald-50 hover:text-brand-700 hover:border-brand-200 transition-colors"
                      >
                        {tech}
                      </span>
                    )
                  )}
                </div>
              </div>

              {/* Bottom Qualification Cleared Card */}
              <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-emerald-50/90 to-teal-50/60 border border-brand-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white shrink-0 shadow-sm shadow-brand-500/30">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      Presale Qualification Cleared
                    </div>
                    <div className="text-xs text-slate-500">
                      Assigned to: Lead Systems Architect • Tier 1 Deal
                    </div>
                  </div>
                </div>

                <button className="px-4 py-2 rounded-lg text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white shadow-sm transition-all whitespace-nowrap self-start sm:self-auto">
                  Open Workspace
                </button>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
