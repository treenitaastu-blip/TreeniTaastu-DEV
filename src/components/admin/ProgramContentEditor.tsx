// src/components/admin/ProgramContentEditor.tsx
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { processExerciseInput as processExerciseInputUtil, validateExercise } from "@/utils/exerciseUtils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
  const [editingExercise, setEditingExercise] = useState<Partial<ClientItem> | null>(null);
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

  // Use shared exercise processing utility
  const processExerciseInput = (input: typeof newExercise) => {
    const processed = processExerciseInputUtil({
      reps: input.reps,
      is_unilateral: input.is_unilateral,
      weight_kg: input.weight_kg
    });
    
    return {
      ...input,
      ...processed
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
    // Validate exercise using shared validation utility
    const errors = validateExercise({
      exercise_name: newExercise.exercise_name,
      sets: newExercise.sets,
      reps: newExercise.reps,
      weight_kg: newExercise.weight_kg,
      seconds: null // ProgramContentEditor doesn't have seconds in state yet
    });
    
    if (Object.keys(errors).length > 0) {
      const errorMessage = Object.values(errors).join(', ');
      toast({
        title: "Valideerimise viga",
        description: errorMessage,
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
      // Process unilateral exercise input if needed
      const processedUpdates = (updates.reps !== undefined || updates.is_unilateral !== undefined) 
        ? processExerciseInputUtil({
            reps: updates.reps || "",
            is_unilateral: updates.is_unilateral || false,
            weight_kg: updates.weight_kg
          })
        : {};
      
      const updateData: any = {};
      if (updates.exercise_name !== undefined) updateData.exercise_name = updates.exercise_name;
      if (updates.sets !== undefined) updateData.sets = updates.sets;
      if (updates.reps !== undefined) updateData.reps = processedUpdates.reps || updates.reps;
      if (updates.weight_kg !== undefined) updateData.weight_kg = updates.weight_kg;
      if (updates.seconds !== undefined) updateData.seconds = updates.seconds;
      if (updates.rest_seconds !== undefined) updateData.rest_seconds = updates.rest_seconds;
      if (updates.coach_notes !== undefined) updateData.coach_notes = updates.coach_notes || null;
      if (updates.video_url !== undefined) updateData.video_url = updates.video_url || null;
      if (updates.is_unilateral !== undefined) updateData.is_unilateral = updates.is_unilateral;
      if (processedUpdates.reps_per_side !== undefined) updateData.reps_per_side = processedUpdates.reps_per_side;
      if (processedUpdates.total_reps !== undefined) updateData.total_reps = processedUpdates.total_reps;

      const { error } = await supabase
        .from("client_items")
        .update(updateData)
        .eq("id", itemId);

      if (error) throw error;

      toast({
        title: "Harjutus uuendatud",
        description: "Muudatused on salvestatud",
      });

      setEditingItem(null);
      setEditingExercise(null);
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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Programmi sisu redigeerimine</DialogTitle>
          <DialogDescription>
            Redigeeri programmi harjutusi ja seadistusi
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Laen programmi sisu...</p>
            </div>
          </div>
        ) : (
        <div className="space-y-6">

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
                  {editingItem === item.id ? (
                    // Edit form
                    <Card className="border-dashed border-primary">
                      <CardContent className="pt-4">
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor={`edit_exercise_name_${item.id}`}>Harjutuse nimi</Label>
                              <Input
                                id={`edit_exercise_name_${item.id}`}
                                value={editingExercise?.exercise_name || item.exercise_name}
                                onChange={(e) => setEditingExercise(prev => ({ ...prev, exercise_name: e.target.value }))}
                                placeholder="Näiteks: Kükid"
                              />
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`edit_is_unilateral_${item.id}`}
                                checked={editingExercise?.is_unilateral ?? item.is_unilateral ?? false}
                                onCheckedChange={(checked) => 
                                  setEditingExercise(prev => ({ ...prev, is_unilateral: checked as boolean }))
                                }
                              />
                              <Label htmlFor={`edit_is_unilateral_${item.id}`}>Ühepoolne harjutus</Label>
                            </div>
                            
                            <div>
                              <Label htmlFor={`edit_sets_${item.id}`}>Seeriat</Label>
                              <Input
                                id={`edit_sets_${item.id}`}
                                type="number"
                                value={editingExercise?.sets !== undefined ? editingExercise.sets : item.sets}
                                onChange={(e) => setEditingExercise(prev => ({ ...prev, sets: parseInt(e.target.value) || 0 }))}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`edit_reps_${item.id}`}>
                                Kordusi {(editingExercise?.is_unilateral ?? item.is_unilateral) ? "(per side)" : ""}
                              </Label>
                              <Input
                                id={`edit_reps_${item.id}`}
                                value={editingExercise?.reps !== undefined ? editingExercise.reps : item.reps}
                                onChange={(e) => setEditingExercise(prev => ({ ...prev, reps: e.target.value }))}
                                placeholder={(editingExercise?.is_unilateral ?? item.is_unilateral) ? "8" : "10 või 8-12"}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`edit_weight_kg_${item.id}`}>Kaal (kg) / Aeg (sek)</Label>
                              <Input
                                id={`edit_weight_kg_${item.id}`}
                                type="number"
                                value={editingExercise?.weight_kg !== undefined ? editingExercise.weight_kg ?? "" : (item.weight_kg ?? "")}
                                onChange={(e) => setEditingExercise(prev => ({ ...prev, weight_kg: e.target.value ? parseFloat(e.target.value) : null }))}
                                placeholder="Kaal või jäta tühjaks (keharaskus)"
                              />
                            </div>
                            {(editingExercise?.seconds !== undefined || item.seconds) && (
                              <div>
                                <Label htmlFor={`edit_seconds_${item.id}`}>Aeg (sek)</Label>
                                <Input
                                  id={`edit_seconds_${item.id}`}
                                  type="number"
                                  value={editingExercise?.seconds !== undefined ? editingExercise.seconds ?? "" : (item.seconds ?? "")}
                                  onChange={(e) => setEditingExercise(prev => ({ ...prev, seconds: e.target.value ? parseInt(e.target.value) : null }))}
                                  placeholder="Ajaharjutuseks"
                                />
                              </div>
                            )}
                            <div>
                              <Label htmlFor={`edit_rest_seconds_${item.id}`}>Puhkeaeg (sek)</Label>
                              <Input
                                id={`edit_rest_seconds_${item.id}`}
                                type="number"
                                value={editingExercise?.rest_seconds !== undefined ? editingExercise.rest_seconds ?? 60 : (item.rest_seconds ?? 60)}
                                onChange={(e) => setEditingExercise(prev => ({ ...prev, rest_seconds: parseInt(e.target.value) || 0 }))}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`edit_video_url_${item.id}`}>Video URL</Label>
                              <Input
                                id={`edit_video_url_${item.id}`}
                                value={editingExercise?.video_url !== undefined ? editingExercise.video_url || "" : (item.video_url || "")}
                                onChange={(e) => setEditingExercise(prev => ({ ...prev, video_url: e.target.value }))}
                                placeholder="Valikuline"
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor={`edit_coach_notes_${item.id}`}>Treeneri märkused</Label>
                            <Textarea
                              id={`edit_coach_notes_${item.id}`}
                              value={editingExercise?.coach_notes !== undefined ? editingExercise.coach_notes || "" : (item.coach_notes || "")}
                              onChange={(e) => setEditingExercise(prev => ({ ...prev, coach_notes: e.target.value }))}
                              placeholder="Valikuline"
                              rows={2}
                            />
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              onClick={async () => {
                                if (editingExercise) {
                                  await handleUpdateExercise(item.id, editingExercise);
                                }
                              }}
                              disabled={saving}
                            >
                              <Save className="h-4 w-4 mr-2" />
                              Salvesta muudatused
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setEditingItem(null);
                                setEditingExercise(null);
                              }}
                            >
                              <X className="h-4 w-4 mr-2" />
                              Tühista
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    // Display view
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium flex items-center gap-2">
                          <Dumbbell className="h-4 w-4" />
                          {item.exercise_name}
                          {item.is_unilateral && (
                            <Badge variant="secondary" className="text-xs">Ühepoolne</Badge>
                          )}
                          {(item.weight_kg === 0 || item.weight_kg === null) && !item.seconds && (
                            <Badge variant="outline" className="text-xs">Ilma lisaraskuseta</Badge>
                          )}
                          {item.seconds && (
                            <Badge variant="secondary" className="text-xs">Ajaharjutus ({item.seconds}s)</Badge>
                          )}
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-sm">
                          <div className="flex items-center gap-1">
                            <Weight className="h-3 w-3" />
                            {item.sets} x {item.reps}
                          </div>
                          {item.seconds ? (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {item.seconds}s
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Weight className="h-3 w-3" />
                              {item.weight_kg === 0 || item.weight_kg === null ? "ilma lisaraskuseta" : `${item.weight_kg}kg`}
                            </div>
                          )}
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
                          onClick={() => {
                            setEditingItem(item.id);
                            setEditingExercise({
                              exercise_name: item.exercise_name,
                              sets: item.sets,
                              reps: item.reps,
                              weight_kg: item.weight_kg,
                              seconds: item.seconds,
                              rest_seconds: item.rest_seconds,
                              coach_notes: item.coach_notes || "",
                              video_url: item.video_url || "",
                              is_unilateral: item.is_unilateral || false
                            });
                          }}
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
                  )}
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
                            Kordusi {newExercise.is_unilateral ? "(per side)" : ""}
                          </Label>
                          <Input
                            id="reps"
                            value={newExercise.reps}
                            onChange={(e) => setNewExercise(prev => ({ ...prev, reps: e.target.value }))}
                            placeholder={newExercise.is_unilateral ? "8" : "10 või 8-12"}
                          />
                          {newExercise.is_unilateral && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Sisesta ainult number (nt. 8), süsteem näitab "8 per side"
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
                            <p><strong>Kordusi:</strong> {newExercise.is_unilateral ? `${newExercise.reps} per side` : newExercise.reps}</p>
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
        )}
      </DialogContent>
    </Dialog>
  );
}