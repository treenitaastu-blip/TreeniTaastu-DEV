// src/hooks/useProgressTracking.ts
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type UUID = string;

type WorkoutSession = {
  id: UUID;
  user_id: UUID;
  client_day_id: UUID;
  client_program_id: UUID;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
};

type SetLog = {
  id: UUID;
  session_id: UUID | null;
  client_item_id: UUID;
  set_number: number;
  reps_done: number | null;
  seconds_done: number | null;
  weight_kg_done: number | null;
  marked_done_at: string;
};

type VSessionSummary = {
  user_id: UUID | null;
  session_id: UUID | null;
  client_program_id: UUID | null;
  client_day_id: UUID | null;
  started_at: string | null;
  ended_at: string | null;
  duration_minutes: number | null;
  total_sets_completed: number | null;
  avg_rpe: number | null;
  day_title: string | null;
  program_title: string | null;
};

type VUserWeekly = {
  user_id: UUID | null;
  iso_week: string | null;
  sessions_count: number | null;
  completed_sessions: number | null;
  total_minutes: number | null;
  avg_minutes_per_session: number | null;
};

type UserStreaks = {
  current_streak: number | null;
  best_streak: number | null;
  last_workout_date: string | null;
};

export function useProgressTracking(opts?: { clientDayId?: UUID }) {
  const { clientDayId } = opts || {};
  const [userId, setUserId] = useState<UUID | null>(null);

  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [setLogs, setSetLogs] = useState<SetLog[]>([]);
  const [weekly, setWeekly] = useState<VUserWeekly | null>(null);
  const [summary, setSummary] = useState<VSessionSummary | null>(null);
  const [streaks, setStreaks] = useState<UserStreaks | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingSets, setLoadingSets] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** bootstrap: get user id */
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      if (alive) setUserId(uid);
    })();
    return () => {
      alive = false;
    };
  }, []);

  /** find current session (open for this day, else most recent today) */
  useEffect(() => {
    if (!userId) return;
    let alive = true;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        // prefer open session for the specific day (if passed)
        if (clientDayId) {
          const { data, error } = await supabase
            .from("workout_sessions")
            .select("*")
            .eq("user_id", userId)
            .eq("client_day_id", clientDayId)
            .is("ended_at", null)
            .order("started_at", { ascending: false })
            .limit(1);
          if (error) throw error;
          if (alive && data && data.length) {
            setSession(data[0] as WorkoutSession);
            return;
          }
        }

        // else: most recent session today (either open or ended)
        const today = new Date();
        const dayStart = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate()
        ).toISOString();
        const { data, error } = await supabase
          .from("workout_sessions")
          .select("*")
          .eq("user_id", userId)
          .gte("started_at", dayStart)
          .order("started_at", { ascending: false })
          .limit(1);
        if (error) throw error;

        if (alive) setSession((data?.[0] as WorkoutSession) ?? null);
      } catch (e: unknown) {
        console.error(e);
        if (alive)
          setError(
            e instanceof Error ? e.message : "Failed to load session"
          );
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [userId, clientDayId]);

  /** load + subscribe to set_logs for this session */
  useEffect(() => {
    if (!session?.id) {
      setSetLogs([]);
      return;
    }
    let alive = true;

    (async () => {
      setLoadingSets(true);
      try {
        const { data, error } = await supabase
          .from("set_logs")
          .select(
            "id, session_id, client_item_id, set_number, reps_done, seconds_done, weight_kg_done, marked_done_at"
          )
          .eq("session_id", session.id)
          .order("marked_done_at", { ascending: true });
        if (error) throw error;
        if (alive) setSetLogs((data ?? []) as SetLog[]);
      } catch (e: unknown) {
        console.error(e);
        if (alive)
          setError(
            e instanceof Error ? e.message : "Failed to load set logs"
          );
      } finally {
        if (alive) setLoadingSets(false);
      }
    })();

    const ch = supabase
      .channel(`set_logs:${session.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "set_logs",
          filter: `session_id=eq.${session.id}`,
        },
        (payload) => {
          setSetLogs((prev) => {
            const next = [...prev];
            if (payload.eventType === "INSERT") {
              next.push(payload.new as SetLog);
            } else if (payload.eventType === "UPDATE") {
              const ix = next.findIndex(
                (x) => x.id === (payload.new as { id: UUID }).id
              );
              if (ix >= 0) next[ix] = payload.new as SetLog;
            } else if (payload.eventType === "DELETE") {
              const ix = next.findIndex(
                (x) => x.id === (payload.old as { id: UUID }).id
              );
              if (ix >= 0) next.splice(ix, 1);
            }
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
      alive = false;
    };
  }, [session?.id]);

  /** fetch session-level summary (from view) */
  useEffect(() => {
    if (!userId || !session?.id) {
      setSummary(null);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("v_session_summary")
          .select("*")
          .eq("user_id", userId)
          .eq("session_id", session.id)
          .maybeSingle();
        if (error) throw error;
        if (alive) setSummary(data as VSessionSummary);
      } catch (e: unknown) {
        console.warn("[useProgressTracking] Session summary error:", e);
        if (alive) {
          // Don't set error for missing data, just set summary to null
          setSummary(null);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [userId, session?.id, setLogs.length]); // recompute after logs change

  /** fetch weekly aggregate + streaks */
  useEffect(() => {
    if (!userId) {
      setWeekly(null);
      setStreaks(null);
      return;
    }
    let alive = true;
    (async () => {
      try {
        // v_user_weekly: take the most recent week row
        const { data: weeklyRows, error: wErr } = await supabase
          .from("v_user_weekly")
          .select("*")
          .eq("user_id", userId)
          .order("iso_week", { ascending: false })
          .limit(1);
        if (wErr) throw wErr;
        if (alive) setWeekly((weeklyRows?.[0] as unknown as VUserWeekly) ?? null);

        // Set default streak values since user_streaks table is removed
        if (alive) {
          setStreaks({
            current_streak: 0,
            best_streak: 0,
            last_workout_date: null,
          });
        }
      } catch (e: unknown) {
        console.warn("[useProgressTracking] Weekly/streaks error:", e);
        if (alive) {
          // Provide fallback data instead of error for missing data
          setWeekly(null);
          setStreaks({
            current_streak: 0,
            best_streak: 0,
            last_workout_date: null,
          });
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [userId]);

  /** derived progress (client-side) */
  const derived = useMemo(() => {
    const setsDone = setLogs.length;
    const totalReps = setLogs.reduce((acc, s) => acc + (s.reps_done ?? 0), 0);
    // Fix weight calculation: should be weight * reps for each set
    const totalVolumeKg = setLogs.reduce(
      (acc, s) => {
        const weight = s.weight_kg_done ?? 0;
        const reps = s.reps_done ?? 0;
        return acc + (weight * reps);
      },
      0
    );
    return { setsDone, totalReps, totalVolumeKg };
  }, [setLogs]);

  return {
    loading: loading || (session?.id ? loadingSets : false),
    error,

    userId,
    session,

    // live per-session logs
    setLogs,

    // derived live progress
    setsDone: derived.setsDone,
    totalReps: derived.totalReps,
    totalVolumeKg: derived.totalVolumeKg,

    // server-side summaries
    summary,
    weekly,
    streaks,

    // simple refreshers
    refreshSession: async () => {
      if (!userId) return;
      const { data, error } = await supabase
        .from("workout_sessions")
        .select("*")
        .eq("user_id", userId)
        .is("ended_at", null)
        .order("started_at", { ascending: false })
        .limit(1);
      if (!error) setSession((data?.[0] as WorkoutSession) ?? null);
    },
    refreshWeekly: async () => {
      if (!userId) return;
      const { data } = await supabase
        .from("v_user_weekly")
        .select("*")
        .eq("user_id", userId)
        .order("iso_week", { ascending: false })
        .limit(1);
      setWeekly((data?.[0] as unknown as VUserWeekly) ?? null);
    },
  };
}
