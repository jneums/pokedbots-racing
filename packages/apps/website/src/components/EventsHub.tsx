import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useGetUpcomingEventsWithRaces } from '@/hooks/useRacing';
import { Clock, Calendar, Trophy, TrendingUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface EventDeadline {
  type: 'race_start' | 'betting_open' | 'betting_close' | 'registration_close';
  time: number;
  label: string;
  link: string;
  icon: React.ReactNode;
  eventId: bigint;
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function getUrgencyLevel(ms: number): 'critical' | 'urgent' | 'normal' {
  const minutes = ms / (1000 * 60);
  if (minutes <= 15) return 'critical';
  if (minutes <= 60) return 'urgent';
  return 'normal';
}

export default function EventsHub() {
  const { data: events, isLoading } = useGetUpcomingEventsWithRaces(1);
  const [deadlines, setDeadlines] = useState<EventDeadline[]>([]);
  const [now, setNow] = useState(Date.now());

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Process events into deadlines
  useEffect(() => {
    if (!events || events.length === 0) {
      setDeadlines([]);
      return;
    }

    const newDeadlines: EventDeadline[] = [];
    const currentTime = Date.now();

    events.forEach((eventData) => {
      const event = eventData.event;
      const eventId = event.eventId;
      
      // Race start time
      const raceStartTime = Number(event.scheduledTime) / 1_000_000;
      if (raceStartTime > currentTime) {
        newDeadlines.push({
          type: 'race_start',
          time: raceStartTime,
          label: 'Race Start',
          link: `/schedule/${eventId}`,
          icon: <Trophy className="h-4 w-4" />,
          eventId,
        });
      }

      // Registration close time
      const regCloseTime = Number(event.registrationCloses) / 1_000_000;
      if (regCloseTime > currentTime) {
        newDeadlines.push({
          type: 'registration_close',
          time: regCloseTime,
          label: 'Entry Deadline',
          link: `/schedule/${eventId}`,
          icon: <Calendar className="h-4 w-4" />,
          eventId,
        });
      }

      // Betting opens (at registration close)
      if (regCloseTime > currentTime) {
        newDeadlines.push({
          type: 'betting_open',
          time: regCloseTime,
          label: 'Betting Opens',
          link: `/schedule/${eventId}`,
          icon: <TrendingUp className="h-4 w-4" />,
          eventId,
        });
      }

      // Betting closes (at race start)
      if (raceStartTime > currentTime && regCloseTime < currentTime) {
        newDeadlines.push({
          type: 'betting_close',
          time: raceStartTime,
          label: 'Betting Closes',
          link: `/schedule/${eventId}`,
          icon: <TrendingUp className="h-4 w-4" />,
          eventId,
        });
      }
    });

    // Sort by time (soonest first)
    newDeadlines.sort((a, b) => a.time - b.time);
    setDeadlines(newDeadlines);
  }, [events]);

  if (isLoading || deadlines.length === 0) {
    return null;
  }

  // Filter out any expired deadlines
  const activeDeadlines = deadlines.filter(d => d.time > now);
  
  if (activeDeadlines.length === 0) {
    return null;
  }

  const nextDeadline = activeDeadlines[0];
  const timeLeft = nextDeadline.time - now;

  const urgency = getUrgencyLevel(timeLeft);
  const countdown = formatCountdown(timeLeft);

  // Style classes based on urgency
  const getUrgencyClasses = () => {
    switch (urgency) {
      case 'critical':
        return {
          container: 'bg-destructive/20 border-destructive/50 hover:bg-destructive/30',
          text: 'text-destructive',
          icon: 'text-destructive',
          pulse: 'animate-pulse',
        };
      case 'urgent':
        return {
          container: 'bg-yellow-500/20 border-yellow-500/50 hover:bg-yellow-500/30',
          text: 'text-yellow-500',
          icon: 'text-yellow-500',
          pulse: '',
        };
      default:
        return {
          container: 'bg-primary/10 border-primary/30 hover:bg-primary/20',
          text: 'text-primary',
          icon: 'text-primary',
          pulse: '',
        };
    }
  };

  const classes = getUrgencyClasses();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={`flex items-center gap-2 px-3 py-2 h-auto rounded-lg border transition-all ${classes.container}`}
        >
          <Clock className={`h-4 w-4 ${classes.icon} ${classes.pulse}`} />
          <div className="flex flex-col items-start leading-tight">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
              {nextDeadline.label}
            </span>
            <span className={`text-sm font-bold font-mono ${classes.text}`}>
              {countdown}
            </span>
          </div>
          <ChevronDown className="h-3 w-3 text-muted-foreground ml-1" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b bg-card">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Upcoming Events
          </h3>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {activeDeadlines.map((deadline, index) => {
            const timeUntil = deadline.time - now;
            const deadlineUrgency = getUrgencyLevel(timeUntil);
            const deadlineCountdown = formatCountdown(timeUntil);
            
            let bgClass = 'hover:bg-muted/50';
            let textClass = 'text-foreground';
            let badgeClass = 'bg-primary/10 text-primary';
            
            if (deadlineUrgency === 'critical') {
              bgClass = 'hover:bg-destructive/10 border-l-2 border-l-destructive';
              textClass = 'text-destructive';
              badgeClass = 'bg-destructive/20 text-destructive animate-pulse';
            } else if (deadlineUrgency === 'urgent') {
              bgClass = 'hover:bg-yellow-500/10 border-l-2 border-l-yellow-500';
              textClass = 'text-yellow-500';
              badgeClass = 'bg-yellow-500/20 text-yellow-500';
            }

            return (
              <Link
                key={`${deadline.type}-${deadline.eventId}-${index}`}
                to={deadline.link}
                className={`block p-3 transition-colors ${bgClass}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <div className={`mt-0.5 ${textClass}`}>
                      {deadline.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm ${textClass}`}>
                        {deadline.label}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(deadline.time).toLocaleString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-bold font-mono whitespace-nowrap ${badgeClass}`}>
                    {deadlineCountdown}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
