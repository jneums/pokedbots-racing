import { useAuth } from '../../hooks/useAuth';
import { useMyBots, useUserInventory } from '../../hooks/useGarage';
import { useICPBalance, useTransferICP } from '../../hooks/useLedger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { WalletConnect } from '../../components/WalletConnect';
import { BotCard } from '../../components/BotCard';
import { TransferICPDialog } from '../../components/TransferICPDialog';
import { AllowanceManager } from '../../components/AllowanceManager';
import { AccountIdentifier } from '@icp-sdk/canisters/ledger/icp';
import { Principal } from '@icp-sdk/core/principal';
import { Copy, RefreshCw, Check } from 'lucide-react';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export default function GaragePage() {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const [copiedPrincipal, setCopiedPrincipal] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);
  
  // Use React Query hooks
  const { data: bots = [], isLoading: loading, error: botsError } = useMyBots();
  const { data: balance, isLoading: balanceLoading, refetch: refetchBalance } = useICPBalance();
  const { data: inventory, isLoading: inventoryLoading, refetch: refetchInventory } = useUserInventory();
  const transferICP = useTransferICP();

  // Force immediate refetch of bots by invalidating cache
  const refetchBots = () => {
    queryClient.invalidateQueries({ queryKey: ['my-bots'] });
  };

  const error = botsError ? (botsError instanceof Error ? botsError.message : 'Failed to load bots') : null;

  const handleTransfer = async (to: string, amount: number) => {
    await transferICP.mutateAsync({ to, amount });
  };

  const copyPrincipal = () => {
    if (user?.principal) {
      navigator.clipboard.writeText(user.principal);
      setCopiedPrincipal(true);
      setTimeout(() => setCopiedPrincipal(false), 2000);
    }
  };

  const copyAccount = () => {
    if (user?.principal) {
      const accountId = AccountIdentifier.fromPrincipal({
        principal: Principal.fromText(user.principal),
      }).toHex();
      navigator.clipboard.writeText(accountId);
      setCopiedAccount(true);
      setTimeout(() => setCopiedAccount(false), 2000);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-3xl">Wasteland Garage</CardTitle>
            <CardDescription>
              Connect your wallet to view and manage your PokedBots
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-8">
            <WalletConnect />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Wasteland Garage</h1>
          <p className="text-muted-foreground">
            Manage your racing machines. Repair, recharge, and upgrade your bots.
          </p>
        </div>
        <Button onClick={() => refetchBots()} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      {/* Top Cards Grid - Wallet, Account Details, Parts Inventory */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Wallet Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Wallet</CardTitle>
                <CardDescription>Manage your ICP balance</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetchBalance()}
                  disabled={balanceLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${balanceLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <TransferICPDialog
                  onTransfer={handleTransfer}
                  maxBalance={balance ? Number(balance) / 100_000_000 : 0}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Balance</div>
              <div className="text-3xl font-bold">
                {balance !== null && balance !== undefined 
                  ? (Number(balance) / 100_000_000).toFixed(8) 
                  : '—'}{' '}
                <span className="text-lg text-muted-foreground">ICP</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {balance !== null && balance !== undefined 
                  ? `${balance.toString()} e8s` 
                  : 'Click refresh to load'}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Details Section */}
        <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
          <CardDescription>Your identity and receiving addresses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Principal ID */}
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-2">Principal ID</div>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-3 py-2 rounded-md font-mono flex-1 truncate">
                  {user?.principal}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={copyPrincipal}
                >
                  {copiedPrincipal ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Account ID */}
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-2">
                Account ID <span className="text-xs font-normal">(for receiving)</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-3 py-2 rounded-md font-mono flex-1 truncate">
                  {user?.principal && AccountIdentifier.fromPrincipal({
                    principal: Principal.fromText(user.principal),
                  }).toHex()}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={copyAccount}
                >
                  {copiedAccount ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Allowance Manager Section */}
      <div className="mb-8">
        <AllowanceManager />
      </div>

      {/* Parts Inventory Section */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Parts Inventory</CardTitle>
              <CardDescription>Components for bot upgrades</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetchInventory()}
              disabled={inventoryLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${inventoryLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{inventory ? Number(inventory.speedChips) : '—'}</div>
              <div className="text-xs text-muted-foreground">Speed Chips</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{inventory ? Number(inventory.powerCoreFragments) : '—'}</div>
              <div className="text-xs text-muted-foreground">Power Core Fragments</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{inventory ? Number(inventory.thrusterKits) : '—'}</div>
              <div className="text-xs text-muted-foreground">Thruster Kits</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{inventory ? Number(inventory.gyroModules) : '—'}</div>
              <div className="text-xs text-muted-foreground">Gyro Modules</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{inventory ? Number(inventory.universalParts) : '—'}</div>
              <div className="text-xs text-muted-foreground">Universal Parts</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {loading && bots.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2 mt-2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded w-5/6"></div>
                  <div className="h-4 bg-muted rounded w-4/6"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : bots.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground text-lg mb-4">
              No PokedBots found in your wallet
            </p>
            <p className="text-sm text-muted-foreground">
              Purchase bots from the marketplace to get started racing in the wasteland!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bots.map((bot) => (
            <BotCard key={bot.tokenIndex.toString()} bot={bot} onUpdate={() => refetchBots()} />
          ))}
        </div>
      )}

      {!loading && bots.length > 0 && (
        <div className="mt-8 text-center">
          <Badge variant="secondary" className="px-4 py-2">
            {bots.length} {bots.length === 1 ? 'Bot' : 'Bots'} in Garage
          </Badge>
        </div>
      )}
    </div>
  );
}
