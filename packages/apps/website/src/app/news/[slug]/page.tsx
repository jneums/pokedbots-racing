import { useParams, Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNewsArticle } from "@/hooks/useNews";
import { ChevronLeft, Calendar, User, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function NewsArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: article, isLoading, error } = useNewsArticle(slug!);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12">
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
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-5xl mx-auto">
            <Link to="/news">
              <Button variant="ghost" size="lg" className="mb-10 -ml-4 text-base">
                <ChevronLeft className="mr-2 h-5 w-5" />
                Back to News
              </Button>
            </Link>
            <Card className="border-2 border-destructive/50">
              <CardHeader>
                <CardTitle>Error Loading Article</CardTitle>
                <CardDescription>
                  {error instanceof Error ? error.message : 'Failed to load article'}
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!article) {
    return <Navigate to="/news" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <Link to="/news">
            <Button variant="ghost" size="lg" className="mb-10 -ml-4 text-base">
              <ChevronLeft className="mr-2 h-5 w-5" />
              Back to News
            </Button>
          </Link>

          {/* Article Header */}
          <div className="mb-12 space-y-4">
            <h1 className="text-5xl font-bold">
              {article.metadata.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
              {article.metadata.date && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {new Date(article.metadata.date).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              )}
              
              {article.metadata.author && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{article.metadata.author}</span>
                </div>
              )}
            </div>

            {article.metadata.description && (
              <p className="text-xl text-muted-foreground leading-relaxed">
                {article.metadata.description}
              </p>
            )}
          </div>

          {/* Article Content */}
          <article className="prose prose-invert prose-lg max-w-none">
            <div className="markdown-content" dangerouslySetInnerHTML={{ __html: article.content }} />
          </article>

          {/* Back Button */}
          <div className="mt-16 pt-8 border-t border-border">
            <Link to="/news">
              <Button variant="outline" size="lg" className="text-base">
                <ChevronLeft className="mr-2 h-5 w-5" />
                Back to News
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
