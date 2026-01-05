import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useGetUpcomingEventsWithRaces } from '@/hooks/useRacing';
import { Clock, Calendar } from 'lucide-react';

export default function RaceCountdown() {
  const { data: events, isLoading } = useGetUpcomingEventsWithRaces(1);
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    isUrgent: boolean;
    isVeryUrgent: boolean;
  } | null>(null);

  const nextEventData = events?.[0];
  const nextEvent = nextEventData?.event;

  useEffect(() => {
    if (!nextEvent) return;

    const updateCountdown = () => {
      const now = Date.now();
      const eventTime = Number(nextEvent.scheduledTime) / 1_000_000; // Convert nanoseconds to ms
      const diff = eventTime - now;

      if (diff <= 0) {
        setTimeLeft(null);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const totalMinutes = hours * 60 + minutes;
      setTimeLeft({
        hours,
        minutes,
        seconds,
        isUrgent: totalMinutes <= 60, // Less than 1 hour
        isVeryUrgent: totalMinutes <= 15, // Less than 15 minutes
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [nextEvent]);

  if (isLoading || !nextEvent || !timeLeft) {
    return null;
  }

  // Link to the event's schedule page with the event ID
  const eventId = nextEvent.eventId;
  const linkTo = `/schedule#event-${eventId}`;

  // Determine animation and color classes
  const getStatusClasses = () => {
    if (timeLeft.isVeryUrgent) {
      return {
        container: 'bg-destructive/20 border-destructive/50 animate-pulse',
        text: 'text-destructive',
        icon: 'text-destructive',
        badge: 'bg-destructive text-destructive-foreground'
      };
    }
    if (timeLeft.isUrgent) {
      return {
        container: 'bg-orange-500/20 border-orange-500/50',
        text: 'text-orange-500',
        icon: 'text-orange-500',
        badge: 'bg-orange-500 text-white'
      };
    }
    return {
      container: 'bg-primary/10 border-primary/30',
      text: 'text-primary',
      icon: 'text-primary',
      badge: 'bg-primary text-primary-foreground'
    };
  };

  const classes = getStatusClasses();

  return (
    <Link 
      to={linkTo}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all hover:scale-105 ${classes.container}`}
    >
      <Clock className={`h-4 w-4 ${classes.icon} ${timeLeft.isVeryUrgent ? 'animate-pulse' : ''}`} />
      <div className="flex flex-col items-start leading-tight">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Next Race</span>
        <span className={`text-sm font-bold font-mono ${classes.text}`}>
          {timeLeft.hours > 0 && `${timeLeft.hours}h `}
          {String(timeLeft.minutes).padStart(2, '0')}:
          {String(timeLeft.seconds).padStart(2, '0')}
        </span>
      </div>
      {timeLeft.isVeryUrgent && (
        <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${classes.badge}`}>
          Live Soon!
        </div>
      )}
    </Link>
  );
}
