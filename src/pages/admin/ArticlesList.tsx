import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Plus, 
  Search, 
  Edit3, 
  Eye, 
  EyeOff, 
  Trash2,
  ArrowLeft
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Article {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  format: string;
  read_time_minutes: number;
  evidence_strength: string;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export default function ArticlesList() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const loadArticles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setArticles(data || []);
    } catch (error) {
      console.error("Error loading articles:", error);
      toast.error("Viga artiklite laadimisel");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArticles();
  }, []);

  const togglePublish = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("articles")
        .update({ published: !currentStatus })
        .eq("id", id);

      if (error) throw error;
      
      setArticles(prev => 
        prev.map(article => 
          article.id === id 
            ? { ...article, published: !currentStatus }
            : article
        )
      );
      
      toast.success(
        !currentStatus ? "Artikkel avaldatud" : "Artikkel peidetud"
      );
    } catch (error) {
      console.error("Error toggling publish status:", error);
      toast.error("Viga avaldamise staatuse muutmisel");
    }
  };

  const deleteArticle = async (id: string, title: string) => {
    if (!confirm(`Kas oled kindel, et soovid kustutada artikli "${title}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("articles")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      setArticles(prev => prev.filter(article => article.id !== id));
      toast.success("Artikkel kustutatud");
    } catch (error) {
      console.error("Error deleting article:", error);
      toast.error("Viga artikli kustutamisel");
    }
  };

  const filteredArticles = articles.filter(article =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="text-center">Laen artikleid...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" className="mb-4" asChild>
            <Link to="/admin">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Tagasi adminisse
            </Link>
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Artiklite haldus</h1>
              <p className="text-muted-foreground">
                Halda Tervisetõed artikleid - loo, muuda ja avalda
              </p>
            </div>
            <Button asChild>
              <Link to="/admin/articles/new">
                <Plus className="mr-2 h-4 w-4" />
                Lisa artikkel
              </Link>
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              id="article-search"
              name="article-search"
              placeholder="Otsi artikleid..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Articles Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredArticles.map((article) => (
            <Card key={article.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2 mb-2">
                      {article.title}
                    </CardTitle>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary">
                        {article.category}
                      </Badge>
                      <Badge variant="outline">
                        {article.format}
                      </Badge>
                      <Badge 
                        variant={article.published ? "default" : "destructive"}
                      >
                        {article.published ? "Avaldatud" : "Mustand"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                  {article.summary}
                </p>
                
                <div className="text-xs text-muted-foreground mb-4">
                  Lugemisaeg: {article.read_time_minutes} min • 
                  Uuendatud: {new Date(article.updated_at).toLocaleDateString("et-EE")}
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/admin/articles/${article.id}/edit`}>
                      <Edit3 className="w-3 h-3 mr-1" />
                      Muuda
                    </Link>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => togglePublish(article.id, article.published)}
                  >
                    {article.published ? (
                      <>
                        <EyeOff className="w-3 h-3 mr-1" />
                        Peida
                      </>
                    ) : (
                      <>
                        <Eye className="w-3 h-3 mr-1" />
                        Avalda
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => deleteArticle(article.id, article.title)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredArticles.length === 0 && (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground mb-4">
              {searchQuery ? "Otsinguga ei leitud artikleid" : "Ühtegi artiklit pole veel loodud"}
            </p>
            <Button asChild>
              <Link to="/admin/articles/new">
                <Plus className="mr-2 h-4 w-4" />
                Lisa esimene artikkel
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}