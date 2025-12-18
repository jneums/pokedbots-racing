import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function Home() {
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
                className="w-full max-w-3xl h-auto"
              />
            </div>
            
            {/* Teaser Text */}
            <div className="max-w-3xl mx-auto space-y-8">
              <p className="text-2xl sm:text-3xl md:text-4xl text-muted-foreground leading-relaxed font-light">
                Build your wasteland racing team. Upgrade your bots. Compete for real <span className="text-primary font-semibold">ICP prizes</span>.
              </p>
              
              <div className="grid sm:grid-cols-3 gap-6 pt-6">
                <div className="bg-card/50 backdrop-blur border-2 border-primary/20 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 rounded-lg p-6">
                  <div className="text-4xl mb-3">🏎️</div>
                  <div className="font-semibold text-lg mb-2">Race & Compete</div>
                  <div className="text-sm text-muted-foreground">Daily events with prize pools</div>
                </div>
                <div className="bg-card/50 backdrop-blur border-2 border-primary/20 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 rounded-lg p-6">
                  <div className="text-4xl mb-3">⚡</div>
                  <div className="font-semibold text-lg mb-2">Upgrade & Customize</div>
                  <div className="text-sm text-muted-foreground">Boost stats and optimize performance</div>
                </div>
                <div className="bg-card/50 backdrop-blur border-2 border-primary/20 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 rounded-lg p-6">
                  <div className="text-4xl mb-3">🏆</div>
                  <div className="font-semibold text-lg mb-2">Earn Rewards</div>
                  <div className="text-sm text-muted-foreground">Win ICP in tournaments</div>
                </div>
              </div>
            </div>

            <div className="flex gap-5 justify-center flex-wrap pt-8">
              <Link to="/schedule">
                <Button size="lg" className="text-lg px-10 py-7 h-auto font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                  View Schedule
                </Button>
              </Link>
              <Link to="/marketplace">
                <Button size="lg" variant="outline" className="text-lg px-10 py-7 h-auto font-semibold border-2 hover:bg-accent/50">
                  Browse Marketplace
                </Button>
              </Link>
              <Link to="/leaderboard">
                <Button size="lg" variant="outline" className="text-lg px-10 py-7 h-auto font-semibold border-2 hover:bg-accent/50">
                  Leaderboard
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
                  Browse Marketplace
                </Button>
              </Link>
              <Link to="/schedule">
                <Button size="lg" variant="outline" className="text-lg px-8 py-6 h-auto font-semibold border-2">
                  View Race Schedule
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
