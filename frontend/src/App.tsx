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
import { MembersDirectory } from './components/MembersDirectory';
import { SettingsCenter } from './components/SettingsCenter';
import { ClientsDirectory } from './components/ClientsDirectory';
import { AuditLog } from './components/AuditLog';
import { LeadsDirectory } from './components/LeadsDirectory';
import { MeetingsWorkspace } from './components/MeetingsWorkspace';
import { ProposalsStudio } from './components/ProposalsStudio';
import { PortalDesk } from './components/PortalDesk';
import { ClientPortalPage } from './components/ClientPortalPage';
import { RolePipelines } from './components/RolePipelines';
import { AdminAnalytics } from './components/AdminAnalytics';
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
  | 'vault'
  | 'members'
  | 'profile'
  | 'settings'
  | 'clients'
  | 'audit'
  | 'leads'
  | 'rate-cards'
  | 'meetings'
  | 'proposals'
  | 'portal'
  | 'client-portal'
  | 'pipelines'
  | 'analytics';

function pageFromHash(hash: string): Page {
  const route = hash.split('?')[0];
  if (route === '#signin') return 'signin';
  if (route === '#reset-password') return 'reset-password';
  if (route === '#overview') return 'overview';
  if (route === '#analytics') return 'analytics';
  if (route === '#ai-workspace') return 'ai-workspace';
  if (route === '#rfps') return 'rfps';
  if (route === '#vault') return 'vault';
  if (route === '#members') return 'members';
  if (route === '#profile') return 'profile';
  if (route === '#settings') return 'settings';
  if (route === '#clients') return 'clients';
  if (route === '#audit') return 'audit';
  if (route === '#leads') return 'leads';
  if (route === '#rate-cards') return 'overview';
  if (route === '#meetings') return 'meetings';
  if (route === '#proposals') return 'proposals';
  if (route === '#portal') return 'portal';
  if (route === '#client-portal') return 'client-portal';
  if (route === '#pipelines') return 'pipelines';
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

  useEffect(() => {
    if (status === 'authenticated' && (currentPage === 'home' || currentPage === 'signin' || !window.location.hash || window.location.hash === '#')) {
      goTo('overview');
    }
  }, [status, currentPage]);

  // Admin isolation guard: redirect Admin away from presale deal workspaces to Overview
  useEffect(() => {
    if (status === 'authenticated' && user?.role === 'ADMIN') {
      const presalePages: Page[] = ['ai-workspace', 'rfps', 'leads', 'portal', 'meetings', 'proposals', 'rate-cards'];
      if (presalePages.includes(currentPage)) {
        goTo('overview');
      }
    }
  }, [status, user, currentPage]);

  // Render-blocking guard: never flash Home / SignIn / old UI while auth session is being verified
  const isPublicTokenRoute = currentPage === 'client-portal' || currentPage === 'reset-password';
  if (status === 'loading' && !isPublicTokenRoute) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#f8fafc]">
        <span className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
        <span className="text-xs font-mono text-slate-500">Đang đồng bộ phiên làm việc...</span>
      </div>
    );
  }

  // Synchronously resolve target page when authenticated so landing page never flashes for 1 frame
  const effectivePage: Page =
    status === 'authenticated' && (currentPage === 'home' || currentPage === 'signin' || !window.location.hash || window.location.hash === '#')
      ? 'overview'
      : status === 'authenticated' && user?.role === 'ADMIN' && ['ai-workspace', 'rfps', 'leads', 'portal', 'meetings', 'proposals', 'rate-cards'].includes(currentPage)
      ? 'overview'
      : currentPage;

  const goTo = (page: Page) => {
    window.location.hash = page === 'home' ? '' : `#${page}`;
    setCurrentPage(page);
    if (page !== currentPage) window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToHome = () => goTo('home');
  const navigateToSignIn = () => goTo('signin');
  const navigateToOverview = () => goTo('overview');
  const navigateToAnalytics = () => goTo('analytics');
  const navigateToAIWorkspace = () => goTo('ai-workspace');
  const navigateToRfps = () => goTo('rfps');
  const navigateToVault = () => goTo('vault');
  const navigateToMembers = () => goTo('members');
  const navigateToClients = () => goTo('clients');
  const navigateToAudit = () => goTo('audit');
  const navigateToLeads = () => goTo('leads');
  const navigateToMeetings = () => goTo('meetings');
  const navigateToProposals = () => goTo('proposals');
  const navigateToPortal = () => goTo('portal');
  const navigateToPipelines = () => goTo('pipelines');

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigateToHome();
    }
  };

  const signedInName = status === 'authenticated' && user ? user.fullName : null;

  if (effectivePage === 'analytics') {
    return (
      <RequireAuth>
        <AdminAnalytics
          onLogout={handleLogout}
          onNavigateOverview={navigateToOverview}
          onNavigateMembers={navigateToMembers}
          onNavigateAudit={navigateToAudit}
          onNavigateClients={navigateToClients}
          onNavigatePipelines={navigateToPipelines}
        />
      </RequireAuth>
    );
  }

  if (effectivePage === 'ai-workspace') {
    return (
      <RequireAuth>
        <AIWorkspace
          onNavigateOverview={navigateToOverview}
          onNavigateRfps={navigateToRfps}
          onNavigateVault={navigateToVault}
          onNavigatePipelines={navigateToPipelines}
          onLogout={handleLogout}
        />
      </RequireAuth>
    );
  }

  if (effectivePage === 'overview') {
    return (
      <RequireAuth>
        <Overview
          onLogout={handleLogout}
          onNavigateAIWorkspace={navigateToAIWorkspace}
          onNavigateRfps={navigateToRfps}
          onNavigateVault={navigateToVault}
          onNavigateMembers={navigateToMembers}
          onNavigateClients={navigateToClients}
          onNavigateAudit={navigateToAudit}
          onNavigateLeads={navigateToLeads}
          onNavigateMeetings={navigateToMeetings}
          onNavigateProposals={navigateToProposals}
          onNavigatePortal={navigateToPortal}
          onNavigatePipelines={navigateToPipelines}
          onNavigateAnalytics={navigateToAnalytics}
        />
      </RequireAuth>
    );
  }

  if (effectivePage === 'rfps') {
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

  if (effectivePage === 'vault') {
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

  if (effectivePage === 'leads') {
    return (
      <RequireAuth>
        <LeadsDirectory onBackToOverview={navigateToOverview} onLogout={handleLogout} />
      </RequireAuth>
    );
  }

  if (currentPage === 'rate-cards') {
    return (
      <RequireAuth>
        <Overview
          onNavigateAIWorkspace={navigateToAIWorkspace}
          onNavigateRfps={navigateToRfps}
          onNavigateVault={navigateToVault}
          onNavigateMembers={navigateToMembers}
          onNavigateClients={navigateToClients}
          onNavigateAudit={navigateToAudit}
          onNavigateLeads={navigateToLeads}
          onNavigateMeetings={navigateToMeetings}
          onNavigateProposals={navigateToProposals}
          onNavigatePortal={navigateToPortal}
          onNavigatePipelines={navigateToPipelines}
          onNavigateAnalytics={navigateToAnalytics}
          onLogout={handleLogout}
        />
      </RequireAuth>
    );
  }

  if (effectivePage === 'meetings') {
    return (
      <RequireAuth>
        <MeetingsWorkspace onBackToOverview={navigateToOverview} />
      </RequireAuth>
    );
  }

  if (effectivePage === 'proposals') {
    return (
      <RequireAuth>
        <ProposalsStudio onBackToOverview={navigateToOverview} onLogout={handleLogout} />
      </RequireAuth>
    );
  }

  if (effectivePage === 'portal') {
    return (
      <RequireAuth>
        <PortalDesk onBackToOverview={navigateToOverview} onLogout={handleLogout} />
      </RequireAuth>
    );
  }

  if (effectivePage === 'client-portal') {
    return <ClientPortalPage />;
  }

  if (effectivePage === 'pipelines') {
    return (
      <RequireAuth>
        <RolePipelines
          onLogout={handleLogout}
          onNavigateOverview={navigateToOverview}
          onNavigateAIWorkspace={navigateToAIWorkspace}
        />
      </RequireAuth>
    );
  }

  if (effectivePage === 'clients') {
    return (
      <RequireAuth>
        <ClientsDirectory onBackToOverview={navigateToOverview} />
      </RequireAuth>
    );
  }

  if (effectivePage === 'audit') {
    return (
      <RequireAuth>
        <AuditLog onBackToOverview={navigateToOverview} />
      </RequireAuth>
    );
  }

  if (effectivePage === 'members') {
    return (
      <RequireAuth>
        <MembersDirectory onBackToOverview={navigateToOverview} />
      </RequireAuth>
    );
  }

  if (effectivePage === 'profile' || effectivePage === 'settings') {
    return (
      <RequireAuth>
        <SettingsCenter />
      </RequireAuth>
    );
  }

  if (effectivePage === 'reset-password') {
    return <ResetPassword onBackToHome={navigateToHome} onDone={navigateToSignIn} />;
  }

  if (effectivePage === 'signin') {
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
