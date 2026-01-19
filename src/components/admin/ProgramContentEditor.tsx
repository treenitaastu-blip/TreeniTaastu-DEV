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
import { useConfirmationDialog, ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  Trash2, 
  Save, 
  Edit3, 
  X,
  Dumbbell,
  Clock,
  Weight,
  ChevronUp,
  ChevronDown
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
  const { showDialog, hideDialog, dialog } = useConfirmationDialog();
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
    seconds: null as number | null,
    rest_seconds: 60,
    coach_notes: "",
    video_url: "",
    is_unilateral: false,
    reps_per_side: null as number | null,
    total_reps: null as number | null
  });
  
  // Helper to determine exercise type from current values
  const getExerciseType = (item: { weight_kg?: number | null; seconds?: number | null }) => {
    if (item.seconds !== null && item.seconds !== undefined && item.seconds > 0) {
      return 'time';
    }
    if (item.weight_kg !== null && item.weight_kg !== undefined && item.weight_kg > 0) {
      return 'weight';
    }
    return 'bodyweight';
  };
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
      seconds: newExercise.seconds
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

      // Keep exercise name for quick re-add, reset the rest
      const savedName = newExercise.exercise_name;
      setNewExercise({
        exercise_name: savedName, // Keep name for quick re-add of similar exercises
        sets: 3,
        reps: "10",
        weight_kg: null,
        seconds: null,
        rest_seconds: 60,
        coach_notes: "",
        video_url: "",
        is_unilateral: false,
        reps_per_side: null,
        total_reps: null
      });
      // Don't reset selectedDayId - allow adding multiple exercises to same day quickly

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

  const handleRemoveExercise = (itemId: string) => {
    const exercise = days
      .flatMap(day => day.items)
      .find(item => item.id === itemId);
    
    showDialog({
      title: "Harjutuse kustutamine",
      description: `Kas oled kindel, et soovid harjutuse "${exercise?.exercise_name || 'valitud harjutus'}" programmist kustutada?`,
      onConfirm: () => performRemoveExercise(itemId),
      variant: "destructive",
      confirmText: "Kustuta",
      cancelText: "Tühista",
      icon: <Trash2 className="h-6 w-6" />
    });
  };

  const performRemoveExercise = async (itemId: string) => {
    setSaving(true);
    hideDialog();
    
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

  const handleMoveExercise = async (dayId: string, itemId: string, direction: "up" | "down") => {
    const day = days.find(d => d.id === dayId);
    if (!day) return;

    const items = [...(day.items || [])];
    const currentIndex = items.findIndex(item => item.id === itemId);
    
    if (currentIndex === -1) return;
    
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    
    if (targetIndex < 0 || targetIndex >= items.length) return;

    setSaving(true);
    try {
      // Swap order_in_day values
      const currentItem = items[currentIndex];
      const targetItem = items[targetIndex];
      
      const currentOrder = currentItem.order_in_day;
      const targetOrder = targetItem.order_in_day;

      // Update both items
      const { error: error1 } = await supabase
        .from("client_items")
        .update({ order_in_day: targetOrder })
        .eq("id", currentItem.id);

      if (error1) throw error1;

      const { error: error2 } = await supabase
        .from("client_items")
        .update({ order_in_day: currentOrder })
        .eq("id", targetItem.id);

      if (error2) throw error2;

      // Reload content to show new order
      await loadProgramContent();
      
      toast({
        title: "Harjutus liigutatud",
        description: `Harjutus liigutatud ${direction === "up" ? "üles" : "alla"}`,
      });
    } catch (error: any) {
      console.error("Error moving exercise:", error);
      toast({
        title: "Viga",
        description: error.message || "Harjutuse liigutamisel tekkis viga",
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
      let processedUpdates: { reps?: string; reps_per_side?: number | null; total_reps?: number | null } = {};
      
      if (updates.reps !== undefined || updates.is_unilateral !== undefined) {
        processedUpdates = processExerciseInputUtil({
          reps: updates.reps || "",
          is_unilateral: updates.is_unilateral || false,
          weight_kg: updates.weight_kg
        });
      }
      
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
                            {/* Exercise Type Selector */}
                            <div>
                              <Label htmlFor={`edit_exercise_type_${item.id}`}>Harjutuse tüüp</Label>
                              <Select
                                value={editingExercise ? (getExerciseType(editingExercise) || getExerciseType(item)) : getExerciseType(item)}
                                onValueChange={(value) => {
                                  if (value === 'time') {
                                    setEditingExercise(prev => ({
                                      ...prev,
                                      seconds: prev?.seconds ?? item.seconds ?? 60,
                                      weight_kg: null
                                    }));
                                  } else if (value === 'weight') {
                                    setEditingExercise(prev => ({
                                      ...prev,
                                      weight_kg: prev?.weight_kg ?? item.weight_kg ?? 0,
                                      seconds: null
                                    }));
                                  } else { // bodyweight
                                    setEditingExercise(prev => ({
                                      ...prev,
                                      weight_kg: null,
                                      seconds: null
                                    }));
                                  }
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="weight">
                                    <div className="flex items-center gap-2">
                                      <Weight className="h-4 w-4" />
                                      <span>Kaaluga</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="bodyweight">
                                    <div className="flex items-center gap-2">
                                      <Dumbbell className="h-4 w-4" />
                                      <span>Kehakaal</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="time">
                                    <div className="flex items-center gap-2">
                                      <Clock className="h-4 w-4" />
                                      <span>Aja järgi</span>
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            {/* Conditional fields based on exercise type */}
                            {(() => {
                              const currentType = editingExercise ? (getExerciseType(editingExercise) || getExerciseType(item)) : getExerciseType(item);
                              if (currentType === 'time') {
                                return (
                                  <div>
                                    <Label htmlFor={`edit_seconds_${item.id}`}>Aeg (sek)</Label>
                                    <Input
                                      id={`edit_seconds_${item.id}`}
                                      type="number"
                                      min="1"
                                      value={editingExercise?.seconds !== undefined ? editingExercise.seconds ?? "" : (item.seconds ?? 60)}
                                      onChange={(e) => setEditingExercise(prev => ({ ...prev, seconds: e.target.value ? parseInt(e.target.value) : null }))}
                                      placeholder="Näiteks: 60"
                                    />
                                  </div>
                                );
                              } else if (currentType === 'weight') {
                                return (
                                  <div>
                                    <Label htmlFor={`edit_weight_kg_${item.id}`}>Kaal (kg)</Label>
                                    <Input
                                      id={`edit_weight_kg_${item.id}`}
                                      type="number"
                                      min="0"
                                      step="0.5"
                                      value={editingExercise?.weight_kg !== undefined ? (editingExercise.weight_kg ?? "") : (item.weight_kg ?? "")}
                                      onChange={(e) => setEditingExercise(prev => ({ ...prev, weight_kg: e.target.value ? parseFloat(e.target.value) : null }))}
                                      placeholder="Näiteks: 20"
                                    />
                                  </div>
                                );
                              }
                              // bodyweight - no additional field needed (weight_kg will be null)
                              return null;
                            })()}
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
                              {saving ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                                  Salvestan...
                                </>
                              ) : (
                                <>
                                  <Save className="h-4 w-4 mr-2" />
                                  Salvesta muudatused
                                </>
                              )}
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
                          onClick={() => handleMoveExercise(day.id, item.id, "up")}
                          disabled={saving || day.items.findIndex(ex => ex.id === item.id) === 0}
                          title="Liiguta üles"
                        >
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMoveExercise(day.id, item.id, "down")}
                          disabled={saving || day.items.findIndex(ex => ex.id === item.id) === day.items.length - 1}
                          title="Liiguta alla"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </Button>
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
                              seconds: item.seconds ?? null,
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
                        {/* Exercise Type Selector */}
                        <div>
                          <Label htmlFor="exercise_type">Harjutuse tüüp</Label>
                          <Select
                            value={getExerciseType(newExercise)}
                            onValueChange={(value) => {
                              if (value === 'time') {
                                setNewExercise(prev => ({
                                  ...prev,
                                  seconds: prev.seconds ?? 60,
                                  weight_kg: null
                                }));
                              } else if (value === 'weight') {
                                setNewExercise(prev => ({
                                  ...prev,
                                  weight_kg: prev.weight_kg ?? 0,
                                  seconds: null
                                }));
                              } else { // bodyweight
                                setNewExercise(prev => ({
                                  ...prev,
                                  weight_kg: null,
                                  seconds: null
                                }));
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="weight">
                                <div className="flex items-center gap-2">
                                  <Weight className="h-4 w-4" />
                                  <span>Kaaluga</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="bodyweight">
                                <div className="flex items-center gap-2">
                                  <Dumbbell className="h-4 w-4" />
                                  <span>Kehakaal</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="time">
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4" />
                                  <span>Aja järgi</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* Conditional fields based on exercise type */}
                        {getExerciseType(newExercise) === 'time' ? (
                          <div>
                            <Label htmlFor="seconds">Aeg (sek)</Label>
                            <Input
                              id="seconds"
                              type="number"
                              min="1"
                              value={newExercise.seconds || ""}
                              onChange={(e) => setNewExercise(prev => ({ ...prev, seconds: e.target.value ? parseInt(e.target.value) : null }))}
                              placeholder="Näiteks: 60"
                            />
                          </div>
                        ) : getExerciseType(newExercise) === 'weight' ? (
                          <div>
                            <Label htmlFor="weight_kg">Kaal (kg)</Label>
                            <Input
                              id="weight_kg"
                              type="number"
                              min="0"
                              step="0.5"
                              value={newExercise.weight_kg || ""}
                              onChange={(e) => setNewExercise(prev => ({ ...prev, weight_kg: e.target.value ? parseFloat(e.target.value) : null }))}
                              placeholder="Näiteks: 20"
                            />
                          </div>
                        ) : null}
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
                          {saving ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                              Lisan...
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-2" />
                              Lisa harjutus
                            </>
                          )}
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

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={dialog.isOpen}
        onClose={hideDialog}
        onConfirm={dialog.onConfirm}
        title={dialog.title}
        description={dialog.description}
        variant={dialog.variant}
        confirmText={dialog.confirmText}
        cancelText={dialog.cancelText}
        isLoading={dialog.isLoading || saving}
        loadingText={dialog.loadingText || "Kustutamine..."}
        icon={dialog.icon}
      />
      </DialogContent>
    </Dialog>
  );
}