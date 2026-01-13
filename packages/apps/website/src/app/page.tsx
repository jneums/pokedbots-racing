import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ICPTicker } from "@/components/ICPTicker";
import { useGetUpcomingEventsWithRaces } from "@/hooks/useRacing";
import { Badge } from "@/components/ui/badge";

function formatICP(amount: bigint): string {
  const icp = Number(amount) / 100_000_000;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(icp) + ' ICP';
}

function formatDate(timestamp: bigint): string {
  const date = new Date(Number(timestamp) / 1_000_000);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Home() {
  const { data: eventsWithRaces, isLoading } = useGetUpcomingEventsWithRaces(14);
  
  // Get top 3 events by prize pool - use backend's raceSummary.totalPrizePool which sums all individual race prize pools
  const topEvents = eventsWithRaces
    ?.map(e => {
      // Backend calculates accurate totalPrizePool by summing individual race pools (entry fees + platform bonuses + sponsorships)
      // Fall back to manual calculation only if raceSummary is missing
      const totalPrizePool = e.raceSummary?.totalPrizePool 
        ? BigInt(e.raceSummary.totalPrizePool)
        : (BigInt(e.event.registrationCounts.total) * BigInt(e.event.metadata.entryFee)) + 
          BigInt(e.event.metadata.prizePoolBonus) + 
          BigInt(e.event.metadata.eventBonusPrize) + 
          e.event.sponsorships.reduce((sum: bigint, s: any) => sum + BigInt(s.amount), 0n);
      
      return {
        ...e,
        eventPrizePool: totalPrizePool
      };
    })
    .filter(e => e.eventPrizePool > 0n)
    .sort((a, b) => Number(b.eventPrizePool - a.eventPrizePool))
    .slice(0, 3) || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b bg-gradient-to-br from-primary/5 via-background to-accent/10">
        <div className="container mx-auto px-4 py-16 sm:py-24">
          <div className="max-w-5xl mx-auto text-center space-y-10">
            <div className="flex justify-center">
              <img 
                src="/pokedbots-racing-logo.webp" 
                alt="PokedBots Racing" 
                className="w-full max-w-md h-auto"
              />
            </div>
            
            {/* Teaser Text */}
            <div className="max-w-3xl mx-auto space-y-8">
              <p className="text-2xl sm:text-3xl md:text-4xl text-muted-foreground leading-relaxed font-light">
                Build your wasteland racing team. Upgrade your bots. Compete for real <span className="text-primary font-semibold">ICP prizes</span>.
              </p>
            </div>

            <div className="flex gap-5 justify-center flex-wrap pt-8">
              <Link to="/marketplace">
                <Button size="lg" className="text-lg px-10 py-7 h-auto font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                  Browse Marketplace
                </Button>
              </Link>
              <Link to="/schedule">
                <Button size="lg" variant="outline" className="text-lg px-10 py-7 h-auto font-semibold border-2 hover:bg-accent/50">
                  View Schedule
                </Button>
              </Link>
              <Link to="/guides">
                <Button size="lg" variant="outline" className="text-lg px-10 py-7 h-auto font-semibold border-2 hover:bg-accent/50">
                  Read Guides
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ICP Section */}
      <section className="border-t bg-gradient-to-br from-accent/5 via-background to-primary/5">
        <div className="container mx-auto px-4 py-16 sm:py-20">
          <div className="max-w-4xl mx-auto">
            <div className="bg-card/50 backdrop-blur border-2 border-primary/30 rounded-xl p-8 sm:p-12 shadow-2xl">
              <div className="flex flex-col sm:flex-row items-center gap-8">
                <div className="flex-shrink-0">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center border-4 border-primary/40 shadow-lg shadow-primary/20 p-4">
                    <img src="/icp.webp" alt="ICP Logo" className="w-full h-full object-contain" />
                  </div>
                </div>
                <div className="flex-1 text-center sm:text-left space-y-4">
                  <div>
                    <h2 className="text-3xl sm:text-4xl font-bold mb-2">Powered by Internet Computer</h2>
                    <p className="text-xl text-primary font-semibold mb-3">Token: ICP</p>
                    <ICPTicker />
                  </div>
                  <div className="text-base sm:text-lg text-muted-foreground leading-relaxed space-y-3">
                    <p>
                      Pokedbotsracing runs on <span className="text-foreground font-semibold">Internet Computer Protocol (ICP)</span> — we use existing, established blockchain tokens, not custom currencies.
                    </p>
                    <p>
                      We did not create the PokedBots NFT collection; we simply provide a racing utility for these existing NFTs. Our goal is a self-sustaining economy where value comes from supply and demand.
                    </p>
                    <p className="text-primary/90 font-medium">
                      Less than 8,500 bots remain... but there's a whole lot of racing. 🏁
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Top Races Section */}
      {!isLoading && topEvents.length > 0 && (
        <section className="border-t bg-gradient-to-br from-primary/5 via-background to-accent/5">
          <div className="container mx-auto px-4 py-16 sm:py-20">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">🏆 Top Prize Pools</h2>
                <p className="text-lg text-muted-foreground">Biggest upcoming races you can enter now</p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-6">
                {topEvents.map((eventData, idx) => {
                  const event = eventData.event;
                  const raceSummary = eventData.raceSummary;
                  const eventType = 'DailySprint' in event.eventType ? 'Daily Sprint' 
                    : 'WeeklyLeague' in event.eventType ? 'Weekly League'
                    : 'MonthlyCup' in event.eventType ? 'Monthly Cup'
                    : 'Race Event';
                  
                  return (
                    <Link 
                      key={event.eventId} 
                      to={`/schedule/${event.eventId}`}
                      className="group"
                    >
                      <div className="bg-card border-2 border-primary/20 hover:border-primary/50 transition-all hover:shadow-2xl hover:shadow-primary/10 rounded-xl p-6 h-full flex flex-col justify-between relative overflow-hidden">
                        {/* Rank Badge */}
                        <div className="absolute top-4 right-4">
                          <Badge className={`text-lg px-3 py-1 ${
                            idx === 0 ? 'bg-yellow-500/90 hover:bg-yellow-500 text-yellow-950' 
                            : idx === 1 ? 'bg-gray-400/90 hover:bg-gray-400 text-gray-950'
                            : 'bg-amber-700/90 hover:bg-amber-700 text-amber-50'
                          }`}>
                            #{idx + 1}
                          </Badge>
                        </div>
                        
                        {/* Top Section - Event Name */}
                        <div className="min-h-[6.5rem]">
                          <h3 className="text-2xl font-bold mb-2 group-hover:text-primary transition-colors pr-12">
                            {event.metadata.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">{eventType}</p>
                        </div>
                        
                        {/* Bottom Section - Everything Else */}
                        <div className="space-y-4">
                          {/* Prize Pool - Prominent */}
                          <div className="text-center p-4 bg-gradient-to-br from-amber-500/20 via-yellow-500/20 to-orange-500/20 border-2 border-amber-500/40 rounded-lg">
                            <div className="text-3xl mb-1">💰</div>
                            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-1">Prize Pool</div>
                            <div className="text-2xl font-bold text-amber-500 dark:text-amber-400">
                              {formatICP(eventData.eventPrizePool)}
                            </div>
                          </div>
                          
                          {/* Race Stats */}
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="text-center p-2 bg-card/50 border border-primary/20 rounded">
                              <div className="text-muted-foreground mb-1">Est. Races</div>
                              <div className="font-bold text-primary">
                                {event.raceIds.length > 0 ? event.raceIds.length : (() => {
                                  // Estimate: 1 race per 8 registrants per class
                                  let totalRaces = 0;
                                  event.registrationCounts.byClass.forEach((classCount: any) => {
                                    const count = Number(classCount[1]);
                                    if (count > 0) {
                                      totalRaces += Math.ceil(count / 8);
                                    }
                                  });
                                  return totalRaces || 0;
                                })()}
                              </div>
                            </div>
                            <div className="text-center p-2 bg-card/50 border border-primary/20 rounded">
                              <div className="text-muted-foreground mb-1">Racers</div>
                              <div className="font-bold text-primary">{Number(event.registrationCounts.total)}</div>
                            </div>
                          </div>
                          
                          {/* Date */}
                          <div className="text-center text-sm text-muted-foreground border-t border-primary/20 pt-3">
                            🗓️ {formatDate(event.scheduledTime)}
                          </div>
                          
                          {/* View Details Button */}
                          <div className="pt-4 border-t border-primary/20">
                            <div className="text-center text-sm font-semibold text-primary group-hover:text-primary/80 transition-colors">
                              View Event Details →
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
              
              <div className="text-center mt-10">
                <Link to="/schedule">
                  <Button size="lg" variant="outline" className="text-lg px-8 py-6 h-auto font-semibold border-2">
                    View Full Schedule →
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Guides Section */}
      <section className="border-t bg-card/30">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Getting Started</h2>
              <p className="text-lg text-muted-foreground">Learn the basics and master the wasteland</p>
            </div>
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <Link to="/guides/01-quick-start" className="group">
                <div className="bg-card border-2 border-primary/20 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 rounded-lg p-6 h-full">
                  <div className="text-3xl mb-3">🚀</div>
                  <h3 className="font-semibold text-xl mb-2 group-hover:text-primary transition-colors">Quick Start Guide</h3>
                  <p className="text-sm text-muted-foreground">Get your first bot and start racing in minutes</p>
                </div>
              </Link>
              
              <Link to="/guides/02-racing-guide" className="group">
                <div className="bg-card border-2 border-primary/20 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 rounded-lg p-6 h-full">
                  <div className="text-3xl mb-3">🏁</div>
                  <h3 className="font-semibold text-xl mb-2 group-hover:text-primary transition-colors">Racing Mechanics</h3>
                  <p className="text-sm text-muted-foreground">Understand stats, terrain bonuses, and winning strategies</p>
                </div>
              </Link>
              
              <Link to="/guides/04-upgrade-system" className="group">
                <div className="bg-card border-2 border-primary/20 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 rounded-lg p-6 h-full">
                  <div className="text-3xl mb-3">⚡</div>
                  <h3 className="font-semibold text-xl mb-2 group-hover:text-primary transition-colors">Upgrade System</h3>
                  <p className="text-sm text-muted-foreground">Boost your bot's stats with ICP or parts</p>
                </div>
              </Link>
              
              <Link to="/guides/03-scavenging-guide" className="group">
                <div className="bg-card border-2 border-primary/20 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 rounded-lg p-6 h-full">
                  <div className="text-3xl mb-3">🔧</div>
                  <h3 className="font-semibold text-xl mb-2 group-hover:text-primary transition-colors">Scavenging Guide</h3>
                  <p className="text-sm text-muted-foreground">Gather free parts while your bots are idle</p>
                </div>
              </Link>
              
              <Link to="/guides/06-marketplace-shopping" className="group">
                <div className="bg-card border-2 border-primary/20 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 rounded-lg p-6 h-full">
                  <div className="text-3xl mb-3">🛒</div>
                  <h3 className="font-semibold text-xl mb-2 group-hover:text-primary transition-colors">Shopping Guide</h3>
                  <p className="text-sm text-muted-foreground">Find the best bots to buy on the marketplace</p>
                </div>
              </Link>
              
              <Link to="/guides/05-costs-and-fees" className="group">
                <div className="bg-card border-2 border-primary/20 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 rounded-lg p-6 h-full">
                  <div className="text-3xl mb-3">💰</div>
                  <h3 className="font-semibold text-xl mb-2 group-hover:text-primary transition-colors">Costs & Fees</h3>
                  <p className="text-sm text-muted-foreground">Understand all ICP costs and optimize expenses</p>
                </div>
              </Link>
            </div>
            
            <div className="text-center mt-10">
              <Link to="/guides">
                <Button size="lg" variant="outline" className="text-lg px-8 py-6 h-auto font-semibold border-2">
                  View All Guides →
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t bg-gradient-to-br from-primary/5 via-background to-accent/10">
        <div className="container mx-auto px-4 py-24 sm:py-32">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="text-4xl sm:text-5xl font-bold">Ready to Race?</h2>
            <p className="text-xl sm:text-2xl text-muted-foreground/90 font-light leading-relaxed max-w-2xl mx-auto">
              Build your garage, upgrade your bots, and compete for ICP prizes.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link to="/marketplace">
                <Button size="lg" className="text-lg px-8 py-6 h-auto font-semibold shadow-lg">
                  Get Your First Bot
                </Button>
              </Link>
              <Link to="/leaderboard">
                <Button size="lg" variant="outline" className="text-lg px-8 py-6 h-auto font-semibold border-2">
                  View Leaderboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
