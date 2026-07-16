import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export interface OverallPTStats {
  totalVolumeKg: number;
  avgRPE: number;
  lastWorkout: string | null;
  loading: boolean;
}

interface SetLogSummary {
  weight_kg_done: number | null;
  reps_done: number | null;
  seconds_done: number | null;
}

interface SessionSummary {
  started_at: string | null;
  ended_at: string | null;
  set_logs: SetLogSummary[] | null;
}

interface WorkoutFeedbackSummary {
  session_id: string;
  fatigue_level: number;
  created_at: string;
}

/**
 * Shared hook to calculate overall Personal Training statistics.
 * Used by Home page and PersonalTrainingStats page to avoid duplicate calculations.
 */
export function useOverallPTStats() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [workoutRPE, setWorkoutRPE] = useState<number[]>([]);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const loadPTStats = async () => {
      try {
        const [sessionResult, feedbackResult] = await Promise.all([
          supabase
            .from("v_session_summary")
            .select(`
              started_at,
              ended_at,
              set_logs(
                weight_kg_done,
                reps_done,
                seconds_done
              )
            `)
            .eq("user_id", user.id)
            .order("started_at", { ascending: false })
            .limit(50),
          supabase
            .from("workout_feedback")
            .select("session_id, fatigue_level, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(100),
        ]);

        const { data: sessionData, error: sessionError } = sessionResult;
        const { data: feedbackData, error: feedbackError } = feedbackResult;

        if (sessionError) {
          console.error("PT stats error:", sessionError);
        } else {
          setSessions((sessionData || []) as SessionSummary[]);
        }

        if (feedbackError) {
          console.error("Workout RPE stats error:", feedbackError);
        } else {
          // Historical data may contain more than one feedback row for a
          // session. Keep only the newest one so every workout has equal weight.
          const latestBySession = new Map<string, number>();
          (feedbackData as WorkoutFeedbackSummary[] | null)?.forEach((feedback) => {
            if (
              !latestBySession.has(feedback.session_id)
              && Number.isFinite(feedback.fatigue_level)
              && feedback.fatigue_level >= 1
              && feedback.fatigue_level <= 10
            ) {
              latestBySession.set(feedback.session_id, feedback.fatigue_level);
            }
          });

          setWorkoutRPE(Array.from(latestBySession.values()).slice(0, 50));
        }
      } catch (error) {
        console.error("PT stats error:", error);
      } finally {
        setLoading(false);
      }
    };

    loadPTStats();
  }, [user?.id]);

  const stats = useMemo(() => {
    // Calculate total volume from set logs
    let totalVolumeKg = 0;
    
    sessions.forEach(session => {
      if (session.set_logs && Array.isArray(session.set_logs)) {
        session.set_logs.forEach((setLog) => {
          if (setLog.weight_kg_done && setLog.reps_done) {
            totalVolumeKg += setLog.weight_kg_done * setLog.reps_done;
          }
        });
      }
    });
    
    // The RPE shown on the home page is the 1–10 effort score submitted after
    // finishing a workout, stored as workout_feedback.fatigue_level.
    const avgRPE = workoutRPE.length > 0
      ? workoutRPE.reduce((sum, rpe) => sum + rpe, 0) / workoutRPE.length
      : 0;

    // Get last workout date
    const lastWorkout = sessions.length > 0 
      ? (sessions[0]?.ended_at || sessions[0]?.started_at || null)
      : null;

    return {
      totalVolumeKg,
      avgRPE,
      lastWorkout,
      loading
    };
  }, [sessions, workoutRPE, loading]);

  return stats;
}
