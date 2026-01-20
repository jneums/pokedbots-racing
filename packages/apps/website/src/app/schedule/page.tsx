'use client';

import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGetUpcomingEventsWithRaces, useGetPastEvents, type ScheduledEvent } from "@/hooks/useRacing";

// Type for event with race summary from the backend
type EventWithRaceSummary = {
  event: ScheduledEvent;
  raceSummary: {
    totalRaces: bigint;
    terrains: Array<any>;
    distances: Array<bigint>;
    totalParticipants: bigint;
    totalPrizePool?: bigint;
    nextRaceStartTime?: [] | [bigint];
    completedRaces?: bigint;
    pendingRaces?: bigint;
  };
};

function formatICP(amount: bigint): string {
  const icp = Number(amount) / 100_000_000;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(icp) + ' ICP';
}

function formatDate(timestamp: bigint): string {
  const date = new Date(Number(timestamp) / 1_000_000); // Convert nanoseconds to milliseconds
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

// Format date for day headers (no time)
function formatDayHeader(date: Date): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const isToday = date.toDateString() === today.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();
  
  if (isToday) {
    return '📅 Today';
  }
  if (isTomorrow) {
    return '📅 Tomorrow';
  }
  
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

// Get the relevant date for an event (next race time for multi-stage, or scheduled time)
function getEventSortDate(item: EventWithRaceSummary): Date {
  // If there's a next race start time, use that for multi-stage events
  if (item.raceSummary.nextRaceStartTime && item.raceSummary.nextRaceStartTime.length > 0) {
    return new Date(Number(item.raceSummary.nextRaceStartTime[0]) / 1_000_000);
  }
  // Fall back to event scheduled time
  return new Date(Number(item.event.scheduledTime) / 1_000_000);
}

// Get the day key for grouping (YYYY-MM-DD in local time)
function getDayKey(date: Date): string {
  // Use local date components to avoid UTC timezone issues
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Group events by day
function groupEventsByDay(events: EventWithRaceSummary[]): Map<string, EventWithRaceSummary[]> {
  const grouped = new Map<string, EventWithRaceSummary[]>();
  
  for (const item of events) {
    const date = getEventSortDate(item);
    const dayKey = getDayKey(date);
    
    if (!grouped.has(dayKey)) {
      grouped.set(dayKey, []);
    }
    grouped.get(dayKey)!.push(item);
  }
  
  return grouped;
}

function formatRelativeTime(timestamp: bigint): string {
  const date = new Date(Number(timestamp) / 1_000_000);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  
  if (diffHours < 0) return 'Started';
  
  if (diffHours < 24) {
    const hours = Math.floor(diffHours);
    const minutes = Math.floor((diffHours - hours) * 60);
    
    if (hours === 0) {
      return `in ${minutes} min${minutes !== 1 ? 's' : ''}`;
    }
    return `in ${hours}h ${minutes}m`;
  }
  
  const days = Math.floor(diffHours / 24);
  return `in ${days} day${days !== 1 ? 's' : ''}`;
}

function getEventTypeIcon(eventType: ScheduledEvent['eventType']): string {
  if ('DailySprint' in eventType) return '⚡';
  if ('WeeklyLeague' in eventType) return '🏆';
  if ('MonthlyCup' in eventType) return '👑';
  if ('SpecialEvent' in eventType) return '🌟';
  return '🏁';
}

function getEventTypeName(eventType: ScheduledEvent['eventType']): string {
  if ('DailySprint' in eventType) return 'Daily Sprint';
  if ('WeeklyLeague' in eventType) return 'Weekly League';
  if ('MonthlyCup' in eventType) return 'Monthly Cup';
  if ('SpecialEvent' in eventType) return eventType.SpecialEvent;
  return 'Race Event';
}

function getStatusBadge(status: ScheduledEvent['status'], registrationCloses: bigint, isPastEvent: boolean = false) {
  const now = Date.now() * 1_000_000; // Convert to nanoseconds
  const registrationClosed = Number(registrationCloses) < now;

  // Override status for past events
  if (isPastEvent) {
    return <Badge className="bg-gray-600/90 hover:bg-gray-600 border-gray-500/50 text-white">Completed</Badge>;
  }
  
  if ('Announced' in status) {
    return <Badge className="bg-blue-500/90 hover:bg-blue-500 border-blue-400/50">Announced</Badge>;
  }
  if ('RegistrationOpen' in status) {
    // Check actual timestamp to ensure accurate real-time status
    if (registrationClosed) {
      return <Badge className="bg-yellow-500/90 hover:bg-yellow-500 border-yellow-400/50">Registration Closed</Badge>;
    }
    return <Badge className="bg-green-500/90 hover:bg-green-500 border-green-400/50">Open</Badge>;
  }
  if ('RegistrationClosed' in status) {
    return <Badge className="bg-yellow-500/90 hover:bg-yellow-500 border-yellow-400/50">Registration Closed</Badge>;
  }
  if ('InProgress' in status) {
    return <Badge className="bg-orange-500/90 hover:bg-orange-500 border-orange-400/50">Racing</Badge>;
  }
  if ('Completed' in status) {
    return <Badge className="bg-gray-600/90 hover:bg-gray-600 border-gray-500/50 text-white">Completed</Badge>;
  }
  if ('Cancelled' in status) {
    return <Badge className="bg-red-500/90 hover:bg-red-500 border-red-400/50">Cancelled</Badge>;
  }
  return null;
}

function getDivisionName(division: any): string {
  if ('Scrap' in division) return 'Scrap';
  if ('Junker' in division) return 'Junker';
  if ('Raider' in division) return 'Raider';
  if ('Elite' in division) return 'Elite';
  if ('SilentKlan' in division) return 'Silent Klan';
  return 'Unknown';
}

function EventCard({ event, raceSummary, isPastEvent = false }: { 
  event: ScheduledEvent; 
  raceSummary?: {
    totalRaces: bigint;
    terrains: Array<any>;
    distances: Array<bigint>;
    totalParticipants: bigint;
    totalPrizePool?: bigint;
    nextRaceStartTime?: [] | [bigint];
    completedRaces?: bigint;
    pendingRaces?: bigint;
  };
  isPastEvent?: boolean;
}) {
  const now = new Date();
  const scheduledTime = new Date(Number(event.scheduledTime) / 1_000_000);
  const hasStarted = now >= scheduledTime;
  const registrationClosesDate = new Date(Number(event.registrationCloses) / 1_000_000);
  const registrationOpensDate = new Date(Number(event.registrationOpens) / 1_000_000);
  const isRegistrationOpen = now >= registrationOpensDate && now < registrationClosesDate;
  const isUpcoming = now < registrationOpensDate;
  
  // Multi-stage event info
  const totalRaces = raceSummary ? Number(raceSummary.totalRaces) : 0;
  const completedRaces = raceSummary?.completedRaces ? Number(raceSummary.completedRaces) : 0;
  const pendingRaces = raceSummary?.pendingRaces ? Number(raceSummary.pendingRaces) : 0;
  const isMultiStage = totalRaces > 1;
  const hasUpcomingRaces = pendingRaces > 0;
  
  const nextRaceTime = raceSummary?.nextRaceStartTime && raceSummary.nextRaceStartTime.length > 0
    ? new Date(Number(raceSummary.nextRaceStartTime[0]) / 1_000_000)
    : null;

  // Calculate total prize pool
  const calculateEventPrizePool = (): bigint => {
    const entryFees = event.registrationCounts.total * event.metadata.entryFee;
    const platformBonus = event.metadata.prizePoolBonus;
    const eventBonus = event.metadata.eventBonusPrize;
    const sponsorships = event.sponsorships.reduce((sum, s) => sum + s.amount, BigInt(0));
    return entryFees + platformBonus + eventBonus + sponsorships;
  };

  const totalEventPrizePool = calculateEventPrizePool();

  return (
    <Link to={`/schedule/${event.eventId}`} className="block">
      <Card className={`border-2 ${hasStarted && !isPastEvent ? 'border-orange-500/40 bg-orange-950/10' : 'border-primary/20 bg-card/50'} hover:border-primary/50 transition-all cursor-pointer`}>
        <div className="p-4">
          <div className="flex items-center gap-4">
            {/* Event Icon */}
            <div className="text-2xl flex-shrink-0">{getEventTypeIcon(event.eventType)}</div>
            
            {/* Main Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-base truncate">{event.metadata.name}</h3>
                <Badge variant="outline" className="text-xs font-mono px-1.5 py-0">
                  {formatDate(event.scheduledTime)}
                </Badge>
                {hasStarted && !isPastEvent && !isMultiStage && (
                  <Badge className="bg-orange-500/80 text-xs px-1.5 py-0 animate-pulse">Racing</Badge>
                )}
                {isMultiStage && hasUpcomingRaces && !isPastEvent && completedRaces > 0 && (
                  <Badge className="bg-purple-500/80 text-xs px-1.5 py-0">{completedRaces}/{totalRaces}</Badge>
                )}
                {!hasStarted && !isPastEvent && getStatusBadge(event.status, event.registrationCloses, isPastEvent)}
                {isPastEvent && getStatusBadge(event.status, event.registrationCloses, isPastEvent)}
              </div>
              
              {/* Meta line */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                <span>{getEventTypeName(event.eventType)}</span>
                <span>•</span>
                <span>{event.raceIds.length || '—'} races</span>
                <span>•</span>
                <span>👥 {Number(event.registrationCounts.total)} registered</span>
                <span>•</span>
                <span className="text-muted-foreground">min {Number(event.metadata.minEntries)}/class</span>
              </div>
              
              {/* Status line */}
              <div className="flex items-center gap-3 text-xs mt-1">
                {isRegistrationOpen && !isPastEvent && (
                  <span className="text-red-400">⏰ Closes {formatRelativeTime(event.registrationCloses)}</span>
                )}
                {isUpcoming && !isPastEvent && (
                  <span className="text-blue-400">Opens {formatRelativeTime(event.registrationOpens)}</span>
                )}
                {isMultiStage && hasUpcomingRaces && nextRaceTime && !isPastEvent && (
                  <span className="text-orange-400">🏎️ Next {formatRelativeTime(BigInt(nextRaceTime.getTime() * 1_000_000))}</span>
                )}
                {isPastEvent && <span className="text-muted-foreground">✓ Completed</span>}
              </div>
            </div>
            
            {/* Divisions - compact */}
            <div className="hidden sm:flex gap-1 flex-shrink-0">
              {event.metadata.divisions.slice(0, 4).map((division, idx) => {
                const className = Object.keys(division)[0];
                const count = event.registrationCounts.byClass.find((c: any) => Object.keys(c[0])[0] === className)?.[1] || 0;
                const minEntries = Number(event.metadata.minEntries);
                const isBelowMin = Number(count) < minEntries && Number(count) > 0;
                const isEmpty = Number(count) === 0;
                return (
                  <Badge 
                    key={idx} 
                    variant="outline" 
                    className={`text-xs px-1.5 py-0 ${
                      isBelowMin ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 
                      isEmpty ? 'bg-primary/5' : 
                      'bg-green-500/10 border-green-500/30'
                    }`}
                    title={`Min ${minEntries} required per class`}
                  >
                    {getDivisionName(division).slice(0, 3)} ({Number(count)}/{minEntries})
                  </Badge>
                );
              })}
            </div>
            
            {/* Prize Pool */}
            {totalEventPrizePool > 0n && (
              <div className="text-right flex-shrink-0 min-w-[80px]">
                <div className="text-xs text-muted-foreground">Prize</div>
                <div className="font-bold text-amber-500">{formatICP(totalEventPrizePool)}</div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}

export default function SchedulePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: upcomingEventsData, isLoading: upcomingLoading } = useGetUpcomingEventsWithRaces(14); // Next 2 weeks
  
  const [pastPage, setPastPage] = useState(0);
  
  // Get active tab from URL query param, default to 'upcoming'
  const activeTab = searchParams.get('tab') || 'upcoming';
  const PAST_EVENTS_PER_PAGE = 10;
  
  // Update URL query param when tab changes
  const handleTabChange = (value: string) => {
    setSearchParams(value === 'upcoming' ? {} : { tab: value });
  };
  
  const { data: pastEvents, isLoading: pastLoading } = useGetPastEvents(
    pastPage * PAST_EVENTS_PER_PAGE,
    PAST_EVENTS_PER_PAGE,
    activeTab === 'past' // Only fetch when Past Events tab is active
  );
  
  // Group upcoming events by day
  const groupedEvents = useMemo((): Map<string, EventWithRaceSummary[]> => {
    if (!upcomingEventsData) return new Map();
    
    // Sort events by their relevant date (next race time for multi-stage, or scheduled time)
    const sorted = [...upcomingEventsData].sort((a, b) => {
      const dateA = getEventSortDate(a as EventWithRaceSummary);
      const dateB = getEventSortDate(b as EventWithRaceSummary);
      return dateA.getTime() - dateB.getTime();
    });
    
    return groupEventsByDay(sorted as EventWithRaceSummary[]);
  }, [upcomingEventsData]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4">🏁 Race Schedule</h1>
            <p className="text-xl text-muted-foreground">
              Upcoming wasteland racing events and championships
            </p>
          </div>

          {/* Tabs for Upcoming vs Past */}
          <Tabs value={activeTab} className="w-full" onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-2 mb-8 h-14 bg-muted p-1.5 rounded-xl">
              <TabsTrigger 
                value="upcoming" 
                className="text-base font-semibold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg"
              >
                📅 Upcoming
              </TabsTrigger>
              <TabsTrigger 
                value="past"
                className="text-base font-semibold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg"
              >
                🏆 Past Events
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming">
              {upcomingLoading ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Loading events...</p>
                </div>
              ) : !upcomingEventsData || upcomingEventsData.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-lg text-muted-foreground">No upcoming events scheduled.</p>
                  <p className="text-sm text-muted-foreground mt-2">Check back later for new races!</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {Array.from(groupedEvents.entries()).map(([dayKey, dayEvents]) => {
                    const dayDate = new Date(dayKey + 'T00:00:00');
                    return (
                      <div key={dayKey} className="space-y-4">
                        {/* Day Header */}
                        <div className="flex items-center gap-4">
                          <h2 className="text-xl font-bold text-primary whitespace-nowrap">
                            {formatDayHeader(dayDate)}
                          </h2>
                          <div className="h-px bg-border flex-1" />
                          <span className="text-sm text-muted-foreground">
                            {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        
                        {/* Events for this day */}
                        <div className="space-y-6">
                          {dayEvents.map((item) => (
                            <EventCard 
                              key={item.event.eventId.toString()} 
                              event={item.event} 
                              raceSummary={item.raceSummary}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="past">
              {pastLoading ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Loading past events...</p>
                </div>
              ) : !pastEvents || pastEvents.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-lg text-muted-foreground">No past events yet.</p>
                  <p className="text-sm text-muted-foreground mt-2">Complete some races to see them here!</p>
                </div>
              ) : (
                <>
                  <div className="space-y-6">
                    {pastEvents.map((event) => (
                      <EventCard key={event.eventId.toString()} event={event} isPastEvent={true} />
                    ))}
                  </div>
                  
                  {/* Pagination Controls */}
                  {pastEvents.length === PAST_EVENTS_PER_PAGE && (
                    <div className="flex items-center justify-center gap-4 mt-8">
                      <Button
                        variant="outline"
                        onClick={() => setPastPage(p => Math.max(0, p - 1))}
                        disabled={pastPage === 0}
                      >
                        ← Previous
                      </Button>
                      
                      <div className="text-sm text-muted-foreground">
                        Page {pastPage + 1}
                      </div>
                      
                      <Button
                        variant="outline"
                        onClick={() => setPastPage(p => p + 1)}
                        disabled={pastEvents.length < PAST_EVENTS_PER_PAGE}
                      >
                        Next →
                      </Button>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
