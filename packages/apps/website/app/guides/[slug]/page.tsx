import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getDocBySlug, getDocSlugs, getAllDocs } from "@/lib/markdown";
import { ChevronLeft, ChevronRight, List } from "lucide-react";

export async function generateStaticParams() {
  const slugs = getDocSlugs('guides');
  return slugs.map((slug) => ({
    slug,
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = await getDocBySlug(slug, 'guides');
  
  if (!guide) {
    return {
      title: "Not Found",
    };
  }

  return {
    title: `${guide.metadata.title || slug} | PokedBots Racing`,
    description: guide.metadata.description,
  };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = await getDocBySlug(slug, 'guides');

  if (!guide) {
    notFound();
  }

  // Get all guides to find next/previous
  const allGuides = getAllDocs('guides');
  const currentIndex = allGuides.findIndex(g => g.slug === slug);
  const prevGuide = currentIndex > 0 ? allGuides[currentIndex - 1] : null;
  const nextGuide = currentIndex < allGuides.length - 1 ? allGuides[currentIndex + 1] : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <Link href="/guides">
            <Button variant="ghost" size="lg" className="mb-10 -ml-4 text-base">
              <ChevronLeft className="mr-2 h-5 w-5" />
              Back to Guides
            </Button>
          </Link>

          <article className="prose prose-invert prose-lg max-w-none">
            {guide.metadata.description && (
              <p className="text-xl text-muted-foreground mb-8">
                {guide.metadata.description}
              </p>
            )}
            <div className="markdown-content" dangerouslySetInnerHTML={{ __html: guide.content }} />
          </article>

          {/* Navigation Buttons */}
          <div className="mt-16 pt-8 border-t border-border">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex gap-4">
                {prevGuide && (
                  <Link href={`/guides/${prevGuide.slug}`}>
                    <Button variant="outline" size="lg" className="text-base">
                      <ChevronLeft className="mr-2 h-5 w-5" />
                      {prevGuide.metadata.title || prevGuide.slug}
                    </Button>
                  </Link>
                )}
              </div>
              
              <div className="flex gap-4">
                <Link href="/guides">
                  <Button variant="outline" size="lg" className="text-base">
                    <List className="mr-2 h-5 w-5" />
                    All Guides
                  </Button>
                </Link>
                
                {nextGuide && (
                  <Link href={`/guides/${nextGuide.slug}`}>
                    <Button variant="default" size="lg" className="text-base">
                      {nextGuide.metadata.title || nextGuide.slug}
                      <ChevronRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
