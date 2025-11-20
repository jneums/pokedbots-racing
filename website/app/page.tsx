import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { getAllDocs } from "@/lib/markdown";

export default function Home() {
  const docs = getAllDocs('docs');
  const guides = getAllDocs('guides');

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b bg-gradient-to-br from-primary/5 via-background to-accent/10">
        <div className="container mx-auto px-4 py-16 sm:py-24">
          <div className="max-w-4xl mx-auto text-center space-y-10">
            <div className="flex justify-center">
              <Image 
                src="/pokedbots-racing-logo.webp" 
                alt="PokedBots Racing" 
                width={600} 
                height={200}
                className="w-full max-w-lg h-auto"
                priority
              />
            </div>
            <p className="text-2xl sm:text-3xl text-muted-foreground/90 max-w-3xl mx-auto leading-relaxed font-light">
              Race your PokedBots in the wasteland. Upgrade with scrap parts, compete in events, and win ICP prizes.
            </p>
            <div className="flex gap-5 justify-center flex-wrap pt-6">
              <Link href="/guides">
                <Button size="lg" className="text-lg px-10 py-7 h-auto font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                  View Guides
                </Button>
              </Link>
              <Link href="https://github.com/jneums/pokedbots-racing" target="_blank">
                <Button size="lg" variant="outline" className="text-lg px-10 py-7 h-auto font-semibold border-2 hover:bg-accent/50">
                  View on GitHub
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
                Built on the Internet Computer with immersive wasteland mechanics
              </p>
            </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 bg-card/50 backdrop-blur">
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

            <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <span className="text-3xl">♻️</span>
                  Scrap System
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  Burn NFTs from other IC collections to craft upgrade parts for your PokedBots.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 bg-card/50 backdrop-blur">
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

            <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 bg-card/50 backdrop-blur">
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

            <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 bg-card/50 backdrop-blur">
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

            <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <span className="text-3xl">🛠️</span>
                  AI Integration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  Manage your racing garage through AI agents via the Model Context Protocol.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
        </div>
      </section>

      {/* Featured Master Bots */}
      <section className="border-t">
        <div className="container mx-auto px-4 py-24 sm:py-32">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-5xl font-bold mb-5">Featured Master Bots</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                The competitive elite with +12 Speed/Power and +8 Acceleration/Stability. Only 6.9% of all PokedBots are Master class.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {/* Bot #588 */}
              <Link href="/guides/elite-faction-showcase" className="block">
                <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 overflow-hidden group pt-0 cursor-pointer h-full">
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
                        <span className="text-foreground">79/100 👑</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-sm">
                        <span className="text-primary font-semibold">SPD: 82</span>
                        <span>PWR: 84</span>
                        <span>ACC: 76</span>
                        <span>STB: 77</span>
                      </div>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    Exceptional value! 79 rating with 82 speed and 84 power. The accessible elite for serious racers.
                  </p>
                  <Button className="w-full" variant="outline">View Guide</Button>
                </CardContent>
              </Card>
              </Link>

              {/* Bot #2471 */}
              <Link href="/guides/elite-faction-showcase" className="block">
                <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 overflow-hidden group pt-0 cursor-pointer h-full">
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
                        <span className="text-foreground">79/100 👑</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-sm">
                        <span className="text-primary font-semibold">SPD: 82</span>
                        <span>PWR: 84</span>
                        <span>ACC: 75</span>
                        <span>STB: 77</span>
                      </div>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    Second-fastest Master bot with excellent endurance. 82 speed + 84 power for sustained dominance.
                  </p>
                  <Button className="w-full" variant="outline">View Guide</Button>
                </CardContent>
              </Card>
              </Link>

              {/* Bot #8631 */}
              <Link href="/guides/elite-faction-showcase" className="block">
                <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 overflow-hidden group pt-0 cursor-pointer h-full">
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
                        <span className="text-foreground font-bold">83/100 👑</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-sm">
                        <span>SPD: 78</span>
                        <span className="text-primary font-semibold">PWR: 91</span>
                        <span>ACC: 81</span>
                        <span>STB: 85</span>
                      </div>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    The crown jewel! Highest rating on the entire marketplace with 91 power core. Ultimate prestige.
                  </p>
                  <Button className="w-full" variant="outline">View Guide</Button>
                </CardContent>
              </Card>
              </Link>
            </div>
            <div className="text-center mt-12">
              <Link href="/guides/elite-faction-showcase">
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
                <Link href="/guides">
                  <Button variant="outline" size="lg" className="text-base px-6 border-2">
                    View All Guides →
                  </Button>
                </Link>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                {guides.slice(0, 4).map((guide) => (
                  <Link key={guide.slug} href={`/guides/${guide.slug}`}>
                    <Card className="border-2 hover:border-primary/50 transition-all h-full hover:shadow-xl hover:shadow-primary/5 group">
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
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Featured GodClass Bots */}
      <section className="border-t bg-muted/20">
        <div className="container mx-auto px-4 py-24 sm:py-32">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-5xl font-bold mb-5">Featured GodClass Bots</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                The rarest faction with +15 to ALL stats. Only 2.7% of all PokedBots are GodClass.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {/* Bot #4343 */}
              <Link href="/guides/godclass-bots-for-sale" className="block">
                <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 overflow-hidden group pt-0 cursor-pointer h-full">
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
                        <span className="text-foreground">68/100</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-sm">
                        <span>SPD: 70</span>
                        <span>PWR: 71</span>
                        <span>ACC: 72</span>
                        <span>STB: 62</span>
                      </div>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    Incredible value! Only 44 ICP for a 68-rated GodClass. Balanced stats across speed/power/accel.
                  </p>
                  <Button className="w-full" variant="outline">View Guide</Button>
                </CardContent>
              </Card>
              </Link>

              {/* Bot #8233 */}
              <Link href="/guides/godclass-bots-for-sale" className="block">
                <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 overflow-hidden group pt-0 cursor-pointer h-full">
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
                        <span className="text-foreground">69/100</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-sm">
                        <span>SPD: 70</span>
                        <span>PWR: 66</span>
                        <span className="text-primary font-semibold">ACC: 76</span>
                        <span>STB: 65</span>
                      </div>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    Lightning-fast race starts with 76 acceleration! Perfect for competitive racing.
                  </p>
                  <Button className="w-full" variant="outline">View Guide</Button>
                </CardContent>
              </Card>
              </Link>

              {/* Bot #4113 */}
              <Link href="/guides/godclass-bots-for-sale" className="block">
                <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 overflow-hidden group pt-0 cursor-pointer h-full">
                <div className="aspect-square bg-muted/20 relative overflow-hidden">
                  <img 
                    src="https://bzsui-sqaaa-aaaah-qce2a-cai.raw.icp0.io/?tokenid=4lp7w-7ykor-uwiaa-aaaaa-b4arg-qaqca-aacai-q&type=thumbnail"
                    alt="Bot #4113"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-primary text-primary-foreground font-bold">CHAMPION</Badge>
                  </div>
                </div>
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-2xl">Bot #4113</CardTitle>
                    <span className="text-2xl font-bold text-primary">3,000 ICP</span>
                  </div>
                  <CardDescription className="text-base">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Rating:</span>
                        <span className="text-foreground font-bold">74/100 🏆</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-sm">
                        <span>SPD: 68</span>
                        <span className="text-primary font-semibold">PWR: 89</span>
                        <span>ACC: 67</span>
                        <span className="text-primary font-semibold">STB: 75</span>
                      </div>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    The absolute best GodClass on the market! 89 power + 75 stability = championship-caliber.
                  </p>
                  <Button className="w-full" variant="outline">View Guide</Button>
                </CardContent>
              </Card>
              </Link>
            </div>
            <div className="text-center mt-12">
              <Link href="/guides/godclass-bots-for-sale">
                <Button size="lg" variant="outline" className="text-base px-8 border-2">
                  Read Full Guide →
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
                  <p className="text-xl text-muted-foreground">Explore design docs and technical details</p>
                </div>
                <Link href="/docs">
                  <Button variant="outline" size="lg" className="text-base px-6 border-2">
                    View All Docs →
                  </Button>
                </Link>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                {docs.slice(0, 4).map((doc) => (
                  <Link key={doc.slug} href={`/docs/${doc.slug}`}>
                    <Card className="border-2 hover:border-primary/50 transition-all h-full hover:shadow-xl hover:shadow-primary/5 group">
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

      {/* Featured WildBot Bots */}
      <section className="border-t">
        <div className="container mx-auto px-4 py-24 sm:py-32">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-5xl font-bold mb-5">Featured WildBot Bots</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Stability masters with +9 Stability. Perfect for rough terrain racing.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {/* Bot #1417 */}
              <Link href="/guides/wildbot-shopping-guide" className="block">
                <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 overflow-hidden group pt-0 cursor-pointer h-full">
                <div className="aspect-square bg-muted/20 relative overflow-hidden">
                  <img 
                    src="https://bzsui-sqaaa-aaaah-qce2a-cai.raw.icp0.io/?tokenid=fo7am-hikor-uwiaa-aaaaa-b4arg-qaqca-aaawe-q&type=thumbnail"
                    alt="Bot #1417"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-primary text-primary-foreground font-bold">BEST VALUE</Badge>
                  </div>
                </div>
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-2xl">Bot #1417</CardTitle>
                    <span className="text-2xl font-bold text-primary">30 ICP</span>
                  </div>
                  <CardDescription className="text-base">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Rating:</span>
                        <span className="text-foreground">63/100</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-sm">
                        <span>SPD: 64</span>
                        <span>PWR: 62</span>
                        <span>ACC: 61</span>
                        <span className="text-primary font-semibold">STB: 65</span>
                      </div>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    Perfect balance of stats with solid speed and signature WildBot stability. Best mid-tier value!
                  </p>
                  <Button className="w-full" variant="outline">View Guide</Button>
                </CardContent>
              </Card>
              </Link>

              {/* Bot #4247 */}
              <Link href="/guides/wildbot-shopping-guide" className="block">
                <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 overflow-hidden group pt-0 cursor-pointer h-full">
                <div className="aspect-square bg-muted/20 relative overflow-hidden">
                  <img 
                    src="https://bzsui-sqaaa-aaaah-qce2a-cai.raw.icp0.io/?tokenid=4ycn2-2qkor-uwiaa-aaaaa-b4arg-qaqca-aaccl-q&type=thumbnail"
                    alt="Bot #4247"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-primary text-primary-foreground font-bold">ELITE</Badge>
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
                        <span className="text-foreground font-bold">69/100 🏆</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-sm">
                        <span>SPD: 65</span>
                        <span>PWR: 68</span>
                        <span className="text-primary font-semibold">ACC: 76</span>
                        <span>STB: 67</span>
                      </div>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    Highest-rated WildBot available! Exceptional 76 acceleration makes this championship-level.
                  </p>
                  <Button className="w-full" variant="outline">View Guide</Button>
                </CardContent>
              </Card>
              </Link>

              {/* Bot #3858 */}
              <Link href="/guides/wildbot-shopping-guide" className="block">
                <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 overflow-hidden group pt-0 cursor-pointer h-full">
                <div className="aspect-square bg-muted/20 relative overflow-hidden">
                  <img 
                    src="https://bzsui-sqaaa-aaaah-qce2a-cai.raw.icp0.io/?tokenid=w2gki-wykor-uwiaa-aaaaa-b4arg-qaqca-aab4j-a&type=thumbnail"
                    alt="Bot #3858"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-4 right-4">
                    <Badge variant="secondary" className="font-bold">SPEED</Badge>
                  </div>
                </div>
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-2xl">Bot #3858</CardTitle>
                    <span className="text-2xl font-bold text-primary">55 ICP</span>
                  </div>
                  <CardDescription className="text-base">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Rating:</span>
                        <span className="text-foreground">63/100</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-sm">
                        <span className="text-primary font-semibold">SPD: 66</span>
                        <span>PWR: 61</span>
                        <span>ACC: 63</span>
                        <span>STB: 64</span>
                      </div>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    Fastest WildBot in the mid-tier. Great for racers who want stability with speed-focused strategies.
                  </p>
                  <Button className="w-full" variant="outline">View Guide</Button>
                </CardContent>
              </Card>
              </Link>
            </div>
            <div className="text-center mt-12">
              <Link href="/guides/wildbot-shopping-guide">
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
          <div className="max-w-4xl mx-auto text-center space-y-10">
            <h2 className="text-5xl sm:text-6xl font-bold">Ready to Race?</h2>
            <p className="text-2xl sm:text-3xl text-muted-foreground/90 font-light leading-relaxed max-w-3xl mx-auto">
              Join the wasteland and start racing your PokedBots today.
            </p>
            <Link href="/docs">
              <Button size="lg" className="text-xl px-12 py-8 h-auto font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
