import { Link } from "react-router-dom";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNewsArticles } from "@/hooks/useNews";
import { Calendar, User, Loader2 } from "lucide-react";

export default function NewsPage() {
  const { data: articles, isLoading, error } = useNewsArticles();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-5xl mx-auto flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-5xl mx-auto">
            <Card className="border-2 border-destructive/50">
              <CardHeader>
                <CardTitle>Error Loading News</CardTitle>
                <CardDescription>
                  {error instanceof Error ? error.message : 'Failed to load news articles'}
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="mb-16">
            <h1 className="text-6xl font-bold mb-6 bg-gradient-to-br from-white via-white to-white/60 bg-clip-text text-transparent">
              News
            </h1>
            <p className="text-2xl text-muted-foreground/90 font-light leading-relaxed max-w-3xl">
              Latest updates, announcements, and stories from PokedBots Racing
            </p>
          </div>

          <div className="grid gap-6">
            {!articles || articles.length === 0 ? (
              <Card className="border-2">
                <CardHeader>
                  <CardTitle>No articles yet</CardTitle>
                  <CardDescription>
                    Check back soon for updates and announcements
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : (
              articles.map((article) => (
                <Link key={article.slug} to={`/news/${article.slug}`}>
                  <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 group">
                    <CardHeader className="space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <CardTitle className="text-3xl group-hover:text-primary transition-colors">
                          {article.metadata.title}
                        </CardTitle>
                        {article.metadata.date && (
                          <Badge variant="secondary" className="shrink-0">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(article.metadata.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </Badge>
                        )}
                      </div>
                      
                      {article.metadata.description && (
                        <CardDescription className="text-lg leading-relaxed">
                          {article.metadata.description}
                        </CardDescription>
                      )}
                      
                      {article.metadata.author && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
                          <User className="h-4 w-4" />
                          <span>{article.metadata.author}</span>
                        </div>
                      )}
                    </CardHeader>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
