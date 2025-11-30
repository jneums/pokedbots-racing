import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Navigation from './app/navigation';
import HomePage from './app/page';
import SchedulePage from './app/schedule/page';
import EventDetailsPage from './app/schedule/[eventId]/page';
import LeaderboardPage from './app/leaderboard/page';
import DocsListPage from './app/docs/page';
import DocPage from './app/docs/[slug]/page';
import GuidesListPage from './app/guides/page';
import GuidePage from './app/guides/[slug]/page';

import { configure as configureIcJs } from '@pokedbots-racing/ic-js';

// --- CONFIGURE THE SHARED PACKAGE ---
// This object is created at BUILD TIME. Vite replaces each `process.env`
// access with a static string.
const canisterIds = {
  POKEDBOTS_RACING: process.env.CANISTER_ID_POKEDBOTS_RACING!,
  // ... add all other canister IDs your app needs
};

const network = process.env.DFX_NETWORK || 'local'; // 'ic' for mainnet, 'local' for local dev
const host = network === 'ic' ? 'https://icp-api.io' : 'http://127.0.0.1:4943';

// Pass the static, build-time configuration to the shared library.
configureIcJs({ canisterIds, host });
// ------------------------------------

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <ScrollToTop />
      <Navigation />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/schedule/:eventId" element={<EventDetailsPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/docs" element={<DocsListPage />} />
          <Route path="/docs/:slug" element={<DocPage />} />
          <Route path="/guides" element={<GuidesListPage />} />
          <Route path="/guides/:slug" element={<GuidePage />} />
        </Routes>
      </main>
      <footer className="border-t-2 border-primary/20 py-12 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center gap-6">
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
  );
}
