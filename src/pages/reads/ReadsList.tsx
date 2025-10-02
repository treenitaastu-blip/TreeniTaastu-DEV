// src/pages/reads/ReadsList.tsx
import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Clock, X } from "lucide-react";
import type { BlogPost, ReadCategory } from "@/types/reads";
import { ReadCard } from "@/components/reads/ReadCard";
import { TagChip } from "@/components/reads/TagChip";
import { saveScrollPosition, restoreScrollPosition } from "@/utils/scrollMemory";
import { supabase } from "@/integrations/supabase/client";

const CATEGORIES = [
  "Toitumine",
  "Liikumine",
  "Magamine",
  "Stress",
  "Tööergonoomika",
  "Kaelavalu",
  "Seljavalu",
  "Lihasmassi vähenemine",
] as const satisfies ReadCategory[];

const TIME_FILTERS = [
  { label: "1–2 min", min: 1, max: 2 },
  { label: "3–5 min", min: 3, max: 5 },
] as const;
type TimeFilter = (typeof TIME_FILTERS)[number];

export default function ReadsList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ReadCategory | null>(null);
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<TimeFilter | null>(null);
  const [savedReads, setSavedReads] = useState<string[]>([]);
  const [allPosts, setAllPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Load articles from database
  useEffect(() => {
    const loadArticles = async () => {
      try {
        setError(false);
        const { data, error } = await supabase
          .from("articles")
          .select("*")
          .eq("published", true)
          .order("updated_at", { ascending: false });

        if (error) {
          console.error("Supabase error:", error);
          throw error;
        }
        
        // Transform database format to BlogPost format
        const transformedPosts: BlogPost[] = (data || []).map((article) => {
          try {
            return {
              slug: article.slug || '',
              title: article.title || '',
              summary: article.summary || '',
              content: article.content || '',
              excerpt: article.excerpt || undefined,
              category: (article.category || 'Toitumine') as ReadCategory,
              format: (article.format || 'TLDR') as BlogPost['format'],
              readTimeMinutes: Number(article.read_time_minutes) || 1,
              evidenceStrength: (article.evidence_strength || 'madal') as BlogPost['evidenceStrength'],
              tags: Array.isArray(article.tags) ? article.tags : [],
              featuredImageUrl: article.featured_image_url || undefined,
              author: article.author || 'Admin',
              updatedAt: article.updated_at || new Date().toISOString(),
            };
          } catch (transformError) {
            console.error("Error transforming article:", article?.slug || 'unknown', transformError);
            return null;
          }
        }).filter(Boolean) as BlogPost[];
        
        setAllPosts(transformedPosts);
      } catch (error) {
        console.error("Error loading articles:", error);
        setError(true);
        setAllPosts([]);
      } finally {
        setLoading(false);
      }
    };

    loadArticles();
  }, []);

  // Materialize JSON as typed array once
  // const allPosts = readsData as ReadPost[];

  // Load saved articles from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("savedReads");
      if (saved) {
        const parsed = JSON.parse(saved) as unknown;
        if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string")) {
          setSavedReads(parsed);
        }
      }
    } catch (error) {

      console.warn("Could not load saved reads:", error);
    }
  }, []);

  // Restore scroll position on return
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedPosition = restoreScrollPosition();
      if (savedPosition > 0) {
        window.scrollTo({ top: savedPosition, behavior: "smooth" });
      }
    }, 100);
    return () => window.clearTimeout(timer);
  }, []);

  // Save scroll position (throttled)
  useEffect(() => {
    const handleScroll = () => {
      saveScrollPosition(window.scrollY);
    };
    const throttledScroll = throttle(handleScroll, 100);
    window.addEventListener("scroll", throttledScroll);
    return () => {
      window.removeEventListener("scroll", throttledScroll);
    };
  }, []);

  // Filtering
  const filteredPosts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allPosts.filter((post) => {
      if (q) {
        const inTitle = post.title.toLowerCase().includes(q);
        const inSummary = post.summary.toLowerCase().includes(q);
        if (!inTitle && !inSummary) return false;
      }
      if (selectedCategory && post.category !== selectedCategory) return false;
      if (selectedTimeFilter) {
        if (
          post.readTimeMinutes < selectedTimeFilter.min ||
          post.readTimeMinutes > selectedTimeFilter.max
        ) {
          return false;
        }
      }
      return true;
    });
  }, [allPosts, searchQuery, selectedCategory, selectedTimeFilter]);

  // Save/remove article
  const handleSave = (slug: string) => {
    const next = savedReads.includes(slug)
      ? savedReads.filter((s) => s !== slug)
      : [...savedReads, slug];
    setSavedReads(next);
    try {
      localStorage.setItem("savedReads", JSON.stringify(next));
    } catch (error) {

      console.warn("Could not save to localStorage:", error);
    }
  };

  // Clear filters
  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory(null);
    setSelectedTimeFilter(null);
  };

  const hasActiveFilters =
    searchQuery.trim().length > 0 || selectedCategory !== null || selectedTimeFilter !== null;

  if (loading) {
    return (
      <div className="min-h-screen p-6 md:p-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">Laen artikleid...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-6 md:p-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold mb-4">Viga artiklite laadimisel</h1>
            <p className="text-lg text-muted-foreground mb-4">
              Ei suutnud artikleid laadida. Palun proovige hiljem uuesti.
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Proovi uuesti
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Tervisetõed</h1>
          <p className="text-lg text-muted-foreground mb-6">
            Teaduspõhised ja lihtsas keeles selgitatud soovitused tervise parandamiseks.
          </p>
          <p className="text-lg text-muted-foreground">
            Teaduslikult tõestatud soovitused tervise parandamiseks
          </p>
        </header>

        {/* Filters */}
        <div className="space-y-4 mb-8">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Otsi artikleid pealkiri või sisu järgi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-sm font-medium mb-3">Kategooriad</h3>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((category) => (
                <TagChip
                  key={category}
                  category={category}
                  isActive={selectedCategory === category}
                  onClick={() =>
                    setSelectedCategory(selectedCategory === category ? null : category)
                  }
                />
              ))}
            </div>
          </div>

          {/* Read time */}
          <div>
            <h3 className="text-sm font-medium mb-3">Lugemise aeg</h3>
            <div className="flex gap-2">
              {TIME_FILTERS.map((filter) => (
                <Badge
                  key={filter.label}
                  variant={selectedTimeFilter === filter ? "default" : "secondary"}
                  className="cursor-pointer"
                  onClick={() =>
                    setSelectedTimeFilter(selectedTimeFilter === filter ? null : filter)
                  }
                >
                  <Clock className="w-3 h-3 mr-1" />
                  {filter.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Reset */}
          {hasActiveFilters && (
            <Button variant="outline" onClick={clearFilters} className="w-fit">
              <X className="w-4 h-4 mr-2" />
              Eemalda filtrid
            </Button>
          )}
        </div>

        {/* Results meta */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">
            Leitud {filteredPosts.length} artiklit {allPosts.length}-st
          </p>
        </div>

        {/* Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredPosts.length > 0 && filteredPosts.map((post) => {
            if (!post || !post.slug) return null;
            return (
              <ReadCard
                key={post.slug}
                post={post}
                onSave={handleSave}
                isSaved={savedReads.includes(post.slug)}
              />
            );
          })}
        </div>

        {/* Empty state */}
        {filteredPosts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground mb-4">
              Antud filtritega ei leitud ühtegi artiklit
            </p>
            <Button variant="outline" onClick={clearFilters}>
              Eemalda filtrid
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Throttle for scroll events (browser-safe timer types) */
function throttle<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let previous = 0;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (!previous) previous = now;
    const remaining = wait - (now - previous);

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      func(...args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        previous = Date.now();
        timeout = null;
        func(...args);
      }, remaining);
    }
  };
}
