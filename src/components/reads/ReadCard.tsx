import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Heart, User } from "lucide-react";
import { BlogPost } from "@/types/reads";
import { TagChip } from "./TagChip";

interface ReadCardProps {
  post: BlogPost;
  onSave?: (slug: string) => void;
  isSaved?: boolean;
}

export function ReadCard({ post, onSave, isSaved = false }: ReadCardProps) {
  const formatUpdatedAt = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('et-EE', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSave?.(post.slug);
  };

  return (
    <Card className="group hover:shadow-elegant transition-all duration-300 border border-border/50 shadow-soft bg-card/50 backdrop-blur-sm hover:bg-card/80 hover:border-border/80">
      <Link to={`/tervisetood/${post.slug}`} className="block">
        <CardHeader className="pb-3 sm:pb-4 p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <CardTitle className="text-base sm:text-lg font-bold group-hover:text-primary transition-colors leading-tight line-clamp-2">
                {post.title}
              </CardTitle>
              <CardDescription className="mt-2 sm:mt-3 text-muted-foreground leading-relaxed text-sm line-clamp-2">
                {post.summary}
              </CardDescription>
            </div>
          </div>
          
          {/* Tags - mobile optimized */}
          <div className="flex flex-wrap items-center gap-2 mt-3 sm:mt-4">
            <TagChip category={post.category} />
            <Badge variant="outline" className="text-xs font-medium">
              {post.format}
            </Badge>
            <Badge 
              variant={post.evidenceStrength === 'kõrge' ? 'default' : 'secondary'}
              className="text-xs font-medium"
            >
              {post.evidenceStrength}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0 px-4 sm:px-6 pb-4 sm:pb-6">
          {/* Author info - mobile friendly */}
          <div className="text-xs text-muted-foreground mb-3">
            <span className="font-medium">{post.author}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1 font-medium">
                <Clock className="w-3 h-3" />
                {post.readTimeMinutes} min lugemist
              </span>
              <span className="font-medium">
                {formatUpdatedAt(post.updatedAt)}
              </span>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-500 transition-colors touch-manipulation"
              onClick={handleSave}
              aria-label={isSaved ? "Eemalda salvestatud artiklitest" : "Salvesta artikkel"}
            >
              <Heart 
                className={`w-4 h-4 transition-colors ${isSaved ? 'fill-red-500 text-red-500' : 'text-muted-foreground hover:text-red-500'}`} 
              />
            </Button>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}