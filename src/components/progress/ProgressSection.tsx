// src/components/progress/ProgressSection.tsx
import { useEffect, useRef, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { CalendarProgress } from "@/components/CalendarProgress";
import { UserFriendlyError } from "@/components/UserFriendlyError";
import { Calendar, List, Flame, CheckCircle, Trophy } from "lucide-react";
import type { ProgramDay } from "@/types/program";
import { calcProgramStreak, isWeekend } from "@/lib/workweek";

/* ---------- Types ---------- */

type ViewMode = "calendar" | "list";

// Legacy database row type that includes individual exercise columns
type LegacyProgramDay = {
  id: string;
  week: number;
  day: number;
  title?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at?: string | null;
  exercise1?: string | null;
  exercise2?: string | null;
  exercise3?: string | null;
  exercise4?: string | null;
  exercise5?: string | null;
  sets1?: number | null;
  sets2?: number | null;
  sets3?: number | null;
  sets4?: number | null;
  sets5?: number | null;
  reps1?: number | null;
  reps2?: number | null;
  reps3?: number | null;
  reps4?: number | null;
  reps5?: number | null;
  seconds1?: number | null;
  seconds2?: number | null;
  seconds3?: number | null;
  seconds4?: number | null;
  seconds5?: number | null;
  hint1?: string | null;
  hint2?: string | null;
  hint3?: string | null;
  hint4?: string | null;
  hint5?: string | null;
  videolink1?: string | null;
  videolink2?: string | null;
  videolink3?: string | null;
  videolink4?: string | null;
  videolink5?: string | null;
};

type UserProgressRow = {
  id: string | number;
  programday_id: string;
  created_at: string | null;
  completed_at: string | null;
  programday: LegacyProgramDay | null;
};

type CompletedItem = {
  rowId: string;
  dateISO: string;
  programdayId: string;
  created_at: string | null;
  completed_at: string | null;
  dayMeta: ProgramDay | null;
};

/* ---------- Utils ---------- */

const safeDateISO = (primary?: string | null, fallback?: string | null) => {
  const src = primary ?? fallback ?? null;
  const d = src ? new Date(src) : new Date(NaN);
  if (Number.isNaN(d.getTime())) {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t.toISOString().slice(0, 10);
  }
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
};


const getWeekKey = (dateStr: string) => {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const weekNumber = getISOWeek(date);
  return `${year}-W${String(weekNumber).padStart(2, '0')}`;
};

const getISOWeek = (date: Date) => {
  const tempDate = new Date(date.valueOf());
  const dayNum = (date.getDay() + 6) % 7;
  tempDate.setDate(tempDate.getDate() - dayNum + 3);
  const firstThursday = tempDate.valueOf();
  tempDate.setMonth(0, 1);
  if (tempDate.getDay() !== 4) {
    tempDate.setMonth(0, 1 + ((4 - tempDate.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - tempDate.valueOf()) / 604800000);
};

/* ---------- Component ---------- */

export function ProgressSection() {
  const { user } = useAuth();

  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [items, setItems] = useState<CompletedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [weeklyBadges, setWeeklyBadges] = useState<string[]>([]);

  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const expandedRef = useRef<HTMLDivElement | null>(null);

  const isWeekendToday = useMemo(() => isWeekend(), []);

  /* ----- Load data ----- */
  useEffect(() => {
    const load = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        console.warn("[ProgressSection] Loading progress for user:", user.id);
        
        const { data, error } = await supabase
          .from("userprogress")
          .select(
            `
            id,
            programday_id,
            created_at,
            completed_at,
            programday:programday_id (
              id, week, day, title, notes, created_at, updated_at,
              exercise1, exercise2, exercise3, exercise4, exercise5,
              sets1, sets2, sets3, sets4, sets5,
              reps1, reps2, reps3, reps4, reps5,
              seconds1, seconds2, seconds3, seconds4, seconds5,
              hint1, hint2, hint3, hint4, hint5,
              videolink1, videolink2, videolink3, videolink4, videolink5
            )
          `
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        console.warn("[ProgressSection] Raw data:", data);
        console.warn("[ProgressSection] Error:", error);

        if (error) throw error;

        const rows = (data ?? []) as unknown as UserProgressRow[];

        const processed: CompletedItem[] = rows.map((row) => {
          // Convert legacy programday format to our expected format
          const dayMeta = row.programday ? {
            id: row.programday.id,
            week: row.programday.week,
            day: row.programday.day,
            title: row.programday.title || `Nädal ${row.programday.week}, Päev ${row.programday.day}`,
            notes: row.programday.notes,
            // Convert legacy individual exercise columns to exercises array
            exercises: [
              ...(row.programday.exercise1 ? [{
                order: 1,
                name: row.programday.exercise1,
                sets: row.programday.sets1,
                reps: row.programday.reps1,
                seconds: row.programday.seconds1,
                cues: row.programday.hint1,
                video_url: row.programday.videolink1
              }] : []),
              ...(row.programday.exercise2 ? [{
                order: 2,
                name: row.programday.exercise2,
                sets: row.programday.sets2,
                reps: row.programday.reps2,
                seconds: row.programday.seconds2,
                cues: row.programday.hint2,
                video_url: row.programday.videolink2
              }] : []),
              ...(row.programday.exercise3 ? [{
                order: 3,
                name: row.programday.exercise3,
                sets: row.programday.sets3,
                reps: row.programday.reps3,
                seconds: row.programday.seconds3,
                cues: row.programday.hint3,
                video_url: row.programday.videolink3
              }] : []),
              ...(row.programday.exercise4 ? [{
                order: 4,
                name: row.programday.exercise4,
                sets: row.programday.sets4,
                reps: row.programday.reps4,
                seconds: row.programday.seconds4,
                cues: row.programday.hint4,
                video_url: row.programday.videolink4
              }] : []),
              ...(row.programday.exercise5 ? [{
                order: 5,
                name: row.programday.exercise5,
                sets: row.programday.sets5,
                reps: row.programday.reps5,
                seconds: row.programday.seconds5,
                cues: row.programday.hint5,
                video_url: row.programday.videolink5
              }] : [])
            ],
            created_at: row.programday.created_at,
            updated_at: row.programday.updated_at
          } : null;

          return {
            rowId: String(row.id),
            dateISO: safeDateISO(row.completed_at, row.created_at),
            programdayId: row.programday_id,
            created_at: row.created_at,
            completed_at: row.completed_at,
            dayMeta,
          };
        });

        console.warn("[ProgressSection] Processed items:", processed);
        setItems(processed);

        // Calculate program streak (only workdays) - create proper date strings
        const completedDates = processed
          .map(d => d.dateISO)
          .filter(Boolean) // Remove any null/undefined dates
          .map(dateStr => {
            // Ensure YYYY-MM-DD format
            if (dateStr.length === 10 && dateStr.includes('-')) {
              return dateStr;
            }
            // Convert ISO datetime to date string if needed
            try {
              return new Date(dateStr).toISOString().slice(0, 10);
            } catch (e) {
              console.warn("[ProgressSection] Invalid date format:", dateStr);
              return null;
            }
          })
          .filter(Boolean) as string[];
        
        console.log("[ProgressSection] Completed dates for streak:", completedDates);
        const programStreak = calcProgramStreak(completedDates);
        console.log("[ProgressSection] Calculated streak:", programStreak);
        setStreak(programStreak);

        // Calculate weekly badges
        const weeklyCompletions = processed.reduce((acc, item) => {
          const weekKey = getWeekKey(item.dateISO);
          acc[weekKey] = (acc[weekKey] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const badges = Object.entries(weeklyCompletions)
          .filter(([_, count]) => count >= 5)
          .map(([week]) => week);
        
        setWeeklyBadges(badges);

      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[Progress load]", msg);
        setError(msg || "Viga andmete laadimisel");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  /* Scroll to expanded card */
  useEffect(() => {
    if (expandedRef.current) {
      expandedRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [expandedKey]);

  /* ----- Calendar click → open in list ----- */
  const handleDayClick = (iso: string) => {
    setViewMode("list");
    const row = items.find((i) => i.dateISO === iso);
    setExpandedKey(row ? row.rowId : null);
  };

  const calendarFeed = items.map(({ dateISO, programdayId }) => ({
    dateISO,
    programdayId,
  }));

  /* ----- Render ----- */
  if (loading) {
    return (
      <div className="mt-8">
        <div className="flex flex-col items-center gap-3 text-muted-foreground py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <div className="text-sm">Laen progressi andmeid…</div>
        </div>
      </div>
    );
  }

  if (isWeekendToday) {
    return (
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Sinu progress
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center py-8">
            <div className="text-muted-foreground mb-4">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nädalavahetus – programm on pausil.</p>
              <p className="text-sm">Progress on nähtav tööpäevadel.</p>
            </div>
            {streak > 0 && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-800 rounded-full text-sm">
                <Flame className="h-4 w-4" />
                Streak: {streak} päeva
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalProgramDays = 20;

  const renderExerciseList = (meta?: ProgramDay | null) => {
    if (!meta) return null;
    
    // Handle legacy programday format
    const exercises: string[] = [];
    for (let i = 1; i <= 5; i++) {
      const exerciseName = (meta as any)[`exercise${i}`];
      if (exerciseName && exerciseName.trim()) {
        exercises.push(exerciseName.trim());
      }
    }
    
    if (exercises.length === 0) return null;

    return (
      <div className="mt-3 rounded-lg border bg-muted/20 p-3">
        <div className="mb-2 text-xs text-muted-foreground">
          Selle päeva harjutused
        </div>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {exercises.map((exercise, idx) => (
            <li key={idx}>{exercise}</li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="mt-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Sinu progress</h2>
          <p className="text-muted-foreground">
            Jälgi oma treeningute arengut ja hoia järjepidevust
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Weekly badges */}
          {weeklyBadges.length > 0 && (
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-600">
                {weeklyBadges.length} nädalat 5+ treeningut
              </span>
            </div>
          )}

        </div>
      </div>

      {/* Mobile-friendly toggle */}
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <Button
          variant={viewMode === "calendar" ? "default" : "outline"}
          onClick={() => setViewMode("calendar")}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 min-h-[44px] px-4 py-3"
        >
          <Calendar className="h-4 w-4" />
          <span className="text-sm sm:text-base">Kalender</span>
        </Button>
        <Button
          variant={viewMode === "list" ? "default" : "outline"}
          onClick={() => setViewMode("list")}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 min-h-[44px] px-4 py-3"
        >
          <List className="h-4 w-4" />
          <span className="text-sm sm:text-base">Nimekiri</span>
        </Button>
      </div>

      {error && (
        <UserFriendlyError 
          error={error} 
          onRetry={() => window.location.reload()} 
          className="mb-6"
        />
      )}

      {/* Content */}
      {viewMode === "calendar" ? (
        <CalendarProgress
          completedDays={calendarFeed}
          totalProgramDays={totalProgramDays}
          onDayClick={handleDayClick}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <List className="h-5 w-5" />
              Lõpetatud treeningud
            </CardTitle>
            <CardDescription>
              Kõik sinu lõpetatud treeningud kronoloogilises järjestuses
            </CardDescription>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <CheckCircle className="mx-auto mb-4 h-16 w-16 opacity-30" />
                <h3 className="mb-2 text-lg font-medium text-foreground">Alusta oma treeningreis!</h3>
                <p className="mb-1">Sul pole veel ühtegi treeningut lõpetatud.</p>
                <p className="text-sm">
                  Kontrolli, kas sul on määratud treening või alusta uue programmiga.
                </p>
                {error && (
                  <div className="mt-4 px-4 py-2 bg-destructive/10 text-destructive rounded-md text-sm">
                    Viga andmete laadimisel: {error}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((it) => {
                  const isOpen = expandedKey === it.rowId;
                  return (
                    <div
                      key={it.rowId}
                      id={`completed-${it.rowId}`}
                      ref={isOpen ? expandedRef : null}
                      className="rounded-lg border p-3"
                    >
                      <div
                        className="flex cursor-pointer items-center justify-between"
                        onClick={() =>
                          setExpandedKey((prev) =>
                            prev === it.rowId ? null : it.rowId
                          )
                        }
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <div>
                            <div className="font-medium">Treening lõpetatud</div>
                            {it.dayMeta && (
                              <div className="text-sm text-muted-foreground">
                                Nädal {it.dayMeta.week}, Päev {it.dayMeta.day}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(
                            it.created_at ?? it.completed_at ?? Date.now()
                          ).toLocaleString("et-EE", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>

                      {isOpen && renderExerciseList(it.dayMeta)}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

    </div>
  );
}