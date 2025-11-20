import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getDocBySlug, getDocSlugs } from "@/lib/markdown";
import { ChevronLeft } from "lucide-react";

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
        </div>
      </div>
    </div>
  );
}
