import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { PurchaseDialog } from '../../components/PurchaseDialog';
import { useAuth } from '../../hooks/useAuth';
import { useInfiniteMarketplace, usePurchaseBot } from '../../hooks/useMarketplace';
import { AlertCircle } from 'lucide-react';

interface PurchaseDialogState {
  isOpen: boolean;
  tokenIndex: number | null;
  price: number;
  faction: string | null;
  rating: number;
}

export default function MarketplacePage() {
  const { user } = useAuth();
  const [sortBy, setSortBy] = useState<'price' | 'rating' | 'winRate' | 'wins'>('price');
  const { mutate: purchaseBot } = usePurchaseBot();
  const [showLoginAlert, setShowLoginAlert] = useState(false);
  const [purchaseDialog, setPurchaseDialog] = useState<PurchaseDialogState>({
    isOpen: false,
    tokenIndex: null,
    price: 0,
    faction: null,
    rating: 0,
  });

  const handlePurchaseClick = (tokenIndex: number, price: number, faction: string | null, rating: number) => {
    if (!user) {
      setShowLoginAlert(true);
      setTimeout(() => setShowLoginAlert(false), 5000);
      return;
    }
    setPurchaseDialog({
      isOpen: true,
      tokenIndex,
      price,
      faction,
      rating,
    });
  };

  const handleConfirmPurchase = async () => {
    if (!purchaseDialog.tokenIndex) return;
    
    return new Promise<void>((resolve, reject) => {
      purchaseBot(
        { tokenIndex: purchaseDialog.tokenIndex!, price: purchaseDialog.price },
        {
          onSuccess: () => {
            resolve();
          },
          onError: (error) => {
            reject(error);
          },
        }
      );
    });
  };

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteMarketplace({ sortBy, limit: 20 });

  // Flatten all pages into a single array
  const listings = data?.pages.flatMap(page => page.listings) ?? [];

  const getFactionBadgeColor = (faction: string | null) => {
    if (!faction) return 'bg-gray-500';
    
    const ultraRare = ['UltimateMaster', 'Wild', 'Golden', 'Ultimate'];
    const superRare = ['Blackhole', 'Dead', 'Master'];
    const rare = ['Bee', 'Food', 'Box', 'Murder'];
    
    if (ultraRare.includes(faction)) return 'bg-purple-600';
    if (superRare.includes(faction)) return 'bg-blue-600';
    if (rare.includes(faction)) return 'bg-green-600';
    return 'bg-gray-600';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Wasteland Marketplace</h1>
        <p className="text-muted-foreground">
          Browse and purchase PokedBots NFTs for racing
        </p>
      </div>

      <>
        {showLoginAlert && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please connect your wallet to purchase a bot. Click "Connect Wallet" in the navigation bar.
            </AlertDescription>
          </Alert>
        )}

        <div className="mb-6 flex gap-2">
            <Button
              variant={sortBy === 'price' ? 'default' : 'outline'}
              onClick={() => setSortBy('price')}
            >
              Sort by Price
            </Button>
            <Button
              variant={sortBy === 'rating' ? 'default' : 'outline'}
              onClick={() => setSortBy('rating')}
            >
              Sort by Rating
            </Button>
            <Button
              variant={sortBy === 'winRate' ? 'default' : 'outline'}
              onClick={() => setSortBy('winRate')}
            >
              Sort by Win Rate
            </Button>
            <Button
              variant={sortBy === 'wins' ? 'default' : 'outline'}
              onClick={() => setSortBy('wins')}
            >
              Sort by Wins
            </Button>
          </div>

          {error && (
            <Card className="mb-6 border-red-500">
              <CardContent className="pt-6 text-red-500">
                {error instanceof Error ? error.message : 'Failed to load marketplace listings'}
              </CardContent>
            </Card>
          )}

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading marketplace...</p>
            </div>
          ) : listings.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No bots currently listed for sale
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {listings.map((listing) => (
                  <Card key={listing.tokenIndex} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="aspect-square relative bg-gradient-to-br from-gray-800 to-gray-900 overflow-hidden">
                      <img
                        src={listing.imageUrl}
                        alt={`Bot #${listing.tokenIndex}`}
                        className="w-full h-full object-cover object-top"
                        loading="lazy"
                      />
                      {listing.faction && (
                        <div className={`absolute top-2 right-2 ${getFactionBadgeColor(listing.faction)} text-white text-xs px-2 py-1 rounded`}>
                          {listing.faction}
                        </div>
                      )}
                    </div>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex justify-between items-center">
                        <span>Bot #{listing.tokenIndex}</span>
                        <span className="text-primary">{listing.price.toFixed(2)} ICP</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Rating:</span>
                          <span className="font-semibold">{listing.overallRating}/100</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1 text-xs">
                          <div className="text-center">
                            <div className="text-muted-foreground">SPD</div>
                            <div className="font-semibold">{listing.baseSpeed}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-muted-foreground">PWR</div>
                            <div className="font-semibold">{listing.basePowerCore}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-muted-foreground">ACC</div>
                            <div className="font-semibold">{listing.baseAcceleration}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-muted-foreground">STB</div>
                            <div className="font-semibold">{listing.baseStability}</div>
                          </div>
                        </div>
                        <div className="pt-2 border-t min-h-[2.5rem] flex items-center">
                          {listing.isInitialized && listing.racesEntered > 0 ? (
                            <div className="flex justify-between w-full">
                              <span className="text-muted-foreground">Record:</span>
                              <span>{listing.wins}W / {listing.racesEntered - listing.wins}L ({listing.winRate.toFixed(1)}%)</span>
                            </div>
                          ) : !listing.isInitialized ? (
                            <div className="text-xs text-muted-foreground">
                              Not yet initialized for racing
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground">
                              No races yet
                            </div>
                          )}
                        </div>
                      </div>
                      <Button 
                        className="w-full mt-4" 
                        variant="default"
                        onClick={() => handlePurchaseClick(
                          listing.tokenIndex, 
                          listing.price,
                          listing.faction,
                          listing.overallRating
                        )}
                      >
                        Purchase
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {hasNextPage && (
                <div className="mt-8 text-center">
                  <Button
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    variant="outline"
                    size="lg"
                  >
                    {isFetchingNextPage ? 'Loading...' : 'Load More'}
                  </Button>
                </div>
              )}
              
              {isFetching && !isFetchingNextPage && (
                <div className="mt-8 text-center text-muted-foreground">
                  Refreshing...
                </div>
              )}
            </>
          )}

        <PurchaseDialog
          botNumber={purchaseDialog.tokenIndex ?? 0}
          price={purchaseDialog.price}
          faction={purchaseDialog.faction}
          rating={purchaseDialog.rating}
          isOpen={purchaseDialog.isOpen}
          onClose={() => setPurchaseDialog({ ...purchaseDialog, isOpen: false })}
          onConfirm={handleConfirmPurchase}
        />
      </>
    </div>
  );
}
