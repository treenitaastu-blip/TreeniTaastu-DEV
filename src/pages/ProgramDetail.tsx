// src/pages/ProgramDetail.tsx
import { FormEvent, useEffect, useMemo, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import PTAccessValidator from "@/components/PTAccessValidator";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Dumbbell,
  Edit3,
  Home,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";

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
  is_active: boolean | null;
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
  const [savingTitle, setSavingTitle] = useState(false);

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

  const loadProgram = useCallback(async () => {
    if (!user || !programId) return;

    try {
      setLoading(true);
      setError(null);

        // Load program with better error handling
        const { data: programData, error: programError } = await supabase
          .from("client_programs")
          .select("id, title_override, start_date, assigned_to, is_active")
          .eq("id", programId)
          .eq("assigned_to", user.id)
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
            (itemsRaw as unknown as Array<{
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

      } catch (err) {
        console.error("Failed to load program:", err);
        setError("Programmi ei õnnestunud laadida. Palun proovi uuesti.");
      } finally {
        setLoading(false);
      }
    }, [user, programId]);

  useEffect(() => {
    loadProgram();
  }, [loadProgram]);

  const openSessionDay = openSessionDayId ? daysById[openSessionDayId] : null;
  const nextDay = nextUncompletedDayId ? daysById[nextUncompletedDayId] : null;

  const cancelTitleEditing = () => {
    if (savingTitle) return;
    setEditingTitle(false);
    setEditTitleValue(program?.title_override || "");
  };

  const handleSaveTitle = async () => {
    if (!programId || !user || savingTitle) return;

    setSavingTitle(true);
    try {
      const titleOverride = editTitleValue.trim() || null;
      const { error: updateError } = await supabase
        .from("client_programs")
        .update({ title_override: titleOverride })
        .eq("id", programId)
        .eq("assigned_to", user.id);

      if (updateError) throw updateError;

      setProgram((currentProgram) =>
        currentProgram ? { ...currentProgram, title_override: titleOverride } : currentProgram,
      );
      setEditingTitle(false);
      toast({
        title: "Nimetus muudetud",
        description: "Programmi uus nimetus on salvestatud.",
      });
    } catch (updateError) {
      console.error("Error updating title:", updateError);
      toast({
        title: "Nimetust ei saanud muuta",
        description: "Palun proovi hetke pärast uuesti.",
        variant: "destructive",
      });
    } finally {
      setSavingTitle(false);
    }
  };

  const handleTitleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void handleSaveTitle();
  };

  if (loading) {
    return (
      <div className="tt-app-loading" role="status">
        <div className="tt-app-loading__inner">
          <div className="tt-app-loading__mark" aria-hidden="true" />
          <p className="tt-app-loading__copy">Laen treeningkava…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tt-app-home tt-program-detail">
        <main className="tt-app-shell">
          <div className="tt-program-state" role="alert">
            <span className="tt-program-state__icon" aria-hidden="true">
              <RefreshCw size={22} />
            </span>
            <div>
              <h1 className="tt-app-panel__title">Kava ei saanud laadida</h1>
              <p className="tt-app-empty__copy">{error}</p>
              <div className="tt-program-state__actions">
                <button type="button" onClick={() => void loadProgram()} className="tt-app-button">
                  <RefreshCw size={17} aria-hidden="true" />
                  Proovi uuesti
                </button>
                <Link to="/programs" className="tt-app-button tt-app-button--secondary">
                  <ArrowLeft size={17} aria-hidden="true" />
                  Minu programmid
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="tt-app-home tt-program-detail">
        <main className="tt-app-shell">
          <div className="tt-program-state">
            <span className="tt-program-state__icon" aria-hidden="true">
              <Dumbbell size={22} />
            </span>
            <div>
              <h1 className="tt-app-panel__title">Programmi ei leitud</h1>
              <p className="tt-app-empty__copy">See kava ei ole enam saadaval.</p>
              <Link to="/programs" className="tt-app-button tt-program-state__button">
                <ArrowLeft size={17} aria-hidden="true" />
                Minu programmid
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const programTitle = program.title_override || "Treeningkava";
  const completedDayCount = program.days.filter((day) => completedDays.has(day.id)).length;
  const progressPercentage = program.days.length
    ? Math.round((completedDayCount / program.days.length) * 100)
    : 0;
  const startDate = program.start_date
    ? new Date(program.start_date).toLocaleDateString("et-EE")
    : "Täna";

  return (
    <PTAccessValidator>
      <div className="tt-app-home tt-program-detail">
        <main className="tt-app-shell">
          <nav className="tt-program-breadcrumb" aria-label="Breadcrumb">
            <Link to="/programs">
              <Home size={15} aria-hidden="true" />
              Minu programmid
            </Link>
            <ChevronRight size={15} aria-hidden="true" />
            <span aria-current="page">{programTitle}</span>
          </nav>

          <section className="tt-app-hero tt-program-detail__hero" aria-labelledby="program-title">
            <div>
              <p className="tt-app-kicker">Sinu treeningkava</p>
              {editingTitle ? (
                <form className="tt-program-title-edit" onSubmit={handleTitleSubmit}>
                  <label className="sr-only" htmlFor="program-detail-title">
                    Programmi nimetus
                  </label>
                  <input
                    id="program-detail-title"
                    value={editTitleValue}
                    onChange={(event) => setEditTitleValue(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") cancelTitleEditing();
                    }}
                    className="tt-program-title-edit__input"
                    placeholder="Treeningkava"
                    maxLength={120}
                    autoFocus
                    disabled={savingTitle}
                  />
                  <button
                    type="submit"
                    className="tt-program-title-edit__button"
                    aria-label="Salvesta programmi nimetus"
                    disabled={savingTitle}
                  >
                    {savingTitle ? (
                      <Loader2 className="animate-spin" size={18} aria-hidden="true" />
                    ) : (
                      <Check size={18} aria-hidden="true" />
                    )}
                  </button>
                  <button
                    type="button"
                    className="tt-program-title-edit__button"
                    onClick={cancelTitleEditing}
                    aria-label="Tühista nimetuse muutmine"
                    disabled={savingTitle}
                  >
                    <X size={18} aria-hidden="true" />
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  className="tt-program-detail__title-button"
                  onClick={() => {
                    setEditingTitle(true);
                    setEditTitleValue(programTitle);
                  }}
                  aria-label={`Muuda programmi „${programTitle}” nimetust`}
                >
                  <h1 id="program-title" className="tt-app-hero__title">
                    {programTitle}
                  </h1>
                  <Edit3 size={19} aria-hidden="true" />
                </button>
              )}
            </div>
            <div className="tt-program-detail__hero-aside">
              <p className="tt-app-hero__note">
                Vali järgmine treeningpäev, märgi seeriad tehtuks ja hoia oma areng ühes kohas.
              </p>
              <Link to="/programs" className="tt-program-back-link">
                <ArrowLeft size={16} aria-hidden="true" />
                Kõik programmid
              </Link>
            </div>
          </section>

          <dl className="tt-program-metrics" aria-label="Programmi ülevaade">
            <div className="tt-program-metric">
              <dt>Treeningpäevi</dt>
              <dd>{program.days.length}</dd>
            </div>
            <div className="tt-program-metric">
              <dt>Tehtud</dt>
              <dd>{completedDayCount}</dd>
            </div>
            <div className="tt-program-metric tt-program-metric--accent">
              <dt>Edusammud</dt>
              <dd>{progressPercentage}%</dd>
            </div>
            <div className="tt-program-metric">
              <dt>Alustatud</dt>
              <dd className="tt-program-metric__date">{startDate}</dd>
            </div>
          </dl>

          {openSessionDay ? (
            <section className="tt-program-next tt-program-next--active" aria-labelledby="next-workout-title">
              <div>
                <p className="tt-app-eyebrow">Pooleli olev treening</p>
                <h2 id="next-workout-title" className="tt-program-next__title">
                  Päev {openSessionDay.day_order} · {openSessionDay.title}
                </h2>
                <p className="tt-program-next__copy">Jätka sealt, kus viimati pooleli jäid.</p>
              </div>
              <Link to={`/workout/${program.id}/${openSessionDay.id}`} className="tt-app-button tt-app-button--paper">
                Jätka treeningut
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </section>
          ) : nextDay ? (
            <section className="tt-program-next" aria-labelledby="next-workout-title">
              <div>
                <p className="tt-app-eyebrow">Järgmine treening</p>
                <h2 id="next-workout-title" className="tt-program-next__title">
                  Päev {nextDay.day_order} · {nextDay.title}
                </h2>
                <p className="tt-program-next__copy">Sinu järgmine kavas olev treeningpäev.</p>
              </div>
              <Link to={`/workout/${program.id}/${nextDay.id}`} className="tt-app-button tt-app-button--paper">
                Alusta treeningut
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </section>
          ) : (
            <section className="tt-program-next tt-program-next--complete" aria-label="Programm lõpetatud">
              <div>
                <p className="tt-app-eyebrow">Programm lõpetatud</p>
                <h2 className="tt-program-next__title">Kõik treeningpäevad on tehtud.</h2>
                <p className="tt-program-next__copy">Tubli töö — saad soovi korral päevi uuesti teha.</p>
              </div>
              <CheckCircle2 size={32} aria-hidden="true" />
            </section>
          )}

          <section className="tt-program-schedule" aria-labelledby="schedule-title">
            <header className="tt-app-section-head">
              <h2 id="schedule-title" className="tt-app-section-head__title">Treeningplaan</h2>
              <span className="tt-app-section-head__label">Nädalate kaupa</span>
            </header>

            <div className="tt-program-weeks">
              {weeklyDays.map((week) => (
                <section key={week.weekNumber} className="tt-program-week" aria-labelledby={`week-${week.weekNumber}`}>
                  <header className="tt-program-week__head">
                    <div>
                      <p className="tt-app-eyebrow">Treeningtsükkel</p>
                      <h3 id={`week-${week.weekNumber}`} className="tt-program-week__title">
                        Nädal {week.weekNumber}
                      </h3>
                    </div>
                    {week.isCompleted ? (
                      <span className="tt-app-status is-active">
                        <CheckCircle2 size={14} aria-hidden="true" />
                        Lõpetatud
                      </span>
                    ) : null}
                  </header>

                  <div className="tt-program-days" role="list">
                    {week.days.map((day) => {
                      const isCompleted = completedDays.has(day.id);
                      const isOpen = openSessionDayId === day.id;
                      const actionLabel = isOpen ? "Jätka" : isCompleted ? "Tee uuesti" : "Alusta";

                      return (
                        <article
                          key={day.id}
                          className={`tt-program-day${isOpen ? " is-current" : ""}${isCompleted ? " is-complete" : ""}`}
                          role="listitem"
                        >
                          <div className="tt-program-day__topline">
                            <span className="tt-program-day__number">{String(day.day_order).padStart(2, "0")}</span>
                            {isCompleted ? <CheckCircle2 size={19} aria-label="Lõpetatud" /> : null}
                          </div>
                          <div className="tt-program-day__body">
                            <h4 className="tt-program-day__title">Päev {day.day_order}</h4>
                            <p className="tt-program-day__copy">{day.title}</p>
                          </div>
                          <div className="tt-program-day__meta">
                            <span>
                              <Dumbbell size={15} aria-hidden="true" />
                              {day.items.length} {day.items.length === 1 ? "harjutus" : "harjutust"}
                            </span>
                            {day.note ? (
                              <span>
                                <CalendarDays size={15} aria-hidden="true" />
                                Treeneri märkus
                              </span>
                            ) : null}
                          </div>
                          <Link
                            to={`/workout/${program.id}/${day.id}`}
                            className={`tt-app-button tt-app-button--wide${isCompleted ? " tt-app-button--secondary" : ""}`}
                            aria-label={`${actionLabel}: päev ${day.day_order}, ${day.title}`}
                          >
                            {actionLabel}
                            <ArrowRight size={17} aria-hidden="true" />
                          </Link>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </section>
        </main>
      </div>
    </PTAccessValidator>
  );
}
