// src/components/admin/ProgramContentEditor.tsx
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Trash2, 
  Save, 
  Edit3, 
  X,
  Dumbbell,
  Clock,
  Weight
} from "lucide-react";

interface ClientDay {
  id: string;
  day_order: number;
  title: string;
  note?: string | null;
  items: ClientItem[];
}

interface ClientItem {
  id: string;
  exercise_name: string;
  sets: number;
  reps: string;
  seconds?: number | null;
  weight_kg?: number | null;
  rest_seconds?: number | null;
  coach_notes?: string | null;
  video_url?: string | null;
  order_in_day: number;
  is_unilateral?: boolean;
  reps_per_side?: number | null;
  total_reps?: number | null;
  alternatives?: ExerciseAlternative[];
}

interface ExerciseAlternative {
  id: string;
  primary_exercise_id: string;
  alternative_name: string;
  alternative_description?: string | null;
  alternative_video_url?: string | null;
  difficulty_level?: string | null;
  equipment_required?: string[] | null;
  muscle_groups?: string[] | null;
}

interface ProgramContentEditorProps {
  programId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function ProgramContentEditor({
  programId,
  isOpen,
  onOpenChange,
  onSuccess
}: ProgramContentEditorProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [days, setDays] = useState<ClientDay[]>([]);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [alternativesByItem, setAlternativesByItem] = useState<Record<string, ExerciseAlternative[]>>({});
  const [newExercise, setNewExercise] = useState({
    exercise_name: "",
    sets: 3,
    reps: "10",
    weight_kg: null as number | null,
    rest_seconds: 60,
    coach_notes: "",
    video_url: "",
    is_unilateral: false,
    reps_per_side: null as number | null,
    total_reps: null as number | null
  });
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);

  // Process exercise input for unilateral exercises
  const processExerciseInput = (input: typeof newExercise) => {
    const { reps, is_unilateral, weight_kg } = input;
    
    let reps_per_side: number | null = null;
    let total_reps: number;
    let display_reps: string;
    
    if (is_unilateral) {
      // For unilateral exercises, extract the number from "8 mõlemal poolel" or just "8"
      const repsNumber = parseInt(reps.replace(/[^\d]/g, ''));
      reps_per_side = repsNumber;
      total_reps = repsNumber * 2;
      display_reps = `${repsNumber} mõlemal poolel`;
    } else {
      // For bilateral exercises, use the number as-is
      const repsNumber = parseInt(reps.replace(/[^\d]/g, ''));
      total_reps = repsNumber;
      display_reps = repsNumber.toString();
    }
    
    const is_bodyweight = weight_kg === 0 || weight_kg === null;
    
    return {
      ...input,
      reps: display_reps,
      reps_per_side,
      total_reps,
      is_bodyweight
    };
  };

  useEffect(() => {
    if (isOpen && programId) {
      loadProgramContent();
    }
  }, [isOpen, programId]);

  const loadProgramContent = async () => {
    setLoading(true);
    try {
      // Load program days
      const { data: daysData, error: daysError } = await supabase
        .from("client_days")
        .select(`
          id,
          day_order,
          title,
          note
        `)
        .eq("client_program_id", programId)
        .order("day_order", { ascending: true });

      if (daysError) throw daysError;

      // Load items for each day
      const daysWithItems: ClientDay[] = [];
      for (const day of daysData || []) {
        const { data: itemsData, error: itemsError } = await supabase
          .from("client_items")
          .select(`
            id,
            exercise_name,
            sets,
            reps,
            seconds,
            weight_kg,
            rest_seconds,
            coach_notes,
            video_url,
            order_in_day,
            is_unilateral,
            reps_per_side,
            total_reps
          `)
          .eq("client_day_id", day.id)
          .order("order_in_day", { ascending: true });

        if (itemsError) throw itemsError;

        daysWithItems.push({
          ...day,
          items: itemsData || []
        });
      }

      setDays(daysWithItems);

      // Load alternatives for all items
      const allItemIds = daysWithItems.flatMap(day => day.items.map(item => item.id));
      if (allItemIds.length > 0) {
        const { data: alternativesData, error: alternativesError } = await supabase
          .from("exercise_alternatives")
          .select("*")
          .in("primary_exercise_id", allItemIds)
          .order("created_at", { ascending: true });
        
        if (!alternativesError && alternativesData) {
          const altMap: Record<string, ExerciseAlternative[]> = {};
          alternativesData.forEach((alt) => {
            (altMap[alt.primary_exercise_id] = altMap[alt.primary_exercise_id] || []).push(alt);
          });
          setAlternativesByItem(altMap);
        }
      }
    } catch (error: any) {
      console.error("Error loading program content:", error);
      toast({
        title: "Viga",
        description: error.message || "Programmi sisu laadimisel tekkis viga",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddExercise = async (dayId: string) => {
    if (!newExercise.exercise_name.trim()) {
      toast({
        title: "Viga",
        description: "Palun sisesta harjutuse nimi",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Process the exercise input for unilateral exercises
      const processedExercise = processExerciseInput(newExercise);
      
      const { data: itemId, error } = await supabase.rpc("add_exercise_to_program_day", {
        p_program_id: programId,
        p_day_id: dayId,
        p_exercise_name: processedExercise.exercise_name.trim(),
        p_sets: processedExercise.sets,
        p_reps: processedExercise.reps,
        p_weight_kg: processedExercise.weight_kg,
        p_rest_seconds: processedExercise.rest_seconds,
        p_coach_notes: processedExercise.coach_notes || null,
        p_video_url: processedExercise.video_url || null,
        p_is_unilateral: processedExercise.is_unilateral,
        p_reps_per_side: processedExercise.reps_per_side,
        p_total_reps: processedExercise.total_reps
      });

      if (error) throw error;

      toast({
        title: "Harjutus lisatud",
        description: `${newExercise.exercise_name} on lisatud programmi`,
      });

      // Reset form
      setNewExercise({
        exercise_name: "",
        sets: 3,
        reps: "10",
        weight_kg: null,
        rest_seconds: 60,
        coach_notes: "",
        video_url: "",
        is_unilateral: false,
        reps_per_side: null,
        total_reps: null
      });
      setSelectedDayId(null);

      // Reload content
      await loadProgramContent();
    } catch (error: any) {
      console.error("Error adding exercise:", error);
      toast({
        title: "Viga",
        description: error.message || "Harjutuse lisamisel tekkis viga",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveExercise = async (itemId: string) => {
    if (!confirm("Kas oled kindel, et soovid selle harjutuse kustutada?")) {
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.rpc("remove_exercise_from_program_day", {
        p_program_id: programId,
        p_item_id: itemId
      });

      if (error) throw error;

      toast({
        title: "Harjutus kustutatud",
        description: "Harjutus on programmist eemaldatud",
      });

      // Reload content
      await loadProgramContent();
    } catch (error: any) {
      console.error("Error removing exercise:", error);
      toast({
        title: "Viga",
        description: error.message || "Harjutuse kustutamisel tekkis viga",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateExercise = async (itemId: string, updates: Partial<ClientItem>) => {
    setSaving(true);
    try {
      const { error } = await supabase.rpc("update_client_program_content", {
        p_program_id: programId,
        p_day_id: "", // Not needed for updates
        p_exercise_name: updates.exercise_name || "",
        p_sets: updates.sets || 0,
        p_reps: updates.reps || "",
        p_weight_kg: updates.weight_kg,
        p_rest_seconds: updates.rest_seconds,
        p_coach_notes: updates.coach_notes,
        p_video_url: updates.video_url
      });

      if (error) throw error;

      toast({
        title: "Harjutus uuendatud",
        description: "Muudatused on salvestatud",
      });

      setEditingItem(null);
      await loadProgramContent();
    } catch (error: any) {
      console.error("Error updating exercise:", error);
      toast({
        title: "Viga",
        description: error.message || "Harjutuse uuendamisel tekkis viga",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Alternatives management functions
  const addAlternative = async (itemId: string, alternative: Partial<ExerciseAlternative>) => {
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("exercise_alternatives")
        .insert({
          primary_exercise_id: itemId,
          alternative_name: alternative.alternative_name || "",
          alternative_description: alternative.alternative_description || null,
          alternative_video_url: alternative.alternative_video_url || null,
          difficulty_level: alternative.difficulty_level || null,
          equipment_required: alternative.equipment_required || null,
          muscle_groups: alternative.muscle_groups || null,
        })
        .select("*")
        .single();

      if (error) throw error;

      setAlternativesByItem((prev) => ({
        ...prev,
        [itemId]: [...(prev[itemId] || []), data],
      }));

      toast({
        title: "Alternatiiv lisatud",
        description: "Alternatiivne harjutus on lisatud",
      });
    } catch (error: any) {
      console.error("Error adding alternative:", error);
      toast({
        title: "Viga",
        description: error.message || "Alternatiivi lisamisel tekkis viga",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateAlternative = async (altId: string, updates: Partial<ExerciseAlternative>) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("exercise_alternatives")
        .update({
          alternative_name: updates.alternative_name,
          alternative_description: updates.alternative_description,
          alternative_video_url: updates.alternative_video_url,
          difficulty_level: updates.difficulty_level,
          equipment_required: updates.equipment_required,
          muscle_groups: updates.muscle_groups,
        })
        .eq("id", altId);

      if (error) throw error;

      // Update local state
      setAlternativesByItem((prev) => {
        const newMap = { ...prev };
        Object.keys(newMap).forEach((itemId) => {
          newMap[itemId] = newMap[itemId].map((alt) =>
            alt.id === altId ? { ...alt, ...updates } : alt
          );
        });
        return newMap;
      });

      toast({
        title: "Alternatiiv uuendatud",
        description: "Muudatused on salvestatud",
      });
    } catch (error: any) {
      console.error("Error updating alternative:", error);
      toast({
        title: "Viga",
        description: error.message || "Alternatiivi uuendamisel tekkis viga",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteAlternative = async (altId: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("exercise_alternatives")
        .delete()
        .eq("id", altId);

      if (error) throw error;

      // Update local state
      setAlternativesByItem((prev) => {
        const newMap = { ...prev };
        Object.keys(newMap).forEach((itemId) => {
          newMap[itemId] = newMap[itemId].filter((alt) => alt.id !== altId);
        });
        return newMap;
      });

      toast({
        title: "Alternatiiv kustutatud",
        description: "Alternatiivne harjutus on kustutatud",
      });
    } catch (error: any) {
      console.error("Error deleting alternative:", error);
      toast({
        title: "Viga",
        description: error.message || "Alternatiivi kustutamisel tekkis viga",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Laen programmi sisu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Programmi sisu redigeerimine</h3>
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-4 w-4 mr-2" />
          Sulge
        </Button>
      </div>

      {days.map((day) => (
        <Card key={day.id} className="border-l-4 border-l-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge variant="secondary">Päev {day.day_order}</Badge>
              {day.title}
            </CardTitle>
            {day.note && (
              <p className="text-sm text-muted-foreground">{day.note}</p>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Existing exercises */}
              {day.items.map((item) => (
                <div key={item.id} className="border rounded-lg p-4 bg-muted/50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium flex items-center gap-2">
                        <Dumbbell className="h-4 w-4" />
                        {item.exercise_name}
                        {item.is_unilateral && (
                          <Badge variant="secondary" className="text-xs">Ühepoolne</Badge>
                        )}
                        {(item.weight_kg === 0 || item.weight_kg === null) && (
                          <Badge variant="outline" className="text-xs">Ilma lisaraskuseta</Badge>
                        )}
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-sm">
                        <div className="flex items-center gap-1">
                          <Weight className="h-3 w-3" />
                          {item.sets} x {item.reps}
                        </div>
                        <div className="flex items-center gap-1">
                          <Weight className="h-3 w-3" />
                          {item.weight_kg === 0 || item.weight_kg === null ? "ilma lisaraskuseta" : `${item.weight_kg}kg`}
                        </div>
                        {item.rest_seconds && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {item.rest_seconds}s
                          </div>
                        )}
                        {item.video_url && (
                          <div>
                            <a 
                              href={item.video_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              Video
                            </a>
                          </div>
                        )}
                      </div>
                      {item.is_unilateral && item.total_reps && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Kokku: {item.total_reps} kordusi
                        </div>
                      )}
                      {item.coach_notes && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {item.coach_notes}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingItem(item.id)}
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRemoveExercise(item.id)}
                        disabled={saving}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Alternatives Section */}
                  <div className="mt-4 border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="text-sm font-medium text-muted-foreground">Alternatiivsed harjutused</h5>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const newAlt = {
                            alternative_name: "",
                            alternative_description: "",
                            alternative_video_url: "",
                            difficulty_level: "",
                            equipment_required: null,
                            muscle_groups: null,
                          };
                          addAlternative(item.id, newAlt);
                        }}
                        disabled={saving}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Lisa alternatiiv
                      </Button>
                    </div>
                    
                    {alternativesByItem[item.id] && alternativesByItem[item.id].length > 0 ? (
                      <div className="space-y-2">
                        {alternativesByItem[item.id].map((alt) => (
                          <div key={alt.id} className="rounded-lg border bg-background p-3">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                              <div>
                                <Label className="text-xs text-muted-foreground">Nimi</Label>
                                <Input
                                  size="sm"
                                  value={alt.alternative_name || ""}
                                  onChange={(e) =>
                                    updateAlternative(alt.id, { alternative_name: e.target.value })
                                  }
                                  placeholder="Alternatiivne harjutus"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Kirjeldus</Label>
                                <Input
                                  size="sm"
                                  value={alt.alternative_description || ""}
                                  onChange={(e) =>
                                    updateAlternative(alt.id, { alternative_description: e.target.value })
                                  }
                                  placeholder="Lühike kirjeldus"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Video URL</Label>
                                <Input
                                  size="sm"
                                  value={alt.alternative_video_url || ""}
                                  onChange={(e) =>
                                    updateAlternative(alt.id, { alternative_video_url: e.target.value })
                                  }
                                  placeholder="https://..."
                                />
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center gap-2">
                                <Label className="text-xs text-muted-foreground">Raskus:</Label>
                                <select
                                  className="text-xs border rounded px-2 py-1"
                                  value={alt.difficulty_level || ""}
                                  onChange={(e) =>
                                    updateAlternative(alt.id, { difficulty_level: e.target.value })
                                  }
                                >
                                  <option value="">Vali raskus</option>
                                  <option value="beginner">Algaja</option>
                                  <option value="intermediate">Keskmine</option>
                                  <option value="advanced">Edasijõudnud</option>
                                </select>
                              </div>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteAlternative(alt.id)}
                                disabled={saving}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground italic">Pole alternatiivseid harjutusi</div>
                    )}
                  </div>
                </div>
              ))}

              {/* Add new exercise form */}
              {selectedDayId === day.id ? (
                <Card className="border-dashed">
                  <CardContent className="pt-4">
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="exercise_name">Harjutuse nimi</Label>
                          <Input
                            id="exercise_name"
                            value={newExercise.exercise_name}
                            onChange={(e) => setNewExercise(prev => ({ ...prev, exercise_name: e.target.value }))}
                            placeholder="Näiteks: Kükid"
                          />
                        </div>
                        
                        {/* Unilateral Toggle */}
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="is_unilateral"
                            checked={newExercise.is_unilateral}
                            onCheckedChange={(checked) => 
                              setNewExercise(prev => ({ ...prev, is_unilateral: checked as boolean }))
                            }
                          />
                          <Label htmlFor="is_unilateral">Ühepoolne harjutus</Label>
                        </div>
                        
                        <div>
                          <Label htmlFor="sets">Seeriat</Label>
                          <Input
                            id="sets"
                            type="number"
                            value={newExercise.sets}
                            onChange={(e) => setNewExercise(prev => ({ ...prev, sets: parseInt(e.target.value) || 0 }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="reps">
                            Kordusi {newExercise.is_unilateral ? "(mõlemal poolel)" : ""}
                          </Label>
                          <Input
                            id="reps"
                            value={newExercise.reps}
                            onChange={(e) => setNewExercise(prev => ({ ...prev, reps: e.target.value }))}
                            placeholder={newExercise.is_unilateral ? "8" : "10 või 8-12"}
                          />
                          {newExercise.is_unilateral && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Sisesta ainult number (nt. 8), süsteem näitab "8 mõlemal poolel"
                            </p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="weight_kg">Kaal (kg)</Label>
                          <Input
                            id="weight_kg"
                            type="number"
                            value={newExercise.weight_kg || ""}
                            onChange={(e) => setNewExercise(prev => ({ ...prev, weight_kg: e.target.value ? parseFloat(e.target.value) : null }))}
                            placeholder="Valikuline"
                          />
                        </div>
                        <div>
                          <Label htmlFor="rest_seconds">Puhkeaeg (sek)</Label>
                          <Input
                            id="rest_seconds"
                            type="number"
                            value={newExercise.rest_seconds}
                            onChange={(e) => setNewExercise(prev => ({ ...prev, rest_seconds: parseInt(e.target.value) || 0 }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="video_url">Video URL</Label>
                          <Input
                            id="video_url"
                            value={newExercise.video_url}
                            onChange={(e) => setNewExercise(prev => ({ ...prev, video_url: e.target.value }))}
                            placeholder="Valikuline"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="coach_notes">Treeneri märkused</Label>
                        <Textarea
                          id="coach_notes"
                          value={newExercise.coach_notes}
                          onChange={(e) => setNewExercise(prev => ({ ...prev, coach_notes: e.target.value }))}
                          placeholder="Valikuline"
                          rows={2}
                        />
                      </div>
                      
                      {/* Preview Section */}
                      {newExercise.exercise_name && (
                        <div className="p-4 border rounded-lg bg-muted/50">
                          <h4 className="font-medium mb-2">Eelvaade:</h4>
                          <div className="space-y-1">
                            <p><strong>Harjutus:</strong> {newExercise.exercise_name}</p>
                            <p><strong>Seeriat:</strong> {newExercise.sets}</p>
                            <p><strong>Kordusi:</strong> {newExercise.is_unilateral ? `${newExercise.reps} mõlemal poolel` : newExercise.reps}</p>
                            <p><strong>Kaal:</strong> {newExercise.weight_kg === 0 || newExercise.weight_kg === null ? "ilma lisaraskuseta" : `${newExercise.weight_kg}kg`}</p>
                            {newExercise.is_unilateral && (
                              <p><strong>Kokku kordusi:</strong> {parseInt(newExercise.reps) * 2}</p>
                            )}
                            {newExercise.is_unilateral && (
                              <Badge variant="secondary" className="text-xs">Ühepoolne</Badge>
                            )}
                            {(newExercise.weight_kg === 0 || newExercise.weight_kg === null) && (
                              <Badge variant="outline" className="text-xs ml-2">Ilma lisaraskuseta</Badge>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleAddExercise(day.id)}
                          disabled={saving}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Lisa harjutus
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setSelectedDayId(null)}
                        >
                          Tühista
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Button
                  variant="outline"
                  className="w-full border-dashed"
                  onClick={() => setSelectedDayId(day.id)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Lisa harjutus
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {days.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Dumbbell className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Programmil pole veel päevi.</p>
        </div>
      )}
    </div>
  );
}