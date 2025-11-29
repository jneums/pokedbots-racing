import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGetEventDetails, useGetRaceById } from "@/hooks/useRacing";
import { generatetokenIdentifier, generateExtThumbnailLink } from '@pokedbots-racing/ic-js';

function formatICP(amount: bigint): string {
  const icp = Number(amount) / 100_000_000;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(icp) + ' ICP';
}

function formatDate(timestamp: bigint): string {
  const date = new Date(Number(timestamp) / 1_000_000);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTerrainName(terrain: any): string {
  if ('ScrapHeaps' in terrain) return 'Scrap Heaps';
  if ('WastelandSand' in terrain) return 'Wasteland Sand';
  if ('MetalRoads' in terrain) return 'Metal Roads';
  return 'Unknown';
}

function getTerrainIcon(terrain: any): string {
  if ('ScrapHeaps' in terrain) return '🏚️';
  if ('WastelandSand' in terrain) return '🏜️';
  if ('MetalRoads' in terrain) return '🛣️';
  return '🏁';
}

function RaceCard({ raceId }: { raceId: bigint }) {
  const { data: race } = useGetRaceById(Number(raceId));

  if (!race) {
    return (
      <Card className="border-2 border-primary/20 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 bg-card/50 backdrop-blur">
        <CardContent className="p-6">
          <p className="text-muted-foreground">Loading race details...</p>
        </CardContent>
      </Card>
    );
  }

  const prizePool = race.entries.reduce((sum: number, entry: any) => sum + Number(entry.entryFee), 0) + Number(race.platformBonus);
  const entryCount = race.entries.length;

  return (
    <Card className="border-2 border-primary/20 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 bg-card/50 backdrop-blur">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-xl flex items-center gap-2">
              {getTerrainIcon(race.terrain)} {race.name}
            </CardTitle>
            <CardDescription className="mt-2">
              {getTerrainName(race.terrain)} • {race.distance.toString()}km • ~{race.duration.toString()}s
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Start Time</p>
            <p className="font-semibold">{formatDate(race.startTime)}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Race Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-card/50 border border-primary/20 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Prize Pool</p>
            <p className="text-base font-bold text-primary">{formatICP(BigInt(prizePool))}</p>
          </div>
          <div className="text-center p-3 bg-card/50 border border-primary/20 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Entries</p>
            <p className="text-base font-bold text-primary">{entryCount}</p>
          </div>
          <div className="text-center p-3 bg-card/50 border border-primary/20 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Status</p>
            <p className="text-base font-bold text-primary">
              {'Upcoming' in race.status && '⏳ Upcoming'}
              {'InProgress' in race.status && '🏁 Racing'}
              {'Completed' in race.status && '✅ Done'}
              {'Cancelled' in race.status && '❌ Cancelled'}
            </p>
          </div>
        </div>

        {/* Entries List */}
        {entryCount > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">Racers ({entryCount}):</p>
            <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
              {race.entries.map((entry: any, idx: number) => {
                const tokenId = generatetokenIdentifier('bzsui-sqaaa-aaaah-qce2a-cai', Number(entry.nftId));
                const imageUrl = generateExtThumbnailLink(tokenId);
                
                return (
                  <div key={idx} className="flex items-center gap-3 p-2 bg-card/50 border border-primary/10 rounded">
                    <img
                      src={imageUrl}
                      alt={`Bot #${entry.nftId}`}
                      className="w-8 h-8 rounded border-2 border-primary/30"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold">PokedBot #{entry.nftId}</p>
                      <p className="text-xs text-muted-foreground">Entry Fee: {formatICP(entry.entryFee)}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      #{idx + 1}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Results if completed */}
        {race.results && race.results.length > 0 && race.results[0] && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">Results:</p>
            <div className="space-y-2">
              {race.results[0].map((result: any, idx: number) => {
                const tokenId = generatetokenIdentifier('bzsui-sqaaa-aaaah-qce2a-cai', Number(result.nftId));
                const imageUrl = generateExtThumbnailLink(tokenId);
                
                return (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-card border-2 border-primary/20 rounded-lg">
                    <div className="text-2xl font-bold w-8">
                      {idx === 0 && '🥇'}
                      {idx === 1 && '🥈'}
                      {idx === 2 && '🥉'}
                      {idx > 2 && `#${idx + 1}`}
                    </div>
                    <img
                      src={imageUrl}
                      alt={`Bot #${result.nftId}`}
                      className="w-10 h-10 rounded border-2 border-primary/40"
                    />
                    <div className="flex-1">
                      <p className="font-semibold">PokedBot #{result.nftId}</p>
                      <p className="text-sm text-muted-foreground">
                        {result.completionTime !== undefined ? `Time: ${result.completionTime.toString()}s` : 'Position ' + (idx + 1)}
                      </p>
                    </div>
                    {result.prizeAmount !== undefined && result.prizeAmount > 0n && (
                      <div className="text-right">
                        <p className="text-sm text-green-500 font-bold">
                          +{formatICP(result.prizeAmount)}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function EventDetailsClient({ eventId }: { eventId: string }) {
  const navigate = useNavigate();
  const { data: event } = useGetEventDetails(Number(eventId));

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading event details...</p>
      </div>
    );
  }

  // Determine the actual status based on time and completion
  const now = Date.now() * 1_000_000; // Convert to nanoseconds
  const isPast = Number(event.scheduledTime) < now;
  const isCompleted = 'Completed' in event.status;
  
  const getStatusBadge = () => {
    if ('Cancelled' in event.status) {
      return <Badge variant="destructive">Cancelled</Badge>;
    }
    if (isCompleted || isPast) {
      return <Badge variant="secondary">Completed</Badge>;
    }
    if ('InProgress' in event.status) {
      return <Badge className="bg-orange-500">In Progress</Badge>;
    }
    if ('RegistrationClosed' in event.status) {
      return <Badge variant="outline">Registration Closed</Badge>;
    }
    if ('RegistrationOpen' in event.status) {
      return <Badge className="bg-green-500">Registration Open</Badge>;
    }
    return <Badge>Announced</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-5xl mx-auto">
          {/* Back Button */}
          <Button 
            variant="ghost" 
            onClick={() => navigate('/schedule')}
            className="mb-6"
          >
            ← Back to Schedule
          </Button>

          {/* Event Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">{event.metadata.name}</h1>
            <p className="text-lg text-muted-foreground mb-4">{event.metadata.description}</p>
            <div className="flex gap-4 items-center text-sm text-muted-foreground">
              <span>🕒 {formatDate(event.scheduledTime)}</span>
              {getStatusBadge()}
            </div>
          </div>

          {/* Event Stats */}
          <Card className="mb-8 border-2 border-primary/20 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle>Event Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-card/50 border border-primary/20 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Entry Fee</p>
                  <p className="text-xl font-bold text-primary">{formatICP(event.metadata.entryFee)}</p>
                </div>
                <div className="text-center p-4 bg-card/50 border border-primary/20 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Bonus Pool</p>
                  <p className="text-xl font-bold text-primary">{formatICP(event.metadata.prizePoolBonus)}</p>
                </div>
                <div className="text-center p-4 bg-card/50 border border-primary/20 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Total Races</p>
                  <p className="text-xl font-bold text-primary">{event.raceIds.length}</p>
                </div>
                <div className="text-center p-4 bg-card/50 border border-primary/20 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Points</p>
                  <p className="text-xl font-bold text-primary">{event.metadata.pointsMultiplier}x</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Races */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Races</h2>
            {event.raceIds.map((raceId: bigint) => (
              <RaceCard key={raceId.toString()} raceId={raceId} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
