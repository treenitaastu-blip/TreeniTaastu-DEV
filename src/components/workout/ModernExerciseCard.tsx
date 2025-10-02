// src/components/workout/ModernExerciseCard.tsx
import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Check, Clock, Weight, Repeat, MessageSquare, Star, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { VideoModal } from "./VideoModal";

// Helper to parse reps string to number (e.g., "12x" -> 12, "8-10" -> 8)
const parseRepsToNumber = (reps: string): number | null => {
  if (!reps) return null;
  const match = reps.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
};

interface ExerciseCardProps {
  exercise: {
    id: string;
    exercise_name: string;
    sets: number;
    reps: string;
    seconds?: number | null;
    weight_kg?: number | null;
    rest_seconds?: number | null;
    coach_notes?: string | null;
    video_url?: string | null;
  };
  completedSets: number;
  onSetComplete: (setNumber: number, data?: Record<string, unknown>) => void;
  onStartRest: () => void;
  setInputs: Record<string, { reps?: number; seconds?: number; kg?: number }>;
  onSetInputChange: (setNumber: number, field: string, value: number) => void;
  notes?: string;
  onNotesChange?: (notes: string) => void;
  rpe?: number;
  onRPEChange?: (rpe: number) => void;
}

export default function ModernExerciseCard({
  exercise,
  completedSets,
  onSetComplete,
  onStartRest,
  setInputs,
  onSetInputChange,
  notes = "",
  onNotesChange,
  rpe,
  onRPEChange
}: ExerciseCardProps) {
  const [showVideo, setShowVideo] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [localNotes, setLocalNotes] = useState(notes);
  const [saving, setSaving] = useState(false);
  const notesRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Sync local notes with prop changes
  useEffect(() => {
    setLocalNotes(notes);
  }, [notes]);

  // Debounced save function
  const debouncedSave = useCallback((value: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setSaving(true);
    saveTimeoutRef.current = setTimeout(() => {
      onNotesChange?.(value);
      setSaving(false);
    }, 1000); // Save after 1 second of no typing
  }, [onNotesChange]);

  const handleNotesChange = useCallback((value: string) => {
    setLocalNotes(value);
    debouncedSave(value);
  }, [debouncedSave]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Scroll to notes section when it opens
  useEffect(() => {
    if (showNotes && notesRef.current) {
      setTimeout(() => {
        notesRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
      }, 100); // Small delay to ensure DOM updates
    }
  }, [showNotes]);

  const renderSetRow = (setNumber: number) => {
    const isCompleted = setNumber <= completedSets;
    const key = `${exercise.id}:${setNumber}`;
    const inputs = setInputs[key] || {};

    return (
      <div 
        key={setNumber}
        className={`rounded-lg border p-4 transition-all ${
          isCompleted 
            ? "bg-success/5 border-success/20" 
            : "bg-card hover:bg-card/80"
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              isCompleted 
                ? "bg-success text-success-foreground" 
                : "bg-muted text-muted-foreground"
            }`}>
              {isCompleted ? <Check className="h-4 w-4" /> : setNumber}
            </div>
            <span className="font-medium">Seeria {setNumber}</span>
          </div>
          
          <div className="text-sm text-muted-foreground">
            Siht: {exercise.reps}
          </div>
        </div>

        {!isCompleted && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
            {/* Reps Input */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground flex items-center gap-1">
                <Repeat className="h-3 w-3" />
                Kordused
              </label>
              <Input
                type="number"
                placeholder={exercise.reps}
                value={inputs.reps !== undefined ? inputs.reps : parseRepsToNumber(exercise.reps) || ""}
                onChange={(e) => onSetInputChange(setNumber, "reps", Number(e.target.value))}
                className="h-8 text-center"
              />
            </div>

            {/* Smart Weight/Time/Bodyweight Input - show only the relevant one */}
            {(exercise.weight_kg && exercise.weight_kg > 0) ? (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Weight className="h-3 w-3" />
                  Raskus (kg)
                </label>
                <Input
                  type="number"
                  step="0.5"
                  placeholder={exercise.weight_kg?.toString() || "0"}
                  value={inputs.kg !== undefined ? inputs.kg : exercise.weight_kg || ""}
                  onChange={(e) => onSetInputChange(setNumber, "kg", Number(e.target.value))}
                  className="h-8 text-center"
                />
              </div>
            ) : (exercise.seconds && exercise.seconds > 0) ? (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Aeg (s)
                </label>
                <Input
                  type="number"
                  placeholder={exercise.seconds.toString()}
                  value={inputs.seconds !== undefined ? inputs.seconds : exercise.seconds || ""}
                  onChange={(e) => onSetInputChange(setNumber, "seconds", Number(e.target.value))}
                  className="h-8 text-center"
                />
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  Keharaskus
                </label>
                <div className="h-8 text-center border rounded-md bg-muted/20 flex items-center justify-center text-xs text-muted-foreground">
                  Keharaskus
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Button */}
        {!isCompleted && (
          <Button
            onClick={() => onSetComplete(setNumber)}
            className="w-full"
            size="sm"
          >
            <Check className="h-4 w-4 mr-2" />
            Märgi tehtuks
          </Button>
        )}

        {isCompleted && setNumber === completedSets && (
          <Button
            onClick={onStartRest}
            variant="outline"
            className="w-full"
            size="sm"
          >
            <Clock className="h-4 w-4 mr-2" />
            Alusta puhkust ({exercise.rest_seconds || 60}s)
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="rounded-2xl border bg-card shadow-soft overflow-hidden">
      {/* Exercise Header */}
      <div className="p-6 border-b">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground mb-1">
              {exercise.exercise_name}
            </h3>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Activity className="h-4 w-4" />
                {exercise.sets} seeriat
              </span>
              <span className="flex items-center gap-1">
                <Repeat className="h-4 w-4" />
                {exercise.reps}
              </span>
              {exercise.weight_kg && (
                <span className="flex items-center gap-1">
                  <Weight className="h-4 w-4" />
                  {exercise.weight_kg} kg
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            {exercise.video_url && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowVideo(true)}
              >
                <Play className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNotes(!showNotes)}
              className={`${showNotes ? "bg-primary/10 border-primary/30" : ""} ${localNotes ? "border-primary/50" : ""}`}
            >
              <MessageSquare className={`h-4 w-4 ${showNotes ? "text-primary" : localNotes ? "text-primary" : ""}`} />
              {localNotes && !showNotes && (
                <span className="ml-1 text-xs">•</span>
              )}
            </Button>
          </div>
        </div>

        {/* Coach Notes */}
        {exercise.coach_notes && (
          <div className="rounded-lg bg-muted/30 p-3 text-sm text-muted-foreground">
            <strong>Treener:</strong> {exercise.coach_notes}
          </div>
        )}
      </div>

      {/* Sets */}
      <div className="p-6 space-y-3">
        {Array.from({ length: exercise.sets }, (_, i) => renderSetRow(i + 1))}
      </div>

      {/* Notes & RPE Section */}
      {showNotes && (
        <div 
          ref={notesRef}
          className="p-6 border-t bg-muted/20 space-y-4 animate-in slide-in-from-top-2 duration-200"
        >
          <div>
            <label className="text-sm font-medium mb-2 block flex items-center gap-2 justify-between">
              <span className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Märkused
              </span>
              {saving && (
                <span className="text-xs text-muted-foreground animate-pulse">
                  Salvestab...
                </span>
              )}
            </label>
            <Textarea
              value={localNotes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Kuidas läks? Lisa märkusi selle harjutuse kohta..."
              rows={3}
              className="border-primary/20 focus:border-primary/40"
            />
            {localNotes && !saving && (
              <p className="text-xs text-muted-foreground mt-1">
                Viimane märkus salvestatud
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block flex items-center gap-2">
              <Star className="h-4 w-4 text-primary" />
              RPE - Kui raske oli? (1-10)
            </label>
            <div className="flex gap-1">
              {Array.from({ length: 10 }, (_, i) => {
                const value = i + 1;
                return (
                  <Button
                    key={value}
                    variant={rpe === value ? "default" : "outline"}
                    size="sm"
                    className="w-8 h-8 p-0"
                    onClick={() => onRPEChange?.(value)}
                  >
                    {value}
                  </Button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              1 = Väga kerge • 5 = Keskmine • 10 = Maksimaalne pingutus
            </p>
          </div>
        </div>
      )}

      {/* Video Modal */}
      {showVideo && exercise.video_url && (
        <VideoModal
          src={exercise.video_url}
          title={exercise.exercise_name}
          onClose={() => setShowVideo(false)}
        />
      )}
    </div>
  );
}