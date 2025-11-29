import { Link } from "react-router-dom";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAllDocs } from "@/lib/markdown";

export default function GuidesPage() {
  const guides = getAllDocs('guides');

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="mb-16">
            <h1 className="text-6xl font-bold mb-6 bg-gradient-to-br from-white via-white to-white/60 bg-clip-text text-transparent">
              Guides
            </h1>
            <p className="text-2xl text-muted-foreground/90 font-light leading-relaxed max-w-3xl">
              Step-by-step guides, tutorials, and showcases for PokedBots Racing
            </p>
          </div>

          <div className="grid gap-6">
            {guides.map((guide) => (
              <Link key={guide.slug} to={`/guides/${guide.slug}`}>
                <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 group">
                  <CardHeader className="space-y-3">
                    <CardTitle className="text-3xl group-hover:text-primary transition-colors">
                      {guide.metadata.title || guide.slug}
                    </CardTitle>
                    {guide.metadata.description && (
                      <CardDescription className="text-lg leading-relaxed">
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
    </div>
  );
}
