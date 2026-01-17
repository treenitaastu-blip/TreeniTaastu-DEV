// src/pages/ProgramDetail.tsx
import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import PTAccessValidator from "@/components/PTAccessValidator";
import { CheckCircle2, Edit, Check, X } from "lucide-react";

/** ---------- Types ---------- */
type ClientProgram = {
  id: string;
  title_override?: string | null;
  start_date?: string | null;
  days: ClientDay[];
};

type ClientDay = {
  id: string;
  day_order: number;
  title: string;
  note?: string | null;
  items: ClientItem[];
};

type ExerciseAlternative = {
  id: string;
  alternative_name: string;
  alternative_description?: string;
  alternative_video_url?: string;
  difficulty_level: 'easier' | 'same' | 'harder';
  equipment_required?: string[];
  muscle_groups?: string[];
};

type ClientItem = {
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
};

/** Rows for meta */
type ProgramRow = {
  id: string;
  title_override: string | null;
  start_date: string | null;
  assigned_to: string;
};

export default function ProgramDetail() {
  const { programId } = useParams<{ programId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();

  const [program, setProgram] = useState<ClientProgram | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState("");

  // "Continue" helpers
  const [openSessionDayId, setOpenSessionDayId] = useState<string | null>(null);
  const [nextUncompletedDayId, setNextUncompletedDayId] = useState<string | null>(null);
  const [completedDays, setCompletedDays] = useState<Set<string>>(new Set());

  const daysById = useMemo(() => {
    const map: Record<string, ClientDay> = {};
    (program?.days ?? []).forEach((d) => (map[d.id] = d));
    return map;
  }, [program?.days]);

  // Group days by weeks (assuming 7 days per week)
  const weeklyDays = useMemo(() => {
    if (!program?.days) return [];
    
    const weeks: { weekNumber: number; days: ClientDay[]; isCompleted: boolean }[] = [];
    const days = [...program.days].sort((a, b) => a.day_order - b.day_order);
    
    for (let i = 0; i < days.length; i += 7) {
      const weekDays = days.slice(i, i + 7);
      const weekNumber = Math.floor(i / 7) + 1;
      const isCompleted = weekDays.every(day => completedDays.has(day.id));
      
      weeks.push({
        weekNumber,
        days: weekDays,
        isCompleted
      });
    }
    
    return weeks;
  }, [program?.days, completedDays]);

  // Auto-progression function when a week is completed
  const handleWeekCompletion = async (weekNumber: number) => {
    if (!program) return;

    try {
      // Increase difficulty by 5-10% for next week
      const { error } = await supabase.rpc('auto_progress_program', {
        p_program_id: program.id
      });

      if (error) {
        console.error('Auto progression error:', error);
      }
    } catch (err) {
      console.error('Failed to auto progress:', err);
    }
  };

  useEffect(() => {
    if (!user || !programId) return;

    const loadProgram = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load program with better error handling
        const { data: programData, error: programError } = await supabase
          .from("client_programs")
          .select("id, title_override, start_date, assigned_to, is_active")
          .eq("id", programId)
          .eq("assigned_to", user.id)
          .or("is_active.is.null,is_active.eq.true") // Only allow access to active programs (true or null, exclude false)
          .maybeSingle<ProgramRow>();

        if (programError) {
          console.error("Program loading error:", programError);
          throw new Error(`Programmi laadimisel tekkis viga: ${programError.message}`);
        }

        if (!programData) {
          throw new Error("Programm ei leitud, on deaktiveeritud või sul puudub sellele ligipääs");
        }

        // Double-check is_active in case it wasn't filtered properly
        if (programData.is_active === false) {
          throw new Error("See programm on deaktiveeritud ja pole enam kättesaadav");
        }

        // Load program days with proper error handling
        const { data: daysRaw, error: daysError } = await supabase
          .from("client_days")
          .select(
            `
              id,
              day_order,
              title,
              note,
              client_programs!inner(assigned_to)
            `
          )
          .eq("client_program_id", programId)
          .eq("client_programs.assigned_to", user.id)
          .order("day_order", { ascending: true });

        if (daysError) {
          console.error("Days loading error:", daysError);
          throw new Error(`Programmi päevade laadimisel tekkis viga: ${daysError.message}`);
        }

        const daysData =
          (daysRaw as Array<{
            id: string;
            day_order: number;
            title: string | null;
            note: string | null;
          }>) ?? [];

        if (daysData.length === 0) {
          console.warn("No days found for program:", programId);
          throw new Error("Programmi päevi ei leitud. Palun võta ühendust toega.");
        }

        const dayIds = daysData.map((d) => d.id);

        // Load exercise items with better error handling
        let itemsByDay: Record<string, ClientItem[]> = {};
        if (dayIds.length > 0) {
          const { data: itemsRaw, error: itemsError } = await supabase
            .from("client_items")
            .select(
              `
                id,
                client_day_id,
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
                total_reps,
                exercise_alternatives (
                  id,
                  alternative_name,
                  alternative_description,
                  alternative_video_url,
                  difficulty_level,
                  equipment_required,
                  muscle_groups
                ),
                client_days!inner(
                  id,
                  client_programs!inner(assigned_to)
                )
              `
            )
            .in("client_day_id", dayIds)
            .eq("client_days.client_programs.assigned_to", user.id)
            .order("order_in_day", { ascending: true });

          if (itemsError) {
            console.error("Items loading error:", itemsError);
            throw new Error(`Harjutuste laadimisel tekkis viga: ${itemsError.message}`);
          }

          const itemsData =
            (itemsRaw as Array<{
              id: string;
              client_day_id: string;
              exercise_name: string;
              sets: number;
              reps: string;
              seconds: number | null;
              weight_kg: number | null;
              rest_seconds: number | null;
              coach_notes: string | null;
              video_url: string | null;
              order_in_day: number;
              is_unilateral?: boolean;
              reps_per_side?: number | null;
              total_reps?: number | null;
              exercise_alternatives?: Array<{
                id: string;
                alternative_name: string;
                alternative_description?: string;
                alternative_video_url?: string;
                difficulty_level: 'easier' | 'same' | 'harder';
                equipment_required?: string[];
                muscle_groups?: string[];
              }>;
            }>) ?? [];

          itemsByDay = itemsData.reduce((acc, row) => {
            const arr = acc[row.client_day_id] ?? [];
            arr.push({
              id: row.id,
              exercise_name: row.exercise_name,
              sets: row.sets,
              reps: row.reps,
              seconds: row.seconds ?? null,
              weight_kg: row.weight_kg ?? null,
              rest_seconds: row.rest_seconds ?? null,
              coach_notes: row.coach_notes ?? null,
              video_url: row.video_url ?? null,
              order_in_day: row.order_in_day,
              is_unilateral: row.is_unilateral ?? false,
              reps_per_side: row.reps_per_side ?? null,
              total_reps: row.total_reps ?? null,
              alternatives: row.exercise_alternatives ?? [],
            });
            acc[row.client_day_id] = arr;
            return acc;
          }, {} as Record<string, ClientItem[]>);
        } else {
          console.warn("No day IDs to load items for");
        }

        // 4) Compose final shape
        const days: ClientDay[] = daysData.map((d) => ({
          id: d.id,
          day_order: d.day_order,
          title: d.title ?? `Päev ${d.day_order}`,
          note: d.note,
          items: (itemsByDay[d.id] ?? []).slice(),
        }));

        const composed: ClientProgram = {
          id: programData.id,
          title_override: programData.title_override,
          start_date: programData.start_date,
          days,
        };
        setProgram(composed);
        setEditTitleValue(programData.title_override || "");

        // 5) Continue helpers
        const { data: openSessions } = await supabase
          .from("workout_sessions")
          .select("client_day_id")
          .eq("client_program_id", programId)
          .eq("user_id", user.id)
          .is("ended_at", null)
          .order("started_at", { ascending: false })
          .limit(1);

        if (openSessions && openSessions.length) {
          setOpenSessionDayId(openSessions[0].client_day_id as string);
        } else {
          setOpenSessionDayId(null);
        }

        const { data: finishedSessions } = await supabase
          .from("workout_sessions")
          .select("client_day_id")
          .eq("client_program_id", programId)
          .eq("user_id", user.id)
          .not("ended_at", "is", null);

        const completedSet = new Set(
          (finishedSessions ?? []).map((s) => s.client_day_id as string)
        );
        setCompletedDays(completedSet);
        
        const next = (days ?? []).find((d) => !completedSet.has(d.id));
        setNextUncompletedDayId(next ? next.id : null);

        // Check for completed weeks and trigger auto-progression
        const weeks = [];
        for (let i = 0; i < days.length; i += 7) {
          const weekDays = days.slice(i, i + 7);
          const weekNumber = Math.floor(i / 7) + 1;
          const isCompleted = weekDays.every(day => completedSet.has(day.id));
          
          if (isCompleted) {
            await handleWeekCompletion(weekNumber);
          }
        }
        
      } catch (err) {
        const msg =
          err && typeof err === "object" && "message" in err
            ? String((err as { message?: string }).message)
            : "Failed to load program";
        // eslint-disable-next-line no-console
        console.error("Failed to load program:", err);
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    loadProgram();
  }, [user, programId]);

  const openSessionDay = openSessionDayId ? daysById[openSessionDayId] : null;
  const nextDay = nextUncompletedDayId ? daysById[nextUncompletedDayId] : null;

  if (loading) {
    return (
      <div className="min-h-[40vh] grid place-items-center p-6">
        <div className="text-sm text-muted-foreground">Laadin programmi…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[40vh] grid place-items-center p-6">
        <div className="text-center space-y-4">
          <div className="text-sm text-destructive">{error}</div>
          <Button asChild variant="outline">
            <Link to="/programs">Tagasi programmidele</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="min-h-[40vh] grid place-items-center p-6">
        <div className="text-center space-y-4">
          <div className="text-sm text-muted-foreground">Programmi ei leitud</div>
          <Button asChild variant="outline">
            <Link to="/programs">Tagasi programmidele</Link>
          </Button>
        </div>
      </div>
    );
  }

  const handleSaveTitle = async () => {
    if (!programId || !user) return;
    
    try {
      const { error } = await supabase
        .from('client_programs')
        .update({ title_override: editTitleValue.trim() || null })
        .eq('id', programId)
        .eq('assigned_to', user.id);

      if (error) throw error;

      setProgram(prev => prev ? { ...prev, title_override: editTitleValue.trim() || null } : prev);

      toast({
        title: "Nimetus muudetud",
        description: "Programmi nimetus on edukalt muudetud",
      });

      setEditingTitle(false);
    } catch (error) {
      console.error("Error updating title:", error);
      toast({
        title: "Viga",
        description: "Nimetuse muutmine ebaõnnestus",
        variant: "destructive",
      });
    }
  };

  return (
    <PTAccessValidator>
      <div className="min-h-screen bg-gradient-to-br from-brand-light via-background to-secondary">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex-1">
              {editingTitle ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editTitleValue}
                    onChange={(e) => setEditTitleValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveTitle();
                      } else if (e.key === 'Escape') {
                        setEditingTitle(false);
                        setEditTitleValue(program.title_override || "");
                      }
                    }}
                    autoFocus
                    className="text-3xl font-bold h-12"
                    placeholder="Treeningkava"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleSaveTitle}
                    className="h-9 w-9 p-0"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingTitle(false);
                      setEditTitleValue(program.title_override || "");
                    }}
                    className="h-9 w-9 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <h1 
                    className="text-3xl font-bold text-foreground cursor-pointer hover:text-primary transition-colors"
                    onClick={() => {
                      setEditingTitle(true);
                      setEditTitleValue(program.title_override || "");
                    }}
                  >
                    {program.title_override || "Treeningkava"}
                  </h1>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingTitle(true);
                      setEditTitleValue(program.title_override || "");
                    }}
                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                {program.days.length} päeva • Alustatud:{" "}
                {program.start_date
                  ? new Date(program.start_date).toLocaleDateString("et-EE")
                  : "Täna"}
              </div>
            </div>
            <Button asChild variant="outline">
              <Link to="/programs">Tagasi</Link>
            </Button>
          </div>

          {/* Continue banner */}
          {openSessionDay ? (
            <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
              <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <div className="text-sm">
                  Jätkamisel on pooleli treening:{" "}
                  <span className="font-medium">
                    Päev {openSessionDay.day_order}: {openSessionDay.title}
                  </span>
                </div>
                <Button asChild size="sm">
                  <Link to={`/workout/${program.id}/${openSessionDay.id}`}>Jätka treeningut</Link>
                </Button>
              </div>
            </div>
          ) : nextDay ? (
            <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-900">
              <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <div className="text-sm">
                  Soovitatav järgmine päev:{" "}
                  <span className="font-medium">
                    Päev {nextDay.day_order}: {nextDay.title}
                  </span>
                </div>
                <Button asChild size="sm" variant="hero">
                  <Link to={`/workout/${program.id}/${nextDay.id}`}>Alusta päevaga</Link>
                </Button>
              </div>
            </div>
          ) : null}

          {/* Weekly Training Days */}
          <div className="space-y-8">
            {program.days.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto max-w-md space-y-4">
                  <div className="text-lg font-medium text-foreground">
                    Programmi päevi ei leitud
                  </div>
                  <p className="text-muted-foreground">
                    Palun võta ühendust toega, et programm sulle määrata.
                  </p>
                </div>
              </div>
            ) : (
              weeklyDays.map((week) => (
                <div
                  key={week.weekNumber}
                  className="rounded-2xl border-0 bg-card/80 p-6 shadow-soft backdrop-blur"
                >
                  <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-semibold text-foreground">
                        Nädal {week.weekNumber}
                      </h2>
                      {week.isCompleted && (
                        <div className="flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                          <CheckCircle2 className="h-4 w-4" />
                          Lõpetatud
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {week.days.map((day) => {
                      const isCompleted = completedDays.has(day.id);
                      const isOpen = openSessionDayId === day.id;
                      
                      return (
                        <div
                          key={day.id}
                          className={`rounded-xl border p-4 transition-all ${
                            isCompleted
                              ? "border-green-200 bg-green-50"
                              : isOpen
                              ? "border-amber-300 bg-amber-50"
                              : "border-border bg-background hover:border-primary/20"
                          }`}
                        >
                          <div className="mb-3 flex items-start justify-between">
                            <div>
                              <h3 className="font-medium text-foreground">
                                Päev {day.day_order}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {day.title}
                              </p>
                            </div>
                            {isCompleted && (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            )}
                          </div>

                          <div className="mb-4 text-xs text-muted-foreground">
                            {day.items.length} harjutust
                            {day.items.some(item => item.alternatives && item.alternatives.length > 0) && (
                              <span className="ml-2 text-blue-600">• Alternatiivid saadaval</span>
                            )}
                          </div>

                          <Button 
                            asChild 
                            variant={isOpen ? "default" : isCompleted ? "outline" : "hero"}
                            size="sm" 
                            className="w-full"
                          >
                            <Link to={`/workout/${program.id}/${day.id}`}>
                              {isOpen ? "Jätka" : isCompleted ? "Korda" : "Alusta"}
                            </Link>
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </PTAccessValidator>
  );
}