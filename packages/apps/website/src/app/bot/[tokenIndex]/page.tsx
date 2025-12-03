import { useParams } from 'react-router-dom';
import { BotDetailsClient } from './BotDetailsClient';

export default function BotDetailsPage() {
  const { tokenIndex } = useParams<{ tokenIndex: string }>();
  return <BotDetailsClient tokenIndex={tokenIndex!} />;
}
