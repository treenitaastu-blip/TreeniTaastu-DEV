import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { exerciseSchema, validateAndSanitize } from "@/lib/validations";

interface ExerciseFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  editingExercise?: {
    id: string;
    title: string;
    description: string;
    category: string;
    duration: string;
    difficulty: string;
    video_url?: string | null;
  } | null;
}

const exerciseCategories = [
  { id: "Jalad", name: "Jalad" },
  { id: "Rind", name: "Rind" },
  { id: "Selg", name: "Selg" }, 
  { id: "Õlad", name: "Õlad" },
  { id: "Käed", name: "Käed" },
  { id: "Kõht", name: "Kõht" },
  { id: "Kardio", name: "Kardio" },
  { id: "Tasakaal", name: "Tasakaal" },
];

const difficultyLevels = [
  "Algaja",
  "Keskmine", 
  "Edasijõudnud"
];

export const ExerciseForm: React.FC<ExerciseFormProps> = ({ onSuccess, onCancel, editingExercise }) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: editingExercise?.title || "",
    description: editingExercise?.description || "",
    category: editingExercise?.category || "",
    duration: editingExercise?.duration || "",
    difficulty: editingExercise?.difficulty || "",
    video_url: editingExercise?.video_url || ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input using Zod schema
    const validation = validateAndSanitize(exerciseSchema, formData);
    
    if (!validation.success) {
      toast({
        title: "Valideerimise viga",
        description: validation.errors?.join(", ") || "Palun kontrolli sisestatud andmeid",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      if (editingExercise) {
        // Update existing exercise
        const { error } = await supabase
          .from("exercises")
          .update(validation.data!)
          .eq("id", editingExercise.id);

        if (error) throw error;

        toast({
          title: "Õnnestus",
          description: "Harjutus on edukalt uuendatud"
        });
      } else {
        // Create new exercise
        const exerciseData = {
          title: formData.title,
          description: formData.description,
          category: formData.category,
          duration: formData.duration,
          difficulty: formData.difficulty,
          video_url: formData.video_url || null
        };
        
        const { error } = await supabase
          .from("exercises")
          .insert(exerciseData);

        if (error) throw error;

        toast({
          title: "Õnnestus",
          description: "Harjutus on edukalt lisatud"
        });
      }
      
      onSuccess();
    } catch (error) {
      console.error("Error saving exercise:", error);
      toast({
        title: "Viga",
        description: editingExercise ? "Harjutuse uuendamine ebaõnnestus" : "Harjutuse lisamine ebaõnnestus",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{editingExercise ? "Muuda harjutust" : "Lisa uus harjutus"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Harjutuse nimi *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="Sisesta harjutuse nimi..."
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Kirjeldus *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Lühike kirjeldus harjutusest..."
              required
            />
          </div>

          <div>
            <Label htmlFor="category">Piirkond *</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Vali piirkond..." />
              </SelectTrigger>
              <SelectContent>
                {exerciseCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="duration">Kestus *</Label>
            <Input
              id="duration"
              value={formData.duration}
              onChange={(e) => setFormData({...formData, duration: e.target.value})}
              placeholder="nt. 3 min"
              required
            />
          </div>

          <div>
            <Label htmlFor="difficulty">Raskusaste *</Label>
            <Select value={formData.difficulty} onValueChange={(value) => setFormData({...formData, difficulty: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Vali raskusaste..." />
              </SelectTrigger>
              <SelectContent>
                {difficultyLevels.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="video_url">YouTube video link</Label>
            <Input
              id="video_url"
              value={formData.video_url}
              onChange={(e) => setFormData({...formData, video_url: e.target.value})}
              placeholder="https://youtube.com/watch?v=..."
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Tühista
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (editingExercise ? "Uuendamine..." : "Lisamine...") : (editingExercise ? "Uuenda harjutust" : "Lisa harjutus")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};