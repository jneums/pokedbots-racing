import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Wallet } from 'lucide-react';
import type { WalletProvider } from '../lib/auth';

const WALLET_OPTIONS: { id: WalletProvider; name: string; description: string }[] = [
  {
    id: 'identity',
    name: 'Internet Identity',
    description: 'IC native authentication (v2)',
  },
  {
    id: 'nfid',
    name: 'NFID',
    description: 'Modern wallet with email support',
  },
  {
    id: 'plug',
    name: 'Plug Wallet',
    description: 'Browser extension wallet',
  },
];

export default function WalletButton() {
  const { user, isAuthenticated, isLoading, error, login, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [connectingProvider, setConnectingProvider] = useState<WalletProvider | null>(null);
  const [copied, setCopied] = useState(false);

  const handleLogin = async (provider: WalletProvider) => {
    setConnectingProvider(provider);
    try {
      await login(provider);
      setIsOpen(false);
    } catch (err) {
      console.error('Login failed:', err);
    } finally {
      setConnectingProvider(null);
    }
  };

  const truncatePrincipal = (principal: string) => {
    if (principal.length <= 12) return principal;
    return `${principal.slice(0, 6)}...${principal.slice(-4)}`;
  };

  if (isAuthenticated && user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <span className="hidden sm:inline">{truncatePrincipal(user.principal)}</span>
            <span className="sm:hidden">Wallet</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div 
            className="px-2 py-1.5 text-sm font-mono cursor-pointer hover:bg-accent rounded-sm transition-colors group"
            onClick={() => {
              navigator.clipboard.writeText(user.principal);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            title="Click to copy"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs">{truncatePrincipal(user.principal)}</span>
              {copied ? (
                <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive cursor-pointer">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Wallet className="h-4 w-4" />
          Connect Wallet
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Your Wallet</DialogTitle>
          <DialogDescription>
            Choose a wallet provider to connect to PokedBots Racing
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 mt-4">
          {WALLET_OPTIONS.map((wallet) => (
            <button
              key={wallet.id}
              onClick={() => handleLogin(wallet.id)}
              disabled={isLoading || connectingProvider !== null}
              className="w-full flex items-start gap-3 p-4 rounded-lg border border-border hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
            >
              <Wallet className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium">{wallet.name}</div>
                <div className="text-sm text-muted-foreground">
                  {wallet.description}
                </div>
                {connectingProvider === wallet.id && (
                  <div className="text-sm text-primary mt-1">
                    Connecting...
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">
              {error}
            </p>
          </div>
        )}

        <div className="mt-4 text-xs text-muted-foreground text-center">
          By connecting, you agree to keep your NFTs in your wallet. This is a non-custodial platform.
        </div>
      </DialogContent>
    </Dialog>
  );
}
