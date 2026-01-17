import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ProgressionRecommendation {
  client_item_id: string;
  needs_recommendation: boolean;
  current_weight: number;
  sessions_without_change: number;
  message: string;
  reason?: string;
}

export interface ProgressionRecommendationsMap {
  [exerciseId: string]: ProgressionRecommendation;
}

/**
 * Hook to fetch progression recommendations for exercises in a program.
 * Checks if exercises have been using the same weight for 4+ sessions.
 */
export function useProgressionRecommendations(
  exerciseIds: string[],
  enabled: boolean = true
) {
  const [recommendations, setRecommendations] = useState<ProgressionRecommendationsMap>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = useCallback(async () => {
    if (!enabled || exerciseIds.length === 0) {
      setRecommendations({});
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch recommendations for all exercises in parallel
      const recommendationPromises = exerciseIds.map(async (exerciseId) => {
        const { data, error: rpcError } = await supabase.rpc('check_exercise_weight_stagnation', {
          p_client_item_id: exerciseId,
          p_min_sessions_without_change: 4
        });

        if (rpcError) {
          console.error(`Error checking progression for exercise ${exerciseId}:`, rpcError);
          return null;
        }

        return {
          exerciseId,
          recommendation: data as ProgressionRecommendation
        };
      });

      const results = await Promise.all(recommendationPromises);

      // Build recommendations map (only include exercises that need recommendations)
      const recommendationsMap: ProgressionRecommendationsMap = {};
      results.forEach((result) => {
        if (result && result.recommendation?.needs_recommendation) {
          recommendationsMap[result.exerciseId] = {
            ...result.recommendation,
            client_item_id: result.exerciseId
          };
        }
      });

      setRecommendations(recommendationsMap);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch progression recommendations';
      console.error('Error fetching progression recommendations:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [exerciseIds, enabled]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  return {
    recommendations,
    loading,
    error,
    refetch: fetchRecommendations
  };
}
