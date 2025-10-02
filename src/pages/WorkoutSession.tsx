// src/pages/WorkoutSession.tsx
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SessionProgress from "@/components/workout/SessionProgress";
import RestTimer from "@/components/workout/RestTimer";
import { VideoPlayer } from "@/components/workout/VideoPlayer";

/** --------------------------
 *  Local types (DB-aligned)
 *  -------------------------- */
type UUID = string;

type ClientProgram = {
  id: UUID;
  assigned_to: UUID;
  is_active: boolean | null;
  title_override: string | null;
};

type ClientDay = {
  id: UUID;
  client_program_id: UUID;
  title: string;
  note: string | null;
  day_order: number | null;
};

type ClientItem = {
  id: UUID;
  client_day_id: UUID;
  exercise_name: string;
  sets: number;
  reps: string; // text
  seconds: number | null;
  weight_kg: number | null;
  order_in_day: number;
  coach_notes: string | null;
  rest_seconds: number | null;
  video_url: string | null;
};

type WorkoutSession = {
  id: UUID;
  client_program_id: UUID;
  client_day_id: UUID;
  user_id: UUID;
  started_at: string; // timestamptz
  ended_at: string | null;
  duration_minutes: number | null;
  last_activity_at: string | null;
};

type SetLog = {
  id: UUID;
  session_id: UUID;
  client_item_id: UUID;
  set_number: number;
  reps_done: number | null;
  seconds_done: number | null;
  weight_kg_done: number | null;
};

function nowIso() {
  return new Date().toISOString();
}
function minutesBetween(startIso: string, endIso: string) {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  return Math.max(0, Math.round((end - start) / 60000));
}
function draftKey(sessionId: string, kind: "notes" | "rpe" | "rir") {
  return `ws:${sessionId}:${kind}`;
}

/** --------------------------
 *  Page Component
 *  -------------------------- */
export default function WorkoutSessionPage() {
  const navigate = useNavigate();
  // Router supports /workout/:programId/:dayId (we'll canonicalize if needed)
  const { programId, dayId } = useParams<{ programId?: string; dayId?: string }>();

  const [me, setMe] = useState<{ id: UUID; email?: string | null } | null>(null);
  const [program, setProgram] = useState<ClientProgram | null>(null);
  const [day, setDay] = useState<ClientDay | null>(null);
  const [items, setItems] = useState<ClientItem[]>([]);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // per-item drafts
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [rpeDraft, setRpeDraft] = useState<Record<string, number>>({});
  const [rirDraft, setRirDraft] = useState<Record<string, number>>({});

  // per-set inputs
  const [setInputs, setSetInputs] = useState<
    Record<string, { reps?: number; seconds?: number; kg?: number }>
  >({});

  // naive de-dupe key `${itemId}:${n}`
  const [loggedSets, setLoggedSets] = useState<Record<string, boolean>>({});

  // Rest timer
  const [rest, setRest] = useState<{ open: boolean; seconds: number; label: string }>({
    open: false,
    seconds: 60,
    label: "Puhkepaus",
  });
  const restOpen = rest.open;
  const restSeconds = rest.seconds;
  const restLabel = rest.label;
  const setRestOpen = (open: boolean) => setRest((r) => ({ ...r, open }));
  const setRestSeconds = (seconds: number | ((n: number) => number)) =>
    setRest((r) => ({
      ...r,
      seconds: typeof seconds === "function" ? (seconds as (n: number) => number)(r.seconds) : seconds,
    }));

  // inline video toggles
  const [openVideoFor, setOpenVideoFor] = useState<Record<string, boolean>>({});
  const orderedItems = useMemo(
    () => [...items].sort((a, b) => a.order_in_day - b.order_in_day),
    [items]
  );

  const heartbeatRef = useRef<number | null>(null);

  const totalSets = useMemo(
    () => orderedItems.reduce((acc, it) => acc + Math.max(1, Number(it.sets || 0)), 0),
    [orderedItems]
  );
  const completedSets = useMemo(
    () => Object.keys(loggedSets).reduce((acc, k) => (loggedSets[k] ? acc + 1 : acc), 0),
    [loggedSets]
  );

  /** Bootstrap: auth → day (via secure join) → program (ownership) → items (via secure join) → session → hydrate logs/notes */
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        // session/user
        const { data: auth } = await supabase.auth.getUser();
        const user = auth?.user;
        if (!user) {
          navigate("/login", { replace: true });
          return;
        }
        if (!alive) return;
        setMe({ id: user.id as UUID, email: user.email });

        if (!dayId) {
          setError("Treeningpäeva ID puudub.");
          return;
        }

        // 1) Load day with hard ownership check via inner join to client_programs
        const { data: dayRaw, error: dayErr } = await supabase
          .from("client_days")
          .select(
            `
              id,
              client_program_id,
              title,
              note,
              day_order,
              client_programs!inner(assigned_to)
            `
          )
          .eq("id", dayId)
          .eq("client_programs.assigned_to", user.id)
          .maybeSingle();

        if (dayErr) throw dayErr;
        if (!dayRaw) {
          setError("Treeningpäeva ei leitud või puudub ligipääs.");
          return;
        }
        if (!alive) return;

        const dayRow = {
          id: dayRaw.id as UUID,
          client_program_id: dayRaw.client_program_id as UUID,
          title: (dayRaw.title ?? "") as string,
          note: (dayRaw.note ?? null) as string | null,
          day_order: (dayRaw.day_order ?? null) as number | null,
        } satisfies ClientDay;

        setDay(dayRow);

        // 2) Verify program ownership (extra explicit)
        const { data: progRow, error: progErr } = await supabase
          .from("client_programs")
          .select("id, assigned_to, is_active, title_override")
          .eq("id", dayRow.client_program_id)
          .eq("assigned_to", user.id)
          .single();

        if (progErr) throw progErr;
        if (!progRow) {
          setError("Sul puudub ligipääs sellele programmile.");
          return;
        }
        if (!alive) return;

        setProgram(progRow as ClientProgram);

        // Canonicalize route if URL programId doesn’t match actual
        if (programId && programId !== progRow.id) {
          navigate(`/workout/${progRow.id}/${dayRow.id}`, { replace: true });
          return; // stop further work; effect will rerun on new route
        }

        // 3) Items with enforced ownership (join client_days -> client_programs)
        const { data: itemsRaw, error: itemsErr } = await supabase
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
              order_in_day,
              coach_notes,
              rest_seconds,
              video_url,
              client_days!inner(
                id,
                client_programs!inner(assigned_to)
              )
            `
          )
          .eq("client_day_id", dayRow.id)
          .eq("client_days.client_programs.assigned_to", user.id)
          .order("order_in_day", { ascending: true });

        if (itemsErr) throw itemsErr;
        if (!alive) return;

        const mappedItems: ClientItem[] =
          (itemsRaw as Array<{
            id: string;
            client_day_id: string;
            exercise_name: string;
            sets: number;
            reps: string;
            seconds: number | null;
            weight_kg: number | null;
            order_in_day: number;
            coach_notes: string | null;
            rest_seconds: number | null;
            video_url: string | null;
          }>)?.map((row) => ({
            id: row.id,
            client_day_id: row.client_day_id,
            exercise_name: row.exercise_name,
            sets: row.sets,
            reps: row.reps,
            seconds: row.seconds ?? null,
            weight_kg: row.weight_kg ?? null,
            order_in_day: row.order_in_day,
            coach_notes: row.coach_notes ?? null,
            rest_seconds: row.rest_seconds ?? null,
            video_url: row.video_url ?? null,
          })) ?? [];

        setItems(mappedItems);

        // 4) Reuse existing open session or create
        const { data: existing, error: findErr } = await supabase
          .from("workout_sessions")
          .select(
            "id, client_program_id, client_day_id, user_id, started_at, ended_at, duration_minutes, last_activity_at"
          )
          .eq("user_id", user.id)
          .eq("client_day_id", dayRow.id)
          .is("ended_at", null)
          .order("started_at", { ascending: false })
          .limit(1);

        if (findErr) throw findErr;

        let sess: WorkoutSession | null =
          existing && existing.length ? (existing[0] as WorkoutSession) : null;

        if (!sess) {
          const { data: created, error: createErr } = await supabase
            .from("workout_sessions")
            .insert([
              {
                client_program_id: dayRow.client_program_id,
                client_day_id: dayRow.id,
                user_id: user.id,
                started_at: nowIso(),
                last_activity_at: nowIso(),
              },
            ])
            .select()
            .single();
          if (createErr) throw createErr;
          sess = created as unknown as WorkoutSession;
        }

        if (!alive) return;
        setSession(sess);

        // 5) hydrate set logs
        const { data: setLogs, error: logsErr } = await supabase
          .from("set_logs")
          .select(
            "id, session_id, client_item_id, set_number, reps_done, seconds_done, weight_kg_done"
          )
          .eq("session_id", sess.id);
        if (logsErr) {
          console.warn("Failed to load set logs", logsErr);
        } else if (alive) {
          const markMap: Record<string, boolean> = {};
          const inputMap: Record<string, { reps?: number; seconds?: number; kg?: number }> = {};
          (setLogs as SetLog[]).forEach((l) => {
            const k = `${l.client_item_id}:${l.set_number}`;
            markMap[k] = true;
            inputMap[k] = {
              reps: l.reps_done ?? undefined,
              seconds: l.seconds_done ?? undefined,
              kg: l.weight_kg_done ?? undefined,
            };
          });
          setLoggedSets(markMap);
          setSetInputs((prev) => ({ ...inputMap, ...prev }));
        }

        // 6) hydrate notes + last RPE + RIR (merge with localStorage drafts)
        const { data: notesRows, error: notesErr } = await supabase
          .from("exercise_notes")
          .select("client_item_id, notes, rpe, rir")
          .eq("session_id", sess.id)
          .eq("client_day_id", dayRow.id)
          .returns<any>(); // tolerate local type lag on new column

        const lsNotes = localStorage.getItem(draftKey(sess.id, "notes"));
        const lsRpe = localStorage.getItem(draftKey(sess.id, "rpe"));
        const lsRir = localStorage.getItem(draftKey(sess.id, "rir"));
        const localNotes: Record<string, string> = lsNotes ? JSON.parse(lsNotes) : {};
        const localRpe: Record<string, number> = lsRpe ? JSON.parse(lsRpe) : {};
        const localRir: Record<string, number> = lsRir ? JSON.parse(lsRir) : {};

        if (notesErr) {
          console.warn("Failed to load exercise notes", notesErr);
        } else if (alive) {
          const notesMap: Record<string, string> = { ...localNotes };
          const rpeMap: Record<string, number> = { ...localRpe };
          const rirMap: Record<string, number> = { ...localRir };
          (notesRows as Array<{ client_item_id: string; notes: string | null; rpe: number | null; rir: number | null }>).forEach(
            (n) => {
              if (!n?.client_item_id) return;
              if (n.notes != null && notesMap[n.client_item_id] == null) {
                notesMap[n.client_item_id] = n.notes;
              }
              if (typeof n.rpe === "number" && rpeMap[n.client_item_id] == null) {
                rpeMap[n.client_item_id] = n.rpe;
              }
              if (typeof n.rir === "number" && rirMap[n.client_item_id] == null) {
                rirMap[n.client_item_id] = n.rir;
              }
            }
          );
          setNotesDraft((prev) => ({ ...notesMap, ...prev }));
          setRpeDraft((prev) => ({ ...rpeMap, ...prev }));
          setRirDraft((prev) => ({ ...rirMap, ...prev }));
        }
      } catch (e) {
        const msg =
          e && typeof e === "object" && "message" in e
            ? String((e as { message?: string }).message)
            : "Tekkis viga andmete laadimisel.";
        console.error(e);
        setError(msg);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      // stop any pending state updates after unmount
      alive = false;
    };
  }, [dayId, programId, navigate]);

  /** Persist drafts locally when they change (scoped to session) */
  useEffect(() => {
    if (!session) return;
    const nid = draftKey(session.id, "notes");
    const rid = draftKey(session.id, "rpe");
    const iid = draftKey(session.id, "rir");
    localStorage.setItem(nid, JSON.stringify(notesDraft));
    localStorage.setItem(rid, JSON.stringify(rpeDraft));
    localStorage.setItem(iid, JSON.stringify(rirDraft));
  }, [session, notesDraft, rpeDraft, rirDraft]);

  /** Keep last_activity_at fresh periodically while page is visible */
  useEffect(() => {
    if (!session) return;

    const touch = async () => {
      try {
        await supabase
          .from("workout_sessions")
          .update({ last_activity_at: nowIso() })
          .eq("id", session.id);
      } catch (e) {
        console.warn("Heartbeat failed", e);
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") void touch();
    };

    document.addEventListener("visibilitychange", onVisibility);
    heartbeatRef.current = window.setInterval(() => {
      if (document.visibilityState === "visible") void touch();
    }, 60000);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    };
  }, [session]);

  /** Keep last_activity_at fresh on any interaction (memoized for lint) */
  const touchSession = useCallback(async () => {
    if (!session) return;
    const { error: updErr } = await supabase
      .from("workout_sessions")
      .update({ last_activity_at: nowIso() })
      .eq("id", session.id);
    if (updErr) {
      console.warn("Failed to touch session", updErr);
    }
  }, [session]);

  /** Mark one set as done (writes to set_logs with correct columns) */
  const markSetDone = useCallback(
    async (
      item: ClientItem,
      setNumber: number,
      override?: { reps?: number; seconds?: number; weightKg?: number; note?: string }
    ) => {
      if (!session || !me) return;
      const key = `${item.id}:${setNumber}`;
      if (loggedSets[key]) return;

      const input = setInputs[key] || {};
      const reps =
        typeof override?.reps === "number" ? override.reps : input.reps;
      const seconds =
        typeof override?.seconds === "number" ? override.seconds : input.seconds;
      const weightKg =
        typeof override?.weightKg === "number" ? override.weightKg : input.kg;

      // optimistic
      setLoggedSets((m) => ({ ...m, [key]: true }));
      setSaving(true);

      try {
        const basePatch = {
          marked_done_at: nowIso(),
          notes: override?.note ?? null,
          reps_done:
            typeof reps === "number" && Number.isFinite(reps) ? reps : null,
          seconds_done:
            typeof seconds === "number" && Number.isFinite(seconds) ? seconds : null,
          weight_kg_done:
            typeof weightKg === "number" && Number.isFinite(weightKg) ? weightKg : null,
        };

        // upsert on (session_id, client_item_id, set_number)
        const { error: upsertErr } = await supabase
          .from("set_logs")
          .upsert(
            [
              {
                session_id: session.id,
                client_item_id: item.id,
                set_number: setNumber,
                program_id: session.client_program_id,
                client_day_id: session.client_day_id,
                user_id: me.id,
                ...basePatch,
              },
            ],
            { onConflict: "session_id,client_item_id,set_number" }
          );

        if (upsertErr) {
          // fallback path
          const { data: existing, error: selErr } = await supabase
            .from("set_logs")
            .select("id")
            .eq("session_id", session.id)
            .eq("client_item_id", item.id)
            .eq("set_number", setNumber)
            .limit(1);
          if (selErr) throw selErr;

          if (!existing || existing.length === 0) {
            const { error: insErr } = await supabase.from("set_logs").insert([
              {
                session_id: session.id,
                client_item_id: item.id,
                set_number: setNumber,
                program_id: session.client_program_id,
                client_day_id: session.client_day_id,
                user_id: me.id,
                ...basePatch,
              },
            ]);
            if (insErr) throw insErr;
          } else {
            const { error: updErr } = await supabase
              .from("set_logs")
              .update(basePatch)
              .eq("id", existing[0].id);
            if (updErr) throw updErr;
          }
        }

        void touchSession();

        // Auto-open rest timer if rest_seconds defined
        const restSec =
          typeof item.rest_seconds === "number" && item.rest_seconds > 0
            ? item.rest_seconds
            : 60;
        setRest({ open: true, seconds: restSec, label: item.exercise_name });
      } catch (e) {
        // rollback optimistic flag
        setLoggedSets((m) => {
          const next = { ...m };
          delete next[key];
          return next;
        });
        const msg =
          e && typeof e === "object" && "message" in e
            ? String((e as { message?: string }).message)
            : "Seti märkimine ebaõnnestus.";
        console.error(e);
        setError(msg);
      } finally {
        setSaving(false);
      }
    },
    [session, me, loggedSets, setInputs, touchSession]
  );

  /** Save per-exercise note + RPE + RIR to exercise_notes */
  async function saveNotesAndRPE(item: ClientItem) {
    if (!session || !me || !day) return;
    setSaving(true);
    try {
      // fetch existing notes (to preserve rpe_history)
      const { data: existingRaw, error: selErr } = await supabase
        .from("exercise_notes")
        .select("id, rpe, rir, rpe_history")
        .eq("session_id", session.id)
        .eq("client_day_id", day.id)
        .eq("client_item_id", item.id)
        .eq("program_id", session.client_program_id)
        .maybeSingle()
        .returns<any>(); // tolerate local type lag

      if (selErr) throw selErr;

      const existing = (existingRaw ?? null) as
        | { id: UUID; rpe: number | null; rir: number | null; rpe_history: Array<{ at: string; rpe: number }> | null }
        | null;

      const note = notesDraft[item.id] ?? "";
      const rawRpe = rpeDraft[item.id];
      const rawRir = rirDraft[item.id];

      const nextRpe =
        typeof rawRpe === "number" && Number.isFinite(rawRpe) && rawRpe > 0 ? rawRpe : null;
      const nextRir =
        typeof rawRir === "number" && Number.isFinite(rawRir) && rawRir >= 0 ? rawRir : null;

      if (!existing) {
        const row = {
          session_id: session.id,
          client_day_id: day.id,
          client_item_id: item.id,
          program_id: session.client_program_id,
          notes: note,
          rpe: nextRpe,
          rir: nextRir,
          rpe_history: nextRpe != null ? [{ at: nowIso(), rpe: nextRpe }] : [],
        };
        const { error: insErr } = await supabase.from("exercise_notes").insert([row]);
        if (insErr) throw insErr;
      } else {
        const prevHist: Array<{ at: string; rpe: number }> = Array.isArray(existing.rpe_history)
          ? (existing.rpe_history as Array<{ at: string; rpe: number }>)
          : [];
        const shouldAppend =
          nextRpe != null &&
          (typeof existing.rpe !== "number" || Number(existing.rpe) !== nextRpe);

        const patch = {
          notes: note,
          rpe: nextRpe,
          rir: nextRir,
          rpe_history: shouldAppend ? [...prevHist, { at: nowIso(), rpe: nextRpe }] : prevHist,
        };
        const { error: updErr } = await supabase
          .from("exercise_notes")
          .update(patch)
          .eq("id", existing.id);
        if (updErr) throw updErr;
      }

      void touchSession();
    } catch (e) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message?: string }).message)
          : "Märkmete salvestamine ebaõnnestus.";
      console.error(e);
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  /** Finish session: set ended_at and duration_minutes */
  async function finishSession() {
    if (!session) return;
    setSaving(true);
    try {
      const endIso = nowIso();
      const duration = minutesBetween(session.started_at, endIso);

      const { error: updErr } = await supabase
        .from("workout_sessions")
        .update({
          ended_at: endIso,
          duration_minutes: duration,
          last_activity_at: endIso,
        })
        .eq("id", session.id);
      if (updErr) throw updErr;

      // clear drafts
      localStorage.removeItem(draftKey(session.id, "notes"));
      localStorage.removeItem(draftKey(session.id, "rpe"));
      localStorage.removeItem(draftKey(session.id, "rir"));

      // Always go to ProgramDetail for this program
      navigate(`/programs/${session.client_program_id}`, { replace: true });
    } catch (e) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message?: string }).message)
          : "Sessiooni lõpetamine ebaõnnestus.";
      console.error(e);
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  /** --------------------------
   *  UI RENDER
   *  -------------------------- */

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="animate-pulse text-sm text-muted-foreground">Laadin treeningut…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div
          className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800"
          role="alert"
          aria-live="assertive"
        >
          {error}
        </div>
        <button className="rounded-lg border px-3 py-2 text-sm" onClick={() => window.location.reload()}>
          Proovi uuesti
        </button>
      </div>
    );
  }

  if (!day || !session) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="text-sm text-muted-foreground">Treening ei ole saadaval.</div>
      </div>
    );
  }

  const programInactive = program && program.is_active === false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      <div className="mx-auto max-w-4xl px-4 py-6 space-y-8">
        {/* Enhanced session progress */}
        <div className="sticky top-4 z-10">
          <SessionProgress
            startedAt={session.started_at}
            totalSets={totalSets}
            completedSets={completedSets}
            onFinish={finishSession}
          />
        </div>

        {/* Modern workout header */}
        <div className="bg-card rounded-2xl border shadow-sm p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">
                {day.title}
                {typeof day.day_order === "number" && day.day_order > 0 && (
                  <span className="ml-2 text-xl text-muted-foreground font-medium">
                    Päev {day.day_order}
                  </span>
                )}
              </h1>
              {program?.title_override && (
                <div className="text-base text-muted-foreground font-medium">
                  {program.title_override}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-muted-foreground">
                Alustatud
              </div>
              <div className="text-sm">
                {new Date(session.started_at).toLocaleString("et-EE")}
              </div>
            </div>
          </div>
          
          {day.note && (
            <div className="bg-muted/50 rounded-xl p-4 border">
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Treeningmärge:
              </div>
              <p className="text-sm leading-relaxed">{day.note}</p>
            </div>
          )}
          
          {programInactive && (
            <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-destructive"></div>
                <span className="text-sm font-medium text-destructive">
                  See programm on märgitud mitteaktiivseks. Logimine on piiratud.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Modern exercise list */}
        <div className="space-y-6">
          {orderedItems.map((it, idx) => {
            const sets = Math.max(1, it.sets || 1);
            const exerciseProgress = Array.from({ length: sets }).filter((_, setIdx) => 
              loggedSets[`${it.id}:${setIdx + 1}`]
            ).length;
            const isCompleted = exerciseProgress === sets;
            
            return (
              <div key={it.id} className="bg-card rounded-2xl border shadow-sm overflow-hidden">
                {/* Exercise header */}
                <div className="p-6 border-b">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        isCompleted 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-xl font-semibold mb-1">{it.exercise_name}</h3>
                        {it.coach_notes && (
                          <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
                            <strong>Juhendaja märge:</strong> {it.coach_notes}
                          </div>
                        )}
                        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                          <span>{sets} seeriat</span>
                          <span>{it.reps} kordust</span>
                          {it.weight_kg && <span>{it.weight_kg}kg</span>}
                          {it.seconds && <span>{it.seconds}s</span>}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Progress</div>
                        <div className="text-sm font-medium">
                          {exerciseProgress}/{sets}
                        </div>
                      </div>
                      {it.video_url && (
                        <button
                          className="rounded-lg border bg-background px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
                          onClick={() => setOpenVideoFor((m) => ({ ...m, [it.id]: !m[it.id] }))}
                        >
                          {openVideoFor[it.id] ? "Peida video" : "📹 Video"}
                        </button>
                      )}
                    </div>
                  </div>

                  {it.video_url && openVideoFor[it.id] && (
                    <div className="rounded-xl overflow-hidden border">
                      <VideoPlayer src={it.video_url} title={it.exercise_name} />
                    </div>
                  )}
                </div>

                {/* Sets grid */}
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {Array.from({ length: sets }).map((_, idx) => {
                      const n = idx + 1;
                      const key = `${it.id}:${n}`;
                      const done = !!loggedSets[key];
                      const inputs = setInputs[key] || {};
                      
                      return (
                        <div key={n} className={`rounded-xl border-2 transition-all duration-200 ${
                          done 
                            ? 'border-primary bg-primary/5' 
                            : 'border-muted hover:border-muted-foreground/30'
                        }`}>
                          <div className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-semibold text-sm">Seeria {n}</h4>
                              {done && (
                                <div className="flex items-center gap-1 text-xs text-primary font-medium">
                                  ✓ Valmis
                                </div>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-3 gap-2 mb-3">
                              <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">
                                  Reps
                                </label>
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  placeholder={it.reps}
                                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none"
                                  value={inputs.reps ?? ""}
                                  onChange={(e) =>
                                    setSetInputs((m) => ({
                                      ...m,
                                      [key]: {
                                        ...m[key],
                                        reps: e.target.value === "" ? undefined : Number(e.target.value),
                                      },
                                    }))
                                  }
                                  disabled={!!programInactive}
                                />
                              </div>
                              
                              <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">
                                  Sek
                                </label>
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  placeholder={it.seconds?.toString() || ""}
                                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none"
                                  value={inputs.seconds ?? ""}
                                  onChange={(e) =>
                                    setSetInputs((m) => ({
                                      ...m,
                                      [key]: {
                                        ...m[key],
                                        seconds: e.target.value === "" ? undefined : Number(e.target.value),
                                      },
                                    }))
                                  }
                                  disabled={!!programInactive}
                                />
                              </div>
                              
                              <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">
                                  Kg
                                </label>
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  step="0.5"
                                  placeholder={it.weight_kg?.toString() || ""}
                                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none"
                                  value={inputs.kg ?? ""}
                                  onChange={(e) =>
                                    setSetInputs((m) => ({
                                      ...m,
                                      [key]: {
                                        ...m[key],
                                        kg: e.target.value === "" ? undefined : Number(e.target.value),
                                      },
                                    }))
                                  }
                                  disabled={!!programInactive}
                                />
                              </div>
                            </div>
                            
                            <button
                              className={`w-full rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 ${
                                done
                                  ? "bg-primary text-primary-foreground cursor-default" 
                                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.98]"
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                              disabled={saving || done || !!programInactive}
                              onClick={() => void markSetDone(it, n)}
                            >
                              {done ? "✓ Märgitud" : "Märgi tehtuks"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Enhanced notes section */}
                  <div className="bg-muted/30 rounded-xl p-4 space-y-4">
                    <h4 className="font-semibold text-sm">Märkmed & Hinnangud</h4>
                    
                    <textarea
                      rows={3}
                      className="w-full rounded-lg border bg-background px-3 py-3 text-sm transition-colors focus:border-primary focus:outline-none resize-none"
                      placeholder="Märkmed harjutuse kohta (tunne, valu, tempo, raskus...)"
                      value={notesDraft[it.id] ?? ""}
                      onChange={(e) => setNotesDraft((m) => ({ ...m, [it.id]: e.target.value }))}
                      disabled={!!programInactive}
                    />
                    
                    <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-muted-foreground mb-1">
                            RPE (1-10)
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={10}
                            className="w-full rounded-lg border bg-background px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none"
                            placeholder="0"
                            value={rpeDraft[it.id] ?? ""}
                            onChange={(e) =>
                              setRpeDraft((m) => ({
                                ...m,
                                [it.id]: e.target.value === "" ? 0 : Number(e.target.value),
                              }))
                            }
                            disabled={!!programInactive}
                          />
                        </div>

                        <div className="flex-1">
                          <label className="block text-xs font-medium text-muted-foreground mb-1">
                            RIR (0-10)
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={10}
                            className="w-full rounded-lg border bg-background px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none"
                            placeholder="0"
                            value={rirDraft[it.id] ?? ""}
                            onChange={(e) =>
                              setRirDraft((m) => ({
                                ...m,
                                [it.id]: e.target.value === "" ? 0 : Number(e.target.value),
                              }))
                            }
                            disabled={!!programInactive}
                          />
                        </div>
                      </div>
                      
                      <button
                        className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        disabled={saving || !!programInactive}
                        onClick={() => void saveNotesAndRPE(it)}
                      >
                        💾 Salvesta
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modern footer */}
        <div className="bg-card rounded-2xl border shadow-sm p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              className="rounded-lg border bg-background px-6 py-3 text-sm font-medium hover:bg-muted transition-colors"
              onClick={() => navigate(`/programs/${day.client_program_id}`)}
            >
              ← Tagasi programmile
            </button>

            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Valmis seeriad</div>
                <div className="text-lg font-bold">
                  {completedSets}/{totalSets}
                </div>
              </div>
              
              <button
                className="rounded-lg bg-primary text-primary-foreground px-8 py-3 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.98]"
                disabled={saving || !!programInactive}
                onClick={() => void finishSession()}
              >
                {completedSets === totalSets ? "🎉 Lõpeta treening" : "Lõpeta treening"}
              </button>
            </div>
          </div>
        </div>

        {/* Rest timer overlay */}
        <RestTimer
          isOpen={restOpen}
          initialSeconds={restSeconds}
          label={restLabel}
          onClose={() => setRestOpen(false)}
          onAddSeconds={(s) => setRestSeconds((v) => v + s)}
          onReset={(s) => setRestSeconds(s)}
        />
      </div>
    </div>
  );
}
