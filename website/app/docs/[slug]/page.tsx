import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getDocBySlug, getDocSlugs } from "@/lib/markdown";
import { ChevronLeft } from "lucide-react";

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
        </div>
      </div>
    </div>
  );
}
