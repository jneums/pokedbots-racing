import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { getAllDocs } from "@/lib/markdown";

export default function Home() {
  const docs = getAllDocs('docs');
  const guides = getAllDocs('guides');

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b bg-gradient-to-br from-primary/5 via-background to-accent/10">
        <div className="container mx-auto px-4 py-16 sm:py-20">
          <div className="max-w-4xl mx-auto text-center space-y-10">
            <div className="flex justify-center">
              <img 
                src="/pokedbots-racing-logo.webp" 
                alt="PokedBots Racing" 
                className="w-full max-w-lg h-auto"
              />
            </div>
            
            {/* Simple Explanation */}
            <div className="max-w-2xl mx-auto space-y-6">
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
                What is PokedBots Racing?
              </h1>
              <p className="text-xl sm:text-2xl text-muted-foreground leading-relaxed">
                The first AI agent-first racing management simulator. Your AI agents manage your PokedBots garage—analyzing and purchasing bots, performing upgrades, entering races, and maintaining your fleet between events.
              </p>
              <div className="grid sm:grid-cols-3 gap-4 pt-4">
                <div className="bg-card/50 backdrop-blur border-2 border-primary/20 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 rounded-lg p-4">
                  <div className="text-3xl mb-2">🤖</div>
                  <div className="font-semibold mb-1">AI Agents</div>
                  <div className="text-sm text-muted-foreground">Let AI manage your racing garage</div>
                </div>
                <div className="bg-card/50 backdrop-blur border-2 border-primary/20 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 rounded-lg p-4">
                  <div className="text-3xl mb-2">🏎️</div>
                  <div className="font-semibold mb-1">Strategic Racing</div>
                  <div className="text-sm text-muted-foreground">Optimize bots and compete in events</div>
                </div>
                <div className="bg-card/50 backdrop-blur border-2 border-primary/20 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 rounded-lg p-4">
                  <div className="text-3xl mb-2">💰</div>
                  <div className="font-semibold mb-1">Win ICP</div>
                  <div className="text-sm text-muted-foreground">Top finishers earn real prizes</div>
                </div>
              </div>
            </div>

            <p className="text-xl sm:text-2xl text-muted-foreground/80 max-w-3xl mx-auto leading-relaxed font-light pt-4">
              Compete in scheduled races with real ICP prizes. Your AI handles the strategy—you reap the rewards.
            </p>
            <div className="flex gap-5 justify-center flex-wrap pt-6">
              <Link to="/schedule">
                <Button size="lg" className="text-lg px-10 py-7 h-auto font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                  View Schedule
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

      {/* Features Section */}
      <section className="bg-muted/20">
        <div className="container mx-auto px-4 py-24 sm:py-32">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-5xl font-bold mb-5">Key Features</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                AI-powered garage management meets competitive wasteland racing
              </p>
            </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-2 border-primary/20 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <span className="text-3xl">🛠️</span>
                  AI Integration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  Let AI agents manage your racing garage via the Model Context Protocol—from purchasing bots to race strategy.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary/20 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <span className="text-3xl">🏎️</span>
                  Dynamic Racing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  Realistic racing simulation based on your bot's stats, terrain effects, and faction bonuses.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary/20 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <span className="text-3xl">💰</span>
                  ICP Prizes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  Compete in scheduled races with real ICP prize pools and sponsorship rewards.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary/20 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <span className="text-3xl">🎯</span>
                  Bot Upgrades
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  Permanently boost your bot's speed, power, acceleration, and stability through crafting.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary/20 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <span className="text-3xl">📅</span>
                  Racing Calendar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  Daily sprints, weekly leagues, and monthly tournaments across different terrains and classes.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary/20 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <span className="text-3xl">🔧</span>
                  Bot Maintenance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  Repair damage, recharge batteries, and manage condition between races to keep your fleet competitive.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
        </div>
      </section>

      {/* Featured Ultimate Bots */}
      <section className="border-t">
        <div className="container mx-auto px-4 py-24 sm:py-32">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-5xl font-bold mb-5">Featured Ultimate Bots</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Ultra-rare powerhouses with +5 Speed/Power Core and +3 Acceleration/Stability. Only 45 Ultimate bots exist in the wasteland.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {/* Bot #588 */}
              <Link to="/guides/elite-faction-showcase" className="block">
                <Card className="border-2 border-primary/20 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 bg-card/50 backdrop-blur overflow-hidden group pt-0 cursor-pointer h-full">
                <div className="aspect-[3/4] bg-muted/20 relative overflow-hidden">
                  <img 
                    src="https://bzsui-sqaaa-aaaah-qce2a-cai.raw.icp0.io/?tokenid=r7y2n-zikor-uwiaa-aaaaa-b4arg-qaqca-aaajg-a&type=thumbnail"
                    alt="Bot #588"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-primary text-primary-foreground font-bold">BEST VALUE</Badge>
                  </div>
                </div>
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-2xl">Bot #588</CardTitle>
                    <span className="text-2xl font-bold text-primary">1,800 ICP</span>
                  </div>
                  <CardDescription className="text-base">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Rating:</span>
                        <span className="text-foreground">39/100 👑</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-sm">
                        <span className="text-primary font-semibold">SPD: 43</span>
                        <span>PWR: 37</span>
                        <span>ACC: 39</span>
                        <span>STB: 37</span>
                      </div>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    Exceptional value! 39 rating with strong 43 speed. Ultra-rare Ultimate faction at reasonable price.
                  </p>
                  <Button className="w-full" variant="outline">View Guide</Button>
                </CardContent>
              </Card>
              </Link>

              {/* Bot #2471 */}
              <Link to="/guides/elite-faction-showcase" className="block">
                <Card className="border-2 border-primary/20 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 bg-card/50 backdrop-blur overflow-hidden group pt-0 cursor-pointer h-full">
                <div className="aspect-[3/4] bg-muted/20 relative overflow-hidden">
                  <img 
                    src="https://bzsui-sqaaa-aaaah-qce2a-cai.raw.icp0.io/?tokenid=lpouj-xqkor-uwiaa-aaaaa-b4arg-qaqca-aabgt-q&type=thumbnail"
                    alt="Bot #2471"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-4 right-4">
                    <Badge variant="secondary" className="font-bold">SPEED</Badge>
                  </div>
                </div>
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-2xl">Bot #2471</CardTitle>
                    <span className="text-2xl font-bold text-primary">2,000 ICP</span>
                  </div>
                  <CardDescription className="text-base">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Rating:</span>
                        <span className="text-foreground">38/100 👑</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-sm">
                        <span className="text-primary font-semibold">SPD: 42</span>
                        <span>PWR: 36</span>
                        <span>ACC: 39</span>
                        <span>STB: 37</span>
                      </div>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    Strong 42 speed with balanced stats. Ultra-rare Ultimate faction for competitive racing.
                  </p>
                  <Button className="w-full" variant="outline">View Guide</Button>
                </CardContent>
              </Card>
              </Link>

              {/* Bot #8631 */}
              <Link to="/guides/elite-faction-showcase" className="block">
                <Card className="border-2 border-primary/20 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 bg-card/50 backdrop-blur overflow-hidden group pt-0 cursor-pointer h-full">
                <div className="aspect-[3/4] bg-muted/20 relative overflow-hidden">
                  <img 
                    src="https://bzsui-sqaaa-aaaah-qce2a-cai.raw.icp0.io/?tokenid=dm37u-eakor-uwiaa-aaaaa-b4arg-qaqca-aaeg3-q&type=thumbnail"
                    alt="Bot #8631"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold">ULTIMATE</Badge>
                  </div>
                </div>
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-2xl">Bot #8631</CardTitle>
                    <span className="text-xl font-bold text-primary">88,888 ICP</span>
                  </div>
                  <CardDescription className="text-base">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Rating:</span>
                        <span className="text-foreground font-bold">45/100 👑</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-sm">
                        <span className="text-primary font-semibold">SPD: 45</span>
                        <span className="text-primary font-semibold">PWR: 45</span>
                        <span className="text-primary font-semibold">ACC: 47</span>
                        <span className="text-primary font-semibold">STB: 45</span>
                      </div>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    The crown jewel! Top-25 Ultimate bot with exceptional balanced stats. Ultra-rare prestige.
                  </p>
                  <Button className="w-full" variant="outline">View Guide</Button>
                </CardContent>
              </Card>
              </Link>
            </div>
            <div className="text-center mt-12">
              <Link to="/guides/elite-faction-showcase">
                <Button size="lg" variant="outline" className="text-base px-8 border-2">
                  Read Full Guide →
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Guides Preview */}
      {guides.length > 0 && (
        <section className="border-t">
          <div className="container mx-auto px-4 py-24 sm:py-32">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-wrap items-center justify-between gap-6 mb-16">
                <div>
                  <h2 className="text-5xl font-bold mb-3">Guides</h2>
                  <p className="text-xl text-muted-foreground">Step-by-step tutorials and gameplay strategies</p>
                </div>
                <Link to="/guides">
                  <Button variant="outline" size="lg" className="text-base px-6 border-2">
                    View All Guides →
                  </Button>
                </Link>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                {(() => {
                  const featuredSlugs = [
                    'beginner-racing-guide',
                    'full-system-demo-and-recommendations', 
                    'elite-faction-showcase',
                    'mcp-tools-guide'
                  ];
                  const featuredGuides = featuredSlugs
                    .map(slug => guides.find(g => g.slug === slug))
                    .filter((guide): guide is NonNullable<typeof guide> => guide !== undefined);
                  return featuredGuides.map((guide) => (
                    <Link key={guide.slug} to={`/guides/${guide.slug}`}>
                      <Card className="border-2 border-primary/20 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 bg-card/50 backdrop-blur h-full group">
                        <CardHeader className="space-y-3">
                          <CardTitle className="text-2xl group-hover:text-primary transition-colors">
                            {guide.metadata.title || guide.slug}
                          </CardTitle>
                          {guide.metadata.description && (
                            <CardDescription className="text-base leading-relaxed">
                              {guide.metadata.description}
                            </CardDescription>
                          )}
                        </CardHeader>
                      </Card>
                    </Link>
                  ));
                })()}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Featured Blackhole Bots */}
      <section className="border-t bg-muted/20">
        <div className="container mx-auto px-4 py-24 sm:py-32">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-5xl font-bold mb-5">Featured Blackhole Bots</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Super-rare power specialists with +18 Power Core, +16 Acceleration, +13 Speed/Stability. Only 244 Blackhole bots exist.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {/* Bot #4343 */}
              <Link to="/guides/wildbot-shopping-guide" className="block">
                <Card className="border-2 border-primary/20 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 bg-card/50 backdrop-blur overflow-hidden group pt-0 cursor-pointer h-full">
                <div className="aspect-square bg-muted/20 relative overflow-hidden">
                  <img 
                    src="https://bzsui-sqaaa-aaaah-qce2a-cai.raw.icp0.io/?tokenid=vo3ly-mqkor-uwiaa-aaaaa-b4arg-qaqca-aacd3-q&type=thumbnail"
                    alt="Bot #4343"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-primary text-primary-foreground font-bold">BEST VALUE</Badge>
                  </div>
                </div>
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-2xl">Bot #4343</CardTitle>
                    <span className="text-2xl font-bold text-primary">44 ICP</span>
                  </div>
                  <CardDescription className="text-base">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Rating:</span>
                        <span className="text-foreground">41/100 🏆</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-sm">
                        <span>SPD: 35</span>
                        <span className="text-primary font-semibold">PWR: 46</span>
                        <span className="text-primary font-semibold">ACC: 41</span>
                        <span className="text-primary font-semibold">STB: 41</span>
                      </div>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    Best value Blackhole! Exceptional 46 power with strong acceleration. Super-rare at an incredible price.
                  </p>
                  <Button className="w-full" variant="outline">View Guide</Button>
                </CardContent>
              </Card>
              </Link>

              {/* Bot #8233 */}
              <Link to="/guides/wildbot-shopping-guide" className="block">
                <Card className="border-2 border-primary/20 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 bg-card/50 backdrop-blur overflow-hidden group pt-0 cursor-pointer h-full">
                <div className="aspect-square bg-muted/20 relative overflow-hidden">
                  <img 
                    src="https://bzsui-sqaaa-aaaah-qce2a-cai.raw.icp0.io/?tokenid=cwnxk-eqkor-uwiaa-aaaaa-b4arg-qaqca-aaeau-q&type=thumbnail"
                    alt="Bot #8233"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-4 right-4">
                    <Badge variant="secondary" className="font-bold">ACCELERATION</Badge>
                  </div>
                </div>
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-2xl">Bot #8233</CardTitle>
                    <span className="text-2xl font-bold text-primary">99 ICP</span>
                  </div>
                  <CardDescription className="text-base">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Rating:</span>
                        <span className="text-foreground">38/100</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-sm">
                        <span>SPD: 35</span>
                        <span>PWR: 40</span>
                        <span className="text-primary font-semibold">ACC: 43</span>
                        <span>STB: 32</span>
                      </div>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    Acceleration specialist! 43 acceleration benefits from Blackhole's +16 bonus. Great for technical courses.
                  </p>
                  <Button className="w-full" variant="outline">View Guide</Button>
                </CardContent>
              </Card>
              </Link>

              {/* Bot #3033 */}
              <Link to="/guides/wildbot-shopping-guide" className="block">
                <Card className="border-2 border-primary/20 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 bg-card/50 backdrop-blur overflow-hidden group pt-0 cursor-pointer h-full">
                <div className="aspect-square bg-muted/20 relative overflow-hidden">
                  <img 
                    src="https://bzsui-sqaaa-aaaah-qce2a-cai.raw.icp0.io/?tokenid=3zlhu-zykor-uwiaa-aaaaa-b4arg-qaqca-aabpm-q&type=thumbnail"
                    alt="Bot #3033"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold">PREMIUM</Badge>
                  </div>
                </div>
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-2xl">Bot #3033</CardTitle>
                    <span className="text-2xl font-bold text-primary">555 ICP</span>
                  </div>
                  <CardDescription className="text-base">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Rating:</span>
                        <span className="text-foreground">44/100</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-sm">
                        <span className="text-primary font-semibold">SPD: 44</span>
                        <span className="text-primary font-semibold">PWR: 45</span>
                        <span className="text-primary font-semibold">ACC: 43</span>
                        <span className="text-primary font-semibold">STB: 43</span>
                      </div>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    Exceptional balanced stats across the board! Premium super-rare with 44+ in all categories.
                  </p>
                  <Button className="w-full" variant="outline">View Guide</Button>
                </CardContent>
              </Card>
              </Link>
            </div>
            <div className="text-center mt-12">
              <Link to="/guides/wildbot-shopping-guide">
                <Button size="lg" variant="outline" className="text-base px-8 border-2">
                  View All Blackhole Bots →
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Documentation Preview */}
      {docs.length > 0 && (
        <section className="border-t">
          <div className="container mx-auto px-4 py-24 sm:py-32">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-wrap items-center justify-between gap-6 mb-16">
                <div>
                  <h2 className="text-5xl font-bold mb-3">Docs</h2>
                  <p className="text-xl text-muted-foreground">System guides and racing mechanics explained</p>
                </div>
                <Link to="/docs">
                  <Button variant="outline" size="lg" className="text-base px-6 border-2">
                    View All Docs →
                  </Button>
                </Link>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                {docs.map((doc) => (
                  <Link key={doc.slug} to={`/docs/${doc.slug}`}>
                    <Card className="border-2 border-primary/20 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 bg-card/50 backdrop-blur h-full group">
                      <CardHeader className="space-y-3">
                        <CardTitle className="text-2xl group-hover:text-primary transition-colors">
                          {doc.metadata.title || doc.slug}
                        </CardTitle>
                        {doc.metadata.description && (
                          <CardDescription className="text-base leading-relaxed">
                            {doc.metadata.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Featured Dead Bots */}
      <section className="border-t">
        <div className="container mx-auto px-4 py-24 sm:py-32">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-5xl font-bold mb-5">Featured Dead Bots</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Undead resilience champions with +10 Stability, +9 Power Core, +7 Speed/Acceleration. Super-rare tier with 382 total bots.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {/* Bot #4247 - Highest Rated Dead */}
              <Link to="/guides/wildbot-shopping-guide" className="block">
                <Card className="border-2 border-primary/20 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 bg-card/50 backdrop-blur overflow-hidden group pt-0 cursor-pointer h-full">
                <div className="aspect-square bg-muted/20 relative overflow-hidden">
                  <img 
                    src="https://bzsui-sqaaa-aaaah-qce2a-cai.raw.icp0.io/?tokenid=4ycn2-2qkor-uwiaa-aaaaa-b4arg-qaqca-aaccl-q&type=thumbnail"
                    alt="Bot #4247"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-primary text-primary-foreground font-bold">BEST VALUE</Badge>
                  </div>
                </div>
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-2xl">Bot #4247</CardTitle>
                    <span className="text-2xl font-bold text-primary">65 ICP</span>
                  </div>
                  <CardDescription className="text-base">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Rating:</span>
                        <span className="text-foreground font-bold">41/100 🏆</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-sm">
                        <span>SPD: 37</span>
                        <span className="text-primary font-semibold">PWR: 42</span>
                        <span className="text-primary font-semibold">ACC: 43</span>
                        <span className="text-primary font-semibold">STB: 42</span>
                      </div>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    Highest-rated Dead bot! Strong balanced stats with excellent stability. Super-rare value!
                  </p>
                  <Button className="w-full" variant="outline">View Guide</Button>
                </CardContent>
              </Card>
              </Link>

              {/* Bot #6433 - Stability Specialist */}
              <Link to="/guides/wildbot-shopping-guide" className="block">
                <Card className="border-2 border-primary/20 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 bg-card/50 backdrop-blur overflow-hidden group pt-0 cursor-pointer h-full">
                <div className="aspect-square bg-muted/20 relative overflow-hidden">
                  <img 
                    src="https://bzsui-sqaaa-aaaah-qce2a-cai.raw.icp0.io/?tokenid=cxchb-gqkor-uwiaa-aaaaa-b4arg-qaqca-aadeq-q&type=thumbnail"
                    alt="Bot #6433"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-4 right-4">
                    <Badge variant="secondary" className="font-bold">STABILITY</Badge>
                  </div>
                </div>
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-2xl">Bot #6433</CardTitle>
                    <span className="text-2xl font-bold text-primary">150 ICP</span>
                  </div>
                  <CardDescription className="text-base">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Rating:</span>
                        <span className="text-foreground">37/100</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-sm">
                        <span>SPD: 29</span>
                        <span>PWR: 41</span>
                        <span>ACC: 34</span>
                        <span className="text-primary font-semibold">STB: 42</span>
                      </div>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    Strong stability! Dead faction undead resilience perfect for rough terrain endurance.
                  </p>
                  <Button className="w-full" variant="outline">View Guide</Button>
                </CardContent>
              </Card>
              </Link>

              {/* Bot #2439 - Budget Dead */}
              <Link to="/guides/wildbot-shopping-guide" className="block">
                <Card className="border-2 border-primary/20 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 bg-card/50 backdrop-blur overflow-hidden group pt-0 cursor-pointer h-full">
                <div className="aspect-square bg-muted/20 relative overflow-hidden">
                  <img 
                    src="https://bzsui-sqaaa-aaaah-qce2a-cai.raw.icp0.io/?tokenid=mczwi-fqkor-uwiaa-aaaaa-b4arg-qaqca-aabgd-q&type=thumbnail"
                    alt="Bot #2439"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-4 right-4">
                    <Badge variant="secondary" className="font-bold">SPEED</Badge>
                  </div>
                </div>
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-2xl">Bot #2439</CardTitle>
                    <span className="text-2xl font-bold text-primary">100 ICP</span>
                  </div>
                  <CardDescription className="text-base">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Rating:</span>
                        <span className="text-foreground">36/100</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-sm">
                        <span className="text-primary font-semibold">SPD: 36</span>
                        <span>PWR: 36</span>
                        <span>ACC: 37</span>
                        <span>STB: 36</span>
                      </div>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    Well-balanced Dead bot with even stats across the board. Affordable entry into the super-rare Dead faction!
                  </p>
                  <Button className="w-full" variant="outline">View Guide</Button>
                </CardContent>
              </Card>
              </Link>
            </div>
            <div className="text-center mt-12">
              <Link to="/guides/wildbot-shopping-guide">
                <Button size="lg" variant="outline" className="text-base px-8 border-2">
                  Read Full Guide →
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t bg-gradient-to-br from-primary/5 via-background to-accent/10">
        <div className="container mx-auto px-4 py-32 sm:py-40">
          <div className="max-w-5xl mx-auto space-y-16">
            <div className="text-center space-y-6">
              <h2 className="text-5xl sm:text-6xl font-bold">Ready to Get Started?</h2>
              <p className="text-2xl text-muted-foreground/90 font-light leading-relaxed max-w-3xl mx-auto">
                Connect your AI agent to PokedBots Racing and start managing your garage.
              </p>
            </div>

            {/* Getting Started Steps */}
            <div className="space-y-6">
              <Card className="border-2 border-primary/20 bg-card/50 backdrop-blur">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                      1
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-2xl mb-2">Connect to MCP Server</CardTitle>
                      <CardDescription className="text-base">
                        Connect using your preferred MCP client (Claude Desktop, VSCode, Cursor) with the server URL below.
                      </CardDescription>
                      <div className="mt-4 flex items-center gap-2">
                        <div className="flex-1 p-3 bg-muted rounded-lg text-sm font-mono break-all">
                          https://ilyol-uqaaa-aaaai-q34kq-cai.icp0.io/mcp
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText('https://ilyol-uqaaa-aaaai-q34kq-cai.icp0.io/mcp');
                          }}
                          className="shrink-0"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Card className="border-2 border-primary/20 bg-card/50 backdrop-blur">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                      2
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-2xl mb-2">Set Up Prometheus Wallet</CardTitle>
                      <CardDescription className="text-base space-y-3">
                        <p>
                          Visit Prometheus Protocol to create your AI agent wallet. This creates a secure IC wallet controlled by your AI agent.
                        </p>
                        <p>
                          Find your wallet address by clicking your avatar in the Prometheus app bar. Your AI agent can check balances and make transactions on your behalf.
                        </p>
                      </CardDescription>
                      <div className="mt-4">
                        <a href="https://prometheusprotocol.org/app/io.github.jneums.final-score" target="_blank" rel="noopener noreferrer">
                          <Button className="gap-2">
                            Open Prometheus Protocol
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </Button>
                        </a>
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Card className="border-2 border-primary/20 bg-card/50 backdrop-blur">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                      3
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-2xl mb-2">Add ICP to Your Wallet</CardTitle>
                      <CardDescription className="text-base space-y-3">
                        <p>
                          Get ICP on any IC DEX, or bridge from other chains using{' '}
                          <a href="https://onesec.to" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                            onesec.to
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>{' '}
                          and send to your Prometheus wallet address.
                        </p>
                        <p>
                          In Prometheus Protocol, you'll need to approve PokedBots Racing to spend ICP on your behalf for bot purchases and race entries.
                        </p>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Card className="border-2 border-primary/20 bg-card/50 backdrop-blur">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                      4
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-2xl mb-2">Browse & Purchase Bots</CardTitle>
                      <CardDescription className="text-base space-y-3">
                        <p>
                          Ask your AI agent to browse available PokedBots for sale. It can filter by faction, rating, stats, and price to find the perfect bot for your garage.
                        </p>
                        <p>
                          Once you find a bot you like, have your agent purchase it. The bot will be transferred directly to your garage subaccount.
                        </p>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Card className="border-2 border-primary/20 bg-card/50 backdrop-blur">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                      5
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-2xl mb-2">Start Racing! 🏎️</CardTitle>
                      <CardDescription className="text-base">
                        Initialize your bot for racing, then enter upcoming races. Your AI can analyze race requirements, manage bot condition, and optimize your racing strategy.
                      </CardDescription>
                      <div className="mt-4 flex flex-row flex-wrap gap-3 sm:gap-4">
                        <Link to="/schedule">
                          <Button size="lg" className="gap-2">
                            View Race Schedule
                          </Button>
                        </Link>
                        <Link to="/leaderboard">
                          <Button size="lg" variant="outline" className="gap-2">
                            See Leaderboard
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
