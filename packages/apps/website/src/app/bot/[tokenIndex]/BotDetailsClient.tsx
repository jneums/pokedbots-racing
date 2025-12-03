'use client';

import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGetBotProfile } from '@/hooks/useRacing';
import { generatetokenIdentifier, generateExtThumbnailLink, generateExtAssetLink } from '@pokedbots-racing/ic-js';

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
  if ('Scavenger' in raceClass) return '🥉 Scavenger';
  if ('Raider' in raceClass) return '🥈 Raider';
  if ('Elite' in raceClass) return '🥇 Elite';
  if ('SilentKlan' in raceClass) return '👑 Silent Klan';
  return 'Unknown';
}

export function BotDetailsClient({ tokenIndex }: { tokenIndex: string }) {
  const navigate = useNavigate();
  const { data: profile, isLoading } = useGetBotProfile(Number(tokenIndex));

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">
          {isLoading ? 'Loading bot details...' : 'Bot not found or not initialized for racing'}
        </p>
      </div>
    );
  }

  const tokenId = generatetokenIdentifier('bzsui-sqaaa-aaaah-qce2a-cai', Number(tokenIndex));
  const imageUrl = generateExtThumbnailLink(tokenId);
  const thumbnailUrl = generateExtThumbnailLink(tokenId);

  const faction = Object.keys(profile.faction)[0];
  const racesEntered = Number(profile.career.racesEntered);
  const wins = Number(profile.career.wins);
  const podiums = Number(profile.career.podiums);
  const totalEarnings = BigInt(profile.career.totalEarnings);
  
  const winRate = racesEntered > 0
    ? ((wins / racesEntered) * 100).toFixed(1)
    : '0';

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
              <h1 className="text-4xl font-bold mb-2">PokedBot #{tokenIndex}</h1>
              <div className="flex gap-2 mb-4">
                <Badge className={`bg-gradient-to-r ${getFactionColor(faction)} text-white`}>
                  {faction}
                </Badge>
                <Badge variant="outline">{getRaceClassBadge(profile.raceClass)}</Badge>
                <Badge variant="secondary">Rating: {profile.stats.overallRating}/100</Badge>
                <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                  ⚡ ELO: {profile.eloRating}
                </Badge>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3 mt-6">
                <div className="p-4 bg-card border-2 border-primary/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">Races</p>
                  <p className="text-2xl font-bold text-primary">{racesEntered}</p>
                </div>
                <div className="p-4 bg-card border-2 border-primary/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">Wins</p>
                  <p className="text-2xl font-bold text-primary">{wins}</p>
                </div>
                <div className="p-4 bg-card border-2 border-primary/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">Win Rate</p>
                  <p className="text-2xl font-bold text-primary">{winRate}%</p>
                </div>
                <div className="p-4 bg-card border-2 border-primary/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">Earnings</p>
                  <p className="text-2xl font-bold text-primary">{formatICP(totalEarnings)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Card */}
          <Card className="mb-8 border-2 border-primary/20">
            <CardHeader>
              <CardTitle>Performance Stats</CardTitle>
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
            </CardContent>
          </Card>

          {/* Career Stats */}
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle>Career Highlights</CardTitle>
            </CardHeader>
            <CardContent>
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
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
