import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from '../hooks/useAuth';
import WalletButton from '../components/WalletButton';
import EventsHub from '../components/EventsHub';
import { ChevronDown, Sparkles } from 'lucide-react';
import { useRecentGear } from '../hooks/useGarage';
import { NewGearReveal } from '../components/NewGearReveal';

export default function Navigation() {
  const location = useLocation();
  const pathname = location.pathname;
  const [isOpen, setIsOpen] = useState(false);
  const [raceMenuOpen, setRaceMenuOpen] = useState(false);
  const [myBotsMenuOpen, setMyBotsMenuOpen] = useState(false);
  const { isAuthenticated, logout } = useAuth();
  const [gearRevealOpen, setGearRevealOpen] = useState(false);
  const { recentGear } = useRecentGear();
  const newGearCount = isAuthenticated ? recentGear.length : 0;
  
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

  const isRaceActive = ['/schedule', '/leaderboard', '/simulator'].some(p => isActive(p));
  const isMyBotsActive = ['/garage', '/marketplace'].some(p => isActive(p));
  
  // Prevent body scroll when mobile drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);
  
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-6">
        <div className="flex h-20 items-center justify-between">
          <Link to="/" className="flex items-center gap-3 font-semibold text-foreground hover:text-primary transition-colors">
            <img src="/pokedbots-racing-icon.webp" alt="PokedBots Racing" className="h-9 w-auto translate-y-1" />
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6">
            <EventsHub />
            
            {/* Racing Dropdown */}
            <div className="relative">
              <button
                onMouseEnter={() => setRaceMenuOpen(true)}
                onMouseLeave={() => setRaceMenuOpen(false)}
                className={`${linkClass('/schedule')} flex items-center gap-1 ${isRaceActive ? 'text-primary drop-shadow-[0_0_8px_hsl(var(--primary))]' : ''}`}
              >
                Racing
                <ChevronDown className="h-3 w-3" />
              </button>
              {raceMenuOpen && (
                <div 
                  className="absolute top-full left-0 pt-2 w-48"
                  onMouseEnter={() => setRaceMenuOpen(true)}
                  onMouseLeave={() => setRaceMenuOpen(false)}
                >
                  <div className="bg-card border border-border rounded-lg shadow-xl py-2">
                  <Link to="/schedule" className="block px-4 py-2 text-sm hover:bg-muted transition-colors">
                    <div className="font-medium">Schedule</div>
                    <div className="text-xs text-muted-foreground">View upcoming races</div>
                  </Link>
                  <Link to="/leaderboard" className="block px-4 py-2 text-sm hover:bg-muted transition-colors">
                    <div className="font-medium">Leaderboard</div>
                    <div className="text-xs text-muted-foreground">Top racers & stats</div>
                  </Link>
                  <Link to="/simulator" className="block px-4 py-2 text-sm hover:bg-muted transition-colors">
                    <div className="font-medium">Simulator</div>
                    <div className="text-xs text-muted-foreground">Test matchups</div>
                  </Link>
                  </div>
                </div>
              )}
            </div>

            {/* My Bots Dropdown */}
            <div className="relative">
              <button
                onMouseEnter={() => setMyBotsMenuOpen(true)}
                onMouseLeave={() => setMyBotsMenuOpen(false)}
                className={`${linkClass('/garage')} flex items-center gap-1 ${isMyBotsActive ? 'text-primary drop-shadow-[0_0_8px_hsl(var(--primary))]' : ''}`}
              >
                My Bots
                <ChevronDown className="h-3 w-3" />
              </button>
              {myBotsMenuOpen && (
                <div 
                  className="absolute top-full left-0 pt-2 w-48"
                  onMouseEnter={() => setMyBotsMenuOpen(true)}
                  onMouseLeave={() => setMyBotsMenuOpen(false)}
                >
                  <div className="bg-card border border-border rounded-lg shadow-xl py-2">
                  <Link to="/garage" className="block px-4 py-2 text-sm hover:bg-muted transition-colors">
                    <div className="font-medium">Garage</div>
                    <div className="text-xs text-muted-foreground">Manage your bots</div>
                  </Link>
                  <Link to="/marketplace" className="block px-4 py-2 text-sm hover:bg-muted transition-colors">
                    <div className="font-medium">Marketplace</div>
                    <div className="text-xs text-muted-foreground">Buy & sell bots</div>
                  </Link>
                  </div>
                </div>
              )}
            </div>

            {newGearCount > 0 && (
              <button
                onClick={() => setGearRevealOpen(true)}
                className="relative flex items-center gap-1.5 text-sm font-medium text-amber-400 hover:text-amber-300 transition-all animate-pulse"
                title={`${newGearCount} new gear pieces`}
              >
                <Sparkles className="h-4 w-4" />
                New Gear
                <span className="absolute -top-1.5 -right-3 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-black px-1">
                  {newGearCount}
                </span>
              </button>
            )}
            <WalletButton />
          </nav>
          
          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
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
                className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                onClick={() => setIsOpen(false)}
              />
              
              {/* Drawer */}
              <div className="fixed top-20 right-0 w-72 z-50 md:hidden overflow-y-auto max-h-[calc(100vh-5rem)] bg-card border-l border-border shadow-2xl">
                <nav className="flex flex-col py-4">
                  <div className="px-4 pb-4 space-y-3">
                    <EventsHub />
                    <WalletButton />
                  </div>
                  <div className="h-px bg-border my-2" />
                  
                  {/* Racing Section */}
                  <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Racing
                  </div>
                  <Link 
                    to="/schedule" 
                    className={mobileLinkClass('/schedule')}
                    onClick={() => setIsOpen(false)}
                  >
                    <div className="font-medium">Schedule</div>
                    <div className="text-xs text-muted-foreground">View upcoming races</div>
                  </Link>
                  <Link 
                    to="/leaderboard" 
                    className={mobileLinkClass('/leaderboard')}
                    onClick={() => setIsOpen(false)}
                  >
                    <div className="font-medium">Leaderboard</div>
                    <div className="text-xs text-muted-foreground">Top racers & stats</div>
                  </Link>
                  <Link 
                    to="/simulator" 
                    className={mobileLinkClass('/simulator')}
                    onClick={() => setIsOpen(false)}
                  >
                    <div className="font-medium">Simulator</div>
                    <div className="text-xs text-muted-foreground">Test matchups</div>
                  </Link>

                  <div className="h-px bg-border my-2" />

                  {/* My Bots Section */}
                  <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    My Bots
                  </div>
                  <Link 
                    to="/garage" 
                    className={mobileLinkClass('/garage')}
                    onClick={() => setIsOpen(false)}
                  >
                    <div className="font-medium">Garage</div>
                    <div className="text-xs text-muted-foreground">Manage your bots</div>
                  </Link>
                  <Link 
                    to="/marketplace" 
                    className={mobileLinkClass('/marketplace')}
                    onClick={() => setIsOpen(false)}
                  >
                    <div className="font-medium">Marketplace</div>
                    <div className="text-xs text-muted-foreground">Buy & sell bots</div>
                  </Link>
                  {newGearCount > 0 && (
                    <button
                      onClick={() => {
                        setGearRevealOpen(true);
                        setIsOpen(false);
                      }}
                      className="w-full block px-4 py-3 text-base font-medium text-amber-400 hover:bg-amber-400/10 transition-all border-l-4 border-amber-400 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        New Gear
                        <span className="min-w-[20px] h-[20px] flex items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-black px-1">
                          {newGearCount}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">Reveal your latest drops</div>
                    </button>
                  )}

                  <div className="h-px bg-border my-2" />

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

      {/* New Gear Reveal Dialog — accessible from anywhere */}
      <NewGearReveal
        gear={recentGear}
        open={gearRevealOpen}
        onOpenChange={setGearRevealOpen}
      />
    </header>
  );
}
