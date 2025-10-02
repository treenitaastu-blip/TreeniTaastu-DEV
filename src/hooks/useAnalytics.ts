// src/hooks/useAnalytics.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AnalyticsData = {
  totalUsers?: number;            // now provided by updated RPC
  activeUsers7d?: number;         // maps from active_users
  newUsers7d?: number;            // now provided by updated RPC
  avgSessionsPerUser7d?: number;  // now provided by updated RPC
  completionRate30d?: number;     // maps from completion_rate
  avgRpe7d?: number;              // maps from avg_rpe
  workoutsStarted7d?: number;     // now provided by updated RPC
  workoutsCompleted7d?: number;   // now provided by updated RPC
  dropoffDayMean?: number;        // maps from dropoff_day
  retentionDay7?: number;         // now provided by updated RPC
  retentionDay30?: number;        // now provided by updated RPC
  totalVolumeKg?: number;         // total volume lifted in kg (30 days)
};

type State = {
  data: AnalyticsData | null;
  loading: boolean;
  error: unknown;
};

const INITIAL: State = { data: null, loading: true, error: null };

type AnyRecord = Record<string, unknown>;

function n(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const x = Number(v);
    if (!Number.isNaN(x)) return x;
  }
  return undefined;
}

/** Adapt the RPC row (snake_case) to UI shape (camelCase) */
function adaptFromRpc(row: AnyRecord | null): AnalyticsData | null {
  if (!row) return null;
  return {
    totalUsers: n(row.total_users),
    activeUsers7d: n(row.active_users),
    newUsers7d: n(row.new_users_7d),
    avgSessionsPerUser7d: n(row.avg_sessions_per_user_7d),
    completionRate30d: n(row.completion_rate),
    avgRpe7d: n(row.avg_rpe),
    workoutsStarted7d: n(row.workouts_started_7d),
    workoutsCompleted7d: n(row.workouts_completed_7d),
    dropoffDayMean: n(row.dropoff_day),
    retentionDay7: n(row.retention_day_7),
    retentionDay30: n(row.retention_day_30),
    totalVolumeKg: n(row.total_volume_kg),
  };
}

/** Fallback adapters for views if you keep them */
function adaptFromProgramAnalytics(row: AnyRecord | null): AnalyticsData | null {
  if (!row) return null;
  return {
    completionRate30d: n(row.completion_rate),
    dropoffDayMean: n(row.most_common_dropoff_day),
    totalUsers: n(row.total_users),
    workoutsCompleted7d: n(row.total_completions),
  };
}

async function fetchAnalyticsOnce(): Promise<{ row: AnyRecord | null; error: unknown; source?: string; }> {
  // 1) Preferred: RPC
  try {
    const { data, error } = await supabase.rpc("get_analytics_summary");
    if (!error && data) {
      const first = Array.isArray(data) ? (data[0] as AnyRecord) : (data as AnyRecord);
      if (first && typeof first === "object") {
        return { row: { __source: "rpc", ...first }, error: null, source: "rpc" };
      }
    }
  } catch (e) {
    console.warn("[useAnalytics] RPC get_analytics_summary failed:", e);
  }

  // 2) Fallback: v_program_analytics
  try {
    const { data, error } = await supabase.from("v_program_analytics").select("*").limit(1);
    if (!error && Array.isArray(data) && data.length > 0) {
      return { row: { __source: "v_program_analytics", ...data[0] as AnyRecord }, error: null, source: "view" };
    }
  } catch (e) {
    console.warn("[useAnalytics] v_program_analytics fetch failed:", e);
  }

  // 3) Last resort: v_session_summary count
  try {
    const { data, error } = await supabase.from("v_session_summary").select("session_id");
    if (!error && Array.isArray(data)) {
      return { row: { __source: "v_session_summary", total_sessions: data.length }, error: null, source: "view" };
    }
  } catch (e) {
    console.warn("[useAnalytics] v_session_summary fetch failed:", e);
  }

  return {
    row: null,
    error: "No analytics source found. Ensure RPC `get_analytics_summary()` (preferred) or fallback views exist."
  };
}

export function useAnalytics() {
  const [state, setState] = useState<State>(INITIAL);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    (async () => {
      setState((s) => ({ ...s, loading: true, error: null }));
      const { row, error } = await fetchAnalyticsOnce();
      if (!mounted.current) return;

      if (error) {
        console.warn("[useAnalytics] Error fetching analytics:", error);
        setState({ data: null, loading: false, error });
        return;
      }

      // Pick adapter based on source hint or keys
      let data: AnalyticsData | null = null;
      if (row && ("active_users" in row || "total_users" in row)) {
        data = adaptFromRpc(row);
      } else if (row && ("completion_rate" in row || "total_users" in row)) {
        data = adaptFromProgramAnalytics(row);
      }
      
      // Always provide fallback data structure even if all values are 0
      if (!data) {
        data = {
          totalUsers: 0,
          activeUsers7d: 0,
          newUsers7d: 0,
          avgSessionsPerUser7d: 0,
          completionRate30d: 0,
          avgRpe7d: 0,
          workoutsStarted7d: 0,
          workoutsCompleted7d: 0,
          dropoffDayMean: 0,
          retentionDay7: 0,
          retentionDay30: 0,
          totalVolumeKg: 0,
        };
      }
      
      setState({ data, loading: false, error: null });
    })();

    return () => { mounted.current = false; };
  }, []);

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const { row, error } = await fetchAnalyticsOnce();
    if (!mounted.current) return;

    if (error) {
      console.warn("[useAnalytics] Error refreshing analytics:", error);
      setState({ data: null, loading: false, error });
      return;
    }

    let data: AnalyticsData | null = null;
    if (row && ("active_users" in row || "total_users" in row)) {
      data = adaptFromRpc(row);
    } else if (row && ("completion_rate" in row || "total_users" in row)) {
      data = adaptFromProgramAnalytics(row);
    }
    
    // Always provide fallback data structure
    if (!data) {
      data = {
        totalUsers: 0,
        activeUsers7d: 0,
        newUsers7d: 0,
        avgSessionsPerUser7d: 0,
        completionRate30d: 0,
        avgRpe7d: 0,
        workoutsStarted7d: 0,
        workoutsCompleted7d: 0,
        dropoffDayMean: 0,
        retentionDay7: 0,
        retentionDay30: 0,
        totalVolumeKg: 0,
      };
    }
    
    setState({ data, loading: false, error: null });
  }, []);

  return useMemo(
    () => ({ data: state.data, loading: state.loading, error: state.error, refresh }),
    [state.data, state.loading, state.error, refresh]
  );
}