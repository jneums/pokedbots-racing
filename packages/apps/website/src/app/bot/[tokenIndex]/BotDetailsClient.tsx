import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useGetBotProfile, useGetBotRaceHistory } from '@/hooks/useRacing';
import { useDedicationInfo } from '@/hooks/useGarage';
import { useBackgrounds } from '@/hooks/useBackgrounds';
import { useBotBaseStats } from '@/hooks/usePrecomputedStats';
import { generatetokenIdentifier, generateExtThumbnailLink } from '@pokedbots-racing/ic-js';
import { getTerrainPreference, getTerrainIcon, getTerrainName, getFactionBonus, getFactionSpecialTerrain } from '@/lib/utils';

function formatICP(amount: bigint): string {
  const icp = Number(amount) / 100_000_000;
  return icp.toFixed(3);
}

function getFactionColor(faction: string): string {
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
}

function getRaceClassBadge(raceClass: any): string {
  // Handle string format from backend
  if (typeof raceClass === 'string') {
    if (raceClass.includes('Scrap')) return '🗑️ Scrap';
    if (raceClass.includes('Junker')) return '🥉 Junker';
    if (raceClass.includes('Raider')) return '🥈 Raider';
    if (raceClass.includes('Elite')) return '🥇 Elite';
    if (raceClass.includes('SilentKlan') || raceClass.includes('Silent Klan')) return '👑 Silent Klan';
  }
  // Handle variant object format
  if ('Scrap' in raceClass) return '🗑️ Scrap';
  if ('Junker' in raceClass) return '🥉 Junker';
  if ('Raider' in raceClass) return '🥈 Raider';
  if ('Elite' in raceClass) return '🥇 Elite';
  if ('SilentKlan' in raceClass) return '👑 Silent Klan';
  return 'Unknown';
}

// Get tier display info (emoji, color gradient)
function getDedicationTierInfo(tier: number): { emoji: string; gradient: string; textColor: string } {
  switch (tier) {
    case 0: return { emoji: '🔰', gradient: 'from-gray-400 to-gray-500', textColor: 'text-gray-400' };
    case 1: return { emoji: '⭐', gradient: 'from-green-400 to-green-600', textColor: 'text-green-400' };
    case 2: return { emoji: '🌟', gradient: 'from-blue-400 to-blue-600', textColor: 'text-blue-400' };
    case 3: return { emoji: '💫', gradient: 'from-purple-400 to-purple-600', textColor: 'text-purple-400' };
    case 4: return { emoji: '🏆', gradient: 'from-yellow-400 to-orange-500', textColor: 'text-yellow-400' };
    case 5: return { emoji: '👑', gradient: 'from-pink-500 to-red-500', textColor: 'text-pink-500' };
    default: return { emoji: '🔰', gradient: 'from-gray-400 to-gray-500', textColor: 'text-gray-400' };
  }
}

export function BotDetailsClient({ tokenIndex }: { tokenIndex: string }) {
  const navigate = useNavigate();
  const { data: profile } = useGetBotProfile(Number(tokenIndex));
  const { 
    data: raceHistoryData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingHistory
  } = useGetBotRaceHistory(Number(tokenIndex), 10);
  const { data: backgroundData } = useBackgrounds();
  const { data: dedicationInfo } = useDedicationInfo(Number(tokenIndex));
  const baseStats = useBotBaseStats(Number(tokenIndex));
  
  // Flatten all pages of race history
  const allRaces = raceHistoryData?.pages.flatMap(page => page.races) || [];
  
  // Check if there are more races from the last page
  const lastPage = raceHistoryData?.pages[raceHistoryData.pages.length - 1];
  const hasMoreRaces = lastPage?.hasMore ?? false;
  
  // Debug logging
  console.log('Race History Debug:', {
    totalPages: raceHistoryData?.pages.length,
    totalRaces: allRaces.length,
    lastPageHasMore: lastPage?.hasMore,
    lastPageNextRaceId: lastPage?.nextRaceId,
    hasNextPage,
    hasMoreRaces
  });

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading bot details...</p>
      </div>
    );
  }

  const tokenId = generatetokenIdentifier('bzsui-sqaaa-aaaah-qce2a-cai', Number(tokenIndex));
  const imageUrl = generateExtThumbnailLink(tokenId);
  const thumbnailUrl = generateExtThumbnailLink(tokenId);

  const isInitialized = profile.isInitialized;
  
  // Handle Candid optional type: [] | [FactionType]
  const factionOpt = Array.isArray(profile.faction) && profile.faction.length > 0 ? profile.faction[0] : profile.faction;
  const faction = factionOpt ? Object.keys(factionOpt)[0] : null;
  
  const racesEntered = Number(profile.career.racesEntered);
  const wins = Number(profile.career.wins);
  const podiums = Number(profile.career.podiums);
  const totalEarnings = BigInt(profile.career.totalEarnings);
  
  const winRate = racesEntered > 0
    ? ((wins / racesEntered) * 100).toFixed(1)
    : '0';

  // Get actual background color for terrain preference
  // For uninitialized bots, this shows estimated preference based on background color
  const backgroundColor = backgroundData?.backgrounds[tokenIndex];
  const terrainPreference = faction ? getTerrainPreference(backgroundColor, faction) : null;
  const factionSpecialTerrain = faction ? getFactionSpecialTerrain(faction) : null;

  const ownerPrincipal = profile.owner?.toString();
  const formatPrincipal = (principal: string): string => {
    if (principal.length <= 12) return principal;
    return `${principal.slice(0, 6)}...${principal.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="mb-6"
          >
            ← Back
          </Button>

          {/* Header with Image */}
          <div className="mb-8 flex flex-col md:flex-row gap-8">
            <div className="flex-shrink-0">
              <img
                src={imageUrl}
                alt={`PokedBot #${tokenIndex}`}
                className="w-64 h-64 rounded-lg border-4 border-primary/40 shadow-2xl"
                onError={(e) => {
                  e.currentTarget.src = thumbnailUrl;
                }}
              />
            </div>

            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2">
                {profile.name && profile.name.length > 0 && profile.name[0] ? `PokedBot #${tokenIndex} - ${profile.name[0]}` : `PokedBot #${tokenIndex}`}
              </h1>
              
              <div className="flex gap-2 mb-4 flex-wrap">
                {/* Show faction badge even for uninitialized bots */}
                {faction && <Badge className={`bg-gradient-to-r ${getFactionColor(faction)} text-white`}>
                  {faction}
                </Badge>}
                
                {!isInitialized ? (
                  <>
                    <Badge variant="outline" className="border-yellow-500/50 text-yellow-600 dark:text-yellow-400">
                      ⚠️ Not Initialized
                    </Badge>
                    <Badge variant="secondary">Base Rating: {profile.stats.overallRating}</Badge>
                  </>
                ) : (
                  <>
                    {profile.raceClass && getRaceClassBadge(profile.raceClass) !== 'Unknown' && <Badge variant="outline">{getRaceClassBadge(profile.raceClass)}</Badge>}
                    <Badge variant="secondary">Rating: {profile.stats.overallRating}</Badge>
                    {profile.eloRating && <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                      ⚡ ELO: {profile.eloRating}
                    </Badge>}
                  </>
                )}
                
                {/* Show terrain bonuses for both initialized and uninitialized */}
                {terrainPreference && <Badge variant="outline" className="border-green-500/50 text-green-600 dark:text-green-400">
                  {getTerrainIcon(terrainPreference)} {getTerrainName(terrainPreference)} (+5%)
                </Badge>}
                
                {factionSpecialTerrain && (
                  <Badge variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-400">
                    {getTerrainIcon(factionSpecialTerrain.terrain)} {getTerrainName(factionSpecialTerrain.terrain)} ({factionSpecialTerrain.bonus})
                  </Badge>
                )}
                
                {faction && <Badge variant="outline" className="border-blue-500/50 text-blue-600 dark:text-blue-400">
                  {getFactionBonus(faction)}
                </Badge>}
              </div>
              
              {!isInitialized && (
                <p className="text-sm text-muted-foreground mb-4">
                  📋 Initialize this bot to unlock racing and upgrades. Registration fee: 0.1 ICP (one-time). This will enable race entries, stat upgrades, and competitive leaderboard tracking.
                </p>
              )}

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3 mt-6">
                <div className="p-4 bg-card border-2 border-primary/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">{isInitialized ? 'Races' : 'Not Racing Yet'}</p>
                  <p className="text-2xl font-bold text-primary">{isInitialized ? racesEntered : '-'}</p>
                </div>
                <div className="p-4 bg-card border-2 border-primary/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">{isInitialized ? 'Wins' : 'No Wins Yet'}</p>
                  <p className="text-2xl font-bold text-primary">{isInitialized ? wins : '-'}</p>
                </div>
                <div className="p-4 bg-card border-2 border-primary/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">Win Rate</p>
                  <p className="text-2xl font-bold text-primary">{isInitialized && racesEntered > 0 ? `${winRate}%` : '-'}</p>
                </div>
                <div className="p-4 bg-card border-2 border-primary/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">Earnings</p>
                  <p className="text-2xl font-bold text-primary">{isInitialized ? formatICP(totalEarnings) : '-'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Card */}
          <Card className="mb-8 border-2 border-primary/20">
            <CardHeader>
              <CardTitle>{isInitialized ? 'Performance Stats' : 'Base Stats'}</CardTitle>
              {!isInitialized && (
                <p className="text-sm text-muted-foreground mt-2">
                  These are the base stats. Initialize this bot to unlock faction bonuses, terrain preferences, and upgrades.
                </p>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-card/50 border border-primary/20 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Speed</p>
                  <p className="text-3xl font-bold text-primary">
                    {profile.stats.speed}
                  </p>
                  {isInitialized && baseStats && baseStats.speed !== profile.stats.speed && (
                    <p className="text-xs text-muted-foreground mt-1">
                      ({baseStats.speed})
                    </p>
                  )}
                </div>
                <div className="text-center p-4 bg-card/50 border border-primary/20 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Power Core</p>
                  <p className="text-3xl font-bold text-primary">
                    {profile.stats.powerCore}
                  </p>
                  {isInitialized && baseStats && baseStats.powerCore !== profile.stats.powerCore && (
                    <p className="text-xs text-muted-foreground mt-1">
                      ({baseStats.powerCore})
                    </p>
                  )}
                </div>
                <div className="text-center p-4 bg-card/50 border border-primary/20 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Acceleration</p>
                  <p className="text-3xl font-bold text-primary">
                    {profile.stats.acceleration}
                  </p>
                  {isInitialized && baseStats && baseStats.acceleration !== profile.stats.acceleration && (
                    <p className="text-xs text-muted-foreground mt-1">
                      ({baseStats.acceleration})
                    </p>
                  )}
                </div>
                <div className="text-center p-4 bg-card/50 border border-primary/20 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Stability</p>
                  <p className="text-3xl font-bold text-primary">
                    {profile.stats.stability}
                  </p>
                  {isInitialized && baseStats && baseStats.stability !== profile.stats.stability && (
                    <p className="text-xs text-muted-foreground mt-1">
                      ({baseStats.stability})
                    </p>
                  )}
                </div>
              </div>
              {!isInitialized && (
                <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">
                    💡 <strong>Tip:</strong> Initialize this bot for racing to unlock its faction abilities, preferred terrain, and upgrade system. Base rating: {profile.stats.overallRating}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Career Stats */}
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle>{isInitialized ? 'Career Highlights' : 'Career Information'}</CardTitle>
              {!isInitialized && (
                <p className="text-sm text-muted-foreground mt-2">
                  This bot hasn't raced yet. Initialize to start its racing career!
                </p>
              )}
            </CardHeader>
            <CardContent>
              {isInitialized ? (
                <div className="space-y-3">
                  <div className="flex justify-between p-3 bg-card/50 border border-primary/20 rounded-lg">
                    <span className="text-muted-foreground">Total Races</span>
                    <span className="font-bold">{racesEntered}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-card/50 border border-primary/20 rounded-lg">
                    <span className="text-muted-foreground">🥇 Victories</span>
                    <span className="font-bold">{wins}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-card/50 border border-primary/20 rounded-lg">
                    <span className="text-muted-foreground">🏆 Podium Finishes</span>
                    <span className="font-bold">{podiums}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-card/50 border border-primary/20 rounded-lg">
                    <span className="text-muted-foreground">💰 Total Earnings</span>
                    <span className="font-bold">{formatICP(totalEarnings)} ICP</span>
                  </div>
                  {ownerPrincipal && (
                    <div className="flex justify-between items-center p-3 bg-card/50 border border-primary/20 rounded-lg">
                      <span className="text-muted-foreground">👤 Registered Owner</span>
                      <div className="flex items-center gap-2">
                        <img
                          src={`https://api.dicebear.com/9.x/adventurer/svg?seed=${ownerPrincipal}`}
                          alt="Owner avatar"
                          className="w-6 h-6 rounded-full border border-primary/30"
                        />
                        <span className="font-mono text-sm">{formatPrincipal(ownerPrincipal)}</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="mb-2">🏁 No racing history yet</p>
                  <p className="text-sm">Initialize this bot to start competing in wasteland races!</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dedication System */}
          {dedicationInfo && (
            <Card className="border-2 border-primary/20 mt-8">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {getDedicationTierInfo(dedicationInfo.tier).emoji} Dedication Level
                  </CardTitle>
                  <Badge className={`bg-gradient-to-r ${getDedicationTierInfo(dedicationInfo.tier).gradient} text-white`}>
                    {dedicationInfo.tierName}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Progress to next tier */}
                  {dedicationInfo.nextTierName && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress to {dedicationInfo.nextTierName}</span>
                        <span className="font-medium">{dedicationInfo.progressPercent}%</span>
                      </div>
                      <Progress value={dedicationInfo.progressPercent} className="h-2" />
                      <p className="text-xs text-muted-foreground text-right">
                        {dedicationInfo.totalDP.toLocaleString()} / {dedicationInfo.nextTierDP?.toLocaleString()} DP
                      </p>
                    </div>
                  )}

                  {/* DP Breakdown */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-card/50 border border-primary/20 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Total DP</p>
                      <p className="text-lg font-bold text-primary">{dedicationInfo.totalDP.toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-card/50 border border-primary/20 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Total Invested</p>
                      <p className="text-lg font-bold text-primary">{dedicationInfo.totalInvestedICP.toFixed(2)} ICP</p>
                    </div>
                    <div className="p-3 bg-card/50 border border-primary/20 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Investment DP</p>
                      <p className="text-lg font-bold text-green-500">{dedicationInfo.investmentDP.toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-card/50 border border-primary/20 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Activity DP</p>
                      <p className="text-lg font-bold text-blue-500">{dedicationInfo.activityDP.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Benefits */}
                  {dedicationInfo.tier > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium mb-2">Active Benefits</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                        {dedicationInfo.benefits.speedBonus > 0 && (
                          <div className="p-2 bg-green-500/10 border border-green-500/30 rounded">
                            ⚡ Speed +{dedicationInfo.benefits.speedBonus}
                          </div>
                        )}
                        {dedicationInfo.benefits.accelerationBonus > 0 && (
                          <div className="p-2 bg-green-500/10 border border-green-500/30 rounded">
                            🚀 Accel +{dedicationInfo.benefits.accelerationBonus}
                          </div>
                        )}
                        {dedicationInfo.benefits.powerCoreBonus > 0 && (
                          <div className="p-2 bg-green-500/10 border border-green-500/30 rounded">
                            ⚙️ Power +{dedicationInfo.benefits.powerCoreBonus}
                          </div>
                        )}
                        {dedicationInfo.benefits.stabilityBonus > 0 && (
                          <div className="p-2 bg-green-500/10 border border-green-500/30 rounded">
                            🛡️ Stability +{dedicationInfo.benefits.stabilityBonus}
                          </div>
                        )}
                        {dedicationInfo.benefits.terrainBonusPercent > 0 && (
                          <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded">
                            🏔️ Terrain +{dedicationInfo.benefits.terrainBonusPercent}%
                          </div>
                        )}
                        {dedicationInfo.benefits.scavengingYieldMult > 1 && (
                          <div className="p-2 bg-yellow-500/10 border border-yellow-500/30 rounded">
                            🔧 Scavenge x{dedicationInfo.benefits.scavengingYieldMult.toFixed(2)}
                          </div>
                        )}
                        {dedicationInfo.benefits.upgradeDiscountMult < 1 && (
                          <div className="p-2 bg-purple-500/10 border border-purple-500/30 rounded">
                            💰 Upgrades -{Math.round((1 - dedicationInfo.benefits.upgradeDiscountMult) * 100)}%
                          </div>
                        )}
                        {dedicationInfo.benefits.rechargeCooldownMult < 1 && (
                          <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded">
                            ⏱️ Recharge -{Math.round((1 - dedicationInfo.benefits.rechargeCooldownMult) * 100)}%
                          </div>
                        )}
                        {dedicationInfo.benefits.repairCooldownMult < 1 && (
                          <div className="p-2 bg-orange-500/10 border border-orange-500/30 rounded">
                            🔧 Repair -{Math.round((1 - dedicationInfo.benefits.repairCooldownMult) * 100)}%
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Info for tier 0 */}
                  {dedicationInfo.tier === 0 && (
                    <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        💡 <strong>Earn Dedication Points</strong> by investing in your bot (upgrades, repairs, recharges) and competing in activities (races, scavenging). Higher tiers unlock stat bonuses and cost reductions!
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Race History */}
          <Card className="border-2 border-primary/20 mt-8">
            <CardHeader>
              <CardTitle>Race History</CardTitle>
            </CardHeader>
            <CardContent>
              {!isInitialized ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="mb-2">📊 No race data available</p>
                  <p className="text-sm">This bot needs to be initialized and enter races to build a history.</p>
                </div>
              ) : isLoadingHistory ? (
                <p className="text-center text-muted-foreground">Loading race history...</p>
              ) : allRaces.length === 0 ? (
                <p className="text-center text-muted-foreground">No completed races yet</p>
              ) : (
                <>
                  <div className="space-y-3">
                    {allRaces.map((race: any, idx: number) => {
                      const position = Number(race.position);
                      const wasWin = position === 1;
                      const wasPodium = position > 0 && position <= 3;
                      const leaderboardPoints = race.leaderboardPoints || 0;
                      
                      return (
                        <Link 
                          key={`${race.raceId}-${idx}`}
                          to={`/schedule/${race.eventId}`}
                          className="block group"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gradient-to-r from-card/80 to-card/40 border border-primary/20 rounded-lg hover:border-primary/40 hover:from-card hover:to-card/60 transition-all duration-200 shadow-sm hover:shadow-md">
                            {/* Top row on mobile: Position + Race Info */}
                            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                              {/* Position Badge */}
                              <div className={`flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-xl sm:text-2xl font-bold ${
                                wasWin ? 'bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 ring-2 ring-yellow-500/30' :
                                wasPodium ? 'bg-gradient-to-br from-blue-500/20 to-purple-500/20 ring-2 ring-blue-500/30' :
                                'bg-card/50 ring-2 ring-primary/20'
                              }`}>
                                {position === 1 && '🥇'}
                                {position === 2 && '🥈'}
                                {position === 3 && '🥉'}
                                {position > 3 && <span className="text-base sm:text-lg">#{position}</span>}
                              </div>
                              
                              {/* Race Info */}
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm sm:text-base mb-0.5 sm:mb-1 group-hover:text-primary transition-colors line-clamp-1">
                                  {race.raceName}
                                </p>
                                <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 text-xs text-muted-foreground">
                                  <span className="whitespace-nowrap">📅 {new Date(Number(race.scheduledTime) / 1_000_000).toLocaleDateString()}</span>
                                  {race.finalTime && race.finalTime.length > 0 && race.finalTime[0] !== undefined && (
                                    race.finalTime[0] > 100000 
                                      ? <span className="text-red-400 font-semibold whitespace-nowrap">• DNF</span>
                                      : <span className="text-green-400 whitespace-nowrap">• ⏱️ {race.finalTime[0].toFixed(2)}s</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* Stats and Rewards - stack on mobile, align right on desktop */}
                            <div className="flex flex-row sm:flex-col gap-2 items-start sm:items-end justify-between sm:justify-start flex-wrap sm:flex-nowrap">
                              {race.prizeAmount > 0n && (
                                <div className="text-xs sm:text-sm font-bold text-green-400 bg-green-500/10 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full border border-green-500/20 whitespace-nowrap">
                                  💰 +{formatICP(BigInt(race.prizeAmount))}
                                </div>
                              )}
                              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                <Badge 
                                  variant={wasWin ? "default" : wasPodium ? "secondary" : "outline"} 
                                  className="text-xs font-medium px-2 sm:px-2.5 py-0.5"
                                >
                                  👥 {race.totalRacers}
                                </Badge>
                                <Badge 
                                  variant="outline" 
                                  className="text-xs font-semibold px-2 sm:px-2.5 py-0.5 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/30 text-blue-400"
                                >
                                  ⭐ +{leaderboardPoints}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                  
                  {/* Load More Button */}
                  {hasMoreRaces && (
                    <div className="mt-6 text-center">
                      <Button
                        onClick={() => fetchNextPage()}
                        disabled={isFetchingNextPage}
                        variant="outline"
                        className="w-full sm:w-auto"
                      >
                        {isFetchingNextPage ? (
                          <>
                            <span className="animate-spin mr-2">⏳</span>
                            Loading more races...
                          </>
                        ) : (
                          <>
                            📜 Load More Races
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
