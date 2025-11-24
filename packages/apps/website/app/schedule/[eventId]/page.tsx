import { EventDetailsClient } from './EventDetailsClient';

export async function generateStaticParams() {
  // Generate params for the first few events
  // This allows static export to work while still supporting dynamic routes
  return [
    { eventId: '0' },
    { eventId: '1' },
    { eventId: '2' },
  ];
}

export default async function EventDetailsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  return <EventDetailsClient eventId={eventId} />;
}
