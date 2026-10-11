import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { TrustCapabilities } from './components/TrustCapabilities';
import { PillarOne } from './components/PillarOne';
import { PillarTwo } from './components/PillarTwo';
import { PillarThree } from './components/PillarThree';
import { PillarFour } from './components/PillarFour';
import { CtaBanner } from './components/CtaBanner';
import { Footer } from './components/Footer';
import { SignIn } from './components/SignIn';
import { Overview } from './components/Overview';
import { AIWorkspace } from './components/AIWorkspace';
import { RfpIntake } from './components/RfpIntake';
import { KnowledgeVault } from './components/KnowledgeVault';

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'home' | 'signin' | 'overview' | 'ai-workspace' | 'rfps' | 'vault'>('home');

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash === '#ai-workspace') {
        setCurrentPage('ai-workspace');
      } else if (hash === '#overview') {
        setCurrentPage('overview');
      } else if (hash === '#rfps') {
        setCurrentPage('rfps');
      } else if (hash === '#vault') {
        setCurrentPage('vault');
      } else if (hash === '#signin') {
        setCurrentPage('signin');
      } else {
        setCurrentPage('home');
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const navigateToSignIn = () => {
    window.location.hash = '#signin';
    setCurrentPage('signin');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToOverview = () => {
    window.location.hash = '#overview';
    setCurrentPage('overview');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToAIWorkspace = () => {
    window.location.hash = '#ai-workspace';
    setCurrentPage('ai-workspace');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToRfps = () => {
    window.location.hash = '#rfps';
    setCurrentPage('rfps');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToVault = () => {
    window.location.hash = '#vault';
    setCurrentPage('vault');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToHome = () => {
    window.location.hash = '';
    setCurrentPage('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (currentPage === 'ai-workspace') {
    return (
      <AIWorkspace 
        onNavigateOverview={navigateToOverview}
        onNavigateRfps={navigateToRfps}
        onNavigateVault={navigateToVault}
        onLogout={navigateToHome} 
      />
    );
  }

  if (currentPage === 'overview') {
    return (
      <Overview 
        onLogout={navigateToHome} 
        onNavigateAIWorkspace={navigateToAIWorkspace}
        onNavigateRfps={navigateToRfps}
        onNavigateVault={navigateToVault}
      />
    );
  }

  if (currentPage === 'rfps') {
    return (
      <RfpIntake
        onNavigateOverview={navigateToOverview}
        onNavigateAIWorkspace={navigateToAIWorkspace}
        onLogout={navigateToHome}
      />
    );
  }

  if (currentPage === 'vault') {
    return (
      <KnowledgeVault
        onNavigateOverview={navigateToOverview}
        onNavigateAIWorkspace={navigateToAIWorkspace}
        onLogout={navigateToHome}
      />
    );
  }

  if (currentPage === 'signin') {
    return (
      <SignIn 
        onBackToHome={navigateToHome} 
        onLoginSuccess={navigateToOverview} 
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#fafbfa] text-slate-900 selection:bg-brand-500 selection:text-white relative">
      {/* Top subtle grid background */}
      <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none -z-10" />

      {/* Header Navigation */}
      <Navbar onSignInClick={navigateToSignIn} />

      {/* Main Content Sections */}
      <main className="flex-1">
        {/* Hero Section with Telemetry Stream & Metrics */}
        <Hero />

        {/* Enterprise Trust Capabilities Strip (All 3rd-party brands removed) */}
        <TrustCapabilities />

        {/* Pillar 01: RFP Ingestion & Lead Scoring */}
        <div id="features">
          <PillarOne />
        </div>

        {/* Pillar 02: Discovery Session Audio Synthesis */}
        <div id="ai-capabilities">
          <PillarTwo />
        </div>

        {/* Pillar 03: Proposal & SOW Copilot Studio */}
        <PillarThree />

        {/* Pillar 04: Predictive Win Rate & Next Best Actions */}
        <PillarFour />

        {/* Ready to Accelerate CTA Banner */}
        <CtaBanner />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default App;
