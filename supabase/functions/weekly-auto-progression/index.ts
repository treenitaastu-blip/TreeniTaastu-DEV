import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AutoProgressionResult {
  success: boolean;
  program_id: string;
  updates_made: number;
  progressions: Array<{
    exercise_name: string;
    item_id: string;
    progression: any;
  }>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Weekly auto-progression started");

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get all active programs with auto-progression enabled
    const { data: activePrograms, error: programsError } = await supabaseClient
      .from('client_programs')
      .select('id, assigned_to, duration_weeks, start_date, auto_progression_enabled')
      .eq('status', 'active')
      .eq('auto_progression_enabled', true);

    if (programsError) {
      throw new Error(`Failed to fetch active programs: ${programsError.message}`);
    }

    console.log(`Found ${activePrograms?.length || 0} active programs with auto-progression enabled`);

    const results = {
      total_programs: activePrograms?.length || 0,
      processed_programs: 0,
      successful_progressions: 0,
      total_exercise_updates: 0,
      failed_programs: [] as string[],
      progression_details: [] as AutoProgressionResult[],
    };

    // Process each program
    if (activePrograms && activePrograms.length > 0) {
      for (const program of activePrograms) {
        try {
          console.log(`Processing program ${program.id} for user ${program.assigned_to}`);
          
          // Call the auto-progression function
          const { data: progressionResult, error: progressionError } = await supabaseClient
            .rpc('auto_progress_program', {
              p_program_id: program.id
            });

          if (progressionError) {
            console.error(`Failed to auto-progress program ${program.id}:`, progressionError);
            results.failed_programs.push(program.id);
            continue;
          }

          const result = progressionResult as AutoProgressionResult;
          results.processed_programs++;
          
          if (result.success) {
            results.successful_progressions++;
            results.total_exercise_updates += result.updates_made;
            results.progression_details.push(result);
            
            console.log(`Successfully updated ${result.updates_made} exercises for program ${program.id}`);
          } else {
            console.log(`No updates needed for program ${program.id}: ${result}`);
          }

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`Error processing program ${program.id}:`, errorMessage);
          results.failed_programs.push(program.id);
        }
      }
    }

    // Also check and complete any programs that are due
    console.log("Checking for programs due for completion...");
    
    const { data: completionResult, error: completionError } = await supabaseClient
      .rpc('complete_due_programs');

    let completedPrograms = 0;
    if (!completionError && completionResult) {
      completedPrograms = (completionResult as { completed_programs: number }).completed_programs;
      console.log(`Marked ${completedPrograms} programs as completed`);
    }

    // Log the final results
    console.log("Weekly auto-progression completed:", {
      ...results,
      completed_programs: completedPrograms
    });

    return new Response(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        ...results,
        completed_programs: completedPrograms
      },
      message: `Processed ${results.processed_programs} programs, updated ${results.total_exercise_updates} exercises, completed ${completedPrograms} programs`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in weekly auto-progression:", errorMessage);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});