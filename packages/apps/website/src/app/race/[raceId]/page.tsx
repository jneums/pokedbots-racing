import { useParams } from 'react-router-dom';
import { RaceDetailsClient } from './RaceDetailsClient';

export default function RaceDetailsPage() {
  const { raceId } = useParams<{ raceId: string }>();
  return <RaceDetailsClient raceId={raceId!} />;
}
