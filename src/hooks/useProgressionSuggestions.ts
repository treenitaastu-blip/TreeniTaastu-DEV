import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ProgressionSuggestion {
  type: 'weight' | 'reps';
  value: number;
  reason: string;
}

export function useProgressionSuggestions(exerciseId: string, userId?: string) {
  const [suggestion, setSuggestion] = useState<ProgressionSuggestion | null>(null);
  const [loading, setLoading] = useState(true);

  const generateSuggestion = useCallback(async () => {
    if (!userId) return;
    
    try {
      setLoading(true);

      // Get exercise history from the last 4 weeks
      const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString();

      const { data: exerciseData } = await supabase
        .from("client_items")
        .select("exercise_name, weight_kg, reps")
        .eq("id", exerciseId)
        .single();

      if (!exerciseData) return;

      // Get recent performance data
      const { data: recentSessions } = await supabase
        .from("workout_sessions")
        .select(`
          id,
          started_at,
          set_logs!inner(
            reps_done,
            weight_kg_done,
            client_item_id
          ),
          exercise_notes(
            rpe,
            client_item_id
          )
        `)
        .eq("user_id", userId)
        .eq("set_logs.client_item_id", exerciseId)
        .gte("started_at", fourWeeksAgo)
        .order("started_at", { ascending: false })
        .limit(10);

      if (!recentSessions || recentSessions.length < 2) {
        setLoading(false);
        return;
      }

      // Analyze performance trends
      let totalRpe = 0;
      let rpeCount = 0;
      let lastWeight = 0;
      let lastReps = 0;
      let completedSets = 0;
      let totalSets = 0;

      recentSessions.forEach(session => {
        session.set_logs.forEach(setLog => {
          totalSets++;
          if (setLog.reps_done && setLog.weight_kg_done) {
            completedSets++;
            lastWeight = Math.max(lastWeight, setLog.weight_kg_done);
            lastReps = Math.max(lastReps, setLog.reps_done);
          }
        });

        session.exercise_notes.forEach(note => {
          if (note.rpe && note.client_item_id === exerciseId) {
            totalRpe += note.rpe;
            rpeCount++;
          }
        });
      });

      const avgRpe = rpeCount > 0 ? totalRpe / rpeCount : 0;
      const completionRate = totalSets > 0 ? completedSets / totalSets : 0;

      // Generate suggestion based on performance
      let suggestionResult: ProgressionSuggestion | null = null;

      // Strong performance indicators for progression
      if (avgRpe < 7 && completionRate >= 0.8 && recentSessions.length >= 3) {
        // RPE is low and completion rate is high - ready for progression
        
        const currentWeight = exerciseData.weight_kg || lastWeight || 0;
        const targetReps = parseInt(exerciseData.reps) || lastReps || 8;

        if (currentWeight > 0 && avgRpe < 6) {
          // Suggest weight increase for very low RPE
          const increment = currentWeight <= 20 ? 1.25 : currentWeight <= 50 ? 2.5 : 5;
          suggestionResult = {
            type: 'weight',
            value: currentWeight + increment,
            reason: `RPE liiga madal (${avgRpe.toFixed(1)}). Proovi ${increment}kg raskemalt!`
          };
        } else if (avgRpe < 7 && lastReps < targetReps + 2) {
          // Suggest more reps if RPE is manageable
          suggestionResult = {
            type: 'reps',
            value: Math.min(targetReps + 2, lastReps + 1),
            reason: `Hea vorm! Proovi ${Math.min(targetReps + 2, lastReps + 1)} kordust.`
          };
        }
      } else if (avgRpe > 8.5) {
        // RPE is too high - suggest reduction
        const currentWeight = exerciseData.weight_kg || lastWeight || 0;
        if (currentWeight > 0) {
          const reduction = currentWeight <= 20 ? 1.25 : currentWeight <= 50 ? 2.5 : 5;
          suggestionResult = {
            type: 'weight',
            value: Math.max(currentWeight - reduction, currentWeight * 0.9),
            reason: `RPE liiga kõrge (${avgRpe.toFixed(1)}). Vähenda kaalu.`
          };
        }
      } else if (completionRate < 0.6) {
        // Low completion rate - suggest easier variation
        const currentWeight = exerciseData.weight_kg || lastWeight || 0;
        if (currentWeight > 0) {
          suggestionResult = {
            type: 'weight',
            value: Math.max(currentWeight * 0.85, currentWeight - 5),
            reason: "Madal lõpetamise määr. Proovi kergemat kaalu."
          };
        }
      }

      setSuggestion(suggestionResult);

    } catch (error) {
      console.error("Error generating progression suggestion:", error);
    } finally {
      setLoading(false);
    }
  }, [userId, exerciseId]);

  useEffect(() => {
    if (!exerciseId || !userId) {
      setSuggestion(null);
      setLoading(false);
      return;
    }

    generateSuggestion();
  }, [exerciseId, userId, generateSuggestion]);

  return { suggestion, loading };
}

export default useProgressionSuggestions;