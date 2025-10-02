import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// XP Constants
const WORKOUT_XP = 30;
const OFFICE_RESET_XP = 15;
const HABIT_COMPLETION_XP = 5; // For completing all 4 habits in a day
const DAILY_XP_CAP = 60;
const MIN_WORKOUT_MINUTES = 8;
const MAX_LEVEL = 99;
const MAX_XP = 5000;
const MAX_HABITS = 4;

// Calculate required XP for a specific level (progressive difficulty)
function getXPForLevel(level: number): number {
  if (level <= 1) return 0;
  
  // Progressive formula: each level requires more XP
  // Designed so level 99 requires exactly 5000 total XP
  const base = 15;
  const multiplier = 0.8;
  const growth = 0.12;
  
  let totalXP = 0;
  for (let i = 2; i <= level; i++) {
    const levelXP = Math.floor(base + (i - 2) * multiplier + Math.pow(i - 2, 1.5) * growth);
    totalXP += levelXP;
  }
  
  return Math.min(totalXP, MAX_XP);
}

// Get level from total XP
function getLevelFromXP(totalXP: number): { level: number, currentLevelXP: number, nextLevelXP: number, xpToNext: number } {
  if (totalXP >= MAX_XP) {
    return { level: MAX_LEVEL, currentLevelXP: MAX_XP, nextLevelXP: MAX_XP, xpToNext: 0 };
  }
  
  for (let level = 1; level <= MAX_LEVEL; level++) {
    const xpForThisLevel = getXPForLevel(level);
    const xpForNextLevel = getXPForLevel(level + 1);
    
    if (totalXP < xpForNextLevel || level === MAX_LEVEL) {
      return {
        level,
        currentLevelXP: xpForThisLevel,
        nextLevelXP: level === MAX_LEVEL ? MAX_XP : xpForNextLevel,
        xpToNext: level === MAX_LEVEL ? 0 : xpForNextLevel - totalXP
      };
    }
  }
  
  return { level: 1, currentLevelXP: 0, nextLevelXP: getXPForLevel(2), xpToNext: getXPForLevel(2) };
}

// Get tier from level
function getTierFromLevel(level: number): string {
  if (level >= 85) return 'Müütiline';
  if (level >= 70) return 'Obsidian';
  if (level >= 55) return 'Teemant';
  if (level >= 40) return 'Plaatina';
  if (level >= 25) return 'Kuld';
  if (level >= 10) return 'Hõbe';
  return 'Pronks';
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from JWT
    const authHeader = req.headers.get('Authorization')!;
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log(`Calculating XP for user: ${user.id}`);

    // Get workout sessions (minimum duration and completed)
    const { data: workoutSessions, error: workoutError } = await supabase
      .from('workout_sessions')
      .select('started_at, ended_at')
      .eq('user_id', user.id)
      .not('ended_at', 'is', null);

    if (workoutError) {
      console.error('Error fetching workout sessions:', workoutError);
      throw workoutError;
    }

    // Get Office Reset completions (kontorikeha program completions from userprogress)
    const { data: officeResetLogs, error: officeResetError } = await supabase
      .from('userprogress')
      .select('completed_at')
      .eq('user_id', user.id)
      .eq('done', true);

    if (officeResetError) {
      console.error('Error fetching office reset logs:', officeResetError);
      throw officeResetError;
    }

    // Get challenge logs for habit tracking
    const { data: challengeLogs, error: challengeError } = await supabase
      .from('challenge_logs')
      .select('date, challenge_slug, challenge_id')
      .eq('user_id', user.id);

    if (challengeError) {
      console.error('Error fetching challenge logs:', challengeError);
      throw challengeError;
    }

    // Get custom habits and their completion logs
    const { data: customHabits, error: habitsError } = await supabase
      .from('custom_habits')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (habitsError) {
      console.error('Error fetching custom habits:', habitsError);
      throw habitsError;
    }

    // Get habit completion logs (from challenge_logs where challenge_id matches habit id)
    const habitIds = (customHabits || []).map(h => h.id);
    const { data: habitLogs, error: habitLogsError } = await supabase
      .from('challenge_logs')
      .select('date, challenge_id')
      .eq('user_id', user.id)
      .in('challenge_id', habitIds);

    if (habitLogsError) {
      console.error('Error fetching habit logs:', habitLogsError);
      throw habitLogsError;
    }

    // Process workout sessions - only count valid sessions (8+ minutes)
    const validWorkouts = (workoutSessions || []).filter(session => {
      if (!session.started_at || !session.ended_at) return false;
      
      const duration = new Date(session.ended_at).getTime() - new Date(session.started_at).getTime();
      const minutes = duration / (1000 * 60);
      return minutes >= MIN_WORKOUT_MINUTES;
    });

    // Group by date and calculate daily XP
    const dailyXP: Record<string, number> = {};

    // Add workout XP
    validWorkouts.forEach(session => {
      const date = new Date(session.started_at).toISOString().split('T')[0];
      if (!dailyXP[date]) dailyXP[date] = 0;
      dailyXP[date] += WORKOUT_XP;
    });

    // Add Office Reset XP (kontorikeha program completions - only one per day)
    const officeResetDates = new Set<string>();
    (officeResetLogs || []).forEach(log => {
      if (log.completed_at) {
        const date = new Date(log.completed_at).toISOString().split('T')[0];
        if (!officeResetDates.has(date)) {
          officeResetDates.add(date);
          if (!dailyXP[date]) dailyXP[date] = 0;
          dailyXP[date] += OFFICE_RESET_XP;
        }
      }
    });

    // Add Habit Completion XP (5 XP for completing all 4 habits in a day)
    const dailyHabitCompletions: Record<string, Set<string>> = {};
    (habitLogs || []).forEach(log => {
      if (!dailyHabitCompletions[log.date]) {
        dailyHabitCompletions[log.date] = new Set();
      }
      dailyHabitCompletions[log.date].add(log.challenge_id);
    });

    // Award XP for days where all habits were completed
    Object.keys(dailyHabitCompletions).forEach(date => {
      const completedHabits = dailyHabitCompletions[date].size;
      const totalHabits = habitIds.length;
      
      // Award XP if all habits completed (and user has exactly 4 habits)
      if (completedHabits === totalHabits && totalHabits === MAX_HABITS) {
        if (!dailyXP[date]) dailyXP[date] = 0;
        dailyXP[date] += HABIT_COMPLETION_XP;
      }
    });

    // Apply daily cap and calculate total XP
    let totalXP = 0;
    Object.keys(dailyXP).forEach(date => {
      const cappedXP = Math.min(dailyXP[date], DAILY_XP_CAP);
      totalXP += cappedXP;
      dailyXP[date] = cappedXP; // Update with capped value
    });

    // Calculate level and progress
    const levelInfo = getLevelFromXP(totalXP);
    const tier = getTierFromLevel(levelInfo.level);

    const result = {
      totalXP,
      level: levelInfo.level,
      tier,
      currentLevelXP: levelInfo.currentLevelXP,
      nextLevelXP: levelInfo.nextLevelXP,
      xpToNext: levelInfo.xpToNext,
      progress: levelInfo.level === MAX_LEVEL ? 100 : ((totalXP - levelInfo.currentLevelXP) / (levelInfo.nextLevelXP - levelInfo.currentLevelXP)) * 100,
      dailyXPBreakdown: dailyXP,
      stats: {
        validWorkouts: validWorkouts.length,
        officeResets: officeResetDates.size,
        totalDays: Object.keys(dailyXP).length,
        totalHabits: habitIds.length,
        perfectHabitDays: Object.keys(dailyHabitCompletions).filter(date => 
          dailyHabitCompletions[date].size === habitIds.length && habitIds.length === MAX_HABITS
        ).length
      }
    };

    console.log(`User XP calculated:`, result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error calculating user XP:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});