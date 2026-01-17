'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Construction } from 'lucide-react';

interface BettingInterfaceProps {
  raceId: number;
  entryDeadline?: bigint;
  raceStatus?: any;
}

// Betting is temporarily disabled
export function BettingInterface({ raceId, entryDeadline, raceStatus }: BettingInterfaceProps) {
  // Suppress unused variable warnings
  void raceId;
  void entryDeadline;
  void raceStatus;
  
  return (
    <Card className="border-dashed border-muted-foreground/30 bg-muted/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2 text-muted-foreground">
          <Construction className="h-4 w-4" />
          Betting Temporarily Disabled
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          The betting system is under review. Enter your bots directly in races to compete for prize pools!
        </p>
      </CardContent>
    </Card>
  );
}
