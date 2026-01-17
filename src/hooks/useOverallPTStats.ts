import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface OverallPTStats {
  totalVolumeKg: number;
  avgRPE: number;
  lastWorkout: string | null;
  loading: boolean;
}

/**
 * Shared hook to calculate overall Personal Training statistics.
 * Used by Home page and PersonalTrainingStats page to avoid duplicate calculations.
 */
export function useOverallPTStats() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const loadPTStats = async () => {
      try {
        // Load session summaries with set logs for proper volume calculation
        const { data: sessionData, error: sessionError } = await supabase
          .from("v_session_summary")
          .select(`
            *,
            set_logs(
              weight_kg_done,
              reps_done,
              seconds_done
            )
          `)
          .eq("user_id", user.id)
          .order("started_at", { ascending: false })
          .limit(50);

        if (sessionError) {
          console.error("PT stats error:", sessionError);
          return;
        }

        setSessions(sessionData || []);
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
        session.set_logs.forEach((setLog: any) => {
          if (setLog.weight_kg_done && setLog.reps_done) {
            totalVolumeKg += setLog.weight_kg_done * setLog.reps_done;
          }
        });
      }
    });
    
    // Calculate average RPE
    const avgRPE = sessions.length > 0 
      ? sessions.filter(s => s.avg_rpe).reduce((sum, s) => sum + (s.avg_rpe || 0), 0) / sessions.filter(s => s.avg_rpe).length 
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
  }, [sessions, loading]);

  return stats;
}
