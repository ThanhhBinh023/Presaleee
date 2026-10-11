import React from 'react';
import { 
  Server, 
  Database, 
  Layers, 
  Network, 
  Cpu
} from 'lucide-react';

export const TrustCapabilities: React.FC = () => {
  const capabilities = [
    { label: 'CLOUD INFRASTRUCTURE', icon: Server },
    { label: 'FINTECH PLATFORMS', icon: Database },
    { label: 'GLOBAL SYSTEM INTEGRATION', icon: Layers },
    { label: 'HIGH-CONCURRENCY MESH', icon: Network },
    { label: 'ENTERPRISE ARCHITECTURE', icon: Cpu },
  ];

  return (
    <section className="py-12 border-y border-slate-200/80 bg-slate-50/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-xs font-mono font-bold tracking-widest text-slate-500 uppercase mb-8">
          TRUSTED BY 500+ ENTERPRISE ENGINEERING &amp; PRESALE TEAMS WORLDWIDE
        </p>

        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 lg:gap-12">
          {capabilities.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div 
                key={idx} 
                className="flex items-center gap-2.5 text-slate-600 hover:text-brand-700 transition-colors py-1.5 px-3 rounded-lg hover:bg-emerald-50/50"
              >
                <div className="w-5 h-5 rounded-md bg-emerald-100 flex items-center justify-center text-brand-600">
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="font-mono text-xs font-bold tracking-wider">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
