import { useEffect, useMemo, useState } from "react";
import type { Json } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Dumbbell,
  FileCheck2,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  UserRound,
} from "lucide-react";

type Client = {
  id: string;
  email: string | null;
  created_at: string;
};

type ExerciseKind = "compound" | "isolation" | "bodyweight" | "time";

type ExerciseAlternative = {
  local_id: string;
  alternative_name: string;
  alternative_description: string;
  alternative_video_url: string;
  difficulty_level: "easier" | "same" | "harder";
  equipment_required: string[];
  muscle_groups: string[];
};

type Exercise = {
  local_id: string;
  exercise_name: string;
  kind: ExerciseKind;
  sets: number;
  reps: string;
  seconds: number | null;
  rest_seconds: number;
  weight_kg: number | null;
  coach_notes: string;
  video_url: string;
  is_unilateral: boolean;
  alternatives: ExerciseAlternative[];
};

type TrainingDay = {
  day_number: number;
  title: string;
  note: string;
  exercises: Exercise[];
  is_open: boolean;
};

type ProgramDraft = {
  version: 2;
  selectedClientId: string;
  programTitle: string;
  startDate: string;
  durationWeeks: number;
  trainingDaysPerWeek: number;
  autoProgressionEnabled: boolean;
  trainingDays: TrainingDay[];
  step: 1 | 2 | 3;
};

interface EnhancedProgramCreatorProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const PROGRAM_DRAFT_STORAGE_KEY =
  "treenitaastu:admin-personal-program-draft:v2";

const makeLocalId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

const createExercise = (): Exercise => ({
  local_id: makeLocalId(),
  exercise_name: "",
  kind: "compound",
  sets: 3,
  reps: "8-12",
  seconds: null,
  rest_seconds: 90,
  weight_kg: null,
  coach_notes: "",
  video_url: "",
  is_unilateral: false,
  alternatives: [],
});

const createDay = (dayNumber: number): TrainingDay => ({
  day_number: dayNumber,
  title: `Päev ${dayNumber}`,
  note: "",
  exercises: [],
  is_open: dayNumber === 1,
});

const createEmptyDraft = (): ProgramDraft => ({
  version: 2,
  selectedClientId: "",
  programTitle: "",
  startDate: new Date().toISOString().slice(0, 10),
  durationWeeks: 4,
  trainingDaysPerWeek: 3,
  autoProgressionEnabled: true,
  trainingDays: [createDay(1), createDay(2), createDay(3)],
  step: 1,
});

const loadDraft = (): ProgramDraft => {
  if (typeof window === "undefined") return createEmptyDraft();

  try {
    const stored = window.localStorage.getItem(PROGRAM_DRAFT_STORAGE_KEY);
    if (!stored) return createEmptyDraft();

    const parsed = JSON.parse(stored) as ProgramDraft;
    if (parsed.version !== 2 || !Array.isArray(parsed.trainingDays)) {
      return createEmptyDraft();
    }

    return parsed;
  } catch {
    return createEmptyDraft();
  }
};

const kindLabel: Record<ExerciseKind, string> = {
  compound: "Põhiharjutus",
  isolation: "Isolatsioon",
  bodyweight: "Kehakaal",
  time: "Aja järgi",
};

export default function EnhancedProgramCreator({
  isOpen,
  onOpenChange,
  onSuccess,
}: EnhancedProgramCreatorProps) {
  const { toast } = useToast();
  const [draft, setDraft] = useState<ProgramDraft>(loadDraft);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [loadingClients, setLoadingClients] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const activeDays = useMemo(
    () => draft.trainingDays.slice(0, draft.trainingDaysPerWeek),
    [draft.trainingDays, draft.trainingDaysPerWeek],
  );

  const selectedClient = clients.find(
    (client) => client.id === draft.selectedClientId,
  );

  const hasMeaningfulDraft = useMemo(
    () =>
      Boolean(
        draft.selectedClientId ||
          draft.programTitle.trim() ||
          draft.step > 1 ||
          draft.trainingDays.some((day) => day.exercises.length > 0),
      ),
    [draft],
  );

  const filteredClients = useMemo(() => {
    const search = clientSearch.trim().toLowerCase();
    if (!search) return clients;
    return clients.filter((client) => client.email?.toLowerCase().includes(search));
  }, [clientSearch, clients]);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    const loadClients = async () => {
      setLoadingClients(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, created_at")
        .order("email");

      if (cancelled) return;

      if (error) {
        toast({
          title: "Kliente ei saanud laadida",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setClients((data ?? []).filter((client) => Boolean(client.email)));
      }
      setLoadingClients(false);
    };

    void loadClients();
    return () => {
      cancelled = true;
    };
  }, [isOpen, toast]);

  useEffect(() => {
    if (!isOpen || !hasMeaningfulDraft || typeof window === "undefined") return;

    const timeout = window.setTimeout(() => {
      window.localStorage.setItem(PROGRAM_DRAFT_STORAGE_KEY, JSON.stringify(draft));
      setLastSavedAt(new Date());
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [draft, hasMeaningfulDraft, isOpen]);

  useEffect(() => {
    if (!isOpen || !hasMeaningfulDraft || typeof window === "undefined") return;

    const warnAboutDraft = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warnAboutDraft);
    return () => window.removeEventListener("beforeunload", warnAboutDraft);
  }, [hasMeaningfulDraft, isOpen]);

  const updateDraft = (updates: Partial<ProgramDraft>) => {
    setFormError("");
    setDraft((current) => ({ ...current, ...updates }));
  };

  const updateTrainingDaysPerWeek = (count: number) => {
    setDraft((current) => {
      const days = [...current.trainingDays];
      while (days.length < count) days.push(createDay(days.length + 1));
      return { ...current, trainingDaysPerWeek: count, trainingDays: days };
    });
    setFormError("");
  };

  const updateDay = (dayIndex: number, updates: Partial<TrainingDay>) => {
    setDraft((current) => ({
      ...current,
      trainingDays: current.trainingDays.map((day, index) =>
        index === dayIndex ? { ...day, ...updates } : day,
      ),
    }));
    setFormError("");
  };

  const addExercise = (dayIndex: number) => {
    setDraft((current) => ({
      ...current,
      trainingDays: current.trainingDays.map((day, index) =>
        index === dayIndex
          ? { ...day, is_open: true, exercises: [...day.exercises, createExercise()] }
          : day,
      ),
    }));
  };

  const updateExercise = (
    dayIndex: number,
    exerciseIndex: number,
    updates: Partial<Exercise>,
  ) => {
    setDraft((current) => ({
      ...current,
      trainingDays: current.trainingDays.map((day, index) =>
        index === dayIndex
          ? {
              ...day,
              exercises: day.exercises.map((exercise, itemIndex) =>
                itemIndex === exerciseIndex
                  ? { ...exercise, ...updates }
                  : exercise,
              ),
            }
          : day,
      ),
    }));
    setFormError("");
  };

  const removeExercise = (dayIndex: number, exerciseIndex: number) => {
    setDraft((current) => ({
      ...current,
      trainingDays: current.trainingDays.map((day, index) =>
        index === dayIndex
          ? {
              ...day,
              exercises: day.exercises.filter(
                (_, itemIndex) => itemIndex !== exerciseIndex,
              ),
            }
          : day,
      ),
    }));
  };

  const moveExercise = (
    dayIndex: number,
    exerciseIndex: number,
    direction: -1 | 1,
  ) => {
    setDraft((current) => ({
      ...current,
      trainingDays: current.trainingDays.map((day, index) => {
        if (index !== dayIndex) return day;
        const nextIndex = exerciseIndex + direction;
        if (nextIndex < 0 || nextIndex >= day.exercises.length) return day;

        const exercises = [...day.exercises];
        [exercises[exerciseIndex], exercises[nextIndex]] = [
          exercises[nextIndex],
          exercises[exerciseIndex],
        ];
        return { ...day, exercises };
      }),
    }));
  };

  const addAlternative = (dayIndex: number, exerciseIndex: number) => {
    updateExercise(dayIndex, exerciseIndex, {
      alternatives: [
        ...draft.trainingDays[dayIndex].exercises[exerciseIndex].alternatives,
        {
          local_id: makeLocalId(),
          alternative_name: "",
          alternative_description: "",
          alternative_video_url: "",
          difficulty_level: "same",
          equipment_required: [],
          muscle_groups: [],
        },
      ],
    });
  };

  const updateAlternative = (
    dayIndex: number,
    exerciseIndex: number,
    alternativeIndex: number,
    updates: Partial<ExerciseAlternative>,
  ) => {
    const exercise = draft.trainingDays[dayIndex].exercises[exerciseIndex];
    updateExercise(dayIndex, exerciseIndex, {
      alternatives: exercise.alternatives.map((alternative, index) =>
        index === alternativeIndex
          ? { ...alternative, ...updates }
          : alternative,
      ),
    });
  };

  const removeAlternative = (
    dayIndex: number,
    exerciseIndex: number,
    alternativeIndex: number,
  ) => {
    const exercise = draft.trainingDays[dayIndex].exercises[exerciseIndex];
    updateExercise(dayIndex, exerciseIndex, {
      alternatives: exercise.alternatives.filter(
        (_, index) => index !== alternativeIndex,
      ),
    });
  };

  const validateSettings = () => {
    if (!draft.selectedClientId) return "Vali klient, kellele kava lood.";
    if (!draft.startDate) return "Vali programmi alguskuupäev.";
    return "";
  };

  const validateTrainingDays = () => {
    for (const day of activeDays) {
      if (!day.exercises.length) {
        return `${day.title || `Päev ${day.day_number}`} vajab vähemalt ühte harjutust.`;
      }

      for (const [index, exercise] of day.exercises.entries()) {
        if (!exercise.exercise_name.trim()) {
          return `${day.title}: harjutus ${index + 1} vajab nime.`;
        }
        if (exercise.sets < 1 || exercise.sets > 50) {
          return `${day.title}: harjutuse seeriate arv peab olema 1–50.`;
        }
        if (exercise.kind === "time") {
          if (!exercise.seconds || exercise.seconds < 1) {
            return `${day.title}: ajaharjutus vajab kestust sekundites.`;
          }
        } else if (!exercise.reps.trim()) {
          return `${day.title}: harjutus vajab korduste arvu.`;
        }
      }
    }
    return "";
  };

  const goToStep = (step: 1 | 2 | 3) => {
    const settingsError = step >= 2 ? validateSettings() : "";
    const trainingError = step === 3 ? validateTrainingDays() : "";
    const error = settingsError || trainingError;

    if (error) {
      setFormError(error);
      return;
    }

    updateDraft({ step });
  };

  const resetDraft = () => {
    const emptyDraft = createEmptyDraft();
    setDraft(emptyDraft);
    setFormError("");
    setLastSavedAt(null);
    window.localStorage.removeItem(PROGRAM_DRAFT_STORAGE_KEY);
  };

  const buildPayload = () =>
    activeDays.map((day) => ({
      day_number: day.day_number,
      title: day.title.trim() || `Päev ${day.day_number}`,
      note: day.note.trim() || null,
      exercises: day.exercises.map((exercise, order) => {
        const unilateralReps = exercise.is_unilateral
          ? Number.parseInt(exercise.reps.replace(/[^\d]/g, ""), 10) || null
          : null;

        return {
          exercise_name: exercise.exercise_name.trim(),
          exercise_type:
            exercise.kind === "time" ? "bodyweight" : exercise.kind,
          sets: exercise.sets,
          reps: exercise.kind === "time" ? "" : exercise.reps.trim(),
          seconds: exercise.kind === "time" ? exercise.seconds : null,
          weight_kg:
            exercise.kind === "bodyweight" || exercise.kind === "time"
              ? null
              : exercise.weight_kg,
          rest_seconds: exercise.rest_seconds,
          coach_notes: exercise.coach_notes.trim() || null,
          video_url: exercise.video_url.trim() || null,
          order_in_day: order + 1,
          is_unilateral:
            exercise.kind !== "time" && exercise.is_unilateral,
          reps_per_side: unilateralReps,
          total_reps: unilateralReps ? unilateralReps * 2 : null,
          alternatives: exercise.alternatives
            .filter((alternative) => alternative.alternative_name.trim())
            .map((alternative) => ({
              alternative_name: alternative.alternative_name.trim(),
              alternative_description:
                alternative.alternative_description.trim() || null,
              alternative_video_url:
                alternative.alternative_video_url.trim() || null,
              difficulty_level: alternative.difficulty_level,
              equipment_required: alternative.equipment_required,
              muscle_groups: alternative.muscle_groups,
            })),
        };
      }),
    }));

  const handleCreateProgram = async () => {
    const error = validateSettings() || validateTrainingDays();
    if (error) {
      setFormError(error);
      return;
    }

    setCreating(true);
    setFormError("");

    try {
      const { data: programId, error: createError } = await supabase.rpc(
        "create_personal_program",
        {
          p_target_user_id: draft.selectedClientId,
          p_title: draft.programTitle.trim(),
          p_start_date: draft.startDate,
          p_duration_weeks: draft.durationWeeks,
          p_auto_progression_enabled: draft.autoProgressionEnabled,
          p_training_days: buildPayload() as unknown as Json,
        },
      );

      if (createError) throw createError;
      if (!programId) throw new Error("Programm loodi ilma ID-ta.");

      window.localStorage.removeItem(PROGRAM_DRAFT_STORAGE_KEY);
      setDraft(createEmptyDraft());
      toast({
        title: "Programm on avaldatud",
        description: `Kava on määratud kasutajale ${selectedClient?.email ?? "valitud klient"}.`,
      });
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Programmi loomine ebaõnnestus.";
      setFormError(message);
      toast({
        title: "Programmi ei saanud luua",
        description: message,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const renderSettings = () => (
    <div className="mx-auto w-full max-w-3xl space-y-5" data-testid="program-step-settings">
      <div>
        <Badge variant="outline" className="mb-2">1. samm</Badge>
        <h3 className="text-xl font-semibold">Kellele ja kui pikaks ajaks?</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Määra programmi põhiandmed. Harjutused lisad järgmises sammus.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-5 p-4 sm:p-6">
          <div className="space-y-2">
            <Label htmlFor="client-search">Otsi klienti</Label>
            <Input
              id="client-search"
              value={clientSearch}
              onChange={(event) => setClientSearch(event.target.value)}
              placeholder="Sisesta kliendi e-post"
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="program-client">Klient</Label>
            <select
              id="program-client"
              value={draft.selectedClientId}
              onChange={(event) =>
                updateDraft({ selectedClientId: event.target.value })
              }
              disabled={loadingClients}
              className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="">
                {loadingClients ? "Laen kliente…" : "Vali klient"}
              </option>
              {filteredClients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.email}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="program-title">Programmi nimi</Label>
            <Input
              id="program-title"
              value={draft.programTitle}
              onChange={(event) =>
                updateDraft({ programTitle: event.target.value })
              }
              placeholder="Näiteks: Jõu ja liikuvuse programm"
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">
              Kui jätad välja tühjaks, kasutame kliendi e-posti põhist nime.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="program-start-date">Alguskuupäev</Label>
              <Input
                id="program-start-date"
                type="date"
                value={draft.startDate}
                onChange={(event) =>
                  updateDraft({ startDate: event.target.value })
                }
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="program-duration">Kestus</Label>
              <select
                id="program-duration"
                value={draft.durationWeeks}
                onChange={(event) =>
                  updateDraft({ durationWeeks: Number(event.target.value) })
                }
                className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                {[2, 4, 6, 8, 10, 12, 16, 20, 24].map((weeks) => (
                  <option key={weeks} value={weeks}>
                    {weeks} nädalat
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="program-days">Treeninguid nädalas</Label>
              <select
                id="program-days"
                value={draft.trainingDaysPerWeek}
                onChange={(event) =>
                  updateTrainingDaysPerWeek(Number(event.target.value))
                }
                className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                {[1, 2, 3, 4, 5, 6, 7].map((days) => (
                  <option key={days} value={days}>
                    {days}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border bg-muted/30 p-4">
            <Checkbox
              id="auto-progression"
              checked={draft.autoProgressionEnabled}
              onCheckedChange={(checked) =>
                updateDraft({ autoProgressionEnabled: checked === true })
              }
            />
            <div>
              <Label htmlFor="auto-progression" className="cursor-pointer">
                Automaatne progressioon
              </Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Rakendus saab kliendi RPE ja soorituste põhjal koormust kohandada.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderExercise = (
    exercise: Exercise,
    dayIndex: number,
    exerciseIndex: number,
  ) => (
    <Card key={exercise.local_id} className="overflow-hidden border-border/80">
      <CardHeader className="space-y-3 bg-muted/25 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Harjutus {exerciseIndex + 1}
            </p>
            <CardTitle className="truncate text-base">
              {exercise.exercise_name || "Nimeta harjutus"}
            </CardTitle>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-10 w-10"
              disabled={exerciseIndex === 0}
              onClick={() => moveExercise(dayIndex, exerciseIndex, -1)}
              aria-label="Liiguta harjutus üles"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-10 w-10"
              disabled={
                exerciseIndex ===
                draft.trainingDays[dayIndex].exercises.length - 1
              }
              onClick={() => moveExercise(dayIndex, exerciseIndex, 1)}
              aria-label="Liiguta harjutus alla"
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-10 w-10 text-destructive hover:text-destructive"
              onClick={() => removeExercise(dayIndex, exerciseIndex)}
              aria-label="Eemalda harjutus"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor={`exercise-name-${exercise.local_id}`}>Harjutus</Label>
            <Input
              id={`exercise-name-${exercise.local_id}`}
              value={exercise.exercise_name}
              onChange={(event) =>
                updateExercise(dayIndex, exerciseIndex, {
                  exercise_name: event.target.value,
                })
              }
              placeholder="Näiteks: Goblet-kükk"
              className="h-11"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor={`exercise-kind-${exercise.local_id}`}>Harjutuse tüüp</Label>
            <select
              id={`exercise-kind-${exercise.local_id}`}
              value={exercise.kind}
              onChange={(event) => {
                const kind = event.target.value as ExerciseKind;
                updateExercise(dayIndex, exerciseIndex, {
                  kind,
                  seconds: kind === "time" ? exercise.seconds ?? 60 : null,
                  weight_kg:
                    kind === "bodyweight" || kind === "time"
                      ? null
                      : exercise.weight_kg,
                  is_unilateral: kind === "time" ? false : exercise.is_unilateral,
                });
              }}
              className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
            >
              {Object.entries(kindLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`exercise-sets-${exercise.local_id}`}>Seeriad</Label>
            <Input
              id={`exercise-sets-${exercise.local_id}`}
              type="number"
              min={1}
              max={50}
              value={exercise.sets}
              onChange={(event) =>
                updateExercise(dayIndex, exerciseIndex, {
                  sets: Number(event.target.value),
                })
              }
              className="h-11"
            />
          </div>

          {exercise.kind === "time" ? (
            <div className="space-y-2">
              <Label htmlFor={`exercise-seconds-${exercise.local_id}`}>Kestus (sek)</Label>
              <Input
                id={`exercise-seconds-${exercise.local_id}`}
                type="number"
                min={1}
                value={exercise.seconds ?? ""}
                onChange={(event) =>
                  updateExercise(dayIndex, exerciseIndex, {
                    seconds: event.target.value
                      ? Number(event.target.value)
                      : null,
                  })
                }
                className="h-11"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor={`exercise-reps-${exercise.local_id}`}>
                Kordused{exercise.is_unilateral ? " ühe poole kohta" : ""}
              </Label>
              <Input
                id={`exercise-reps-${exercise.local_id}`}
                value={exercise.reps}
                onChange={(event) =>
                  updateExercise(dayIndex, exerciseIndex, {
                    reps: event.target.value,
                  })
                }
                placeholder="8–12"
                className="h-11"
              />
            </div>
          )}

          {exercise.kind !== "bodyweight" && exercise.kind !== "time" && (
            <div className="space-y-2">
              <Label htmlFor={`exercise-weight-${exercise.local_id}`}>Algraskus (kg)</Label>
              <Input
                id={`exercise-weight-${exercise.local_id}`}
                type="number"
                min={0}
                step={0.5}
                value={exercise.weight_kg ?? ""}
                onChange={(event) =>
                  updateExercise(dayIndex, exerciseIndex, {
                    weight_kg: event.target.value
                      ? Number(event.target.value)
                      : null,
                  })
                }
                placeholder="Valikuline"
                className="h-11"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor={`exercise-rest-${exercise.local_id}`}>Puhkepaus (sek)</Label>
            <Input
              id={`exercise-rest-${exercise.local_id}`}
              type="number"
              min={0}
              step={15}
              value={exercise.rest_seconds}
              onChange={(event) =>
                updateExercise(dayIndex, exerciseIndex, {
                  rest_seconds: Number(event.target.value),
                })
              }
              className="h-11"
            />
          </div>
        </div>

        {exercise.kind !== "time" && (
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <Checkbox
              id={`exercise-unilateral-${exercise.local_id}`}
              checked={exercise.is_unilateral}
              onCheckedChange={(checked) =>
                updateExercise(dayIndex, exerciseIndex, {
                  is_unilateral: checked === true,
                })
              }
            />
            <Label
              htmlFor={`exercise-unilateral-${exercise.local_id}`}
              className="cursor-pointer"
            >
              Ühepoolne harjutus
            </Label>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`exercise-notes-${exercise.local_id}`}>Treeneri juhised</Label>
            <Textarea
              id={`exercise-notes-${exercise.local_id}`}
              value={exercise.coach_notes}
              onChange={(event) =>
                updateExercise(dayIndex, exerciseIndex, {
                  coach_notes: event.target.value,
                })
              }
              placeholder="Tehnika, tempo või muud olulised juhised"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`exercise-video-${exercise.local_id}`}>Video link</Label>
            <Input
              id={`exercise-video-${exercise.local_id}`}
              type="url"
              value={exercise.video_url}
              onChange={(event) =>
                updateExercise(dayIndex, exerciseIndex, {
                  video_url: event.target.value,
                })
              }
              placeholder="https://…"
              className="h-11"
            />
          </div>
        </div>

        <div className="rounded-xl border border-dashed p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Alternatiivsed harjutused</p>
              <p className="text-xs text-muted-foreground">
                Lisa ainult siis, kui klient võib vajada asendust.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => addAlternative(dayIndex, exerciseIndex)}
              className="h-10"
            >
              <Plus className="mr-2 h-4 w-4" />
              Lisa alternatiiv
            </Button>
          </div>

          {exercise.alternatives.length > 0 && (
            <div className="mt-4 space-y-3">
              {exercise.alternatives.map((alternative, alternativeIndex) => (
                <div
                  key={alternative.local_id}
                  className="grid gap-3 rounded-lg bg-muted/35 p-3 sm:grid-cols-[1fr_180px_auto]"
                >
                  <div className="space-y-2">
                    <Label htmlFor={`alternative-${alternative.local_id}`}>Alternatiiv</Label>
                    <Input
                      id={`alternative-${alternative.local_id}`}
                      value={alternative.alternative_name}
                      onChange={(event) =>
                        updateAlternative(
                          dayIndex,
                          exerciseIndex,
                          alternativeIndex,
                          { alternative_name: event.target.value },
                        )
                      }
                      placeholder="Näiteks: Kastile kükk"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`alternative-level-${alternative.local_id}`}>Raskusaste</Label>
                    <select
                      id={`alternative-level-${alternative.local_id}`}
                      value={alternative.difficulty_level}
                      onChange={(event) =>
                        updateAlternative(
                          dayIndex,
                          exerciseIndex,
                          alternativeIndex,
                          {
                            difficulty_level: event.target.value as
                              | "easier"
                              | "same"
                              | "harder",
                          },
                        )
                      }
                      className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
                    >
                      <option value="easier">Lihtsam</option>
                      <option value="same">Sama tase</option>
                      <option value="harder">Raskem</option>
                    </select>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-11 w-11 self-end text-destructive hover:text-destructive"
                    onClick={() =>
                      removeAlternative(
                        dayIndex,
                        exerciseIndex,
                        alternativeIndex,
                      )
                    }
                    aria-label="Eemalda alternatiiv"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderTrainingDays = () => (
    <div className="mx-auto w-full max-w-5xl space-y-5" data-testid="program-step-days">
      <div>
        <Badge variant="outline" className="mb-2">2. samm</Badge>
        <h3 className="text-xl font-semibold">Koosta treeningpäevad</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Muudatused salvestuvad automaatselt. Päevade arvu vähendamine ei kustuta peidetud päevi.
        </p>
      </div>

      {activeDays.map((day, dayIndex) => (
        <Card key={day.day_number} className="overflow-hidden">
          <CardHeader className="p-0">
            <button
              type="button"
              onClick={() => updateDay(dayIndex, { is_open: !day.is_open })}
              className="flex min-h-16 w-full items-center justify-between gap-3 p-4 text-left sm:px-6"
              aria-expanded={day.is_open}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                  {day.day_number}
                </span>
                <div className="min-w-0">
                  <CardTitle className="truncate text-base">{day.title}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {day.exercises.length} harjutust
                  </p>
                </div>
              </div>
              {day.is_open ? (
                <ChevronUp className="h-5 w-5 shrink-0" />
              ) : (
                <ChevronDown className="h-5 w-5 shrink-0" />
              )}
            </button>
          </CardHeader>

          {day.is_open && (
            <CardContent className="space-y-4 border-t p-4 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`day-title-${day.day_number}`}>Päeva nimi</Label>
                  <Input
                    id={`day-title-${day.day_number}`}
                    value={day.title}
                    onChange={(event) =>
                      updateDay(dayIndex, { title: event.target.value })
                    }
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`day-note-${day.day_number}`}>Päeva märkus</Label>
                  <Input
                    id={`day-note-${day.day_number}`}
                    value={day.note}
                    onChange={(event) =>
                      updateDay(dayIndex, { note: event.target.value })
                    }
                    placeholder="Valikuline"
                    className="h-11"
                  />
                </div>
              </div>

              <div className="space-y-4">
                {day.exercises.map((exercise, exerciseIndex) =>
                  renderExercise(exercise, dayIndex, exerciseIndex),
                )}
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => addExercise(dayIndex)}
                className="h-11 w-full border-dashed"
              >
                <Plus className="mr-2 h-4 w-4" />
                Lisa harjutus
              </Button>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );

  const renderReview = () => (
    <div className="mx-auto w-full max-w-4xl space-y-5" data-testid="program-step-review">
      <div>
        <Badge variant="outline" className="mb-2">3. samm</Badge>
        <h3 className="text-xl font-semibold">Kontrolli ja avalda</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Pärast avaldamist näeb klient kava oma programmis.
        </p>
      </div>

      <Card>
        <CardContent className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
          <div className="flex gap-3">
            <UserRound className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Klient</p>
              <p className="font-medium">{selectedClient?.email}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <CalendarDays className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Algus ja kestus</p>
              <p className="font-medium">
                {new Date(`${draft.startDate}T00:00:00`).toLocaleDateString("et-EE")} · {draft.durationWeeks} nädalat
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Dumbbell className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Programm</p>
              <p className="font-medium">
                {draft.programTitle || `${selectedClient?.email} personaalprogramm`}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Clock3 className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Treeningrütm</p>
              <p className="font-medium">
                {draft.trainingDaysPerWeek} päeva nädalas · progressioon {draft.autoProgressionEnabled ? "sees" : "väljas"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {activeDays.map((day) => (
          <Card key={day.day_number}>
            <CardContent className="p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h4 className="font-semibold">{day.title}</h4>
                <Badge variant="secondary">{day.exercises.length} harjutust</Badge>
              </div>
              <div className="space-y-2">
                {day.exercises.map((exercise, index) => (
                  <div
                    key={exercise.local_id}
                    className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 truncate">
                      {index + 1}. {exercise.exercise_name}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {exercise.sets} × {exercise.kind === "time" ? `${exercise.seconds} s` : exercise.reps}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
        <p>
          Avaldamine toimub ühe turvalise tehinguna. Kui midagi ebaõnnestub, ei jää andmebaasi poolikut kava.
        </p>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="fixed left-0 top-0 z-[100] flex h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden border-0 p-0 sm:left-1/2 sm:top-1/2 sm:h-[min(92vh,900px)] sm:w-[min(96vw,1180px)] sm:max-w-[1180px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border"
        data-testid="program-creator"
      >
        <DialogHeader className="shrink-0 border-b bg-background px-4 py-4 pr-14 text-left sm:px-6">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 hidden h-10 w-10 items-center justify-center rounded-xl bg-primary/10 sm:flex">
              <FileCheck2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg sm:text-xl">Loo kliendile programm</DialogTitle>
              <DialogDescription className="mt-1">
                Samm {draft.step}/3 · mustand salvestub automaatselt
              </DialogDescription>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2" aria-label="Programmi loomise sammud">
            {[
              { step: 1, label: "Seaded" },
              { step: 2, label: "Treeningud" },
              { step: 3, label: "Avaldamine" },
            ].map((item) => (
              <div key={item.step} className="space-y-1.5">
                <div
                  className={`h-1.5 rounded-full ${draft.step >= item.step ? "bg-primary" : "bg-muted"}`}
                />
                <p
                  className={`text-center text-[11px] sm:text-xs ${draft.step === item.step ? "font-semibold text-foreground" : "text-muted-foreground"}`}
                >
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-muted/15 px-4 py-5 sm:px-6 sm:py-7">
          {formError && (
            <div
              role="alert"
              className="mx-auto mb-5 flex max-w-5xl gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"
            >
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p>{formError}</p>
            </div>
          )}

          {draft.step === 1 && renderSettings()}
          {draft.step === 2 && renderTrainingDays()}
          {draft.step === 3 && renderReview()}
        </div>

        <div className="shrink-0 border-t bg-background px-4 py-3 sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center justify-between gap-3 sm:justify-start">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={creating}
                    className="h-11 text-muted-foreground"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Alusta uuesti
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="z-[120] max-w-md">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Kustutan poolelioleva mustandi?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Kõik selle programmi seaded, päevad ja harjutused eemaldatakse. Seda ei saa tagasi võtta.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Jätka koostamist</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={resetDraft}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Kustuta mustand
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
                <Save className="h-3.5 w-3.5" />
                {lastSavedAt ? "Mustand salvestatud" : "Salvestan mustandit…"}
              </div>
            </div>

            <div className="flex gap-2">
              {draft.step > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => goToStep((draft.step - 1) as 1 | 2)}
                  disabled={creating}
                  className="h-11 flex-1 sm:flex-none"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Tagasi
                </Button>
              )}

              {draft.step < 3 ? (
                <Button
                  type="button"
                  onClick={() => goToStep((draft.step + 1) as 2 | 3)}
                  className="h-11 flex-1 sm:min-w-40 sm:flex-none"
                >
                  Jätka
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => void handleCreateProgram()}
                  disabled={creating}
                  className="h-11 flex-1 sm:min-w-48 sm:flex-none"
                >
                  {creating ? (
                    "Avaldan programmi…"
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Avalda programm
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
