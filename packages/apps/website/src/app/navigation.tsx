import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { useAuth } from '../hooks/useAuth';
import WalletButton from '../components/WalletButton';

export default function Navigation() {
  const location = useLocation();
  const pathname = location.pathname;
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated, logout } = useAuth();
  
  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };
  
  const linkClass = (path: string) => {
    const base = "text-sm font-medium transition-all";
    if (isActive(path)) {
      return `${base} text-primary drop-shadow-[0_0_8px_hsl(var(--primary))]`;
    }
    return `${base} text-muted-foreground hover:text-foreground`;
  };
  
  const mobileLinkClass = (path: string) => {
    const base = "block px-4 py-3 text-base font-medium transition-all border-l-4";
    if (isActive(path)) {
      return `${base} text-primary bg-primary/10 border-primary`;
    }
    return `${base} text-muted-foreground hover:text-foreground hover:bg-primary/5 border-transparent`;
  };
  
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-6">
        <div className="flex h-20 items-center justify-between">
          <Link to="/" className="flex items-center gap-3 font-semibold text-foreground hover:text-primary transition-colors">
            <img src="/pokedbots-racing-icon.webp" alt="PokedBots Racing" className="h-9 w-auto translate-y-1" />
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden sm:flex items-center gap-6">
            <Link to="/leaderboard" className={linkClass('/leaderboard')}>
              Leaderboard
            </Link>
            <Link to="/betting" className={linkClass('/betting')}>
              Betting
            </Link>
            <Link to="/garage" className={linkClass('/garage')}>
              Garage
            </Link>
            <Link to="/schedule" className={linkClass('/schedule')}>
              Schedule
            </Link>
            <Link to="/simulator" className={linkClass('/simulator')}>
              Simulator
            </Link>
            <Link to="/marketplace" className={linkClass('/marketplace')}>
              Marketplace
            </Link>
            <Link to="/guides" className={linkClass('/guides')}>
              Guides
            </Link>
            <WalletButton />
          </nav>
          
          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="sm:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
          
          {/* Mobile Drawer */}
          {isOpen && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 bg-black/50 z-40 sm:hidden"
                onClick={() => setIsOpen(false)}
              />
              
              {/* Drawer */}
              <div className="fixed top-[80px] right-0 bottom-0 w-64 border-l-2 border-primary/40 z-40 sm:hidden shadow-2xl">
                <nav className="flex flex-col py-4 bg-card">
                  <div className="px-4 pb-4">
                    <WalletButton />
                  </div>
                  <div className="h-px bg-border mb-2" />
                  <Link 
                    to="/leaderboard" 
                    className={mobileLinkClass('/leaderboard')}
                    onClick={() => setIsOpen(false)}
                  >
                    Leaderboard
                  </Link>
                  <Link 
                    to="/betting" 
                    className={mobileLinkClass('/betting')}
                    onClick={() => setIsOpen(false)}
                  >
                    Betting
                  </Link>
                  <Link 
                    to="/garage" 
                    className={mobileLinkClass('/garage')}
                    onClick={() => setIsOpen(false)}
                  >
                    Garage
                  </Link>
                  <Link 
                    to="/schedule" 
                    className={mobileLinkClass('/schedule')}
                    onClick={() => setIsOpen(false)}
                  >
                    Schedule
                  </Link>
                  <Link 
                    to="/simulator" 
                    className={mobileLinkClass('/simulator')}
                    onClick={() => setIsOpen(false)}
                  >
                    Simulator
                  </Link>
                  <Link 
                    to="/marketplace" 
                    className={mobileLinkClass('/marketplace')}
                    onClick={() => setIsOpen(false)}
                  >
                    Marketplace
                  </Link>
                  {isAuthenticated && (
                    <button
                      onClick={() => {
                        logout();
                        setIsOpen(false);
                      }}
                      className="block px-4 py-3 text-base font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all border-l-4 border-transparent text-left"
                    >
                      Sign Out
                    </button>
                  )}
                  <div className="h-px bg-border my-2" />
                  <Link 
                    to="/guides" 
                    className={mobileLinkClass('/guides')}
                    onClick={() => setIsOpen(false)}
                  >
                    Guides
                  </Link>
                  <a 
                    href="https://github.com/jneums/pokedbots-racing" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block px-4 py-3 text-base font-medium text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-all border-l-4 border-transparent"
                    onClick={() => setIsOpen(false)}
                  >
                    <span className="flex items-center gap-2">
                      GitHub
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </span>
                  </a>
                </nav>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
