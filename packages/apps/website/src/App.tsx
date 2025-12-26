import { Routes, Route, useLocation, Link } from 'react-router-dom';
import { useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import Navigation from './app/navigation';
import HomePage from './app/page';
import MarketplacePage from './app/marketplace/page';
import GaragePage from './app/garage/page';
import SchedulePage from './app/schedule/page';
import EventDetailsPage from './app/schedule/[eventId]/page';
import RaceDetailsPage from './app/race/[raceId]/page';
import LeaderboardPage from './app/leaderboard/page';
import BettingPage from './app/betting/page';
import SimulatorPage from './app/simulator/page';
import DocsListPage from './app/docs/page';
import DocPage from './app/docs/[slug]/page';
import GuidesListPage from './app/guides/page';
import GuidePage from './app/guides/[slug]/page';
import BotDetailsPage from './app/bot/[tokenIndex]/page';
import Track3DTestPage from './app/track3d-test/page';
import { WalletDrawerProvider } from './contexts/WalletDrawerContext';
import { WalletDrawer } from './components/WalletDrawer';
import { useAuth } from './hooks/useAuth';

import { configure as configureIcJs } from '@pokedbots-racing/ic-js';

// --- CONFIGURE THE SHARED PACKAGE ---
// This object is created at BUILD TIME. Vite replaces each `process.env`
// access with a static string.
const canisterIds = {
  POKEDBOTS_RACING: process.env.CANISTER_ID_POKEDBOTS_RACING!,
  POKEDBOTS_NFTS: process.env.CANISTER_ID_POKEDBOTS_NFTS!,
  ICP_LEDGER: process.env.CANISTER_ID_ICP_LEDGER!,
  // ... add all other canister IDs your app needs
};

const network = process.env.DFX_NETWORK || 'local'; // 'ic' for mainnet, 'local' for local dev
const host = network === 'ic' ? 'https://icp0.io' : 'http://127.0.0.1:4943';

console.log('[PokedBots] Initializing with:', { network, host, canisterIds });

// Pass the static, build-time configuration to the shared library.
configureIcJs({ canisterIds, host, verbose: true });
// ------------------------------------

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function SessionExpirationHandler() {
  const { isAuthenticated, logout, user } = useAuth();

  useEffect(() => {
    let hasShownExpiration = false;

    const showExpirationToast = () => {
      if (hasShownExpiration) return;
      hasShownExpiration = true;
      
      toast.error('Wallet Session Expired', {
        description: 'Your Plug wallet session has expired. Please reconnect your wallet.',
        duration: 10000,
      });

      // Auto-logout after showing the message
      setTimeout(() => {
        logout();
      }, 500);
    };

    const handleError = (event: ErrorEvent | PromiseRejectionEvent) => {
      const error = 'reason' in event ? event.reason : event.error;
      const errorMessage = error?.message || error?.toString() || '';

      // Check for Plug wallet session expiration errors
      if (
        isAuthenticated &&
        user?.provider === 'plug' &&
        (errorMessage.includes('No keychain found') ||
         errorMessage.includes('keychain') ||
         errorMessage.includes('session'))
      ) {
        showExpirationToast();
      }
    };

    // Intercept console.error to catch Plug's internal errors
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      const errorMessage = args.join(' ');
      
      if (
        isAuthenticated &&
        user?.provider === 'plug' &&
        (errorMessage.includes('No keychain found') ||
         errorMessage.includes('tabMessenger') ||
         errorMessage.includes('keychain'))
      ) {
        showExpirationToast();
      }
      
      // Still call the original console.error
      originalConsoleError.apply(console, args);
    };

    // Listen for both error events and unhandled promise rejections
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleError);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleError);
      console.error = originalConsoleError;
    };
  }, [isAuthenticated, user, logout]);

  return null;
}

export default function App() {
  return (
    <WalletDrawerProvider>
      <div className="min-h-screen bg-background flex flex-col">
        <Toaster 
          position="top-right" 
          richColors 
          theme="dark"
          toastOptions={{
            className: '',
            style: {
              background: 'oklch(0.16 0.025 35)',
              border: '1px solid oklch(0.28 0.03 40)',
              color: 'oklch(0.95 0.01 60)',
            },
          }}
        />
        <SessionExpirationHandler />
        <ScrollToTop />
        <Navigation />
        <WalletDrawer />
        <main className="flex-1">
          <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/marketplace" element={<MarketplacePage />} />
          <Route path="/garage" element={<GaragePage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/schedule/:eventId" element={<EventDetailsPage />} />
          <Route path="/race/:raceId" element={<RaceDetailsPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/betting" element={<BettingPage />} />
          <Route path="/simulator" element={<SimulatorPage />} />
          <Route path="/bot/:tokenIndex" element={<BotDetailsPage />} />
          <Route path="/docs" element={<DocsListPage />} />
          <Route path="/docs/:slug" element={<DocPage />} />
          <Route path="/guides" element={<GuidesListPage />} />
          <Route path="/guides/:slug" element={<GuidePage />} />
          <Route path="/track3d-test" element={<Track3DTestPage />} />
        </Routes>
      </main>
      <footer className="border-t-2 border-primary/20 py-12 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center gap-6">
            {/* Navigation Links */}
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm">
              <Link to="/guides" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
                Guides
              </Link>
              <Link to="/docs" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
                Docs
              </Link>
              <a 
                href="https://github.com/jneums/pokedbots-racing" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors font-medium inline-flex items-center gap-1"
              >
                GitHub
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
            
            {/* Platform Info */}
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 text-sm sm:text-base text-muted-foreground font-medium">
              <div className="flex items-center gap-1">
                <span>Live on</span>
                <a 
                  href="https://prometheusprotocol.org/app/io.github.jneums.pokedbots-racing" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1"
                >
                  Prometheus Protocol
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
              <span className="hidden sm:inline text-border/60">|</span>
              <div className="flex items-center gap-1">
                <span>Powered by</span>
                <a 
                  href="https://internetcomputer.org" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1"
                >
                  Internet Computer
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
            
            {/* MCP URL */}
            <div className="inline-flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 bg-primary/5 border border-primary/20 rounded-lg">
              <span className="text-xs sm:text-sm text-muted-foreground font-medium whitespace-nowrap">MCP URL</span>
              <code className="text-xs sm:text-sm font-mono text-foreground">
                https://p6nop-vyaaa-aaaai-q4djq-cai.icp0.io/mcp
              </code>
            </div>
          </div>
        </div>
      </footer>
      </div>
    </WalletDrawerProvider>
  );
}
