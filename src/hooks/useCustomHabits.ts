import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type CustomHabit = {
  id: string;
  title: string;
  icon_name: string;
  is_active: boolean;
  sort_order: number;
  done: boolean; // client-side state for today's completion
};

export type HabitLog = {
  date: string;
  habit_id: string;
  completed: boolean;
};

// Default habits to create for new users
const DEFAULT_HABITS = [
  { title: "Olin sotsiaalne", icon_name: "Trophy", sort_order: 1 },
  { title: "Jõin piisavalt vett", icon_name: "Zap", sort_order: 2 },
  { title: "Liikusin 30+ minutit", icon_name: "Activity", sort_order: 3 },
  { title: "Magasin 7+ tundi", icon_name: "CheckCircle", sort_order: 4 },
];

const MAX_HABITS = 4;

export function useCustomHabits() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<CustomHabit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load user's custom habits
  const loadHabits = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // First, get user's custom habits
      const { data: customHabits, error: habitsError } = await supabase
        .from("custom_habits")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("sort_order");

      if (habitsError) throw habitsError;

      // If no custom habits exist, create default ones
      if (!customHabits || customHabits.length === 0) {
        const { error: insertError } = await supabase
          .from("custom_habits")
          .insert(
            DEFAULT_HABITS.map((habit) => ({
              user_id: user.id,
              ...habit,
            }))
          );

        if (insertError) throw insertError;

        // Reload habits after creating defaults
        const { data: newHabits, error: reloadError } = await supabase
          .from("custom_habits")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .order("sort_order");

        if (reloadError) throw reloadError;
        customHabits.push(...(newHabits || []));
      }

      // Get today's completion status
      const today = new Date().toISOString().slice(0, 10);
      const { data: todayLogs } = await supabase
        .from("challenge_logs")
        .select("challenge_id")
        .eq("user_id", user.id)
        .eq("date", today);

      const completedToday = new Set(todayLogs?.map((log) => log.challenge_id) ?? []);

      // Combine habits with completion status
      const habitsWithStatus: CustomHabit[] = customHabits.map((habit) => ({
        id: habit.id,
        title: habit.title,
        icon_name: habit.icon_name,
        is_active: habit.is_active,
        sort_order: habit.sort_order,
        done: completedToday.has(habit.id),
      }));

      setHabits(habitsWithStatus);
    } catch (e) {
      console.error("Error loading habits:", e);
      setError(e instanceof Error ? e.message : "Failed to load habits");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHabits();
  }, [user]);

  // Toggle habit completion for today
  const toggleHabit = async (habitId: string) => {
    if (!user) return;

    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;

    const today = new Date().toISOString().slice(0, 10);

    try {
      if (habit.done) {
        // Remove completion
        await supabase
          .from("challenge_logs")
          .delete()
          .eq("user_id", user.id)
          .eq("date", today)
          .eq("challenge_id", habitId);
      } else {
        // Add completion
        await supabase
          .from("challenge_logs")
          .insert({
            user_id: user.id,
            date: today,
            challenge_id: habitId,
            challenge_slug: habitId, // Use habit ID as slug for custom habits
          });
      }

      // Update local state
      setHabits((prev) =>
        prev.map((h) =>
          h.id === habitId ? { ...h, done: !h.done } : h
        )
      );
    } catch (e) {
      console.error("Error toggling habit:", e);
      setError(e instanceof Error ? e.message : "Failed to toggle habit");
    }
  };

  // Add new custom habit
  const addHabit = async (title: string, iconName: string = "CheckCircle") => {
    if (!user) return;

    // Check if user already has max habits
    if (habits.length >= MAX_HABITS) {
      throw new Error(`Maksimaalselt ${MAX_HABITS} harjumust lubatud`);
    }

    try {
      const maxOrder = Math.max(...habits.map((h) => h.sort_order), 0);
      const { data, error } = await supabase
        .from("custom_habits")
        .insert({
          user_id: user.id,
          title: title.trim(),
          icon_name: iconName,
          sort_order: maxOrder + 1,
        })
        .select()
        .single();

      if (error) throw error;

      // Refresh habits list to ensure consistency
      await loadHabits();

      return data;
    } catch (e) {
      console.error("Error adding habit:", e);
      setError(e instanceof Error ? e.message : "Failed to add habit");
      throw e;
    }
  };

  // Get archived habits for recovery
  const getArchivedHabits = async () => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from("custom_habits")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", false)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error("Error loading archived habits:", e);
      return [];
    }
  };

  // Restore archived habit
  const restoreHabit = async (habitId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("custom_habits")
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq("id", habitId)
        .eq("user_id", user.id);

      if (error) throw error;

      // Refresh habits list
      await loadHabits();
    } catch (e) {
      console.error("Error restoring habit:", e);
      setError(e instanceof Error ? e.message : "Failed to restore habit");
    }
  };

  // Remove custom habit
  const removeHabit = async (habitId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("custom_habits")
        .update({ is_active: false })
        .eq("id", habitId)
        .eq("user_id", user.id);

      if (error) throw error;

      // Remove from local state
      setHabits((prev) => prev.filter((h) => h.id !== habitId));
    } catch (e) {
      console.error("Error removing habit:", e);
      setError(e instanceof Error ? e.message : "Failed to remove habit");
    }
  };

  // Get habit statistics for the last month
  const getHabitStats = async () => {
    if (!user) return null;

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const { data, error } = await supabase
        .from("challenge_logs")
        .select("date, challenge_id")
        .eq("user_id", user.id)
        .gte("date", startDate.toISOString().slice(0, 10))
        .lte("date", endDate.toISOString().slice(0, 10));

      if (error) throw error;

      // Calculate statistics
      const habitStats = habits.map((habit) => {
        const completions = data?.filter((log) => log.challenge_id === habit.id) || [];
        return {
          habitId: habit.id,
          habitTitle: habit.title,
          completions: completions.length,
          completionRate: Math.round((completions.length / 30) * 100),
        };
      });

      const totalCompletions = data?.length || 0;
      const averagePerDay = totalCompletions / 30;
      const totalPossible = habits.length * 30;
      const overallRate = Math.round((totalCompletions / totalPossible) * 100);

      return {
        habits: habitStats,
        totalCompletions,
        averagePerDay: Math.round(averagePerDay * 10) / 10,
        overallCompletionRate: overallRate,
      };
    } catch (e) {
      console.error("Error getting habit stats:", e);
      return null;
    }
  };

  return {
    habits,
    loading,
    error,
    toggleHabit,
    addHabit,
    removeHabit,
    getHabitStats,
    getArchivedHabits,
    restoreHabit,
    refreshHabits: loadHabits,
    maxHabits: MAX_HABITS,
    canAddMore: habits.length < MAX_HABITS,
  };
}