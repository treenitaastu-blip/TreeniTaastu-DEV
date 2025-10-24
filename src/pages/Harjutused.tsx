import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Clock, Target, Lock, Plus, Edit2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { VideoModal } from "@/components/workout/VideoModal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface VideoRoutine {
  id: string;
  title: string;
  description: string;
  duration: string;
  category: string;
  video_url?: string | null;
  is_active?: boolean;
  created_at?: string;
}

const defaultRoutines: VideoRoutine[] = [
  {
    id: "warmup-legs",
    title: "Jalapäeva soojendus",
    description: "5-10 minutit jalapäeva soojendamist kontoritöö jaoks",
    duration: "5-10 min",
    category: "Soojendus",
    video_url: null,
    is_active: false
  },
  {
    id: "warmup-upper",
    title: "Ülakeha soojendus", 
    description: "Õlgade, kaela ja selja soojendamine enne tööd",
    duration: "5-10 min",
    category: "Soojendus",
    video_url: null,
    is_active: false
  },
  {
    id: "hip-mobility",
    title: "Puusade liikuvus",
    description: "Puusade liigutavuse parandamine ja pingete leevendamine",
    duration: "5-10 min", 
    category: "Liikuvus",
    video_url: null,
    is_active: false
  },
  {
    id: "back-mobility",
    title: "Alaselja liikuvus",
    description: "Alaselja pingete leevendamine ja liigutavuse parandamine",
    duration: "5-10 min",
    category: "Liikuvus",
    video_url: null,
    is_active: false
  }
];

interface VideoRoutineFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  editingRoutine: VideoRoutine | null;
}

const VideoRoutineForm: React.FC<VideoRoutineFormProps> = ({ onSuccess, onCancel, editingRoutine }) => {
  const [formData, setFormData] = useState({
    title: editingRoutine?.title || "",
    description: editingRoutine?.description || "",
    duration: editingRoutine?.duration || "5-10 min",
    category: editingRoutine?.category || "Soojendus",
    video_url: editingRoutine?.video_url || "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const routineData = {
        ...formData,
        is_active: true,
        created_at: new Date().toISOString(),
      };

      if (editingRoutine) {
        // Update existing routine
        const { error } = await supabase
          .from("video_routines")
          .update(routineData)
          .eq("id", editingRoutine.id);

        if (error) throw error;

        toast({
          title: "Edukalt uuendatud",
          description: "Harjutusrutiin on uuendatud",
        });
      } else {
        // Create new routine
        const { error } = await supabase
          .from("video_routines")
          .insert([routineData]);

        if (error) throw error;

        toast({
          title: "Edukalt loodud",
          description: "Uus harjutusrutiin on loodud",
        });
      }

      onSuccess();
    } catch (error) {
      console.error("Error saving routine:", error);
      toast({
        title: "Viga",
        description: "Rutiini salvestamine ebaõnnestus",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {editingRoutine ? "Muuda harjutusrutiini" : "Lisa uus harjutusrutiin"}
        </h2>
        <p className="text-muted-foreground">
          Lisa uus lühike harjutusvideo rutiin, mida kasutajad saavad järgida.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="title">Pealkiri</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Nt: Jalapäeva soojendus"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Kestus</Label>
            <Input
              id="duration"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              placeholder="Nt: 5-10 min"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Kirjeldus</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Lühike kirjeldus harjutusrutiinist..."
            rows={3}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Kategooria</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => setFormData({ ...formData, category: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Vali kategooria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Soojendus">Soojendus</SelectItem>
              <SelectItem value="Liikuvus">Liikuvus</SelectItem>
              <SelectItem value="Venitamine">Venitamine</SelectItem>
              <SelectItem value="Tugevus">Tugevus</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="video_url">YouTube video link</Label>
          <Input
            id="video_url"
            value={formData.video_url}
            onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
            placeholder="https://www.youtube.com/watch?v=..."
            type="url"
          />
          <p className="text-sm text-muted-foreground">
            Sisesta YouTube video link. Video peab olema avalik.
          </p>
        </div>

        <div className="flex gap-4 pt-4">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? "Salvestamine..." : editingRoutine ? "Uuenda" : "Lisa"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Tühista
          </Button>
        </div>
      </form>
    </div>
  );
};

const Harjutused = () => {
  const [routines, setRoutines] = useState<VideoRoutine[]>(defaultRoutines);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<VideoRoutine | null>(null);
  const [videoModal, setVideoModal] = useState<{ src: string; title: string } | null>(null);
  const isAdmin = useIsAdmin();

  useEffect(() => {
    fetchRoutines();
  }, []);

  const fetchRoutines = async () => {
    try {
      const { data, error } = await supabase
        .from("video_routines")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Use database routines directly, fallback to default routines if database is empty
      const dbRoutines = data || [];
      if (dbRoutines.length > 0) {
        setRoutines(dbRoutines);
      } else {
        // Fallback to default routines if database is empty
        setRoutines(defaultRoutines);
      }
    } catch (error) {
      console.error("Error fetching routines:", error);
      // Fallback to default routines on error
      setRoutines(defaultRoutines);
      toast({
        title: "Viga",
        description: "Harjutusrutiinide laadimine ebaõnnestus",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVideoPlay = (routine: VideoRoutine) => {
    if (routine.video_url) {
      setVideoModal({ src: routine.video_url, title: routine.title });
    } else {
      toast({
        title: "Video pole saadaval",
        description: "Selle rutiini jaoks ei ole videot lisatud",
        variant: "destructive"
      });
    }
  };

  const handleEditRoutine = (routine: VideoRoutine) => {
    setEditingRoutine(routine);
    setShowAddForm(true);
  };

  const handleAddRoutine = () => {
    setEditingRoutine(null);
    setShowAddForm(true);
  };

  const handleFormSuccess = () => {
    setShowAddForm(false);
    setEditingRoutine(null);
    fetchRoutines();
  };

  const handleCancelForm = () => {
    setShowAddForm(false);
    setEditingRoutine(null);
  };

  const handleDeleteRoutine = async (routineId: string) => {
    try {
      const { error } = await supabase
        .from("video_routines")
        .delete()
        .eq("id", routineId);

      if (error) throw error;

      toast({
        title: "Edukalt kustatud",
        description: "Harjutusrutiin on kustatud",
      });

      fetchRoutines();
    } catch (error) {
      console.error("Error deleting routine:", error);
      toast({
        title: "Viga",
        description: "Rutiini kustutamine ebaõnnestus",
        variant: "destructive"
      });
    }
  };

  if (showAddForm) {
    return (
      <div className="container mx-auto px-4 py-8">
        <VideoRoutineForm
          onSuccess={handleFormSuccess}
          onCancel={handleCancelForm}
          editingRoutine={editingRoutine}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Lühikesed harjutusrutiinid
          </h1>
          <p className="text-muted-foreground">
            5-10 minutit pikkused videorutiinid, mida saad järgida häälega. Kontoritöö kahjustuste ennetamiseks ja leevendamiseks.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={handleAddRoutine} className="ml-4">
            <Plus className="w-4 h-4 mr-2" />
            Lisa rutiin
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="text-muted-foreground">Harjutusrutiinide laadimine...</div>
        </div>
      ) : (
        <>
          {/* Video Routines Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {routines.map((routine) => (
              <Card key={routine.id} className="group hover:shadow-medium transition-all duration-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-1 group-hover:text-primary transition-colors">
                        {routine.title}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {routine.description}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {!routine.video_url && (
                        <Badge variant="secondary" className="ml-2">
                          <Lock className="w-3 h-3 mr-1" />
                          Tulekul
                        </Badge>
                      )}
                      {isAdmin && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditRoutine(routine)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          {routine.created_at && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRoutine(routine.id)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Routine Details */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>{routine.duration}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-muted-foreground">
                        <Target className="w-4 h-4" />
                        <span>{routine.category}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="space-y-2">
                    <Button 
                      variant={routine.video_url ? "default" : "secondary"}
                      className="w-full"
                      onClick={() => handleVideoPlay(routine)}
                      disabled={!routine.video_url}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      {routine.video_url ? 'Vaata videot' : 'Tulekul'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* No routines */}
          {routines.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Play className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                Harjutusrutiine ei leitud
              </h3>
              <p className="text-muted-foreground">
                {isAdmin ? 'Lisa esimene harjutusrutiin.' : 'Harjutusrutiinid lisatakse varsti.'}
              </p>
            </div>
          )}
        </>
      )}

      {/* Coming Soon Notice - only show if no videos are available */}
      {routines.filter(r => r.video_url).length === 0 && (
        <div className="mt-12 text-center">
          <div className="bg-muted/50 rounded-lg p-6 max-w-2xl mx-auto">
            <h3 className="text-lg font-medium text-foreground mb-2">
              Videod tulevad varsti!
            </h3>
            <p className="text-muted-foreground">
              Töötame praegu lühikeste harjutusvideode kallal, mida saad järgida häälega. 
              Iga video on 5-10 minutit pikk ja keskendub kontoritöö kahjustuste ennetamisele.
            </p>
          </div>
        </div>
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