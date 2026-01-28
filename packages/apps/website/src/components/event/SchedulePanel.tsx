import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronUp } from 'lucide-react';
import { generatetokenIdentifier, generateExtThumbnailLink } from '@pokedbots-racing/ic-js';
import { useGetBotProfilesBatch } from "@/hooks/useRacing";

interface SchedulePanelProps {
  races: any[];
  event: any;
  onRaceSelect?: (raceId: number) => void;
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

function formatTime(timestamp: bigint): string {
  const date = new Date(Number(timestamp) / 1_000_000);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatICP(amount: bigint): string {
  const icp = Number(amount) / 100_000_000;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(icp) + ' ICP';
}

function formatTimeUntil(timestampNs: number): string {
  const now = Date.now() * 1_000_000;
  const diffMs = (timestampNs - now) / 1_000_000;
  
  if (diffMs <= 0) return 'Starting...';
  
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m`;
  return 'Starting...';
}

function getDayKey(timestamp: bigint): string {
  const date = new Date(Number(timestamp) / 1_000_000);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getDayLabel(dayKey: string): string {
  const date = new Date(dayKey + 'T00:00:00');
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const tomorrowKey = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
  
  if (dayKey === todayKey) return '📅 Today';
  if (dayKey === tomorrowKey) return '📅 Tomorrow';
  
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function getTerrainIcon(terrain: any): string {
  if ('ScrapHeaps' in terrain) return '🔩';
  if ('WastelandSand' in terrain) return '🏜️';
  if ('MetalRoads' in terrain) return '🛣️';
  return '🏁';
}

function getRaceClassName(raceClass: any): string {
  if (!raceClass) return 'Unknown';
  if ('Scrap' in raceClass) return 'Scrap';
  if ('Junker' in raceClass) return 'Junker';
  if ('Raider' in raceClass) return 'Raider';
  if ('Elite' in raceClass) return 'Elite';
  if ('SilentKlan' in raceClass) return 'Silent Klan';
  return 'Unknown';
}

function getRaceClassKey(raceClass: any): string {
  if ('Scrap' in raceClass) return 'Scrap';
  if ('Junker' in raceClass) return 'Junker';
  if ('Raider' in raceClass) return 'Raider';
  if ('Elite' in raceClass) return 'Elite';
  if ('SilentKlan' in raceClass) return 'SilentKlan';
  return 'Unknown';
}

function getRaceStatus(race: any): 'live' | 'imminent' | 'upcoming' | 'completed' {
  if ('InProgress' in race.status) return 'live';
  if ('Completed' in race.status) return 'completed';
  const now = Date.now() * 1_000_000;
  if ('Upcoming' in race.status && Number(race.startTime) < now + 15 * 60 * 1_000_000_000) return 'imminent';
  return 'upcoming';
}

interface RaceRowProps {
  race: any;
  onSelect?: () => void;
  botProfiles: any[];
}

function RaceRow({ race, onSelect, botProfiles }: RaceRowProps) {
  const navigate = useNavigate();
  const status = getRaceStatus(race);
  const entryCount = race.entries?.length || 0;
  const estimatedPrizePool = (Number(race.entryFee) * entryCount) + Number(race.platformBonus || 0);
  
  // Get winner info for completed races
  const winner = race.results?.[0]?.[0];
  const winnerProfile = winner ? botProfiles.find((p: any) => p && Number(p.tokenIndex) === Number(winner.nftId)) : null;
  
  const handleClick = () => {
    // Navigate to race details page
    navigate(`/race/${race.raceId}`);
    // Also call the optional callback
    onSelect?.();
  };
  
  return (
    <div 
      className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer hover:border-primary/50 ${
        status === 'live' ? 'bg-red-500/10 border-red-500/30' :
        status === 'imminent' ? 'bg-orange-500/10 border-orange-500/30' :
        status === 'completed' ? 'bg-card/30 border-border/30' :
        'bg-card/50 border-border/40 hover:bg-card/70'
      }`}
      onClick={handleClick}
    >
      {/* Status Indicator */}
      <div className="w-16 shrink-0 text-center">
        {status === 'live' && (
          <Badge className="bg-red-500 animate-pulse text-xs">LIVE</Badge>
        )}
        {status === 'imminent' && (
          <span className="text-xs text-orange-500 font-medium">{formatTimeUntil(Number(race.startTime))}</span>
        )}
        {status === 'upcoming' && (
          <span className="text-xs text-muted-foreground">{formatTime(race.startTime)}</span>
        )}
        {status === 'completed' && (
          <span className="text-xs text-green-500">✓</span>
        )}
      </div>

      {/* Race Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{getTerrainIcon(race.terrain)} {race.name}</span>
          {status === 'live' && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          <span>{race.distance?.toString()}km</span>
          <span>•</span>
          <span>{entryCount} racers</span>
          {status === 'completed' && winner && (
            <>
              <span>•</span>
              <span className="text-amber-400">
                🏆 {winnerProfile?.name?.[0] || `Bot #${winner.nftId}`}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Division Badge */}
      <Badge variant="outline" className="text-xs shrink-0">
        {getRaceClassName(race.raceClass)}
      </Badge>

      {/* Prize */}
      <div className="text-right shrink-0 w-20">
        <span className="text-sm font-medium text-amber-400">{formatICP(BigInt(estimatedPrizePool))}</span>
      </div>
    </div>
  );
}

interface DayGroupProps {
  dayKey: string;
  races: any[];
  defaultExpanded: boolean;
  onRaceSelect?: (raceId: number) => void;
  botProfiles: any[];
}

function DayGroup({ dayKey, races, defaultExpanded, onRaceSelect, botProfiles }: DayGroupProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  const liveCount = races.filter(r => getRaceStatus(r) === 'live').length;
  const completedCount = races.filter(r => getRaceStatus(r) === 'completed').length;
  const allCompleted = completedCount === races.length;
  const hasLive = liveCount > 0;
  
  return (
    <div className={`rounded-lg border ${hasLive ? 'border-red-500/30' : 'border-border/40'}`}>
      {/* Day Header */}
      <button
        className={`w-full flex items-center justify-between p-4 text-left transition-colors ${
          hasLive ? 'bg-red-500/5 hover:bg-red-500/10' : 'hover:bg-card/50'
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold">{getDayLabel(dayKey)}</span>
          {hasLive && (
            <Badge className="bg-red-500 animate-pulse text-xs">{liveCount} LIVE</Badge>
          )}
          {allCompleted && (
            <Badge variant="secondary" className="text-xs">Completed</Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {races.length} race{races.length !== 1 ? 's' : ''}
            {completedCount > 0 && !allCompleted && ` (${completedCount} done)`}
          </span>
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>
      
      {/* Race List */}
      {isExpanded && (
        <div className="p-3 pt-0 space-y-2">
          {races.map(race => (
            <RaceRow 
              key={race.raceId?.toString() || race.id} 
              race={race} 
              onSelect={() => onRaceSelect?.(Number(race.raceId))}
              botProfiles={botProfiles}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function SchedulePanel({ races, event, onRaceSelect }: SchedulePanelProps) {
  const [divisionFilter, setDivisionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Get all bot indices for profiles
  const allBotIndices = [...new Set(races.flatMap(race => [
    ...((race.entries || []).map((e: any) => Number(e.nftId))),
    ...((race.results?.[0] || []).map((r: any) => Number(r.nftId)))
  ]))];
  const { data: botProfiles = [] } = useGetBotProfilesBatch(allBotIndices);

  // Filter races
  const filteredRaces = useMemo(() => {
    return races.filter(race => {
      // Division filter
      if (divisionFilter !== 'all' && getRaceClassKey(race.raceClass) !== divisionFilter) {
        return false;
      }
      // Status filter
      const status = getRaceStatus(race);
      if (statusFilter === 'live' && status !== 'live') return false;
      if (statusFilter === 'upcoming' && status !== 'upcoming' && status !== 'imminent') return false;
      if (statusFilter === 'completed' && status !== 'completed') return false;
      return true;
    });
  }, [races, divisionFilter, statusFilter]);

  // Group races by day
  const racesByDay = useMemo(() => {
    const groups = new Map<string, any[]>();
    
    for (const race of filteredRaces) {
      const dayKey = getDayKey(race.startTime);
      if (!groups.has(dayKey)) {
        groups.set(dayKey, []);
      }
      groups.get(dayKey)!.push(race);
    }
    
    // Sort races within each day by start time
    for (const [, dayRaces] of groups) {
      dayRaces.sort((a, b) => Number(a.startTime) - Number(b.startTime));
    }
    
    // Return sorted by day
    return new Map([...groups.entries()].sort((a, b) => a[0].localeCompare(b[0])));
  }, [filteredRaces]);

  // Determine which day groups should be expanded by default
  const getDefaultExpanded = (dayKey: string, dayRaces: any[]): boolean => {
    // Expand if any race is live or imminent
    if (dayRaces.some(r => ['live', 'imminent'].includes(getRaceStatus(r)))) return true;
    // Expand if it's today
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    if (dayKey === todayKey) return true;
    // Collapse completed days
    if (dayRaces.every(r => getRaceStatus(r) === 'completed')) return false;
    // Expand upcoming days
    return true;
  };

  // Get available divisions for filter
  const availableDivisions = useMemo(() => {
    const divisions = new Set<string>();
    races.forEach(race => {
      divisions.add(getRaceClassKey(race.raceClass));
    });
    return Array.from(divisions);
  }, [races]);

  if (races.length === 0) {
    return (
      <Card className="border-2 border-primary/20 bg-card/50">
        <CardContent className="py-12 text-center">
          <div className="text-6xl mb-4">📅</div>
          <h3 className="text-xl font-semibold mb-2">No Races Scheduled</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Races will be created automatically when registration closes.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={divisionFilter} onValueChange={setDivisionFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Division" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Divisions</SelectItem>
            {availableDivisions.map(div => (
              <SelectItem key={div} value={div}>{div}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="live">🔴 Live</SelectItem>
            <SelectItem value="upcoming">⏳ Upcoming</SelectItem>
            <SelectItem value="completed">✓ Completed</SelectItem>
          </SelectContent>
        </Select>
        
        <span className="text-sm text-muted-foreground ml-auto">
          {filteredRaces.length} race{filteredRaces.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Day Groups */}
      <div className="space-y-3">
        {Array.from(racesByDay.entries()).map(([dayKey, dayRaces]) => (
          <DayGroup
            key={dayKey}
            dayKey={dayKey}
            races={dayRaces}
            defaultExpanded={getDefaultExpanded(dayKey, dayRaces)}
            onRaceSelect={onRaceSelect}
            botProfiles={botProfiles}
          />
        ))}
      </div>

      {filteredRaces.length === 0 && races.length > 0 && (
        <Card className="border border-primary/20">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No races match your filters</p>
            <Button variant="link" onClick={() => { setDivisionFilter('all'); setStatusFilter('all'); }}>
              Clear filters
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
