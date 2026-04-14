import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface EventHeroHeaderProps {
  event: any;
  hasLiveRaces: boolean;
  hasImminentRaces: boolean;
  liveRaceCount: number;
  onWatchLive?: () => void;
  onRegister?: () => void;
  onViewStandings?: () => void;
}

function formatDate(timestamp: bigint): string {
  const date = new Date(Number(timestamp) / 1_000_000);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

function formatICP(amount: bigint): string {
  const icp = Number(amount) / 100_000_000;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(icp) + ' ICP';
}

export function EventHeroHeader({
  event,
  hasLiveRaces,
  hasImminentRaces,
  liveRaceCount,
  onWatchLive,
  onRegister,
  onViewStandings,
}: EventHeroHeaderProps) {
  const isCompleted = event && 'Completed' in event.status;
  const isInProgress = event && 'InProgress' in event.status;
  const now = Date.now() * 1_000_000;
  const registrationOpen = Number(event.registrationOpens) < now && Number(event.registrationCloses) > now;

  const getStatusBadge = () => {
    if ('Cancelled' in event.status) {
      return <Badge variant="destructive" className="text-sm px-3 py-1">Cancelled</Badge>;
    }
    if (isCompleted) {
      return <Badge variant="secondary" className="text-sm px-3 py-1">Completed</Badge>;
    }
    if (hasLiveRaces) {
      return (
        <Badge className="bg-red-500 text-white text-sm px-3 py-1 animate-pulse">
          🔴 LIVE NOW
        </Badge>
      );
    }
    if (isInProgress) {
      return <Badge className="bg-orange-500 text-sm px-3 py-1">In Progress</Badge>;
    }
    if (registrationOpen) {
      return <Badge className="bg-green-500 text-sm px-3 py-1">Registration Open</Badge>;
    }
    return <Badge variant="outline" className="text-sm px-3 py-1">Upcoming</Badge>;
  };

  return (
    <div className="relative mb-8">
      {/* Live indicator glow effect */}
      {hasLiveRaces && (
        <div className="absolute inset-0 bg-red-500/10 rounded-xl blur-xl -z-10 animate-pulse" />
      )}
      
      <div className={`p-6 rounded-xl border-2 ${
        hasLiveRaces 
          ? 'border-red-500/50 bg-gradient-to-r from-red-500/10 to-orange-500/10' 
          : 'border-primary/20 bg-card/50'
      } backdrop-blur`}>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          {/* Event Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl md:text-4xl font-bold">{event.metadata.name}</h1>
              {getStatusBadge()}
            </div>
            <p className="text-muted-foreground mb-4 max-w-2xl">{event.metadata.description}</p>

            {/* Creator & Visibility info */}
            {(event.creatorName?.[0] || (event.visibility && !('Public' in event.visibility))) && (
              <div className="flex flex-wrap items-center gap-3 mb-3 text-sm">
                {event.creatorName?.[0] && (
                  <span className="text-muted-foreground">
                    👤 Hosted by <span className="text-foreground font-medium">{event.creatorName[0]}</span>
                  </span>
                )}
                {event.visibility && 'Private' in event.visibility && (
                  <Badge variant="outline" className="text-xs bg-purple-500/10 border-purple-500/30 text-purple-400">
                    🔒 Invite Only
                  </Badge>
                )}
                {event.visibility && 'Restricted' in event.visibility && (
                  <Badge variant="outline" className="text-xs bg-amber-500/10 border-amber-500/30 text-amber-400">
                    🛡️ Restricted Entry
                  </Badge>
                )}
              </div>
            )}
            
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                🕒 {formatDate(event.scheduledTime)}
              </span>
              <span className="flex items-center gap-1">
                🎯 {event.raceIds.length} races
              </span>
              <span className="flex items-center gap-1">
                👥 {Number(event.registrationCounts?.total || 0)} registered
              </span>
              {event.metadata.prizePoolBonus && Number(event.metadata.prizePoolBonus) > 0 && (
                <span className="flex items-center gap-1 text-amber-400">
                  💰 {formatICP(BigInt(event.metadata.prizePoolBonus))} bonus
                </span>
              )}
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="flex flex-col gap-2">
            {hasLiveRaces && onWatchLive && (
              <Button 
                size="lg" 
                className="bg-red-500 hover:bg-red-600 text-white animate-pulse"
                onClick={onWatchLive}
              >
                🔴 Watch Live ({liveRaceCount})
              </Button>
            )}
            {hasImminentRaces && !hasLiveRaces && onWatchLive && (
              <Button 
                size="lg" 
                variant="outline"
                className="border-orange-500 text-orange-500 hover:bg-orange-500/10"
                onClick={onWatchLive}
              >
                ⏳ Starting Soon
              </Button>
            )}
            {registrationOpen && onRegister && (
              <Button size="lg" onClick={onRegister}>
                📝 Register Now
              </Button>
            )}
            {(isInProgress || isCompleted) && onViewStandings && (
              <Button variant="outline" onClick={onViewStandings}>
                📊 View Standings
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
