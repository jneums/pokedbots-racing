'use client';

import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGetBotProfile, useGetBotRaceHistory } from '@/hooks/useRacing';
import { useBackgrounds } from '@/hooks/useBackgrounds';
import { generatetokenIdentifier, generateExtThumbnailLink, generateExtAssetLink } from '@pokedbots-racing/ic-js';
import { getTerrainPreference, getTerrainIcon, getTerrainName, getFactionTerrainBonus, getFactionBonus, getFactionSpecialTerrain } from '@/lib/utils';

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

export function BotDetailsClient({ tokenIndex }: { tokenIndex: string }) {
  const navigate = useNavigate();
  const { data: profile, isLoading } = useGetBotProfile(Number(tokenIndex));
  const { data: raceHistory, isLoading: historyLoading } = useGetBotRaceHistory(Number(tokenIndex), 10);
  const { data: backgroundData } = useBackgrounds();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading bot details...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Bot not found</p>
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
                    <Badge variant="secondary">Base Rating: {profile.stats.overallRating}/100</Badge>
                  </>
                ) : (
                  <>
                    {profile.raceClass && <Badge variant="outline">{getRaceClassBadge(profile.raceClass)}</Badge>}
                    <Badge variant="secondary">Rating: {profile.stats.overallRating}/100</Badge>
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
                  <p className="text-3xl font-bold text-primary">{profile.stats.speed}</p>
                </div>
                <div className="text-center p-4 bg-card/50 border border-primary/20 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Power Core</p>
                  <p className="text-3xl font-bold text-primary">{profile.stats.powerCore}</p>
                </div>
                <div className="text-center p-4 bg-card/50 border border-primary/20 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Acceleration</p>
                  <p className="text-3xl font-bold text-primary">{profile.stats.acceleration}</p>
                </div>
                <div className="text-center p-4 bg-card/50 border border-primary/20 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Stability</p>
                  <p className="text-3xl font-bold text-primary">{profile.stats.stability}</p>
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
              ) : historyLoading ? (
                <p className="text-center text-muted-foreground">Loading race history...</p>
              ) : !raceHistory || raceHistory.races.length === 0 ? (
                <p className="text-center text-muted-foreground">No completed races yet</p>
              ) : (
                <div className="space-y-2">
                  {raceHistory.races.map((race: any, idx: number) => {
                    const position = Number(race.position);
                    const wasWin = position === 1;
                    const wasPodium = position > 0 && position <= 3;
                    
                    return (
                      <Link 
                        key={idx} 
                        to={`/schedule/${race.eventId}`}
                        className="block hover:bg-card/70 transition-colors rounded-lg"
                      >
                        <div className="flex items-center justify-between p-3 bg-card/50 border border-primary/20 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="text-xl font-bold w-10 text-center">
                              {position === 1 && '🥇'}
                              {position === 2 && '🥈'}
                              {position === 3 && '🥉'}
                              {position > 3 && `#${position}`}
                            </div>
                            <div>
                              <p className="font-semibold">{race.raceName}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(Number(race.scheduledTime) / 1_000_000).toLocaleDateString()}
                                {race.finalTime && race.finalTime.length > 0 && race.finalTime[0] !== undefined && (
                                  race.finalTime[0] > 100000 
                                    ? <span className="text-red-500 font-bold ml-1">• DNF</span>
                                    : ` • ${race.finalTime[0].toFixed(2)}s`
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            {race.prizeAmount > 0n && (
                              <p className="text-sm font-bold text-green-500">
                                +{formatICP(BigInt(race.prizeAmount))} ICP
                              </p>
                            )}
                            <Badge variant={wasWin ? "default" : wasPodium ? "secondary" : "outline"} className="text-xs">
                              {race.totalRacers} racers
                            </Badge>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
