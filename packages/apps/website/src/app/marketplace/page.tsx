import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { PurchaseDialog } from '../../components/PurchaseDialog';
import { useAuth } from '../../hooks/useAuth';
import { useInfiniteMarketplace, usePurchaseBot } from '../../hooks/useMarketplace';
import { generatetokenIdentifier, generateExtThumbnailLink } from '@pokedbots-racing/ic-js';
import { getTerrainPreference, getTerrainIcon, getTerrainName, getFactionTerrainBonus, getFactionBonus } from '../../lib/utils';
import { AlertCircle, ChevronDown } from 'lucide-react';

interface PurchaseDialogState {
  isOpen: boolean;
  tokenIndex: number | null;
  price: number;
  faction: string | null;
  rating: number;
}

export default function MarketplacePage() {
  const { user } = useAuth();
  const [sortBy, setSortBy] = useState<'price' | 'rating'>('price');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [minRating, setMinRating] = useState<string>('');
  const [maxRating, setMaxRating] = useState<string>('');
  const [faction, setFaction] = useState<string>('');
  const [raceClass, setRaceClass] = useState<string>('');
  const [tokenIndexSearch, setTokenIndexSearch] = useState<string>('');
  const [filtersOpen, setFiltersOpen] = useState(false);
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
  } = useInfiniteMarketplace({ 
    sortBy,
    minPrice: minPrice ? parseFloat(minPrice) : undefined,
    maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
    minRating: minRating ? parseInt(minRating) : undefined,
    maxRating: maxRating ? parseInt(maxRating) : undefined,
    faction: faction || undefined,
    raceClass: raceClass || undefined,
    tokenIndex: tokenIndexSearch || undefined,
    limit: 20 
  });

  // Flatten all pages into a single array
  const listings = data?.pages.flatMap(page => page.listings) ?? [];

  const getFactionColor = (faction: string | null): string => {
    if (!faction) return 'from-gray-500 to-gray-700';
    const colors: Record<string, string> = {
      UltimateMaster: 'from-purple-500 to-pink-500',
      Golden: 'from-yellow-400 to-yellow-600',
      Ultimate: 'from-blue-500 to-purple-500',
      Wild: 'from-green-500 to-emerald-600',
      Blackhole: 'from-gray-900 to-purple-900',
      Dead: 'from-gray-600 to-red-900',
      Master: 'from-blue-600 to-indigo-700',
      Bee: 'from-yellow-300 to-orange-400',
      Food: 'from-red-400 to-orange-500',
      Box: 'from-amber-600 to-yellow-700',
      Murder: 'from-red-700 to-black',
      Game: 'from-teal-500 to-cyan-600',
      Animal: 'from-green-600 to-lime-500',
      Industrial: 'from-gray-500 to-slate-600',
    };
    return colors[faction] || 'from-gray-500 to-gray-700';
  };

  const getRaceClassBadge = (rating: number): { emoji: string; name: string; color: string } => {
    if (rating >= 50) return { emoji: '👑', name: 'Silent Klan', color: 'from-yellow-400 to-amber-500' };
    if (rating >= 40) return { emoji: '🥇', name: 'Elite', color: 'from-blue-500 to-cyan-500' };
    if (rating >= 30) return { emoji: '🥈', name: 'Raider', color: 'from-gray-400 to-gray-500' };
    if (rating >= 20) return { emoji: '🥉', name: 'Junker', color: 'from-amber-700 to-yellow-800' };
    return { emoji: '🗑️', name: 'Scrap', color: 'from-stone-600 to-stone-700' };
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

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar - Filters (Sticky on desktop) */}
          <aside className="w-full lg:w-64 shrink-0">
            <div className="lg:sticky lg:top-20 space-y-4">
              {/* Mobile: Collapsible filters */}
              <Card className="lg:hidden">
                <CardHeader 
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => setFiltersOpen(!filtersOpen)}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle>Filters</CardTitle>
                    <ChevronDown 
                      className={`h-5 w-5 transition-transform duration-200 ${
                        filtersOpen ? 'transform rotate-180' : ''
                      }`}
                    />
                  </div>
                </CardHeader>
                {filtersOpen && (
                  <CardContent>
                    <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Token Index</label>
                <Input
                  type="number"
                  placeholder="Search by token index..."
                  value={tokenIndexSearch}
                  onChange={(e) => setTokenIndexSearch(e.target.value)}
                  className="w-full"
                  min="0"
                  max="9999"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Min Price (ICP)</label>
                  <input
                    type="number"
                    placeholder="e.g. 0.5"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="px-3 py-2 border rounded-md bg-background"
                    step="0.1"
                    min="0"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Max Price (ICP)</label>
                  <input
                    type="number"
                    placeholder="e.g. 10"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="px-3 py-2 border rounded-md bg-background"
                    step="0.1"
                    min="0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Min Rating</label>
                  <input
                    type="number"
                    placeholder="e.g. 20"
                    value={minRating}
                    onChange={(e) => setMinRating(e.target.value)}
                    className="px-3 py-2 border rounded-md bg-background"
                    step="1"
                    min="0"
                    max="100"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Max Rating</label>
                  <input
                    type="number"
                    placeholder="e.g. 100"
                    value={maxRating}
                    onChange={(e) => setMaxRating(e.target.value)}
                    className="px-3 py-2 border rounded-md bg-background"
                    step="1"
                    min="0"
                    max="100"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Faction</label>
                <Select value={faction || 'all'} onValueChange={(value) => setFaction(value === 'all' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Factions" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value="all">All Factions</SelectItem>
                    <SelectItem value="UltimateMaster">UltimateMaster</SelectItem>
                    <SelectItem value="Wild">Wild</SelectItem>
                    <SelectItem value="Golden">Golden</SelectItem>
                    <SelectItem value="Ultimate">Ultimate</SelectItem>
                    <SelectItem value="Blackhole">Blackhole</SelectItem>
                    <SelectItem value="Dead">Dead</SelectItem>
                    <SelectItem value="Master">Master</SelectItem>
                    <SelectItem value="Bee">Bee</SelectItem>
                    <SelectItem value="Food">Food</SelectItem>
                    <SelectItem value="Box">Box</SelectItem>
                    <SelectItem value="Murder">Murder</SelectItem>
                    <SelectItem value="Game">Game</SelectItem>
                    <SelectItem value="Animal">Animal</SelectItem>
                    <SelectItem value="Industrial">Industrial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Race Class</label>
                <Select value={raceClass || 'all'} onValueChange={(value) => setRaceClass(value === 'all' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    <SelectItem value="SilentKlan">👑 Silent Klan (50+)</SelectItem>
                    <SelectItem value="Elite">🥇 Elite (40-49)</SelectItem>
                    <SelectItem value="Raider">🥈 Raider (30-39)</SelectItem>
                    <SelectItem value="Junker">🥉 Junker (20-29)</SelectItem>
                    <SelectItem value="Scrap">🗑️ Scrap (&lt;20)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
                      {(tokenIndexSearch || minPrice || maxPrice || minRating || maxRating || faction || raceClass) && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setTokenIndexSearch('');
                            setMinPrice('');
                            setMaxPrice('');
                            setMinRating('');
                            setMaxRating('');
                            setFaction('');
                            setRaceClass('');
                          }}
                          className="w-full"
                        >
                          Clear Filters
                        </Button>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Desktop: Always visible filters */}
              <Card className="hidden lg:block">
                <CardHeader>
                  <CardTitle>Filters</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium">Token Index</label>
                      <Input
                        type="number"
                        placeholder="Search by token index..."
                        value={tokenIndexSearch}
                        onChange={(e) => setTokenIndexSearch(e.target.value)}
                        className="w-full"
                        min="0"
                        max="9999"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium">Min Price (ICP)</label>
                      <input
                        type="number"
                        placeholder="e.g. 0.5"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                        className="px-3 py-2 border rounded-md bg-background"
                        step="0.1"
                        min="0"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium">Max Price (ICP)</label>
                      <input
                        type="number"
                        placeholder="e.g. 10"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        className="px-3 py-2 border rounded-md bg-background"
                        step="0.1"
                        min="0"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium">Min Rating</label>
                      <input
                        type="number"
                        placeholder="e.g. 20"
                        value={minRating}
                        onChange={(e) => setMinRating(e.target.value)}
                        className="px-3 py-2 border rounded-md bg-background"
                        step="1"
                        min="0"
                        max="100"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium">Max Rating</label>
                      <input
                        type="number"
                        placeholder="e.g. 100"
                        value={maxRating}
                        onChange={(e) => setMaxRating(e.target.value)}
                        className="px-3 py-2 border rounded-md bg-background"
                        step="1"
                        min="0"
                        max="100"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium">Faction</label>
                      <Select value={faction || 'all'} onValueChange={(value) => setFaction(value === 'all' ? '' : value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Factions" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          <SelectItem value="all">All Factions</SelectItem>
                          <SelectItem value="UltimateMaster">UltimateMaster</SelectItem>
                          <SelectItem value="Wild">Wild</SelectItem>
                          <SelectItem value="Golden">Golden</SelectItem>
                          <SelectItem value="Ultimate">Ultimate</SelectItem>
                          <SelectItem value="Blackhole">Blackhole</SelectItem>
                          <SelectItem value="Dead">Dead</SelectItem>
                          <SelectItem value="Master">Master</SelectItem>
                          <SelectItem value="Bee">Bee</SelectItem>
                          <SelectItem value="Food">Food</SelectItem>
                          <SelectItem value="Box">Box</SelectItem>
                          <SelectItem value="Murder">Murder</SelectItem>
                          <SelectItem value="Game">Game</SelectItem>
                          <SelectItem value="Animal">Animal</SelectItem>
                          <SelectItem value="Industrial">Industrial</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium">Race Class</label>
                      <Select value={raceClass || 'all'} onValueChange={(value) => setRaceClass(value === 'all' ? '' : value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Classes" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Classes</SelectItem>
                          <SelectItem value="SilentKlan">👑 Silent Klan (50+)</SelectItem>
                          <SelectItem value="Elite">🥇 Elite (40-49)</SelectItem>
                          <SelectItem value="Raider">🥈 Raider (30-39)</SelectItem>
                          <SelectItem value="Junker">🥉 Junker (20-29)</SelectItem>
                          <SelectItem value="Scrap">🗑️ Scrap (&lt;20)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {(tokenIndexSearch || minPrice || maxPrice || minRating || maxRating || faction || raceClass) && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setTokenIndexSearch('');
                          setMinPrice('');
                          setMaxPrice('');
                          setMinRating('');
                          setMaxRating('');
                          setFaction('');
                          setRaceClass('');
                        }}
                        className="w-full"
                      >
                        Clear Filters
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            {/* Sort Buttons */}
            <div className="mb-6 flex gap-2">
              <Button
                variant={sortBy === 'price' ? 'default' : 'outline'}
                onClick={() => setSortBy('price')}
                className="whitespace-nowrap"
              >
                Sort by Price
              </Button>
              <Button
                variant={sortBy === 'rating' ? 'default' : 'outline'}
                onClick={() => setSortBy('rating')}
                className="whitespace-nowrap"
              >
                Sort by Rating
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
                {listings.map((listing) => {
                  const tokenId = generatetokenIdentifier('bzsui-sqaaa-aaaah-qce2a-cai', listing.tokenIndex);
                  const imageUrl = generateExtThumbnailLink(tokenId);
                  
                  return (
                  <Card key={listing.tokenIndex} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="aspect-square relative bg-gradient-to-br from-gray-800 to-gray-900 overflow-hidden">
                      <img
                        src={imageUrl}
                        alt={`Bot #${listing.tokenIndex}`}
                        className="w-full h-full object-cover object-top"
                        loading="lazy"
                      />
                      {listing.faction && (
                        <Badge className={`absolute top-2 right-2 bg-gradient-to-r ${getFactionColor(listing.faction)} text-white border-0`}>
                          {listing.faction}
                        </Badge>
                      )}
                      <Badge className={`absolute top-2 left-2 bg-gradient-to-r ${getRaceClassBadge(listing.overallRating).color} text-white border-0`}>
                        {getRaceClassBadge(listing.overallRating).emoji} {getRaceClassBadge(listing.overallRating).name}
                      </Badge>
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
                        {listing.faction && (
                          <div className="flex items-center gap-1 text-xs flex-wrap pt-2">
                            <Badge variant="outline" className="border-green-500/50 text-green-600 dark:text-green-400 px-2 py-0">
                              {getTerrainIcon(getTerrainPreference(listing.backgroundColor, listing.faction))} {getTerrainName(getTerrainPreference(listing.backgroundColor, listing.faction))} 
                              {(() => {
                                const terrain = getTerrainPreference(listing.backgroundColor, listing.faction);
                                const bonus = getFactionTerrainBonus(listing.faction, terrain);
                                return bonus ? ` (${bonus})` : ' (+5%)';
                              })()}
                            </Badge>
                            <Badge variant="outline" className="border-blue-500/50 text-blue-600 dark:text-blue-400 px-2 py-0">
                              {getFactionBonus(listing.faction)}
                            </Badge>
                          </div>
                        )}
                      </div>
                      <Button 
                        className="w-full mt-4" 
                        variant="default"
                        disabled={!user}
                        onClick={() => handlePurchaseClick(
                          listing.tokenIndex, 
                          listing.price,
                          listing.faction,
                          listing.overallRating
                        )}
                      >
                        {user ? 'Purchase' : 'Connect Wallet'}
                      </Button>
                    </CardContent>
                  </Card>
                  );
                })}
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
          </div>
        </div>

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
