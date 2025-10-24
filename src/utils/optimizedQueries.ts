import { supabase } from "@/integrations/supabase/client";
import { getAdminClient } from '@/utils/adminClient';

/**
 * Optimized database queries for the Personal Training system
 * These queries are designed to minimize database calls and improve performance
 */

// Cache for frequently accessed data
const queryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

// Cache TTL in milliseconds
const CACHE_TTL = {
  SHORT: 5 * 60 * 1000,    // 5 minutes
  MEDIUM: 15 * 60 * 1000,  // 15 minutes
  LONG: 60 * 60 * 1000,    // 1 hour
};

/**
 * Generic cache function
 */
function getCachedData<T>(key: string, ttl: number = CACHE_TTL.MEDIUM): T | null {
  const cached = queryCache.get(key);
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }
  return null;
}

function setCachedData<T>(key: string, data: T, ttl: number = CACHE_TTL.MEDIUM): void {
  queryCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  });
}

/**
 * Clear cache for a specific key or all cache
 */
export function clearCache(key?: string): void {
  if (key) {
    queryCache.delete(key);
  } else {
    queryCache.clear();
  }
}

/**
 * OPTIMIZED QUERIES FOR PERSONAL TRAINING SYSTEM
 */

/**
 * Get all client programs with template info and user emails in a single query
 */
export async function getClientProgramsOptimized() {
  const cacheKey = 'client_programs_optimized';
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const { data, error } = await supabase
      .from("client_programs")
      .select(`
        id,
        title_override,
        start_date,
        is_active,
        assigned_to,
        template_id,
        inserted_at,
        templates:template_id (
          id,
          title,
          goal
        ),
        profiles:assigned_to (
          id,
          email,
          full_name
        )
      `)
      .order("inserted_at", { ascending: false });

    if (error) throw error;

    // Transform data to include user_email for backward compatibility
    const transformedData = data?.map(program => ({
      ...program,
      user_email: program.profiles?.email || 'Unknown User',
      template_title: program.templates?.title || 'Unknown Template'
    })) || [];

    setCachedData(cacheKey, transformedData, CACHE_TTL.MEDIUM);
    return transformedData;
  } catch (error) {
    console.error('Error fetching client programs:', error);
    throw error;
  }
}

/**
 * Get all templates with basic info
 */
export async function getTemplatesOptimized() {
  const cacheKey = 'templates_optimized';
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const { data, error } = await supabase
      .from("workout_templates")
      .select(`
        id,
        title,
        goal,
        is_active,
        created_by,
        inserted_at
      `)
      .order("inserted_at", { ascending: false });

    if (error) throw error;

    setCachedData(cacheKey, data, CACHE_TTL.LONG);
    return data;
  } catch (error) {
    console.error('Error fetching templates:', error);
    throw error;
  }
}

/**
 * Get all users with basic info
 */
export async function getUsersOptimized() {
  const cacheKey = 'users_optimized';
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    // Use admin client to bypass RLS restrictions
    const { data, error } = await getAdminClient()
      .from("profiles")
      .select(`
        id,
        email,
        full_name
      `)
      .order("email");

    if (error) {
      console.error('Error fetching users:', error);
      throw error;
    }

    console.log('getUsersOptimized: Loaded', data?.length, 'users');
    setCachedData(cacheKey, data, CACHE_TTL.LONG);
    return data;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
}

/**
 * Get PT system statistics in a single optimized query
 */
export async function getPTStatsOptimized() {
  const cacheKey = 'pt_stats_optimized';
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    // Use a single query with aggregations
    const { data, error } = await supabase
      .from("client_programs")
      .select(`
        id,
        is_active,
        assigned_to,
        client_days!inner (
          id,
          client_items!inner (
            id
          )
        )
      `);

    if (error) throw error;

    // Calculate stats from the data
    const totalPrograms = data?.length || 0;
    const activePrograms = data?.filter(p => p.is_active !== false).length || 0;
    const uniqueClients = new Set(data?.map(p => p.assigned_to).filter(Boolean)).size;
    
    // Count completed sessions (this would need a separate query for accuracy)
    const { data: sessionsData } = await supabase
      .from("workout_sessions")
      .select("id")
      .not("ended_at", "is", null);

    const completedSessions = sessionsData?.length || 0;

    const stats = {
      totalPrograms,
      activePrograms,
      totalClients: uniqueClients,
      completedSessions
    };

    setCachedData(cacheKey, stats, CACHE_TTL.SHORT);
    return stats;
  } catch (error) {
    console.error('Error fetching PT stats:', error);
    throw error;
  }
}

/**
 * Get client program with all related data in a single query
 */
export async function getClientProgramWithData(programId: string) {
  const cacheKey = `client_program_${programId}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const { data, error } = await supabase
      .from("client_programs")
      .select(`
        id,
        title_override,
        start_date,
        is_active,
        assigned_to,
        template_id,
        client_days (
          id,
          title,
          day_order,
          note,
          client_items (
            id,
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
            )
          )
        )
      `)
      .eq("id", programId)
      .single();

    if (error) throw error;

    setCachedData(cacheKey, data, CACHE_TTL.MEDIUM);
    return data;
  } catch (error) {
    console.error('Error fetching client program:', error);
    throw error;
  }
}

/**
 * Get workout session with exercises and alternatives in a single query
 */
export async function getWorkoutSessionOptimized(programId: string, dayId: string) {
  const cacheKey = `workout_session_${programId}_${dayId}`;
  const cached = getCachedData(cacheKey, CACHE_TTL.SHORT);
  if (cached) return cached;

  try {
    const { data, error } = await supabase
      .from("client_items")
      .select(`
        id,
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
        )
      `)
      .eq("client_day_id", dayId)
      .order("order_in_day");

    if (error) throw error;

    setCachedData(cacheKey, data, CACHE_TTL.SHORT);
    return data;
  } catch (error) {
    console.error('Error fetching workout session:', error);
    throw error;
  }
}

/**
 * Get user's PT statistics with optimized queries
 */
export async function getUserPTStatsOptimized(userId: string) {
  const cacheKey = `user_pt_stats_${userId}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    // Parallel queries for better performance
    const [programsResult, sessionsResult, progressResult] = await Promise.all([
      supabase
        .from("client_programs")
        .select("id, title_override, is_active, start_date")
        .eq("assigned_to", userId),
      
      supabase
        .from("v_session_summary")
        .select("session_id, started_at, ended_at, duration_minutes, avg_rpe")
        .eq("user_id", userId)
        .order("started_at", { ascending: false })
        .limit(50),
      
      supabase
        .from("userprogress")
        .select("completed_at, sets, total_sets, reps, total_reps, total_seconds")
        .eq("user_id", userId)
        .eq("done", true)
        .order("completed_at", { ascending: false })
        .limit(100)
    ]);

    if (programsResult.error) throw programsResult.error;
    if (sessionsResult.error) throw sessionsResult.error;
    if (progressResult.error) throw progressResult.error;

    const stats = {
      programs: programsResult.data || [],
      sessions: sessionsResult.data || [],
      progress: progressResult.data || []
    };

    setCachedData(cacheKey, stats, CACHE_TTL.MEDIUM);
    return stats;
  } catch (error) {
    console.error('Error fetching user PT stats:', error);
    throw error;
  }
}

/**
 * Batch update multiple exercises with a single transaction
 */
export async function batchUpdateExercises(updates: Array<{
  id: string;
  weight_kg?: number;
  reps?: string;
  sets?: number;
}>) {
  try {
    // Use a transaction for batch updates
    const { data, error } = await supabase.rpc('batch_update_exercises', {
      updates: updates
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error batch updating exercises:', error);
    throw error;
  }
}

/**
 * Get template with all related data for editing
 */
export async function getTemplateForEditing(templateId: string) {
  const cacheKey = `template_editing_${templateId}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const { data, error } = await supabase
      .from("workout_templates")
      .select(`
        id,
        title,
        goal,
        is_active,
        template_days (
          id,
          day_order,
          title,
          note,
          template_items (
            id,
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
            template_alternatives (
              id,
              alternative_name,
              alternative_description,
              alternative_video_url,
              difficulty_level,
              equipment_required,
              muscle_groups
            )
          )
        )
      `)
      .eq("id", templateId)
      .single();

    if (error) throw error;

    setCachedData(cacheKey, data, CACHE_TTL.MEDIUM);
    return data;
  } catch (error) {
    console.error('Error fetching template for editing:', error);
    throw error;
  }
}

/**
 * Clear all PT-related cache
 */
export function clearPTCache(): void {
  const keysToDelete = Array.from(queryCache.keys()).filter(key => 
    key.includes('client_program') || 
    key.includes('template') || 
    key.includes('pt_stats') ||
    key.includes('workout_session')
  );
  
  keysToDelete.forEach(key => queryCache.delete(key));
}

/**
 * Preload critical data for better user experience
 */
export async function preloadCriticalData(): Promise<void> {
  try {
    // Preload commonly accessed data in parallel
    await Promise.all([
      getTemplatesOptimized(),
      getUsersOptimized(),
      getPTStatsOptimized()
    ]);
  } catch (error) {
    console.error('Error preloading critical data:', error);
    // Don't throw - preloading is optional
  }
}
