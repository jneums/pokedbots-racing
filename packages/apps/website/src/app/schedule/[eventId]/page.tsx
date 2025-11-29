import { useParams } from 'react-router-dom';
import { EventDetailsClient } from './EventDetailsClient';

export default function EventDetailsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  return <EventDetailsClient eventId={eventId!} />;
}
