import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
import { getTerrainPreference, getTerrainIcon, getTerrainName, getFactionTerrainBonus, getFactionBonus, getFactionSpecialTerrain } from '../../lib/utils';
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
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize state from URL params
  const [showAllBots, setShowAllBots] = useState(searchParams.get('showAll') === 'true');
  const [sortBy, setSortBy] = useState<'price' | 'rating' | 'index'>((searchParams.get('sort') as 'price' | 'rating' | 'index') || 'price');
  const [minPrice, setMinPrice] = useState<string>(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState<string>(searchParams.get('maxPrice') || '');
  const [minRating, setMinRating] = useState<string>(searchParams.get('minRating') || '');
  const [maxRating, setMaxRating] = useState<string>(searchParams.get('maxRating') || '');
  const [faction, setFaction] = useState<string>(searchParams.get('faction') || '');
  const [raceClass, setRaceClass] = useState<string>(searchParams.get('class') || '');
  const [tokenIndexSearch, setTokenIndexSearch] = useState<string>(searchParams.get('token') || '');
  const [filtersOpen, setFiltersOpen] = useState(false);
  
  // Update URL whenever filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (showAllBots) params.set('showAll', 'true');
    if (sortBy !== 'price') params.set('sort', sortBy);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (minRating) params.set('minRating', minRating);
    if (maxRating) params.set('maxRating', maxRating);
    if (faction) params.set('faction', faction);
    if (raceClass) params.set('class', raceClass);
    if (tokenIndexSearch) params.set('token', tokenIndexSearch);
    
    setSearchParams(params, { replace: true });
  }, [showAllBots, sortBy, minPrice, maxPrice, minRating, maxRating, faction, raceClass, tokenIndexSearch, setSearchParams]);
  
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
    showAllBots,
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">Wasteland Marketplace</h1>
            <p className="text-muted-foreground">
              {showAllBots ? 'Browse all PokedBots in the collection' : 'Browse and purchase PokedBots NFTs for racing'}
            </p>
          </div>
          
          {/* Toggle Switch */}
          <div className="flex items-center gap-3 bg-card border rounded-lg p-3">
            <span className="text-sm font-medium whitespace-nowrap">
              {showAllBots ? 'All Bots' : 'Listed Only'}
            </span>
            <button
              onClick={() => setShowAllBots(!showAllBots)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                showAllBots ? 'bg-primary' : 'bg-muted'
              }`}
              role="switch"
              aria-checked={showAllBots}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  showAllBots ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
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
              <Button
                variant={sortBy === 'index' ? 'default' : 'outline'}
                onClick={() => setSortBy('index')}
                className="whitespace-nowrap"
              >
                Sort by Index
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
                    <Link to={`/bot/${listing.tokenIndex}`} className="block">
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
                    </Link>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex justify-between items-center">
                        <span>Bot #{listing.tokenIndex}</span>
                        {listing.price > 0 ? (
                          <span className="text-primary">{listing.price.toFixed(2)} ICP</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">NFS</span>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Rating:</span>
                          {listing.isInitialized && listing.baseRating !== listing.currentRating ? (
                            <div className="flex flex-col items-end">
                              <span className="font-semibold">{listing.baseRating}/100</span>
                              <span className="text-[10px] text-muted-foreground">
                                (Current: {listing.currentRating})
                              </span>
                            </div>
                          ) : (
                            <span className="font-semibold">{listing.overallRating}/100</span>
                          )}
                        </div>
                        <div className="grid grid-cols-4 gap-1 text-xs">
                          <div className="text-center">
                            <div className="text-muted-foreground">SPD</div>
                            <div className="font-semibold">
                              {listing.isInitialized && listing.currentSpeed !== undefined ? (
                                <div className="flex flex-col items-center">
                                  <span className={listing.currentSpeed > listing.baseSpeed ? "text-green-500" : ""}>
                                    {listing.currentSpeed}
                                  </span>
                                  <span className="text-[9px] text-muted-foreground">
                                    ({listing.baseSpeed})
                                  </span>
                                </div>
                              ) : (
                                listing.baseSpeed
                              )}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-muted-foreground">PWR</div>
                            <div className="font-semibold">
                              {listing.isInitialized && listing.currentPowerCore !== undefined ? (
                                <div className="flex flex-col items-center">
                                  <span className={listing.currentPowerCore > listing.basePowerCore ? "text-green-500" : ""}>
                                    {listing.currentPowerCore}
                                  </span>
                                  <span className="text-[9px] text-muted-foreground">
                                    ({listing.basePowerCore})
                                  </span>
                                </div>
                              ) : (
                                listing.basePowerCore
                              )}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-muted-foreground">ACC</div>
                            <div className="font-semibold">
                              {listing.isInitialized && listing.currentAcceleration !== undefined ? (
                                <div className="flex flex-col items-center">
                                  <span className={listing.currentAcceleration > listing.baseAcceleration ? "text-green-500" : ""}>
                                    {listing.currentAcceleration}
                                  </span>
                                  <span className="text-[9px] text-muted-foreground">
                                    ({listing.baseAcceleration})
                                  </span>
                                </div>
                              ) : (
                                listing.baseAcceleration
                              )}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-muted-foreground">STB</div>
                            <div className="font-semibold">
                              {listing.isInitialized && listing.currentStability !== undefined ? (
                                <div className="flex flex-col items-center">
                                  <span className={listing.currentStability > listing.baseStability ? "text-green-500" : ""}>
                                    {listing.currentStability}
                                  </span>
                                  <span className="text-[9px] text-muted-foreground">
                                    ({listing.baseStability})
                                  </span>
                                </div>
                              ) : (
                                listing.baseStability
                              )}
                            </div>
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
                              {getTerrainIcon(getTerrainPreference(listing.backgroundColor, listing.faction))} {getTerrainName(getTerrainPreference(listing.backgroundColor, listing.faction))} (+5%)
                            </Badge>
                            {(() => {
                              const factionTerrain = getFactionSpecialTerrain(listing.faction);
                              return factionTerrain ? (
                                <Badge variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-400 px-2 py-0">
                                  {getTerrainIcon(factionTerrain.terrain)} {getTerrainName(factionTerrain.terrain)} ({factionTerrain.bonus})
                                </Badge>
                              ) : null;
                            })()}
                            <Badge variant="outline" className="border-blue-500/50 text-blue-600 dark:text-blue-400 px-2 py-0">
                              {getFactionBonus(listing.faction)}
                            </Badge>
                          </div>
                        )}
                      </div>
                      {listing.price > 0 ? (
                        <Button 
                          className="w-full mt-4" 
                          variant="default"
                          disabled={!user}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handlePurchaseClick(
                              listing.tokenIndex, 
                              listing.price,
                              listing.faction,
                              listing.overallRating
                            );
                          }}
                        >
                          {user ? 'Purchase' : 'Connect Wallet'}
                        </Button>
                      ) : (
                        <Link to={`/bot/${listing.tokenIndex}`}>
                          <Button 
                            className="w-full mt-4" 
                            variant="outline"
                          >
                            View Details
                          </Button>
                        </Link>
                      )}
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
