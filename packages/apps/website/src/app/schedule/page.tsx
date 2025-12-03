'use client';

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGetUpcomingEvents, useGetPastEvents, type ScheduledEvent } from "@/hooks/useRacing";

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

function getStatusBadge(status: ScheduledEvent['status'], isPastEvent: boolean = false) {
  // Override status for past events
  if (isPastEvent) {
    return <Badge className="bg-gray-600/90 hover:bg-gray-600 border-gray-500/50 text-white">Completed</Badge>;
  }
  
  if ('Announced' in status) {
    return <Badge className="bg-blue-500/90 hover:bg-blue-500 border-blue-400/50">Announced</Badge>;
  }
  if ('RegistrationOpen' in status) {
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
  if ('Scavenger' in division) return 'Scavenger';
  if ('Raider' in division) return 'Raider';
  if ('Elite' in division) return 'Elite';
  if ('SilentKlan' in division) return 'Silent Klan';
  return 'Unknown';
}

function EventCard({ event, isPastEvent = false }: { event: ScheduledEvent; isPastEvent?: boolean }) {
  const totalPrizePool = Number(event.metadata.prizePoolBonus) + 
                         (Number(event.metadata.entryFee) * Number(event.raceIds.length));

  const now = new Date();
  const registrationClosesDate = new Date(Number(event.registrationCloses) / 1_000_000);
  const isRegistrationOpen = now < registrationClosesDate && 'RegistrationOpen' in event.status;
  
  const isUpcoming = 'Announced' in event.status;

  return (
    <Card className="border-2 border-primary/20 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 bg-card/50 backdrop-blur">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{getEventTypeIcon(event.eventType)}</span>
              <div>
                <CardTitle className="text-2xl">{event.metadata.name}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {getEventTypeName(event.eventType)}
                </p>
              </div>
              {getStatusBadge(event.status, isPastEvent)}
            </div>
            <CardDescription className="text-base">
              {event.metadata.description}
            </CardDescription>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>🕒 {formatDate(event.scheduledTime)}</span>
              {isRegistrationOpen && !isPastEvent && (
                <span className="text-green-500 font-semibold">
                  Closes {formatRelativeTime(event.registrationCloses)}
                </span>
              )}
              {isPastEvent && (
                <span className="text-muted-foreground">
                  Completed
                </span>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Event Details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center p-3 bg-card border-2 border-primary/20 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Prize Pool</p>
            <p className="text-lg font-bold text-primary">{formatICP(BigInt(totalPrizePool))}</p>
          </div>

          <div className="text-center p-3 bg-card border-2 border-primary/20 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Entry Fee</p>
            <p className="text-lg font-bold text-primary">{formatICP(event.metadata.entryFee)}</p>
          </div>

          <div className="text-center p-3 bg-card border-2 border-primary/20 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Races</p>
            <p className="text-lg font-bold text-primary">{event.raceIds.length}</p>
          </div>

          <div className="text-center p-3 bg-card border-2 border-primary/20 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Points</p>
            <p className="text-lg font-bold text-primary">{event.metadata.pointsMultiplier}x</p>
          </div>
        </div>

        {/* Divisions */}
        {event.metadata.divisions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Divisions:</p>
            <div className="flex gap-2 flex-wrap">
              {event.metadata.divisions.map((division, idx) => (
                <Badge key={idx} variant="outline" className="bg-primary/10">
                  {getDivisionName(division)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Entry Limits */}
        <div className="flex items-center justify-between text-sm">
          <div className="text-muted-foreground">
            Entry Limits: {event.metadata.minEntries.toString()} - {event.metadata.maxEntries.toString()} racers
          </div>
          {isUpcoming && (
            <div className="text-blue-500 font-semibold">
              Opens {formatRelativeTime(event.registrationOpens)}
            </div>
          )}
        </div>

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
  const { data: upcomingEvents, isLoading: upcomingLoading } = useGetUpcomingEvents(14); // Next 2 weeks
  
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
              ) : !upcomingEvents || upcomingEvents.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-lg text-muted-foreground">No upcoming events scheduled.</p>
                  <p className="text-sm text-muted-foreground mt-2">Check back later for new races!</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {upcomingEvents.map((event) => (
                    <EventCard key={event.eventId.toString()} event={event} />
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
