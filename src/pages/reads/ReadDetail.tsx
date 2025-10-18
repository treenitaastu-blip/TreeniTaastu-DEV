import { useState, useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Heart, ArrowLeft, User } from "lucide-react";
import { BlogPost, ReadCategory } from "@/types/reads";
import { TagChip } from "@/components/reads/TagChip";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DOMPurify from "dompurify";

export default function ReadDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const { toast } = useToast();

  // Load article from database
  useEffect(() => {
    if (!slug) return;
    
    const loadArticle = async () => {
      try {
        setError(false);
        const { data, error } = await supabase
          .from("articles")
          .select("*")
          .eq("slug", slug)
          .eq("published", true)
          .maybeSingle();

        if (error) {
          // Use secure logger instead of console.error
          const { error: logError } = await import("@/utils/secureLogger");
          logError("Database error loading article", { error: error.message, slug });
          setError(true);
          setLoading(false);
          return;
        }
        
        if (!data) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        // Transform database format to BlogPost format
        const transformedPost: BlogPost = {
          slug: data.slug,
          title: data.title,
          summary: data.summary,
          content: data.content || '',
          excerpt: data.excerpt || undefined,
          category: data.category as ReadCategory,
          format: data.format as BlogPost['format'],
          readTimeMinutes: data.read_time_minutes,
          evidenceStrength: data.evidence_strength as BlogPost['evidenceStrength'],
          tags: Array.isArray(data.tags) ? data.tags : [],
          featuredImageUrl: data.featured_image_url || undefined,
          author: data.author || 'Admin',
          updatedAt: data.updated_at,
        };

        setPost(transformedPost);

        // Check if article is saved
        try {
          const savedReads = JSON.parse(localStorage.getItem('savedReads') || '[]');
          setIsSaved(savedReads.includes(slug));
        } catch (error) {
          // Use secure logger instead of console.warn
          const { warn: logWarn } = await import("@/utils/secureLogger");
          logWarn('Could not load saved reads', { error: error instanceof Error ? error.message : 'Unknown error' });
        }
      } catch (error) {
        // Use secure logger instead of console.error
        const { error: logError } = await import("@/utils/secureLogger");
        logError('Error loading article', { error: error instanceof Error ? error.message : 'Unknown error', slug });
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadArticle();
  }, [slug]);

  const formatUpdatedAt = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('et-EE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderArticleContent = (content: string) => {
    // SECURITY: Sanitize content to prevent XSS attacks
    const sanitizedContent = DOMPurify.sanitize(content, {
      ALLOWED_TAGS: ['p', 'h1', 'h2', 'h3', 'strong', 'em', 'ul', 'ol', 'li', 'br', 'hr'],
      ALLOWED_ATTR: ['class']
    });
    
    // Enhanced markdown-like rendering for better visual presentation
    return sanitizedContent
      .replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold mb-6 mt-8 first:mt-0 text-foreground">$1</h1>')
      .replace(/^## (.*$)/gm, '<h2 class="text-2xl font-bold mb-4 mt-6 text-foreground">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 class="text-xl font-semibold mb-3 mt-5 text-foreground">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
      .replace(/^- (.*$)/gm, '<li class="ml-6 mb-2 list-disc text-foreground">$1</li>')
      .replace(/^\d+\. (.*$)/gm, '<li class="ml-6 mb-2 list-decimal text-foreground">$1</li>')
      .replace(/^---$/gm, '<hr class="my-8 border-border">')
      .replace(/\n\n/g, '</p><p class="mb-4 text-foreground leading-relaxed">')
      .replace(/^\s*(.+)$/gm, (match, p1) => {
        // Don't wrap if it's already HTML
        if (p1.includes('<')) return match;
        return `<p class="mb-4 text-foreground leading-relaxed">${p1}</p>`;
      });
  };

  const handleSave = () => {
    if (!slug) return;
    
    try {
      const savedReads = JSON.parse(localStorage.getItem('savedReads') || '[]');
      let updatedSaved;
      
      if (isSaved) {
        updatedSaved = savedReads.filter((s: string) => s !== slug);
        setIsSaved(false);
        toast({
          title: "Artikkel eemaldatud salvestatutest"
        });
      } else {
        updatedSaved = [...savedReads, slug];
        setIsSaved(true);
        toast({
          title: "Artikkel salvestatud"
        });
      }
      
      localStorage.setItem('savedReads', JSON.stringify(updatedSaved));
    } catch (error) {
      console.warn('Could not save to localStorage:', error);
      toast({
        title: "Viga salvestamisel",
        description: "Artikli salvestamine ebaõnnestus.",
        variant: "destructive"
      });
    }
  };

  if (error || notFound) {
    return <Navigate to="/tervisetood" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen p-6 md:p-10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">Laen artiklit...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return <Navigate to="/tervisetood" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/50 p-4 sm:p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Button variant="ghost" asChild className="mb-4 hover:bg-transparent p-0">
            <a href="/tervisetood" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
              Tervisetõed
            </a>
          </Button>
        </div>

        {/* Article Header */}
        <article className="bg-card/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 md:p-8 lg:p-10 shadow-elegant border border-border/50 space-y-6 md:space-y-8">
          <header className="space-y-4 md:space-y-6">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
              {post.title}
            </h1>
            
            <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed font-medium">
              {post.summary}
            </p>

            {/* Meta information - mobile optimized */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-6 text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span className="font-medium">{post.readTimeMinutes} min lugemist</span>
              </span>
              <span className="text-muted-foreground">
                Uuendatud <span className="font-medium">{formatUpdatedAt(post.updatedAt)}</span>
              </span>
              <span className="flex items-center gap-2 text-muted-foreground">
                <User className="w-4 h-4" />
                <span className="font-medium">{post.author}</span>
              </span>
            </div>

            {/* Tags and badges - mobile optimized */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <TagChip category={post.category} />
              <Badge variant="outline" className="font-medium text-xs sm:text-sm">
                {post.format}
              </Badge>
              <Badge 
                variant={post.evidenceStrength === 'kõrge' ? 'default' : 'secondary'}
                className="font-medium text-xs sm:text-sm"
              >
                {post.evidenceStrength} tõendusmaterjal
              </Badge>
            </div>

            {/* Tags */}
            {post.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {post.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs font-medium px-2 sm:px-3 py-1">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Save button */}
            <div className="flex justify-between items-center pt-4 sm:pt-6 border-t border-border/50">
              <Button
                variant="outline"
                onClick={handleSave}
                className="flex items-center gap-2 font-medium hover:shadow-medium transition-all text-sm sm:text-base"
              >
                <Heart className={`w-4 h-4 ${isSaved ? 'fill-red-500 text-red-500' : ''}`} />
                {isSaved ? 'Salvestatud' : 'Salvesta artikkel'}
              </Button>
            </div>
          </header>

          {/* Featured Image */}
          {post.featuredImageUrl && (
            <div className="my-6 md:my-8 -mx-4 sm:-mx-6 md:-mx-8 lg:-mx-10">
              <img 
                src={post.featuredImageUrl} 
                alt={post.title}
                className="w-full rounded-lg shadow-elegant border border-border/30"
              />
            </div>
          )}

          {/* Article Content - mobile optimized */}
          <div className="prose prose-sm sm:prose-base md:prose-lg max-w-none dark:prose-invert prose-headings:font-bold prose-headings:text-foreground prose-p:text-foreground prose-p:leading-relaxed prose-strong:text-foreground prose-li:text-foreground prose-hr:border-border prose-headings:leading-tight">
            <div 
              className="article-content"
              dangerouslySetInnerHTML={{ 
                __html: renderArticleContent(post.content)
              }}
            />
          </div>

          {/* Back to list */}
          <div className="pt-6 md:pt-8 border-t border-border/50">
            <Button variant="outline" asChild className="font-medium hover:shadow-medium transition-all text-sm sm:text-base">
              <a href="/tervisetood" className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Tagasi artiklite juurde</span>
                <span className="sm:hidden">Tagasi</span>
              </a>
            </Button>
          </div>
        </article>
      </div>
    </div>
  );
}