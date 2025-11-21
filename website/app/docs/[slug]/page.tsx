import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getDocBySlug, getDocSlugs, getAllDocs } from "@/lib/markdown";
import { ChevronLeft, ChevronRight, List } from "lucide-react";

export async function generateStaticParams() {
  const slugs = getDocSlugs();
  return slugs.map((slug) => ({
    slug,
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = await getDocBySlug(slug);
  
  if (!doc) {
    return {
      title: "Not Found",
    };
  }

  return {
    title: `${doc.metadata.title || slug} | PokedBots Racing`,
    description: doc.metadata.description,
  };
}

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = await getDocBySlug(slug);

  if (!doc) {
    notFound();
  }

  // Get all docs to find next/previous
  const allDocs = getAllDocs('docs');
  const currentIndex = allDocs.findIndex(d => d.slug === slug);
  const prevDoc = currentIndex > 0 ? allDocs[currentIndex - 1] : null;
  const nextDoc = currentIndex < allDocs.length - 1 ? allDocs[currentIndex + 1] : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <Link href="/docs">
            <Button variant="ghost" size="lg" className="mb-10 -ml-4 text-base">
              <ChevronLeft className="mr-2 h-5 w-5" />
              Back to Documentation
            </Button>
          </Link>

          <article className="prose prose-invert prose-lg max-w-none">
            {doc.metadata.description && (
              <p className="text-xl text-muted-foreground mb-8">
                {doc.metadata.description}
              </p>
            )}
            <div className="markdown-content" dangerouslySetInnerHTML={{ __html: doc.content }} />
          </article>

          {/* Navigation Buttons */}
          <div className="mt-16 pt-8 border-t border-border">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex gap-4">
                {prevDoc && (
                  <Link href={`/docs/${prevDoc.slug}`}>
                    <Button variant="outline" size="lg" className="text-base">
                      <ChevronLeft className="mr-2 h-5 w-5" />
                      {prevDoc.metadata.title || prevDoc.slug}
                    </Button>
                  </Link>
                )}
              </div>
              
              <div className="flex gap-4">
                <Link href="/docs">
                  <Button variant="outline" size="lg" className="text-base">
                    <List className="mr-2 h-5 w-5" />
                    All Docs
                  </Button>
                </Link>
                
                {nextDoc && (
                  <Link href={`/docs/${nextDoc.slug}`}>
                    <Button variant="default" size="lg" className="text-base">
                      {nextDoc.metadata.title || nextDoc.slug}
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
