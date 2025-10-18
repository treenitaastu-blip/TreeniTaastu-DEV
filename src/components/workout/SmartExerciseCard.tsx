import { useState, useCallback } from "react";
import { Play, Check, Clock, Weight, Repeat, MessageSquare, Star, TrendingUp, Zap, Activity, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { VideoModal } from "./VideoModal";
import { RIRInput } from "./RIRInput";
import { cn } from "@/lib/utils";

// Helper to parse reps string to number (e.g., "12x" -> 12, "8-10" -> 8)
const parseRepsToNumber = (reps: string): number | null => {
  if (!reps) return null;
  const match = reps.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
};

interface SmartExerciseCardProps {
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
    exercise_alternatives?: Array<{
      id: string;
      alternative_name: string;
      alternative_description?: string;
      alternative_video_url?: string;
      difficulty_level: 'easier' | 'same' | 'harder';
      equipment_required?: string[];
      muscle_groups?: string[];
    }>;
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
  rir?: number;
  onRIRChange?: (rir: number) => void;
  progressionSuggestion?: {
    type: 'weight' | 'reps';
    value: number;
    reason: string;
    confidence_score?: number;
    professional_notes?: string;
  } | null;
  onSwitchToAlternative?: (exerciseId: string, alternativeName: string) => void;
  showAlternatives?: boolean;
  onToggleAlternatives?: (exerciseId: string) => void;
}

export default function SmartExerciseCard({
  exercise,
  completedSets,
  onSetComplete,
  onStartRest,
  setInputs,
  onSetInputChange,
  notes = "",
  onNotesChange,
  rpe,
  onRPEChange,
  rir,
  onRIRChange,
  progressionSuggestion,
  onSwitchToAlternative,
  showAlternatives = false,
  onToggleAlternatives
}: SmartExerciseCardProps) {
  const [showVideo, setShowVideo] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [currentSet, setCurrentSet] = useState(completedSets + 1);

  // Smart auto-fill based on progression suggestion
  const handleSetInputChangeWithSuggestion = useCallback((setNumber: number, field: string, value: number) => {
    onSetInputChange(setNumber, field, value);
    
    // Auto-apply suggestion to all remaining sets
    if (progressionSuggestion && field === progressionSuggestion.type) {
      for (let i = setNumber + 1; i <= exercise.sets; i++) {
        onSetInputChange(i, field, value);
      }
    }
  }, [onSetInputChange, progressionSuggestion, exercise.sets]);

  const handleSetComplete = useCallback((setNumber: number) => {
    onSetComplete(setNumber);
    setCurrentSet(setNumber + 1);
    
    // Auto-start rest timer if it's not the last set
    if (setNumber < exercise.sets) {
      setTimeout(() => {
        onStartRest();
      }, 500);
    }
  }, [onSetComplete, onStartRest, exercise.sets]);

  const getSuggestedValue = (field: string) => {
    if (!progressionSuggestion || progressionSuggestion.type !== field) return null;
    return progressionSuggestion.value;
  };

  const renderCurrentSet = () => {
    if (currentSet > exercise.sets) {
      return (
        <div className="text-center py-6">
          <Check className="h-12 w-12 text-success mx-auto mb-2" />
          <p className="font-semibold text-success">Harjutus lõpetatud!</p>
        </div>
      );
    }

    const key = `${exercise.id}:${currentSet}`;
    const inputs = setInputs[key] || {};
    const suggestedWeight = getSuggestedValue('weight');
    const suggestedReps = getSuggestedValue('reps');

    return (
      <div className="space-y-4">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full">
            <span className="font-bold text-lg">{currentSet}</span>
            <span className="text-sm">/ {exercise.sets}</span>
          </div>
        </div>

        {progressionSuggestion && (
          <div className="bg-gradient-to-r from-accent/10 to-primary/10 border border-accent/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-accent">AI Trainer Recommendation</span>
              {progressionSuggestion.confidence_score && (
                <Badge variant="secondary" className="text-xs">
                  {Math.round(progressionSuggestion.confidence_score * 100)}% confidence
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-2">{progressionSuggestion.reason}</p>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-accent/30 text-accent">
                {progressionSuggestion.type === 'weight' ? `${progressionSuggestion.value} kg` : `${progressionSuggestion.value} reps`}
              </Badge>
              {progressionSuggestion.professional_notes && (
                <span className="text-xs text-muted-foreground">
                  {progressionSuggestion.professional_notes}
                </span>
              )}
            </div>
          </div>
        )}

        <div className={`grid gap-4 ${(exercise.weight_kg && exercise.weight_kg > 0) || (exercise.seconds && exercise.seconds > 0) ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              <Repeat className="h-3 w-3" />
              Kordused
            </label>
            <div className="relative">
              <Input
                type="number"
                placeholder={exercise.reps}
                value={inputs.reps !== undefined ? inputs.reps : suggestedReps || parseRepsToNumber(exercise.reps) || ""}
                onChange={(e) => handleSetInputChangeWithSuggestion(currentSet, "reps", Number(e.target.value))}
                className={cn(
                  "text-center text-lg h-12",
                  suggestedReps && !inputs.reps && "border-accent/50 bg-accent/5"
                )}
              />
              {suggestedReps && !inputs.reps && (
                <Zap className="h-4 w-4 text-accent absolute right-3 top-1/2 -translate-y-1/2" />
              )}
            </div>
          </div>

          {/* Smart Weight/Time/Bodyweight Input - show only the relevant one */}
          {(exercise.weight_kg && exercise.weight_kg > 0) ? (
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <Weight className="h-3 w-3" />
                Raskus (kg)
              </label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.5"
                  placeholder={exercise.weight_kg?.toString() || "0"}
                  value={inputs.kg !== undefined ? inputs.kg : suggestedWeight || exercise.weight_kg || ""}
                  onChange={(e) => handleSetInputChangeWithSuggestion(currentSet, "kg", Number(e.target.value))}
                  className={cn(
                    "text-center text-lg h-12",
                    suggestedWeight && !inputs.kg && "border-accent/50 bg-accent/5"
                  )}
                />
                {suggestedWeight && !inputs.kg && (
                  <Zap className="h-4 w-4 text-accent absolute right-3 top-1/2 -translate-y-1/2" />
                )}
              </div>
            </div>
          ) : (exercise.seconds && exercise.seconds > 0) ? (
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Aeg (s)
              </label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder={exercise.seconds?.toString() || "0"}
                  value={inputs.seconds !== undefined ? inputs.seconds : exercise.seconds || ""}
                  onChange={(e) => handleSetInputChangeWithSuggestion(currentSet, "seconds", Number(e.target.value))}
                  className="text-center text-lg h-12"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <Activity className="h-3 w-3" />
                Keharaskus
              </label>
              <div className="text-center text-lg h-12 border rounded-md bg-muted/20 flex items-center justify-center text-muted-foreground">
                Keharaskus
              </div>
            </div>
          )}
        </div>

        <Button
          onClick={() => handleSetComplete(currentSet)}
          size="lg"
          className="w-full h-12 text-base font-semibold"
        >
          <Check className="h-5 w-5 mr-2" />
          Seeria tehtud
        </Button>
      </div>
    );
  };

  return (
    <div className="rounded-2xl border bg-card shadow-soft overflow-hidden">
      {/* Exercise Header */}
      <div className="p-4 border-b bg-gradient-to-r from-primary/5 to-accent/5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-foreground mb-1">
              {exercise.exercise_name}
            </h3>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>{exercise.sets} × {exercise.reps}</span>
              {(exercise.weight_kg && exercise.weight_kg > 0) && <span>{exercise.weight_kg} kg</span>}
              {(exercise.seconds && exercise.seconds > 0) && <span>{exercise.seconds} s</span>}
              {(!exercise.weight_kg || exercise.weight_kg === 0) && (!exercise.seconds || exercise.seconds === 0) && <span>Keharaskus</span>}
              {exercise.rest_seconds && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {exercise.rest_seconds}s puhkus
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            {exercise.video_url && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowVideo(true)}
                className="h-8 w-8 p-0"
              >
                <Play className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNotes(!showNotes)}
              className={cn(
                "h-8 w-8 p-0",
                showNotes && "bg-primary/10 text-primary",
                notes && !showNotes && "text-primary"
              )}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            {exercise.exercise_alternatives && exercise.exercise_alternatives.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleAlternatives?.(exercise.id)}
                className={cn(
                  "h-8 w-8 p-0",
                  showAlternatives && "bg-accent/10 text-accent"
                )}
              >
                <Repeat className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Coach Notes */}
        {exercise.coach_notes && (
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-primary/60 mt-1.5 flex-shrink-0"></div>
              <span className="text-muted-foreground">{exercise.coach_notes}</span>
            </div>
          </div>
        )}
      </div>

      {/* Progress Indicator */}
      <div className="px-4 py-2 bg-muted/20">
        <div className="flex items-center gap-2 text-sm">
          <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-primary to-accent h-full transition-all duration-500"
              style={{ width: `${(completedSets / exercise.sets) * 100}%` }}
            />
          </div>
          <span className="text-muted-foreground font-medium">
            {completedSets}/{exercise.sets}
          </span>
        </div>
      </div>

      {/* Current Set */}
      <div className="p-4">
        {renderCurrentSet()}
      </div>

      {/* Notes & RPE */}
      {showNotes && (
        <div className="p-4 border-t bg-muted/10 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Märkused
            </label>
            <Textarea
              value={notes}
              onChange={(e) => onNotesChange?.(e.target.value)}
              placeholder="Kuidas läks?"
              rows={2}
              className="text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <Star className="h-4 w-4 text-primary" />
                RPE (1-10)
              </label>
              <div className="flex gap-1 flex-wrap">
                {Array.from({ length: 10 }, (_, i) => {
                  const value = i + 1;
                  return (
                    <Button
                      key={value}
                      variant={rpe === value ? "default" : "ghost"}
                      size="sm"
                      className="w-7 h-7 p-0 text-xs"
                      onClick={() => onRPEChange?.(value)}
                      title={`RPE ${value}/10`}
                    >
                      {value}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <Activity className="h-4 w-4 text-accent" />
                RIR (0-5+)
              </label>
              <div className="flex gap-1 flex-wrap">
                {[0, 1, 2, 3, 4, 5].map((value) => (
                  <Button
                    key={value}
                    variant={rir === value ? "default" : "ghost"}
                    size="sm"
                    className="w-7 h-7 p-0 text-xs"
                    onClick={() => onRIRChange?.(value)}
                    title={`${value} reps in reserve`}
                  >
                    {value}{value === 5 ? "+" : ""}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alternative Exercises */}
      {showAlternatives && exercise.exercise_alternatives && exercise.exercise_alternatives.length > 0 && (
        <div className="p-4 border-t bg-muted/30">
          <h4 className="font-medium mb-3 text-sm flex items-center gap-2">
            <Repeat className="h-4 w-4" />
            Alternatiivsed harjutused
          </h4>
          <div className="space-y-2">
            {exercise.exercise_alternatives.map((alt, index) => (
              <div key={alt.id} className="flex items-center justify-between p-3 border rounded-lg bg-background">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{alt.alternative_name}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      alt.difficulty_level === 'easier' ? 'bg-green-100 text-green-700' :
                      alt.difficulty_level === 'harder' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {alt.difficulty_level === 'easier' ? 'Lihtsam' :
                       alt.difficulty_level === 'harder' ? 'Raskem' : 'Sama'}
                    </span>
                  </div>
                  {alt.alternative_description && (
                    <p className="text-xs text-muted-foreground">{alt.alternative_description}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onSwitchToAlternative?.(exercise.id, alt.alternative_name)}
                  className="ml-2"
                >
                  Vali
                </Button>
              </div>
            ))}
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