'use client';

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGetUpcomingEventsWithRaces, useGetPastEvents, type ScheduledEvent } from "@/hooks/useRacing";

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
  };
  isPastEvent?: boolean;
}) {
  const now = new Date();
  const scheduledTime = new Date(Number(event.scheduledTime) / 1_000_000);
  const hasStarted = now >= scheduledTime;
  const registrationClosesDate = new Date(Number(event.registrationCloses) / 1_000_000);
  const registrationOpensDate = new Date(Number(event.registrationOpens) / 1_000_000);
  // Check actual timestamp to determine if registration is open, not just status
  const isRegistrationOpen = now >= registrationOpensDate && now < registrationClosesDate;
  
  // Registration hasn't opened yet (based on actual timestamp)
  const isUpcoming = now < registrationOpensDate;

  // Calculate total prize pool from event data
  const calculateEventPrizePool = (): bigint => {
    // Entry fees from all registrations
    const entryFees = event.registrationCounts.total * event.metadata.entryFee;
    
    // Platform bonus
    const platformBonus = event.metadata.prizePoolBonus;
    
    // Event bonus prize
    const eventBonus = event.metadata.eventBonusPrize;
    
    // Sum all sponsorships
    const sponsorships = event.sponsorships.reduce((sum, s) => sum + s.amount, BigInt(0));
    
    return entryFees + platformBonus + eventBonus + sponsorships;
  };

  const totalEventPrizePool = calculateEventPrizePool();

  // Get terrain icons
  const getTerrainIcon = (terrain: any): string => {
    if ('ScrapHeaps' in terrain) return '🔩';
    if ('WastelandSand' in terrain) return '🏜️';
    if ('MetalRoads' in terrain) return '🛣️';
    return '🏁';
  };

  const uniqueTerrains = raceSummary ? Array.from(new Set(raceSummary.terrains.map(t => {
    if ('ScrapHeaps' in t) return 'ScrapHeaps';
    if ('WastelandSand' in t) return 'WastelandSand';
    if ('MetalRoads' in t) return 'MetalRoads';
    return 'Unknown';
  }))) : [];

  return (
    <Card className={`border-2 ${hasStarted && !isPastEvent ? 'border-orange-500/40 bg-orange-950/20' : 'border-primary/20 bg-card/50'} hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 backdrop-blur`}>
      <CardHeader>
        <div className="flex flex-col gap-4">
          {/* Prize Pool - Mobile First */}
          {totalEventPrizePool > 0n && (
            <div className="text-center p-4 bg-gradient-to-br from-amber-500/20 via-yellow-500/20 to-orange-500/20 border-2 border-amber-500/40 rounded-xl sm:hidden">
              <div className="text-3xl mb-1">💰</div>
              <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-1">Total Prize Pool</div>
              <div className="text-2xl font-bold text-amber-500 dark:text-amber-400">
                {formatICP(totalEventPrizePool)}
              </div>
            </div>
          )}
          
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{getEventTypeIcon(event.eventType)}</span>
                <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <CardTitle className="text-2xl">{event.metadata.name}</CardTitle>
                  <Badge variant="outline" className="bg-primary/20 text-primary font-mono text-sm">
                    {formatDate(event.scheduledTime)}
                  </Badge>
                  {hasStarted && !isPastEvent && (
                    <Badge className="bg-orange-500/90 hover:bg-orange-500 border-orange-400/50 animate-pulse">
                      🏁 Last Event
                    </Badge>
                  )}
                  {!hasStarted && getStatusBadge(event.status, event.registrationCloses, isPastEvent)}
                  {isPastEvent && getStatusBadge(event.status, event.registrationCloses, isPastEvent)}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1 flex-wrap">
                  <span>{getEventTypeName(event.eventType)}</span>
                  <span>•</span>
                  <span>{event.raceIds.length} race{event.raceIds.length !== 1 ? 's' : ''}</span>
                  {uniqueTerrains.length > 0 && (
                    <>
                      <span>•</span>
                      <span className="flex gap-1">
                        {uniqueTerrains.map((t, idx) => (
                          <span key={idx} title={t}>
                            {getTerrainIcon({ [t]: null })}
                          </span>
                        ))}
                      </span>
                    </>
                  )}
                  {Number(event.registrationCounts.total) > 0 && (
                    <>
                      <span>•</span>
                      <span>👥 {Number(event.registrationCounts.total)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <CardDescription className="text-base">
              {event.metadata.description}
            </CardDescription>
            <div className="flex items-center gap-4 text-sm">
              {isRegistrationOpen && !isPastEvent && (
                <span className="text-green-500 font-semibold">
                  ⏰ Closes {formatRelativeTime(event.registrationCloses)}
                </span>
              )}
              {isPastEvent && (
                <span className="text-muted-foreground">
                  ✓ Completed
                </span>
              )}
              {isUpcoming && !isPastEvent && (
                <span className="text-blue-500 font-semibold">
                  Opens {formatRelativeTime(event.registrationOpens)}
                </span>
              )}
            </div>
          </div>

          {/* Prize Pool - Desktop Only */}
          {totalEventPrizePool > 0n && (
            <div className="hidden sm:flex flex-shrink-0 text-center p-4 bg-gradient-to-br from-amber-500/20 via-yellow-500/20 to-orange-500/20 border-2 border-amber-500/40 rounded-xl min-w-[160px] flex-col">
              <div className="text-3xl mb-1">💰</div>
              <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-1">Total Prize Pool</div>
              <div className="text-2xl font-bold text-amber-500 dark:text-amber-400">
                {formatICP(totalEventPrizePool)}
              </div>
            </div>
          )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Event Details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center p-3 bg-card border-2 border-primary/20 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">{event.raceIds.length > 0 ? 'Races' : 'Est. Races'}</p>
            <p className="text-lg font-bold text-primary">
              {event.raceIds.length > 0 ? event.raceIds.length : (() => {
                // Estimate: 1 race per 8 registrants per class
                let totalRaces = 0;
                event.registrationCounts.byClass.forEach((classCount: any) => {
                  const count = Number(classCount[1]);
                  if (count > 0) {
                    totalRaces += Math.ceil(count / 8);
                  }
                });
                return totalRaces || '—';
              })()}
            </p>
          </div>

          <div className="text-center p-3 bg-card border-2 border-primary/20 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Total Registered</p>
            <p className="text-lg font-bold text-primary">
              {Number(event.registrationCounts.total)}
            </p>
          </div>

          <div className="text-center p-3 bg-card border-2 border-primary/20 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Points</p>
            <p className="text-lg font-bold text-primary">{event.metadata.pointsMultiplier}x</p>
          </div>

          <div className="text-center p-3 bg-card border-2 border-primary/20 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Min Required</p>
            <p className="text-lg font-bold text-primary">{Number(event.metadata.minEntries)}</p>
          </div>
        </div>

        {/* Divisions */}
        {event.metadata.divisions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Divisions (Max {Number(event.metadata.maxEntries)} per class):</p>
            <div className="flex gap-2 flex-wrap">
              {event.metadata.divisions.map((division, idx) => {
                const className = Object.keys(division)[0];
                const count = event.registrationCounts.byClass.find((c: any) => Object.keys(c[0])[0] === className)?.[1] || 0;
                const isFull = Number(count) >= Number(event.metadata.maxEntries);
                
                return (
                  <Badge 
                    key={idx} 
                    variant="outline" 
                    className={isFull ? "bg-red-500/20 border-red-500" : "bg-primary/10"}
                  >
                    {getDivisionName(division)} ({Number(count)}/{Number(event.metadata.maxEntries)})
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* Min Entry Requirement */}
        {Number(event.registrationCounts.total) < Number(event.metadata.minEntries) && isRegistrationOpen && (
          <div className="flex items-center justify-between text-sm bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
            <div className="text-yellow-600">
              ⚠️ Needs {Number(event.metadata.minEntries) - Number(event.registrationCounts.total)} more {Number(event.metadata.minEntries) - Number(event.registrationCounts.total) === 1 ? 'registration' : 'registrations'} to proceed
            </div>
          </div>
        )}

        {/* View Details Button */}
        <Link to={`/schedule/${event.eventId}`} className="block mt-4">
          <Button className="w-full" variant="default">
            View Race Details →
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export default function SchedulePage() {
  const { data: upcomingEventsData, isLoading: upcomingLoading } = useGetUpcomingEventsWithRaces(14); // Next 2 weeks
  
  const [pastPage, setPastPage] = useState(0);
  const [activeTab, setActiveTab] = useState('upcoming');
  const PAST_EVENTS_PER_PAGE = 10;
  
  const { data: pastEvents, isLoading: pastLoading } = useGetPastEvents(
    pastPage * PAST_EVENTS_PER_PAGE,
    PAST_EVENTS_PER_PAGE,
    activeTab === 'past' // Only fetch when Past Events tab is active
  );

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
          <Tabs defaultValue="upcoming" className="w-full" onValueChange={setActiveTab}>
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
                <div className="space-y-6">
                  {upcomingEventsData.map((item) => (
                    <EventCard 
                      key={item.event.eventId.toString()} 
                      event={item.event} 
                      raceSummary={item.raceSummary}
                    />
                  ))}
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
