import { Button } from "@/components/ui/button";

interface StickyLiveBannerProps {
  raceName: string;
  raceCount: number;
  isVisible: boolean;
  onWatchClick: () => void;
}

export function StickyLiveBanner({ raceName, raceCount, isVisible, onWatchClick }: StickyLiveBannerProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3 px-4 py-2 bg-red-500/95 backdrop-blur-sm rounded-full shadow-lg shadow-red-500/25 border border-red-400/50">
        <span className="w-3 h-3 bg-white rounded-full animate-pulse" />
        <span className="text-white font-medium">
          {raceCount > 1 
            ? `${raceCount} races are LIVE!` 
            : `${raceName} is LIVE!`}
        </span>
        <Button 
          size="sm" 
          variant="secondary"
          className="bg-white text-red-600 hover:bg-red-50"
          onClick={onWatchClick}
        >
          Watch Now →
        </Button>
      </div>
    </div>
  );
}
