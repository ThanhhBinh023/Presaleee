import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  FileText, 
  Bot, 
  MessageSquare, 
  Send, 
  Eye, 
  Sparkles,
  Download
} from 'lucide-react';

interface ClientPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ClientPortalModal: React.FC<ClientPortalModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'proposal' | 'prototype' | 'materials' | 'discussion'>('proposal');
  const [clientQuery, setClientQuery] = useState('');
  const [aiAnswers, setAiAnswers] = useState<Array<{ q: string; a: string }>>([
    {
      q: 'Does this architecture guarantee zero data loss during cloud failover?',
      a: 'Yes. Section 2.4.1 outlines a synchronous multi-region replication strategy with mathematical RPO = 0 and automatic failover under 3.0 seconds.',
    },
  ]);
  const [comments, setComments] = useState<string[]>([
    'Evelyn Shaw (CTO): "Please confirm if dual-write mode with our legacy database can run for up to 6 months."',
  ]);
  const [newComment, setNewComment] = useState('');

  if (!isOpen) return null;

  const handleAskAI = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientQuery.trim()) return;
    setAiAnswers([
      ...aiAnswers,
      {
        q: clientQuery,
        a: 'Based on Section 2.4 and Verified Decision TECH-DISC-094, Presaleee validates that throughput scales to 48,000 peak TPS with tiered Redis caching and TLS 1.3 mTLS security.',
      },
    ]);
    setClientQuery('');
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setComments([...comments, `You (Client Reviewer): "${newComment}"`]);
    setNewComment('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Top Navigation Bar */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white font-bold font-mono text-sm">
              P
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm font-mono">
                  Presaleee Client Portal
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-brand-800 border border-brand-200">
                  NDA Protected Session
                </span>
              </div>
              <div className="text-xs text-slate-500 font-mono">
                Project Apollo — FinTech Core Modernization
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => alert('Proposal exported to client PDF package')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-white"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Client Subtabs */}
        <div className="px-6 border-b border-slate-200 flex items-center gap-4 text-xs font-medium">
          {[
            { id: 'proposal', label: 'Proposal Document', icon: FileText },
            { id: 'prototype', label: 'Interactive UI Prototype', icon: Eye },
            { id: 'materials', label: 'Shared Materials & Blueprints', icon: ShieldCheck },
            { id: 'discussion', label: 'Discussions & AI Assistant', icon: MessageSquare },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3.5 border-b-2 flex items-center gap-2 transition-all ${
                  isActive
                    ? 'border-brand-500 text-brand-700 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {activeTab === 'proposal' && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-emerald-50/60 border border-brand-200 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Executive Statement of Work (SOW v2.4)
                  </h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Prepared for Client Architectural Steering Committee. Signed off by Lead Systems Architect.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-white text-brand-700 border border-brand-200 shadow-xs">
                  SLA: 99.999%
                </span>
              </div>

              <div className="prose prose-slate max-w-none text-xs sm:text-sm space-y-4 text-slate-700 leading-relaxed font-sans">
                <h3 className="text-lg font-bold text-slate-900 border-b pb-2">
                  1. Executive Summary &amp; Modernization Mandate
                </h3>
                <p>
                  This Statement of Work establishes the architectural specifications, milestones, and deliverables for migrating the core transaction ledger to a sovereign event-driven architecture running on Kubernetes with sub-50ms latency finality.
                </p>

                <h3 className="text-lg font-bold text-slate-900 border-b pb-2 pt-2">
                  2. Architectural Scope &amp; High-Availability Event Mesh
                </h3>
                <p>
                  The system integrates an Apache Kafka event spine with tiered Redis caching. All state transitions are replicated across multi-region active-active clusters with zero data loss guarantee (RPO = 0).
                </p>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono space-y-2">
                  <div className="font-bold text-brand-700">Commercial Estimation Summary:</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    <div>
                      <span className="text-slate-400 block text-[10px]">TOTAL EFFORT</span>
                      <span className="font-bold text-slate-800">480 Person-Hours</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">TARGET TIMELINE</span>
                      <span className="font-bold text-slate-800">12 Sprints</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">FIXED FEE ESTIMATE</span>
                      <span className="font-bold text-brand-700">$248,000 USD</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">SLA LEVEL</span>
                      <span className="font-bold text-slate-800">Tier-4 Mission Critical</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'prototype' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Live Interactive UI Prototype
                  </h4>
                  <p className="text-xs text-slate-500">
                    Auto-generated from Presaleee AI UI Design Brief based on discovery session inputs.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-50 text-brand-700 border border-brand-200">
                  Interactive Sandbox
                </span>
              </div>

              {/* Simulated UI Prototype Canvas */}
              <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-600 flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h5 className="text-base font-bold text-slate-800">
                  Transaction Dashboard &amp; Ledger Rollback UI
                </h5>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Simulated operator console preview showing real-time ledger finality, dual-write health metrics, and automated failover switch.
                </p>
                <div className="p-4 bg-white rounded-xl border border-slate-200 max-w-lg mx-auto shadow-sm text-left text-xs font-mono space-y-2">
                  <div className="flex justify-between border-b pb-1 text-slate-400 text-[10px]">
                    <span>SERVICE ENDPOINT</span>
                    <span className="text-emerald-600">ONLINE 99.999%</span>
                  </div>
                  <div className="text-slate-800 font-bold">POST /v2/ledger/dispatch/batch</div>
                  <div className="text-slate-500 text-[11px]">Latency: 8.4ms • Consensus: 5/5 Nodes • Vault Signature: Verified</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'materials' && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-900">
                Pre-Audited Architectural Assets &amp; Compliance Annex
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 font-mono">Architecture Blueprint PDF</span>
                    <span className="text-[10px] font-mono bg-emerald-100 text-brand-800 px-2 py-0.5 rounded">Tier-1 Spec</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    High-availability event mesh reference architecture diagram with multi-region active-active topology.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 font-mono">SOC-2 Type II Audit Matrix</span>
                    <span className="text-[10px] font-mono bg-emerald-100 text-brand-800 px-2 py-0.5 rounded">Compliance</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Pre-cleared regulatory controls, encryption policies, and data sovereign residency guarantees.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'discussion' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: Ask AI */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Bot className="w-4 h-4 text-brand-600" />
                    <span className="text-xs font-bold text-slate-900 font-mono">
                      Ask AI about this Proposal
                    </span>
                  </div>

                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {aiAnswers.map((item, i) => (
                      <div key={i} className="text-xs space-y-1">
                        <div className="font-semibold text-slate-800">Q: {item.q}</div>
                        <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-slate-600 font-mono text-[11px] leading-relaxed">
                          {item.a}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleAskAI} className="flex gap-2 pt-2">
                  <input
                    type="text"
                    value={clientQuery}
                    onChange={(e) => setClientQuery(e.target.value)}
                    placeholder="Ask about SLA, tech stack, pricing..."
                    className="flex-1 px-3 py-2 rounded-xl text-xs bg-white border border-slate-200 focus:outline-none focus:border-brand-500 font-mono"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>

              {/* Right: Comments */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="w-4 h-4 text-brand-600" />
                    <span className="text-xs font-bold text-slate-900 font-mono">
                      Review Comments &amp; Clarifications
                    </span>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {comments.map((c, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 leading-relaxed font-mono text-[11px]">
                        {c}
                      </div>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleAddComment} className="flex gap-2 pt-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add feedback for Presale team..."
                    className="flex-1 px-3 py-2 rounded-xl text-xs bg-white border border-slate-200 focus:outline-none focus:border-brand-500 font-mono"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs"
                  >
                    Comment
                  </button>
                </form>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-mono">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
            <span>Presaleee Real-time Engagement Analytics: Active</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-slate-300 hover:bg-white text-slate-700 font-semibold"
          >
            Close Preview
          </button>
        </div>

      </div>
    </div>
  );
};
