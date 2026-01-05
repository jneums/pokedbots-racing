import { useEffect, useState } from 'react';

interface ICPPrice {
  usd: number;
  usd_24h_change: number;
}

export function ICPTicker() {
  const [price, setPrice] = useState<ICPPrice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const response = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=internet-computer&vs_currencies=usd&include_24hr_change=true'
        );
        const data = await response.json();
        setPrice({
          usd: data['internet-computer'].usd,
          usd_24h_change: data['internet-computer'].usd_24h_change,
        });
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch ICP price:', error);
        setLoading(false);
      }
    };

    fetchPrice();
    // Refresh every 60 seconds
    const interval = setInterval(fetchPrice, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !price) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
        <span>Loading price...</span>
      </div>
    );
  }

  const isPositive = price.usd_24h_change >= 0;
  const changeColor = isPositive ? 'text-green-500' : 'text-red-500';

  return (
    <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-sm">
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-foreground">
          ${price.usd.toFixed(4)}
        </span>
        <span className="text-muted-foreground">USD</span>
      </div>
      <div className={`flex items-center gap-1 font-semibold ${changeColor}`}>
        <span>{isPositive ? '▲' : '▼'}</span>
        <span>{Math.abs(price.usd_24h_change).toFixed(2)}%</span>
        <span className="text-xs text-muted-foreground font-normal">24h</span>
      </div>
    </div>
  );
}
