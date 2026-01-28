"use client";

import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { getAllDocs } from "@/lib/markdown";

export default function GuidesPage() {
  const guides = getAllDocs('guides');
  const [searchQuery, setSearchQuery] = useState("");

  const filteredGuides = useMemo(() => {
    if (!searchQuery.trim()) return guides;
    
    const query = searchQuery.toLowerCase();
    return guides.filter((guide) => {
      const title = (guide.metadata.title || guide.slug).toLowerCase();
      const description = (guide.metadata.description || "").toLowerCase();
      const content = (guide.content || "").toLowerCase();
      
      return title.includes(query) || description.includes(query) || content.includes(query);
    });
  }, [guides, searchQuery]);

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

          {/* Search Bar */}
          <div className="mb-8">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search guides..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 h-12 text-lg bg-card border-2 focus:border-primary/50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="mt-2 text-sm text-muted-foreground">
                {filteredGuides.length} {filteredGuides.length === 1 ? 'guide' : 'guides'} found
              </p>
            )}
          </div>

          <div className="grid gap-6">
            {filteredGuides.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-xl text-muted-foreground">No guides found matching "{searchQuery}"</p>
                <button
                  onClick={() => setSearchQuery("")}
                  className="mt-4 text-primary hover:underline"
                >
                  Clear search
                </button>
              </div>
            ) : (
              filteredGuides.map((guide) => (
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
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
