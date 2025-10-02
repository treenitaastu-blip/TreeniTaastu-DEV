import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Save, 
  ArrowLeft, 
  Eye
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CATEGORIES = [
  "Toitumine",
  "Liikumine", 
  "Magamine",
  "Stress",
  "Tööergonoomika",
  "Kaelavalu",
  "Seljavalu",
  "Lihasmassi vähenemine"
] as const;

const FORMATS = [
  "TLDR",
  "Steps", 
  "MythFact"
] as const;

const EVIDENCE_LEVELS = [
  "kõrge",
  "keskmine",
  "madal"
] as const;

interface ArticleFormData {
  slug: string;
  title: string;
  summary: string;
  content: string;
  excerpt: string;
  category: string;
  format: string;
  read_time_minutes: number;
  evidence_strength: string;
  tags: string[];
  featured_image_url: string;
  author: string;
  meta_description: string;
  published: boolean;
}

export default function ArticleForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [formData, setFormData] = useState<ArticleFormData>({
    slug: "",
    title: "",
    summary: "",
    content: "",
    excerpt: "",
    category: "",
    format: "",
    read_time_minutes: 3,
    evidence_strength: "kõrge",
    tags: [],
    featured_image_url: "",
    author: "Admin",
    meta_description: "",
    published: false
  });

  useEffect(() => {
    if (isEditing && id) {
      loadArticle(id);
    }
  }, [id, isEditing]);

  const loadArticle = async (articleId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("id", articleId)
        .single();

      if (error) throw error;
      if (!data) throw new Error("Artikkel ei leitud");

      setFormData({
        slug: data.slug || "",
        title: data.title || "",
        summary: data.summary || "",
        content: data.content || "",
        excerpt: data.excerpt || "",
        category: data.category || "",
        format: data.format || "",
        read_time_minutes: data.read_time_minutes || 3,
        evidence_strength: data.evidence_strength || "kõrge",
        tags: Array.isArray(data.tags) ? data.tags : [],
        featured_image_url: data.featured_image_url || "",
        author: data.author || "Admin",
        meta_description: data.meta_description || "",
        published: data.published || false
      });
    } catch (error) {
      console.error("Error loading article:", error);
      toast.error("Viga artikli laadimisel");
      navigate("/admin/articles");
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[äöüõ]/g, (match) => {
        const map: Record<string, string> = { ä: "a", ö: "o", ü: "u", õ: "o" };
        return map[match] || match;
      })
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      slug: generateSlug(title)
    }));
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.summary || !formData.category || !formData.content) {
      toast.error("Täida kõik kohustuslikud väljad");
      return;
    }

    try {
      setSaving(true);

      const articleData = {
        slug: formData.slug,
        title: formData.title,
        summary: formData.summary,
        content: formData.content,
        excerpt: formData.excerpt || null,
        category: formData.category,
        format: formData.format,
        read_time_minutes: formData.read_time_minutes,
        evidence_strength: formData.evidence_strength,
        tags: formData.tags,
        featured_image_url: formData.featured_image_url || null,
        author: formData.author,
        meta_description: formData.meta_description || null,
        published: formData.published
      };

      if (isEditing && id) {
        const { error } = await supabase
          .from("articles")
          .update(articleData)
          .eq("id", id);

        if (error) throw error;
        toast.success("Artikkel uuendatud");
      } else {
        const { error } = await supabase
          .from("articles")
          .insert(articleData);

        if (error) throw error;
        toast.success("Artikkel loodud");
      }

      navigate("/admin/articles");
    } catch (error: unknown) {
      console.error("Error saving article:", error);
      if ((error as { code?: string })?.code === "23505") {
        toast.error("See slug on juba kasutusel. Muuda pealkirja.");
      } else {
        toast.error("Viga artikli salvestamisel");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <div className="text-center">Laen artiklit...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" className="mb-4" asChild>
            <Link to="/admin/articles">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Tagasi artiklite juurde
            </Link>
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                {isEditing ? "Muuda artiklit" : "Lisa uus artikkel"}
              </h1>
              <p className="text-muted-foreground">
                {isEditing ? "Redigeeri olemasolevat artiklit" : "Loo uus tervisetõed artikkel"}
              </p>
            </div>
            
            {isEditing && formData.published && (
              <Button variant="outline" asChild>
                <Link to={`/tervisetood/${formData.slug}`} target="_blank">
                  <Eye className="mr-2 h-4 w-4" />
                  Vaata avalikult
                </Link>
              </Button>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Põhiinfo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Pealkiri *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Artikli pealkiri"
                  required
                />
              </div>

              <div>
                <Label htmlFor="slug">URL slug (genereerub automaatselt)</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="artikli-url-slug"
                />
              </div>

              <div>
                <Label htmlFor="summary">Kokkuvõte *</Label>
                <Textarea
                  id="summary"
                  value={formData.summary}
                  onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                  placeholder="Lühike kokkuvõte artiklist"
                  required
                />
              </div>

              <div>
                <Label htmlFor="excerpt">Väljavõte (valikuline)</Label>
                <Textarea
                  id="excerpt"
                  value={formData.excerpt}
                  onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                  placeholder="Lühike väljavõte artiklist"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="category">Kategooria *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Vali kategooria" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="format">Formaat *</Label>
                  <Select
                    value={formData.format}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, format: value }))}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Vali formaat" />
                    </SelectTrigger>
                    <SelectContent>
                      {FORMATS.map((format) => (
                        <SelectItem key={format} value={format}>
                          {format}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="readTime">Lugemisaeg (minutit)</Label>
                  <Input
                    id="readTime"
                    type="number"
                    min="1"
                    value={formData.read_time_minutes}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      read_time_minutes: parseInt(e.target.value) || 1 
                    }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="evidenceStrength">Tõendite tugevus</Label>
                <Select
                  value={formData.evidence_strength}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, evidence_strength: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVIDENCE_LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="author">Autor</Label>
                <Input
                  id="author"
                  value={formData.author}
                  onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                  placeholder="Artikli autor"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="published"
                  checked={formData.published}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, published: checked }))}
                />
                <Label htmlFor="published">Avaldatud</Label>
              </div>
            </CardContent>
          </Card>

          {/* Content */}
          <Card>
            <CardHeader>
              <CardTitle>Artikli sisu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="content">Sisu *</Label>
                <RichTextEditor
                  value={formData.content}
                  onChange={(content) => setFormData(prev => ({ ...prev, content }))}
                  placeholder="Artikli põhisisu... Kasuta tööriistariba teksti vormindamiseks."
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle>Sildid</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="tagInput">Lisa silt</Label>
                <div className="flex gap-2">
                  <Input
                    id="tagInput"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Sisesta silt ja vajuta Enter"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                  />
                  <Button type="button" onClick={addTag} variant="outline">
                    Lisa
                  </Button>
                </div>
              </div>
              
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                      {tag} ×
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional Fields */}
          <Card>
            <CardHeader>
              <CardTitle>Lisaväljad</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="featuredImage">Esiplaanipilt URL</Label>
                <Input
                  id="featuredImage"
                  value={formData.featured_image_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, featured_image_url: e.target.value }))}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div>
                <Label htmlFor="metaDescription">Meta kirjeldus (SEO)</Label>
                <Textarea
                  id="metaDescription"
                  value={formData.meta_description}
                  onChange={(e) => setFormData(prev => ({ ...prev, meta_description: e.target.value }))}
                  placeholder="SEO meta kirjeldus (max 160 tähemärki)"
                  maxLength={160}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex gap-4">
            <Button type="submit" disabled={saving} className="flex-1">
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Salvestab..." : (isEditing ? "Uuenda artikkel" : "Loo artikkel")}
            </Button>
            
            <Button type="button" variant="outline" onClick={() => navigate("/admin/articles")}>
              Tühista
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}