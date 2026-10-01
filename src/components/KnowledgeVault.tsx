import React, { useState } from 'react';
import { 
  LayoutGrid, 
  FileText, 
  Sparkles, 
  BookOpen, 
  CreditCard, 
  Search, 
  Plus, 
  Send, 
  Bot, 
  LogOut
} from 'lucide-react';

interface KnowledgeVaultProps {
  onNavigateOverview: () => void;
  onNavigateAIWorkspace: () => void;
  onLogout: () => void;
}

export const KnowledgeVault: React.FC<KnowledgeVaultProps> = ({
  onNavigateOverview,
  onNavigateAIWorkspace,
  onLogout,
}) => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([
    {
      sender: 'user',
      text: 'Chúng ta đã từng làm dự án tương tự cho ngành Fintech/Banking chưa?',
    },
    {
      sender: 'ai',
      text: 'Có. Chúng ta đã triển khai thành công 3 dự án tương tự: "Global Core Banking Modernization" (Proposal 2024), "High-Throughput Payment Ledger" (Case Study), và "Tier-1 Event Mesh Architecture". Tất cả đều đạt chứng chỉ SOC-2 Type II và độ trễ dưới 50ms.',
      citations: [
        'Prop-2024-Fintech-Core.pdf (Page 14)',
        'CaseStudy-Ledger-Modernization.pdf',
      ],
    },
    {
      sender: 'user',
      text: 'Ratecard cho Lead Cloud Architect và Senior Systems Engineer là bao nhiêu?',
    },
    {
      sender: 'ai',
      text: 'Theo bảng Ratecard chuẩn 2025 (Ref: Master-Ratecard-2025.xlsx):\n• Lead Cloud Architect: $165 - $190/hr (Tier-1 Enterprise)\n• Senior Systems Engineer: $125 - $145/hr\nCả hai vị trí đều áp dụng bảo lãnh năng lực tối thiểu 160 giờ/tháng.',
      citations: ['Global-Commercial-Ratecard-2025.xlsx (Tab: Cloud & DevOps)'],
    },
  ]);

  const categories = [
    'All',
    'Proposal cũ',
    'Architecture',
    'Case Study',
    'Pricing & Ratecard',
    'Compliance & Legal',
    'Technical Specs',
  ];

  const assets = [
    {
      title: 'Global Core Banking SOW Template',
      category: 'Proposal cũ',
      format: 'PDF',
      updated: '3 days ago',
      tags: ['Fintech', 'Kubernetes', 'Kafka'],
      usage: 'Used in 14 Proposals',
    },
    {
      title: 'Tier-1 High-Availability Event Mesh Reference',
      category: 'Architecture',
      format: 'DOCX',
      updated: '1 week ago',
      tags: ['Active-Active', 'Sub-50ms', 'RPO=0'],
      usage: 'Used in 28 Proposals',
    },
    {
      title: 'SOC-2 Type II Compliance & Security Matrix',
      category: 'Compliance & Legal',
      format: 'PDF',
      updated: '2 weeks ago',
      tags: ['SOC-2', 'FIDO2', 'Zero-Trust'],
      usage: 'Used in 35 Proposals',
    },
    {
      title: 'Master IT Engineering Services Ratecard 2025',
      category: 'Pricing & Ratecard',
      format: 'XLSX',
      updated: 'Jan 2025',
      tags: ['Ratecard', 'FTE', 'Blended Rates'],
      usage: 'Universal Reference',
    },
    {
      title: 'Payment Gateway Migration 48k TPS Case Study',
      category: 'Case Study',
      format: 'PDF',
      updated: 'Dec 2024',
      tags: ['Case Study', 'Ledger', '48K TPS'],
      usage: 'Used in 19 Proposals',
    },
    {
      title: 'Zero-Downtime Database CDC Replication Spec',
      category: 'Technical Specs',
      format: 'PDF',
      updated: '2 weeks ago',
      tags: ['Debezium', 'Kafka', 'Aurora'],
      usage: 'Used in 12 Proposals',
    },
  ];

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput;
    setChatInput('');

    setChatHistory((prev) => [
      ...prev,
      { sender: 'user', text: userText },
      {
        sender: 'ai',
        text: `Dựa trên tài liệu trong Asset Hub của Presaleee, yêu cầu "${userText}" đã được xác thực trong các kiến trúc chuẩn của chúng ta. Bạn có thể chèn trực tiếp các block nội dung này vào Proposal Builder.`,
        citations: ['Presaleee-Knowledge-Base-v2.4.pdf', 'Master-Tech-Blueprint.docx'],
      },
    ]);
  };

  const filteredAssets = assets.filter((asset) => {
    const matchCategory = selectedCategory === 'All' || asset.category === selectedCategory;
    const matchQuery =
      asset.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCategory && matchQuery;
  });

  return (
    <div className="min-h-screen bg-[#f8fafc] flex text-slate-900 font-sans">
      
      {/* 1. SIDEBAR */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 hidden md:flex">
        <div>
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-sm font-bold font-mono text-base">
                P
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                Presaleee
              </span>
            </div>

            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
                <span className="text-xs font-mono font-bold text-slate-700">
                  DEMO WORKSPACE
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-brand-100 text-brand-800">
                PRO
              </span>
            </div>
          </div>

          <nav className="p-3 space-y-1">
            <button
              onClick={onNavigateOverview}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all"
            >
              <LayoutGrid className="w-4 h-4 text-slate-400" />
              <span>Overview</span>
            </button>

            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all">
              <FileText className="w-4 h-4 text-slate-400" />
              <span>RFPs &amp; Specs</span>
            </button>

            <button
              onClick={onNavigateAIWorkspace}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all"
            >
              <Sparkles className="w-4 h-4 text-slate-400" />
              <span>AI Workspace</span>
            </button>

            {/* Active Knowledge Vault */}
            <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold bg-brand-500 text-white shadow-sm shadow-brand-500/30 transition-all">
              <div className="flex items-center gap-3">
                <BookOpen className="w-4 h-4 text-white" />
                <span>Knowledge Vault</span>
              </div>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-brand-600 text-white">
                RAG AI
              </span>
            </button>

            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all">
              <CreditCard className="w-4 h-4 text-slate-400" />
              <span>Plan &amp; Quota</span>
            </button>
          </nav>
        </div>

        <div className="p-3 border-t border-slate-100">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0">
                SE
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-slate-800 truncate">SE Team Lead</div>
                <div className="text-[11px] font-mono text-slate-400 truncate">sales-eng@org</div>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* 2. MAIN CONTENT (Split: Left Asset Hub + Right AI Chatbot Assistant) */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-500">Presaleee</span>
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-brand-700">Knowledge Vault &amp; Asset Hub</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => alert('Add Asset dialog opened')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Upload Presale Asset</span>
            </button>
          </div>
        </header>

        {/* Body Grid */}
        <div className="p-6 sm:p-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT: ASSET HUB (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-5">
              
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  Asset Hub &amp; Reference Library
                </h1>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  Thư viện tập trung cho các tài liệu presale có thể tái sử dụng (Proposal, Case Study, Ratecard, Blueprint) giúp đội ngũ không phải tìm kiếm rời rạc qua email hay chat.
                </p>
              </div>

              {/* Search & Filter */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by asset title, tag (e.g. Fintech, Kafka, SOC-2)..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-mono bg-slate-50 border border-slate-200 focus:outline-none focus:border-brand-500 focus:bg-white text-slate-800"
                  />
                </div>

                {/* Category Pills */}
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                        selectedCategory === cat
                          ? 'bg-brand-500 text-white font-semibold shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Assets Grid */}
              <div className="space-y-3 pt-2">
                {filteredAssets.map((asset, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 hover:border-brand-300 hover:bg-white transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-slate-900 font-mono">
                          {asset.title}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-200 text-slate-700">
                          {asset.format}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-500">
                        <span className="text-brand-700 font-semibold">{asset.category}</span>
                        <span>•</span>
                        <span>{asset.usage}</span>
                        <span>•</span>
                        <span>{asset.updated}</span>
                      </div>

                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {asset.tags.map((t, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-50 text-brand-700 border border-brand-200"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <button 
                        onClick={() => alert(`Inserted "${asset.title}" into active SOW`)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold font-mono"
                      >
                        Insert to SOW
                      </button>
                    </div>
                  </div>
                ))}
              </div>

            </div>

          </div>

          {/* RIGHT: AI CHATBOT ASSISTANT (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="bg-white rounded-3xl border border-brand-200 shadow-card p-6 flex flex-col h-[750px] justify-between">
              
              <div>
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-brand-500 flex items-center justify-center text-white">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 font-mono">
                        Presaleee Knowledge AI Assistant
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Hiểu toàn bộ kho tài liệu của công ty với Source Citations
                      </p>
                    </div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
                </div>

                {/* Sample Prompt Chips from PDF */}
                <div className="pt-3 pb-2 space-y-1.5">
                  <div className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                    CÂU HỎI MẪU TỪ PRESALE:
                  </div>
                  <button
                    onClick={() =>
                      setChatInput('Chúng ta đã từng làm dự án tương tự cho ngành này chưa?')
                    }
                    className="w-full text-left p-2 rounded-lg bg-slate-50 hover:bg-emerald-50 text-[11px] text-slate-700 font-mono border border-slate-200 hover:border-brand-200 transition-colors truncate block"
                  >
                    "Chúng ta đã từng làm dự án tương tự cho ngành này chưa?"
                  </button>
                  <button
                    onClick={() =>
                      setChatInput('Có proposal nào sử dụng architecture tương tự không?')
                    }
                    className="w-full text-left p-2 rounded-lg bg-slate-50 hover:bg-emerald-50 text-[11px] text-slate-700 font-mono border border-slate-200 hover:border-brand-200 transition-colors truncate block"
                  >
                    "Có proposal nào sử dụng architecture tương tự không?"
                  </button>
                </div>

                {/* Chat Scroll Container */}
                <div className="space-y-3.5 overflow-y-auto max-h-[420px] pr-1 pt-2">
                  {chatHistory.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`space-y-1.5 ${
                        msg.sender === 'user' ? 'text-right' : 'text-left'
                      }`}
                    >
                      <div
                        className={`inline-block p-3 rounded-2xl text-xs font-mono leading-relaxed max-w-[92%] ${
                          msg.sender === 'user'
                            ? 'bg-slate-900 text-white rounded-br-none'
                            : 'bg-slate-50 text-slate-800 border border-slate-200 rounded-bl-none text-left'
                        }`}
                      >
                        <div className="whitespace-pre-line">{msg.text}</div>

                        {/* Source Citations */}
                        {msg.citations && (
                          <div className="mt-2.5 pt-2 border-t border-slate-200 space-y-1">
                            <span className="text-[10px] font-bold text-brand-700 block uppercase">
                              Source Citations:
                            </span>
                            {msg.citations.map((cite, i) => (
                              <div
                                key={i}
                                className="text-[10px] text-slate-600 bg-white p-1 rounded border border-slate-200 font-mono flex items-center gap-1"
                              >
                                <FileText className="w-3 h-3 text-brand-600 shrink-0" />
                                <span className="truncate">{cite}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chat Input Bar */}
              <form onSubmit={handleSendChat} className="pt-4 border-t border-slate-100 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Hỏi AI về hồ sơ năng lực, ratecard, proposal cũ..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl text-xs font-mono bg-slate-50 border border-slate-200 focus:outline-none focus:border-brand-500 focus:bg-white text-slate-900"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-xs transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
