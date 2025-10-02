import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Play, Clock, Target, Plus, Edit2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { ExerciseForm } from "@/components/admin/ExerciseForm";
import { VideoModal } from "@/components/workout/VideoModal";

const exerciseCategories = [
  { id: "all", name: "Kõik harjutused" },
  { id: "neck", name: "Kael" },
  { id: "shoulders", name: "Õlad" },
  { id: "back", name: "Selg" }, 
  { id: "hips", name: "Puusad" },
  { id: "breathing", name: "Hingamine" },
];

interface Exercise {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: string;
  difficulty: string;
  video_url?: string | null;
}

const Harjutused = () => {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [videoModal, setVideoModal] = useState<{ src: string; title: string } | null>(null);
  const isAdmin = useIsAdmin();

  useEffect(() => {
    fetchExercises();
  }, []);

  const fetchExercises = async () => {
    try {
      const { data, error } = await supabase
        .from("exercises")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      setExercises(data || []);
    } catch (error) {
      console.error("Error fetching exercises:", error);
      toast({
        title: "Viga",
        description: "Harjutuste laadimine ebaõnnestus",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingExercise(null);
    fetchExercises();
  };

  const handleEditExercise = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingExercise(null);
  };

  const handleVideoPlay = (exercise: Exercise) => {
    if (exercise.video_url) {
      setVideoModal({ src: exercise.video_url, title: exercise.title });
    } else {
      toast({
        title: "Video pole saadaval",
        description: "Selle harjutuse jaoks ei ole videot lisatud",
        variant: "destructive"
      });
    }
  };

  const filteredExercises = exercises.filter(exercise => {
    const matchesCategory = selectedCategory === "all" || exercise.category === selectedCategory;
    const matchesSearch = exercise.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         exercise.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Algaja": return "bg-success/20 text-success";
      case "Keskmine": return "bg-warning/20 text-warning";
      case "Edasijõudnud": return "bg-destructive/20 text-destructive";
      default: return "bg-muted/20 text-muted-foreground";
    }
  };

  if (showForm) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ExerciseForm
          onSuccess={handleFormSuccess}
          onCancel={handleCancelForm}
          editingExercise={editingExercise}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Harjutuste kogu
          </h1>
          <p className="text-muted-foreground">
            Leia endale sobivad harjutused kontoritöö kahjustuste ennetamiseks ja leevendamiseks.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowForm(true)} className="ml-4">
            <Plus className="w-4 h-4 mr-2" />
            Lisa harjutus
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="mb-8 space-y-4">
        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Otsi harjutusi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          {exerciseCategories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">
          Leitud {filteredExercises.length} harjutust
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="text-muted-foreground">Harjutuste laadimine...</div>
        </div>
      ) : (
        <>
          {/* Exercises Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExercises.map((exercise) => (
              <Card key={exercise.id} className="group hover:shadow-medium transition-all duration-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-1 group-hover:text-brand-primary transition-colors">
                        {exercise.title}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {exercise.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Exercise Details */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>{exercise.duration}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-muted-foreground">
                        <Target className="w-4 h-4" />
                        <span className="capitalize">
                          {exerciseCategories.find(c => c.id === exercise.category)?.name}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Difficulty Badge */}
                  <div className="flex items-center justify-between">
                    <Badge className={`text-xs ${getDifficultyColor(exercise.difficulty)}`}>
                      {exercise.difficulty}
                    </Badge>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <Button 
                      variant="hero" 
                      className="w-full group-hover:shadow-glow transition-all"
                      onClick={() => handleVideoPlay(exercise)}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Vaata videot
                    </Button>
                    
                    {isAdmin && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="w-full"
                        onClick={() => handleEditExercise(exercise)}
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Muuda
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* No results */}
          {filteredExercises.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                Harjutusi ei leitud
              </h3>
              <p className="text-muted-foreground">
                Proovi muuta otsingusõna või vali muu kategooria.
              </p>
            </div>
          )}
        </>
      )}

      {/* Video Modal */}
      {videoModal && (
        <VideoModal
          src={videoModal.src}
          title={videoModal.title}
          onClose={() => setVideoModal(null)}
        />
      )}
    </div>
  );
};

export default Harjutused;