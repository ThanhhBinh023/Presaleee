import React, { useEffect, useState } from 'react';
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
import { ResetPassword } from './components/ResetPassword';
import { Overview } from './components/Overview';
import { AIWorkspace } from './components/AIWorkspace';
import { RfpIntake } from './components/RfpIntake';
import { KnowledgeVault } from './components/KnowledgeVault';
import { RequireAuth } from './components/common/RequireAuth';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ToastProvider } from './components/common/Toast';

type Page =
  | 'home'
  | 'signin'
  | 'reset-password'
  | 'overview'
  | 'ai-workspace'
  | 'rfps'
  | 'vault';

function pageFromHash(hash: string): Page {
  const route = hash.split('?')[0];
  if (route === '#signin') return 'signin';
  if (route === '#reset-password') return 'reset-password';
  if (route === '#overview') return 'overview';
  if (route === '#ai-workspace') return 'ai-workspace';
  if (route === '#rfps') return 'rfps';
  if (route === '#vault') return 'vault';
  return 'home';
}

const AppShell: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(() => pageFromHash(window.location.hash));
  const { status, user, logout } = useAuth();

  useEffect(() => {
    const handleHash = () => setCurrentPage(pageFromHash(window.location.hash));
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const goTo = (page: Page) => {
    window.location.hash = page === 'home' ? '' : `#${page}`;
    setCurrentPage(page);
    if (page !== currentPage) window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToHome = () => goTo('home');
  const navigateToSignIn = () => goTo('signin');
  const navigateToOverview = () => goTo('overview');
  const navigateToAIWorkspace = () => goTo('ai-workspace');
  const navigateToRfps = () => goTo('rfps');
  const navigateToVault = () => goTo('vault');

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigateToHome();
    }
  };

  const signedInName = status === 'authenticated' && user ? user.fullName : null;

  if (currentPage === 'ai-workspace') {
    return (
      <RequireAuth>
        <AIWorkspace
          onNavigateOverview={navigateToOverview}
          onNavigateRfps={navigateToRfps}
          onNavigateVault={navigateToVault}
          onLogout={handleLogout}
        />
      </RequireAuth>
    );
  }

  if (currentPage === 'overview') {
    return (
      <RequireAuth>
        <Overview
          onLogout={handleLogout}
          onNavigateAIWorkspace={navigateToAIWorkspace}
          onNavigateRfps={navigateToRfps}
          onNavigateVault={navigateToVault}
        />
      </RequireAuth>
    );
  }

  if (currentPage === 'rfps') {
    return (
      <RequireAuth>
        <RfpIntake
          onNavigateOverview={navigateToOverview}
          onNavigateAIWorkspace={navigateToAIWorkspace}
          onLogout={handleLogout}
          onNavigateVault={navigateToVault}
        />
      </RequireAuth>
    );
  }

  if (currentPage === 'vault') {
    return (
      <RequireAuth>
        <KnowledgeVault
          onNavigateOverview={navigateToOverview}
          onNavigateAIWorkspace={navigateToAIWorkspace}
          onLogout={handleLogout}
        />
      </RequireAuth>
    );
  }

  if (currentPage === 'reset-password') {
    return <ResetPassword onBackToHome={navigateToHome} onDone={navigateToSignIn} />;
  }

  if (currentPage === 'signin') {
    return <SignIn onBackToHome={navigateToHome} onLoginSuccess={navigateToOverview} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#fafbfa] text-slate-900 selection:bg-brand-500 selection:text-white relative">
      <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none -z-10" />

      <Navbar
        onSignInClick={navigateToSignIn}
        onOpenWorkspace={navigateToOverview}
        userName={signedInName}
      />

      <main className="flex-1">
        <Hero />
        <TrustCapabilities />
        <div id="features">
          <PillarOne />
        </div>
        <div id="ai-capabilities">
          <PillarTwo />
        </div>
        <PillarThree />
        <PillarFour />
        <CtaBanner />
      </main>

      <Footer />
    </div>
  );
};

export const App: React.FC = () => (
  <AuthProvider>
    <ToastProvider>
      <AppShell />
    </ToastProvider>
  </AuthProvider>
);

export default App;
