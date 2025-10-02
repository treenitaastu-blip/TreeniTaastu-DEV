// src/pages/Progress.tsx
import { useEffect, useRef, useState } from "react";
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
import { MotivationBanner } from "@/components/MotivationBanner";
import { StaticProgressCard } from "@/components/smart-progression/StaticProgressCard";
import { useStaticProgression } from "@/hooks/useStaticProgression";
import { Calendar, List, Flame, CheckCircle } from "lucide-react";
import type { ProgramDay } from "@/types/program";
import { normalizeExercises } from "@/lib/program";

/* ---------- Types ---------- */

type ViewMode = "calendar" | "list";

type UserProgressRow = {
  id: string | number;
  programday_id: string;
  created_at: string | null;
  completed_at: string | null;
  programday: ProgramDay | null;
};

type CompletedItem = {
  rowId: string; // unique key
  dateISO: string;
  programdayId: string;
  created_at: string | null;
  completed_at: string | null;
  dayMeta: ProgramDay | null;
};

/* ---------- Utils ---------- */

const todayKey = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
};

/** Stable local day key (YYYY-MM-DD) from primary || fallback || today */
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

const dateKeyFrom = (input: string | Date) => {
  const d = typeof input === "string" ? new Date(input) : new Date(input);
  if (Number.isNaN(d.getTime())) {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t.toISOString().slice(0, 10);
  }
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
};

const MOTIVATION_DAY_KEY = "tt_motivation_day";

/* ---------- Component ---------- */

export default function Progress() {
  const { user } = useAuth();

  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [items, setItems] = useState<CompletedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);

  // Read localStorage in effect (avoid SSR/early issues)
  const [showMotivation, setShowMotivation] = useState<boolean>(false);
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        setShowMotivation(localStorage.getItem(MOTIVATION_DAY_KEY) === todayKey());
      }
    } catch {
      /* ignore */
    }
  }, []);

  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const expandedRef = useRef<HTMLDivElement | null>(null);

  // Smart static progression
  const { 
    staticProgress, 
    loading: progressLoading, 
    fetchStaticProgress 
  } = useStaticProgression(user?.id);

  const today = todayKey();

  /* ----- Load data ----- */
  useEffect(() => {
    const load = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("userprogress")
          .select(
            `
            id,
            programday_id,
            created_at,
            completed_at,
            programday:programday_id (
              id, week, day, title, notes, exercises, created_at, updated_at
            )
          `
          )
          .eq("user_id", user.id)
          .order("completed_at", { ascending: false });

        if (error) throw error;

        // Cast the result to our local row type
        const rows = (data ?? []) as unknown as UserProgressRow[];

        const processed: CompletedItem[] = rows.map((row) => ({
          rowId: String(row.id),
          dateISO: safeDateISO(row.completed_at, row.created_at),
          programdayId: row.programday_id,
          created_at: row.created_at,
          completed_at: row.completed_at,
          dayMeta: row.programday ?? null,
        }));

        setItems(processed);

        // compute workday streak using robust local day keys
        const doneSet = new Set(processed.map((d) => d.dateISO));
        let s = 0;
        const cursor = new Date();
        cursor.setHours(0, 0, 0, 0);
        while (doneSet.has(dateKeyFrom(cursor))) {
          s += 1;
          cursor.setDate(cursor.getDate() - 1);
        }
        setStreak(s);

        // persistent daily banner
        if (doneSet.has(today)) {
          localStorage.setItem(MOTIVATION_DAY_KEY, today);
          setShowMotivation(true);
        } else if (localStorage.getItem(MOTIVATION_DAY_KEY) !== today) {
          setShowMotivation(false);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[Progress load]", msg);
        setError(msg || "Viga andmete laadimisel");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user, today]);

  /* Listen for program-page completion event */
  useEffect(() => {
    const handler = () => {
      localStorage.setItem(MOTIVATION_DAY_KEY, today);
      setShowMotivation(true);
    };
    // The DOM lib types allow string event names; cast to EventListener for safety
    const asListener: EventListener = handler as unknown as EventListener;
    window.addEventListener("workout:completed", asListener);
    return () => {
      window.removeEventListener("workout:completed", asListener);
    };
  }, [today]);

  /* Hide banner at new day */
  useEffect(() => {
    if (localStorage.getItem(MOTIVATION_DAY_KEY) !== today) {
      setShowMotivation(false);
    }
  }, [today]);

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
      <div className="min-h-[60vh] grid place-items-center p-6">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <div className="text-sm">Laen progressi andmeid…</div>
        </div>
      </div>
    );
  }

  const totalProgramDays = 20;

  const renderExerciseList = (meta?: ProgramDay | null) => {
    if (!meta || !meta.exercises) return null;
    const exercises = normalizeExercises(meta.exercises);
    if (exercises.length === 0) return null;

    return (
      <div className="mt-3 rounded-lg border bg-muted/20 p-3">
        <div className="mb-2 text-xs text-muted-foreground">
          Selle päeva harjutused
        </div>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {exercises.map((exercise, idx) => (
            <li key={idx}>{exercise.name}</li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header + streak */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sinu progress</h1>
          <p className="text-muted-foreground">
            Jälgi oma treeningute arengut ja hoia järjepidevust
          </p>
        </div>

        <Card className="sm:w-auto">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white">
                <Flame className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Aktiivne streak</div>
                <div className="text-xl font-bold">{streak} päeva</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Persistent motivation banner */}
      <MotivationBanner isVisible={showMotivation} onClose={() => {}} />

      {/* Smart Progress Overview */}
      {staticProgress && (
        <StaticProgressCard
          staticProgress={staticProgress}
          onViewProgress={() => setViewMode("list")}
          onContinue={() => {
            // Navigate back to main program
            window.location.href = '/static-program';
          }}
        />
      )}

      {/* Toggle */}
      <div className="mb-6 flex items-center gap-2">
        <Button
          variant={viewMode === "calendar" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("calendar")}
          className="flex items-center gap-2"
        >
          <Calendar className="h-4 w-4" />
          Kalendrivaade
        </Button>
        <Button
          variant={viewMode === "list" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("list")}
          className="flex items-center gap-2"
        >
          <List className="h-4 w-4" />
          Nimekirjavaade
        </Button>
      </div>

      {error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="p-4">
            <div className="text-sm text-destructive">{error}</div>
          </CardContent>
        </Card>
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
              <div className="py-8 text-center text-muted-foreground">
                <CheckCircle className="mx-auto mb-3 h-12 w-12 opacity-50" />
                <p>Treeninguid pole veel lõpetatud.</p>
                <p className="text-sm">Alusta oma esimese treeninguga!</p>
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

                {/* If day clicked in calendar without a matching completion */}
                {expandedKey === null && viewMode === "list" && (
                  <div className="mt-4 text-sm text-muted-foreground">
                    Sellel päeval treening märkimata.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick stats */}
      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Kokku treeninguid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{items.length}</div>
            <p className="text-sm text-muted-foreground">
              {totalProgramDays}-st võimalikust
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Lõpetamise määr</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {Math.round((items.length / totalProgramDays) * 100)}%
            </div>
            <p className="text-sm text-muted-foreground">Programmist lõpetatud</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Parim streak</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{streak}</div>
            <p className="text-sm text-muted-foreground">Järjestikust päeva</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}