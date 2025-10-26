// src/pages/ModernWorkoutSession.tsx
import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTrackEvent } from "@/hooks/useTrackEvent";
import { useSmartProgression, type ExerciseProgression } from "@/hooks/useSmartProgression";
import { toast } from "sonner";
import { getErrorMessage, getSeverityStyles, getActionButtonText } from '@/utils/errorMessages';
import { useLoadingState, LOADING_KEYS, getLoadingMessage } from '@/hooks/useLoadingState';
import { LoadingIndicator, LoadingOverlay } from '@/components/ui/LoadingIndicator';
import { logWorkoutError, logProgressionError, logDatabaseError, ErrorCategory } from '@/utils/errorLogger';
import { trackSessionEndFailure, trackProgressionFailure, trackDataSaveFailure, WorkoutFailureType } from '@/utils/workoutFailureTracker';
import { trackFeatureUsage, trackTaskCompletion, trackMobileInteraction, trackAPIResponseTime } from '@/utils/uxMetricsTracker';

import ModernWorkoutHeader from "@/components/workout/ModernWorkoutHeader";
import SmartExerciseCard from "@/components/workout/SmartExerciseCard";
import { WorkoutRestTimer } from "@/components/workout/WorkoutRestTimer";
import PersonalTrainingCompletionDialog from "@/components/workout/PersonalTrainingCompletionDialog";
import PTAccessValidator from "@/components/PTAccessValidator";
import ErrorRecovery from "@/components/ErrorRecovery";
import WorkoutFeedback from "@/components/workout/WorkoutFeedback";
// Removed unused import: calculateExerciseProgression from progressionLogic

// Helper function to parse reps string to number
const parseRepsToNumber = (reps: string): number | null => {
  if (!reps) return null;
  const match = reps.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
};

type ClientProgram = {
  id: string;
  title_override?: string | null;
};

type ClientDay = {
  id: string;
  title: string;
  note?: string | null;
  day_order?: number | null;
};

type ClientItem = {
  id: string;
  exercise_name: string;
  sets: number;
  reps: string;
  seconds?: number | null;
  weight_kg?: number | null;
  rest_seconds?: number | null;
  coach_notes?: string | null;
  video_url?: string | null;
  order_in_day: number;
};

type WorkoutSession = {
  id: string;
  started_at: string;
  ended_at?: string | null;
};

type SetLog = {
  client_item_id: string;
  set_number: number;
  reps_done?: number | null;
  seconds_done?: number | null;
  weight_kg_done?: number | null;
};

export default function ModernWorkoutSession() {
  const { user } = useAuth();
  const { trackFeatureUsage, trackPageView } = useTrackEvent();
  const navigate = useNavigate();
  const { programId, dayId } = useParams<{ programId: string; dayId: string }>();

  // Core data
  const [program, setProgram] = useState<ClientProgram | null>(null);
  const [day, setDay] = useState<ClientDay | null>(null);
  const [exercises, setExercises] = useState<ClientItem[]>([]);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  
  // Progress tracking
  const [setLogs, setSetLogs] = useState<Record<string, SetLog>>({});
  const [setInputs, setSetInputs] = useState<Record<string, any>>({});
  const [exerciseNotes, setExerciseNotes] = useState<Record<string, string>>({});
  const [exerciseRPE, setExerciseRPE] = useState<Record<string, number>>({});
  
  // Track completed exercises for RPE/RIR collection
  const [completedExerciseIds, setCompletedExerciseIds] = useState<Set<string>>(new Set());
  
  // Alternative exercises management
  const [openAlternativesFor, setOpenAlternativesFor] = useState<Record<string, boolean>>({});
  const [selectedAlternative, setSelectedAlternative] = useState<Record<string, string>>({});
  // Store original names to support toggle back from alternative
  const [originalExerciseNames, setOriginalExerciseNames] = useState<Record<string, string>>({});
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { loadingStates, setLoading: setLoadingState, setError: setLoadingError, getLoadingState } = useLoadingState();
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  
  // Rest timer
  const [restTimer, setRestTimer] = useState<{
    isOpen: boolean;
    seconds: number;
    exerciseName: string;
  }>({
    isOpen: false,
    seconds: 60,
    exerciseName: ""
  });

  // New feedback system state
  const [exerciseFeedbackEnabled, setExerciseFeedbackEnabled] = useState(true);
  const [showWorkoutFeedback, setShowWorkoutFeedback] = useState(false);
  const [exerciseProgression, setExerciseProgression] = useState<Record<string, {
    newWeight: number;
    change: number;
    reason: string;
  }>>({});

  const totalSets = useMemo(() => {
    return exercises.reduce((total, ex) => total + ex.sets, 0);
  }, [exercises]);

  const completedSets = useMemo(() => {
    return Object.keys(setLogs).length;
  }, [setLogs]);

  const getCompletedSetsForExercise = useCallback((exerciseId: string) => {
    return Object.keys(setLogs).filter(key => key.startsWith(exerciseId + ":")).length;
  }, [setLogs]);

  // Load workout data
  useEffect(() => {
    const loadWorkout = async () => {
      if (!user || !programId || !dayId) {
        setError("Puuduvad nõutud parameetrid. Kas oled sisse logitud ja URL on korrektne?");
        setLoading(false);
        return;
      }

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(programId) || !uuidRegex.test(dayId)) {
        setError("Vigased identifikaatorid URL-is. Palun kontrolli linki.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Load program with detailed error context
        const { data: programData, error: programError } = await supabase
          .from("client_programs")
          .select("id, title_override, status, is_active, assigned_to, assigned_by")
          .eq("id", programId)
          .eq("assigned_to", user.id)
          .maybeSingle();

        if (programError) {
          throw new Error(`Andmebaasi viga programmi laadimisel: ${programError.message || programError.code}`);
        }

        if (!programData) {
          // Check if program exists but user doesn't have access
          const { data: existsCheck } = await supabase
            .from("client_programs")
            .select("id, assigned_to, assigned_by")
            .eq("id", programId)
            .maybeSingle();
            
          if (existsCheck) {
            throw new Error(`Sul puudub ligipääs sellele programmile. Programm kuulub kasutajale ID: ${existsCheck.assigned_to}`);
          } else {
            throw new Error(`Programmi ID-ga ${programId} ei leitud. Kontrolli, kas link on õige.`);
          }
        }

        if (!programData.is_active || programData.status !== 'active') {
          throw new Error(`See programm ei ole aktiivne (staatus: ${programData.status}, aktiivne: ${programData.is_active}). Võta ühendust treeneriga.`);
        }
        setProgram(programData);

        // Load day with enhanced validation
        const { data: dayData, error: dayError } = await supabase
          .from("client_days")
          .select("id, title, note, day_order, client_program_id")
          .eq("id", dayId)
          .eq("client_program_id", programId)
          .maybeSingle();

        if (dayError) {
          throw new Error(`Andmebaasi viga päeva laadimisel: ${dayError.message || dayError.code}`);
        }

        if (!dayData) {
          // Check if day exists but belongs to different program
          const { data: dayCheck } = await supabase
            .from("client_days")
            .select("id, client_program_id")
            .eq("id", dayId)
            .maybeSingle();
            
          if (dayCheck) {
            throw new Error(`Päev kuulub teise programmi (${dayCheck.client_program_id}). Kontrolli URL-i.`);
          } else {
            throw new Error(`Treeningu päeva ID-ga ${dayId} ei leitud. Kontrolli linki.`);
          }
        }
        setDay(dayData);

        // Load exercises with enhanced validation and logging
        const { data: exerciseData, error: exerciseError } = await supabase
          .from("client_items")
          .select(`
            id,
            client_day_id,
            order_in_day,
            exercise_name,
            base_exercise_name,
            sets,
            reps,
            seconds,
            weight_kg,
            rest_seconds,
            coach_notes,
            video_url,
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

        if (exerciseError) {
          throw new Error(`Harjutuste andmebaasi viga: ${exerciseError.message || exerciseError.code}`);
        }

        if (!exerciseData || exerciseData.length === 0) {
          throw new Error("Selles treeningu päevas pole harjutusi määratud. Palun võta ühendust toega.");
        }

        setExercises(exerciseData);
        // Capture originals for toggle behavior
        const originals: Record<string, string> = {};
        for (const ex of exerciseData) {
          originals[ex.id] = ex.exercise_name;
        }
        setOriginalExerciseNames(originals);

        // Find or create session
        let sessionData;
        const { data: existingSession } = await supabase
          .from("workout_sessions")
          .select("*")
          .eq("user_id", user.id)
          .eq("client_day_id", dayId)
          .is("ended_at", null)
          .maybeSingle();

        if (existingSession) {
          sessionData = existingSession;
        } else {
          const { data: newSession, error: sessionError } = await supabase
            .from("workout_sessions")
            .insert({
              user_id: user.id,
              client_program_id: programId,
              client_day_id: dayId,
              started_at: new Date().toISOString()
            })
            .select()
            .single();

          if (sessionError) {
            throw new Error(`Treeningu sessiooni loomine ebaõnnestus: ${sessionError.message}`);
          }
          sessionData = newSession;
        }

        setSession(sessionData);

        // Load existing set logs
        const { data: logsData } = await supabase
          .from("set_logs")
          .select("*")
          .eq("session_id", sessionData.id);

        if (logsData) {
          const logsMap: Record<string, SetLog> = {};
          const inputsMap: Record<string, Record<string, unknown>> = {};
          
          logsData.forEach((log: any) => {
            const key = `${log.client_item_id}:${log.set_number}`;
            logsMap[key] = log;
            inputsMap[key] = {
              reps: log.reps_done,
              seconds: log.seconds_done,
              kg: log.weight_kg_done
            };
          });
          
          setSetLogs(logsMap);
          setSetInputs(inputsMap);
        }

        // Load latest exercise notes for each exercise (not just current session)
        if (exerciseData && exerciseData.length > 0) {
          const { data: notesData } = await supabase
            .from("exercise_notes")
            .select("*")
            .in("client_item_id", exerciseData.map(ex => ex.id))
            .eq("user_id", user.id)
            .order("updated_at", { ascending: false });

          if (notesData) {
            const notesMap: Record<string, string> = {};
            const rpeMap: Record<string, number> = {};
            
            // Group by client_item_id and take the latest note for each exercise
            const latestNotes = notesData.reduce((acc: Record<string, any>, note: any) => {
              if (!acc[note.client_item_id] || new Date(note.updated_at) > new Date(acc[note.client_item_id].updated_at)) {
                acc[note.client_item_id] = note;
              }
              return acc;
            }, {});
            
            Object.values(latestNotes).forEach((note: any) => {
              if (note.notes) notesMap[note.client_item_id] = note.notes;
              if (note.rpe) rpeMap[note.client_item_id] = note.rpe;
            });
            
            setExerciseNotes(notesMap);
            setExerciseRPE(rpeMap);
          }
        }

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Tundmatu viga treeningu laadimisel";
        
        // Provide more helpful error messages based on common issues
        if (errorMessage.includes("JWT")) {
          setError("Autentimine aegus. Palun logi sisse uuesti.");
        } else if (errorMessage.includes("permission") || errorMessage.includes("denied")) {
          setError("Sul puudub ligipääs sellele programmile. Kontrolli, kas see on sulle määratud.");
        } else if (errorMessage.includes("not found") || errorMessage.includes("ei leitud")) {
          setError(`${errorMessage} Kui probleem püsib, võta ühendust toega.`);
        } else {
          setError(errorMessage);
        }
      } finally {
        setLoading(false);
      }
    };

    loadWorkout();
  }, [user, programId, dayId]);

  const handleSetComplete = useCallback(async (exerciseId: string, setNumber: number) => {
    if (!session || !user) return;

    const key = `${exerciseId}:${setNumber}`;
    const inputs = setInputs[key] || {};
    const exercise = exercises.find(ex => ex.id === exerciseId);

    try {
      setSaving(true);
      setLoadingState(LOADING_KEYS.SET_COMPLETE, true, getLoadingMessage(LOADING_KEYS.SET_COMPLETE));
      
      // Parse target reps for fallback
      const targetReps = exercise?.reps ? parseInt(exercise.reps.replace(/[^\d]/g, '')) || null : null;
      
      const { error } = await supabase.from("set_logs").insert({
        session_id: session.id,
        client_item_id: exerciseId,
        client_day_id: dayId!,
        program_id: programId!,
        user_id: user.id,
        set_number: setNumber,
        reps_done: inputs.reps || targetReps,
        seconds_done: inputs.seconds || exercise?.seconds,
        weight_kg_done: inputs.kg || exercise?.weight_kg,
        marked_done_at: new Date().toISOString()
      });

      if (error) throw error;

      // Update local state with actual saved values
      const actualReps = inputs.reps || targetReps;
      const actualSeconds = inputs.seconds || exercise?.seconds;
      const actualWeight = inputs.kg || exercise?.weight_kg;
      
      setSetLogs(prev => ({ 
        ...prev, 
        [key]: { 
          client_item_id: exerciseId, 
          set_number: setNumber, 
          reps_done: actualReps, 
          seconds_done: actualSeconds, 
          weight_kg_done: actualWeight 
        } 
      }));
      
      toast.success("Seeria märgitud tehtuks!");

      // Show RPE/RIR dialog only after ALL sets of the exercise are completed
      const completedSets = getCompletedSetsForExercise(exerciseId) + 1; // +1 for the current set
      
      if (exercise && completedSets >= exercise.sets && !completedExerciseIds.has(exerciseId)) {
        
        // Mark exercise as completed for RPE/RIR collection
        setCompletedExerciseIds(prev => new Set(prev).add(exerciseId));
        
        // Track exercise completion
        trackFeatureUsage('exercise', 'completed', {
          exercise_name: exercise.exercise_name,
          sets_completed: completedSets,
          program_id: programId,
          day_id: dayId
        });
        
        // Show success feedback first
        toast.success(`✅ ${exercise.exercise_name} lõpetatud!`, {
          description: "Hinda oma sooritust - see aitab järgmist treeningut kohandada"
        });
        
      }

    } catch (err) {
      const errorInfo = getErrorMessage(err, 'exercise_save');
      setLoadingError(LOADING_KEYS.SET_COMPLETE, errorInfo.description);
      toast.error(errorInfo.title, {
        description: errorInfo.description,
        action: errorInfo.action ? {
          label: getActionButtonText(errorInfo.action),
          onClick: () => {
            // Retry the operation
            handleSetComplete(exerciseId, setNumber);
          }
        } : undefined
      });
    } finally {
      setSaving(false);
      setLoadingState(LOADING_KEYS.SET_COMPLETE, false);
    }
  }, [session, user, dayId, programId, setInputs, exercises, getCompletedSetsForExercise, completedExerciseIds, trackFeatureUsage]);

  const handleStartRest = useCallback((exercise: ClientItem) => {
    setRestTimer({
      isOpen: true,
      seconds: exercise.rest_seconds || 60,
      exerciseName: exercise.exercise_name
    });
  }, []);

  const handleSetInputChange = useCallback((exerciseId: string, setNumber: number, field: string, value: number) => {
    const key = `${exerciseId}:${setNumber}`;
    setSetInputs(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value }
    }));
  }, []);

  // Weight update functions
  const handleUpdateSingleSetWeight = useCallback(async (exerciseId: string, setNumber: number, newWeight: number) => {
    if (!user) {
      console.error('No user context for weight update');
      return;
    }
    
    // Validate that the exercise exists and belongs to the current user
    const exercise = exercises.find(ex => ex.id === exerciseId);
    if (!exercise) {
      console.error(`Exercise ${exerciseId} not found for user ${user.id}`);
      return;
    }
    
    // Validate set number is within range
    if (setNumber < 1 || setNumber > exercise.sets) {
      console.error(`Invalid set number ${setNumber} for exercise ${exerciseId} (max: ${exercise.sets})`);
      return;
    }
    
    // Validate weight is reasonable
    if (newWeight < 0 || newWeight > 1000) {
      console.error(`Invalid weight ${newWeight}kg for exercise ${exerciseId}`);
      return;
    }
    
    try {
      // Update the setInputs for this specific set
      const key = `${exerciseId}:${setNumber}`;
      setSetInputs(prev => ({
        ...prev,
        [key]: { ...prev[key], kg: newWeight }
      }));
      
      console.log(`Updated single set weight: ${exerciseId}:${setNumber} = ${newWeight}kg for user ${user.id}`);
    } catch (error) {
      console.error('Error updating single set weight:', error);
    }
  }, [user, exercises]);

  const handleUpdateAllSetsWeight = useCallback(async (exerciseId: string, newWeight: number) => {
    if (!user) {
      console.error('No user context for weight update');
      return;
    }
    
    // Validate that the exercise exists and belongs to the current user
    const exercise = exercises.find(ex => ex.id === exerciseId);
    if (!exercise) {
      console.error(`Exercise ${exerciseId} not found for user ${user.id}`);
      return;
    }
    
    // Validate weight is reasonable
    if (newWeight < 0 || newWeight > 1000) {
      console.error(`Invalid weight ${newWeight}kg for exercise ${exerciseId}`);
      return;
    }
    
    // Store original values for rollback
    const originalWeight = exercise.weight_kg;
    const originalSetInputs = { ...setInputs };
    
    try {
      // Optimistically update UI first for better UX
      setSetInputs(prev => {
        const updated = { ...prev };
        for (let i = 1; i <= exercise.sets; i++) {
          const key = `${exerciseId}:${i}`;
          updated[key] = { ...updated[key], kg: newWeight };
        }
        return updated;
      });
      
      setExercises(prev => prev.map(ex => 
        ex.id === exerciseId 
          ? { ...ex, weight_kg: newWeight }
          : ex
      ));
      
      // Update the client_items table with the new weight preference
      // RLS policy ensures only the user who owns the exercise can update it
      const { error } = await supabase
        .from('client_items')
        .update({ weight_kg: newWeight })
        .eq('id', exerciseId);
      
      if (error) {
        console.error('Error updating exercise weight in database:', error);
        console.error('This could indicate a permission issue or exercise not found');
        
        // Rollback UI changes
        setSetInputs(originalSetInputs);
        setExercises(prev => prev.map(ex => 
          ex.id === exerciseId 
            ? { ...ex, weight_kg: originalWeight }
            : ex
        ));
        
        // Log the rollback
        console.log(`Rolled back weight update for exercise ${exerciseId} due to database error`);
        return;
      }
      
      console.log(`Successfully updated all sets weight for exercise ${exerciseId} to ${newWeight}kg for user ${user.id}`);
    } catch (error) {
      console.error('Unexpected error updating all sets weight:', error);
      
      // Rollback UI changes
      setSetInputs(originalSetInputs);
      setExercises(prev => prev.map(ex => 
        ex.id === exerciseId 
          ? { ...ex, weight_kg: originalWeight }
          : ex
      ));
      
      console.log(`Rolled back weight update for exercise ${exerciseId} due to unexpected error`);
    }
  }, [user, exercises, setInputs]);

  const handleNotesChange = useCallback(async (exerciseId: string, notes: string) => {
    if (!session || !user) return;
    
    // Update local state immediately for responsive UI
    setExerciseNotes(prev => ({ ...prev, [exerciseId]: notes }));
    
    // Save to database with simple debouncing
    const saveNotes = async () => {
      try {
        if (notes.trim()) {
          await supabase.from("exercise_notes").upsert({
            session_id: session.id,
            client_day_id: dayId!,
            client_item_id: exerciseId,
            program_id: programId!,
            user_id: user.id,
            notes: notes.trim()
          }, {
            onConflict: 'session_id,client_item_id'
          });
        } else {
          // If notes are empty, delete the record for this session
          await supabase
            .from("exercise_notes")
            .delete()
            .eq("session_id", session.id)
            .eq("client_item_id", exerciseId);
        }
      } catch (error) {
        // Silently handle note saving error
      }
    };

    // Debounce the save operation
    setTimeout(saveNotes, 500);
  }, [session, user, dayId, programId]);

  const handleRPEChange = useCallback(async (exerciseId: string, rpe: number) => {
    if (!session || !user) return;
    
    // Update local state immediately
    setExerciseRPE(prev => ({ ...prev, [exerciseId]: rpe }));
    
    // Save to database in real-time
    try {
      await supabase.from("exercise_notes").upsert({
        session_id: session.id,
        client_day_id: dayId!,
        client_item_id: exerciseId,
        program_id: programId!,
        user_id: user.id,
        rpe: rpe
      }, {
        onConflict: "session_id,client_item_id"
      });
    } catch (error) {
      // Silently handle RPE saving error
    }
  }, [session, user, dayId, programId]);

  // Handle exercise feedback from new system
  const handleExerciseFeedback = useCallback(async (exerciseId: string, feedback: {
    feedback: 'too_easy' | 'just_right' | 'too_hard';
    newWeight?: number;
    change?: number;
    reason: string;
  }) => {
    if (!session || !user) return;

    try {
      // Store progression data
      setExerciseProgression(prev => ({
        ...prev,
        [exerciseId]: {
          newWeight: feedback.newWeight || 0,
          change: feedback.change || 0,
          reason: feedback.reason
        }
      }));

      // Save feedback to database
      await supabase.from("exercise_notes").upsert({
        session_id: session.id,
        client_day_id: dayId!,
        client_item_id: exerciseId,
        program_id: programId!,
        user_id: user.id,
        exercise_feedback: feedback.feedback,
        progression_reason: feedback.reason
      }, {
        onConflict: "session_id,client_item_id"
      });

      // Update exercise weight if provided
      if (feedback.newWeight !== undefined && feedback.newWeight !== 0) {
        await supabase
          .from("client_items")
          .update({ weight_kg: feedback.newWeight })
          .eq("id", exerciseId);

        // Update local state
        setExercises(prev => prev.map(ex => 
          ex.id === exerciseId 
            ? { ...ex, weight_kg: feedback.newWeight! }
            : ex
        ));
      }

      toast.success("Tagasiside salvestatud!", {
        description: feedback.reason
      });

    } catch (error) {
      console.error('Error saving exercise feedback:', error);
      toast.error("Tagasiside salvestamine ebaõnnestus");
    }
  }, [session, user, dayId, programId]);

  // Calculate workout summary
  const getWorkoutSummary = useCallback(() => {
    if (!session?.started_at) return null;
    
    const startTime = new Date(session.started_at);
    const endTime = session.ended_at ? new Date(session.ended_at) : new Date();
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)); // minutes
    
    // Calculate ACTUAL completed data from setLogs
    const actualSetsCompleted = Object.keys(setLogs).length;
    const actualRepsCompleted = Object.values(setLogs).reduce((sum, log) => {
      return sum + (log.reps_done || 0);
    }, 0);
    const actualWeightLifted = Object.values(setLogs).reduce((sum, log) => {
      return sum + ((log.weight_kg_done || 0) * (log.reps_done || 0));
    }, 0);
    
    return {
      setsCompleted: actualSetsCompleted,
      totalReps: actualRepsCompleted,
      totalWeight: Math.round(actualWeightLifted),
      duration
    };
  }, [session, setLogs]);

  // Handle workout-level feedback
  const handleWorkoutFeedback = useCallback(async (feedback: {
    joint_pain: boolean;
    joint_pain_location?: string;
    fatigue_level: number;
    energy_level: 'low' | 'normal' | 'high';
    notes?: string;
  }) => {
    if (!session || !user) return;

    try {
      // Save workout feedback to database
      await supabase.from("workout_feedback").insert({
        session_id: session.id,
        user_id: user.id,
        program_id: programId!,
        joint_pain: feedback.joint_pain,
        joint_pain_location: feedback.joint_pain_location,
        fatigue_level: feedback.fatigue_level,
        energy_level: feedback.energy_level,
        notes: feedback.notes
      });

      // Apply volume progression based on feedback
      const { data: progressionResults, error: progressionError } = await supabase.rpc('apply_volume_progression', {
        p_user_id: user.id,
        p_program_id: programId!,
        p_fatigue_level: feedback.fatigue_level,
        p_energy_level: feedback.energy_level,
        p_joint_pain: feedback.joint_pain
      });

      if (progressionError) {
        console.error('Volume progression error:', progressionError);
        // Don't show error to user, just log it
      } else if (progressionResults && progressionResults.length > 0) {
        // Show progression summary
        const progressionSummary = progressionResults.map((result: any) => 
          `${result.exercise_name}: ${result.old_reps}→${result.new_reps} reps, ${result.old_sets}→${result.new_sets} sets`
        ).join(', ');
        
        toast.success("Treeningu tagasiside salvestatud!", {
          description: `Progression: ${progressionSummary}`
        });
      } else {
        toast.success("Treeningu tagasiside salvestatud!");
      }

      setShowWorkoutFeedback(false);
      
      // Show completion dialog after feedback is submitted
      setShowCompletionDialog(true);

    } catch (error) {
      console.error('Error saving workout feedback:', error);
      toast.error("Treeningu tagasiside salvestamine ebaõnnestus");
    }
  }, [session, user, programId]);


  // REMOVED: Old RPE/RIR progression system - replaced with new feedback system


  // Get the smart progression hook at component level
  const { autoProgressProgram } = useSmartProgression(programId, user?.id);

  // Automatic progression based on RPE/RIR data using optimized algorithm
  const applyAutomaticProgression = useCallback(async () => {
    if (!session || !programId || !exercises.length) return;

    try {
      // Use the optimized auto-progression for the entire program
      if (autoProgressProgram) {
        const result = await autoProgressProgram();
        
        if (result?.success && result.updates_made > 0) {
          // Show success message
          toast.success(
            result.deload_exercises && result.deload_exercises > 0 ? "Koormuse vähendamine rakendatud!" : "Programm optimeeritud!",
            {
              description: `${result.updates_made} harjutust automaatselt kohandatud sinu RPE/RIR andmete põhjal${result.deload_exercises ? ` (${result.deload_exercises} koormust vähendatud)` : ''}.`,
            }
          );
        }
      }
    } catch (error) {
      console.error('Smart progression failed, using fallback:', error);
      
      // Enhanced fallback to simple RPE-based progression
      try {
        let progressionCount = 0;
        const progressionResults = [];
        
        for (const exercise of exercises) {
          const rpe = exerciseRPE[exercise.id];
          
          // Only progress exercises with RPE data
          if (!rpe || rpe < 1 || rpe > 10) continue;

          // Get current exercise parameters
          const currentWeight = exercise.weight_kg;
          const currentReps = exercise.reps;
          
          // Enhanced progression logic with safety checks
          let newWeight = currentWeight;
          let newReps = currentReps;
          let progressionReason = '';
          
          // More sophisticated RPE-based progression
          if (rpe <= 5) {
            // Very easy - increase weight by 7.5% or add reps
            if (currentWeight && currentWeight > 0) {
              newWeight = Math.round(currentWeight * 1.075 * 2) / 2;
              progressionReason = 'Weight increased (RPE too low)';
            } else if (currentReps && currentReps < 15) {
              newReps = currentReps + 1;
              progressionReason = 'Reps increased (RPE too low)';
            }
          } else if (rpe <= 6) {
            // Easy - increase weight by 5% or add reps
            if (currentWeight && currentWeight > 0) {
              newWeight = Math.round(currentWeight * 1.05 * 2) / 2;
              progressionReason = 'Weight increased (RPE low)';
            } else if (currentReps && currentReps < 12) {
              newReps = currentReps + 1;
              progressionReason = 'Reps increased (RPE low)';
            }
          } else if (rpe >= 9) {
            // Hard - decrease weight by 5% or reduce reps
            if (currentWeight && currentWeight > 0) {
              newWeight = Math.round(currentWeight * 0.95 * 2) / 2;
              progressionReason = 'Weight decreased (RPE too high)';
            } else if (currentReps && currentReps > 5) {
              newReps = currentReps - 1;
              progressionReason = 'Reps decreased (RPE too high)';
            }
          } else if (rpe >= 10) {
            // Very hard - decrease weight by 10% or reduce reps significantly
            if (currentWeight && currentWeight > 0) {
              newWeight = Math.round(currentWeight * 0.90 * 2) / 2;
              progressionReason = 'Weight decreased significantly (RPE very high)';
            } else if (currentReps && currentReps > 3) {
              newReps = Math.max(3, currentReps - 2);
              progressionReason = 'Reps decreased significantly (RPE very high)';
            }
          } else {
            // RPE 7-8 is perfect range - maintain current parameters
            continue;
          }

          // Only update if parameters actually changed
          const weightChanged = newWeight !== currentWeight && newWeight && currentWeight;
          const repsChanged = newReps !== currentReps && newReps && currentReps;
          
          if (weightChanged || repsChanged) {
            const updateData: any = {};
            if (weightChanged) updateData.weight_kg = newWeight;
            if (repsChanged) updateData.reps = newReps;
            
            const { error: updateError } = await supabase
              .from("client_items")
              .update(updateData)
              .eq("id", exercise.id);
              
            if (!updateError) {
              progressionCount++;
              progressionResults.push({
                exercise_name: exercise.exercise_name,
                reason: progressionReason,
                old_weight: currentWeight,
                new_weight: newWeight,
                old_reps: currentReps,
                new_reps: newReps
              });
            } else {
              console.error(`Failed to update exercise ${exercise.id}:`, updateError);
            }
          }
        }
        
        // Log progression results
        if (progressionCount > 0) {
          console.log(`Fallback progression applied to ${progressionCount} exercises:`, progressionResults);
        }
        
      } catch (fallbackError) {
        console.error('Enhanced fallback progression failed:', {
          error: fallbackError,
          programId,
          exerciseCount: exercises.length,
          timestamp: new Date().toISOString()
        });
        // Don't throw - progression is non-critical
      }
    }
  }, [session, programId, exercises, exerciseRPE, autoProgressProgram]);

  const handleFinishWorkout = useCallback(async () => {
    console.log('handleFinishWorkout called', { session: !!session, sessionId: session?.id });
    if (!session) return;

    try {
      setSaving(true);
      console.log('Starting workout finish process...');
      
      // Save any remaining exercise notes and RPE that weren't saved yet
      for (const exercise of exercises) {
        const notes = exerciseNotes[exercise.id];
        const rpe = exerciseRPE[exercise.id];
        
        if (notes || rpe) {
          await supabase.from("exercise_notes").upsert({
            session_id: session.id,
            client_day_id: dayId!,
            client_item_id: exercise.id,
            program_id: programId!,
            user_id: user!.id,
            notes: notes || undefined,
            rpe: rpe || undefined
          }, {
            onConflict: 'session_id,client_item_id'
          });
        }
      }
      
      // End session
      console.log('Updating workout session...', { sessionId: session.id });
      const { error } = await supabase
        .from("workout_sessions")
        .update({ 
          ended_at: new Date().toISOString(),
          duration_minutes: Math.round((Date.now() - new Date(session.started_at).getTime()) / 60000)
        })
        .eq("id", session.id);

      if (error) {
        console.error('Error updating workout session:', error);
        throw error;
      }
      console.log('Workout session updated successfully');

      // Track workout completion first (before progression analysis)
      trackFeatureUsage('workout', 'completed', {
        program_id: programId,
        day_id: dayId,
        exercise_count: exercises.length,
        duration_minutes: Math.round((Date.now() - new Date(session.started_at).getTime()) / 60000),
        completed_exercises: completedExerciseIds.size
      });

      // Track task completion for UX metrics
      trackTaskCompletion('workout_completion', true, {
        userId: user?.id,
        sessionId: session?.id,
        programId: programId,
        dayId: dayId,
        additionalData: {
          exerciseCount: exercises.length,
          completedExercises: completedExerciseIds.size,
          durationMinutes: Math.round((Date.now() - new Date(session.started_at).getTime()) / 60000)
        }
      });

      // Show success message immediately
      toast.success("Treening lõpetatud!");
      
      // Show workout feedback first, then completion dialog
      setShowWorkoutFeedback(true);

      // Apply automatic progression based on RPE/RIR data (truly non-blocking)
      // Use setTimeout to ensure it doesn't block the UI
      setTimeout(async () => {
        try {
          await applyAutomaticProgression();
        } catch (progressionError) {
          // Track progression analysis failure
          if (user?.id && session?.id) {
            trackProgressionFailure(user.id, session.id, progressionError, {
              programId,
              dayId,
              exerciseCount: exercises.length,
              completedExercises: completedExerciseIds.size,
              sessionDuration: Math.round((Date.now() - new Date(session.started_at).getTime()) / 60000)
            });
          }

          // Log progression analysis failure
          logProgressionError(progressionError, {
            userId: user?.id,
            sessionId: session?.id,
            programId: programId,
            dayId: dayId,
            action: 'progression_analysis',
            component: 'ModernWorkoutSession',
            additionalData: {
              exerciseCount: exercises.length,
              completedExercises: completedExerciseIds.size
            }
          });
          console.error('Progression analysis failed (non-critical):', progressionError);
          // Don't show error to user as workout is already completed
        }
      }, 100); // Small delay to ensure session is saved first

    } catch (err) {
      // Track session end failure
      if (user?.id && session?.id) {
        trackSessionEndFailure(user.id, session.id, err, {
          programId,
          dayId,
          exerciseCount: exercises.length,
          completedExercises: completedExerciseIds.size,
          sessionDuration: session ? Math.round((Date.now() - new Date(session.started_at).getTime()) / 60000) : 0
        });
      }

      // Log the error with comprehensive context
      logWorkoutError(err, {
        userId: user?.id,
        sessionId: session?.id,
        programId: programId,
        dayId: dayId,
        action: 'workout_completion',
        component: 'ModernWorkoutSession',
        additionalData: {
          exerciseCount: exercises.length,
          completedExercises: completedExerciseIds.size,
          sessionDuration: session ? Math.round((Date.now() - new Date(session.started_at).getTime()) / 60000) : 0
        }
      });

      const errorInfo = getErrorMessage(err, 'workout_complete');
      toast.error(errorInfo.title, {
        description: errorInfo.description,
        action: errorInfo.action ? {
          label: getActionButtonText(errorInfo.action),
          onClick: () => {
            // Retry the operation
            handleFinishWorkout();
          }
        } : undefined
      });
    } finally {
      setSaving(false);
    }
  }, [session, exercises, exerciseNotes, exerciseRPE, dayId, programId, user, applyAutomaticProgression, trackFeatureUsage, completedExerciseIds.size]);

  // Function to automatically switch to alternative exercise (optimistic update)
  const switchToAlternative = useCallback(async (exerciseId: string, _alternativeName: string) => {
    const ex = exercises.find(e => e.id === exerciseId);
    if (!ex) return;
    const originalName = ex.base_exercise_name || originalExerciseNames[exerciseId] || ex.exercise_name;
    const altNames = (ex.exercise_alternatives || [])
      .map(a => a.alternative_name)
      .filter(Boolean);
    // Build unique candidate list: original first, then distinct alternatives
    const seen = new Set<string>();
    const candidates = [originalName, ...altNames].filter(name => {
      if (seen.has(name)) return false;
      seen.add(name);
      return true;
    });
    // Find next different name in cycle
    const currentIdx = Math.max(0, candidates.indexOf(ex.exercise_name));
    const nextIdx = (currentIdx + 1) % Math.max(1, candidates.length);
    const targetName = candidates[nextIdx] || ex.exercise_name;
    console.log('[AlternativeSwitch] requested', { exerciseId, from: ex.exercise_name, to: targetName, originalName, candidates });

    const previousName = ex.exercise_name;

    // Optimistic UI update
    setExercises(prev => prev.map(row => row.id === exerciseId ? { ...row, exercise_name: targetName } : row));

    try {
      const { error } = await supabase
        .from("client_items")
        .update({ exercise_name: targetName })
        .eq("id", exerciseId);

      if (error) {
        console.warn('[AlternativeSwitch] db error', error);
        throw error;
      }

      trackMobileInteraction('alternative_exercise_selected', {
        exerciseId,
        alternativeName: targetName,
        sessionId: session?.id
      });
      console.log('[AlternativeSwitch] success');
      toast.success(`Harjutus vahetatud: ${targetName}`);
    } catch (error) {
      // Revert optimistic update
      if (previousName) {
        setExercises(prev => prev.map(row => row.id === exerciseId ? { ...row, exercise_name: previousName } : row));
      }
      logWorkoutError(error, {
        userId: user?.id,
        sessionId: session?.id,
        programId,
        dayId,
        exerciseId,
        action: 'alternative_exercise_switch'
      });
      toast.error("Viga harjutuse vahetamisel");
    }
  }, [supabase, exercises, session?.id, trackMobileInteraction, logWorkoutError, user?.id, programId, dayId, setExercises]);


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Laadin treeningut...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <PTAccessValidator>
        <ErrorRecovery 
          error={error}
          context={{
            programId,
            dayId,
            userId: user?.id,
            action: "load_workout"
          }}
          onRetry={() => window.location.reload()}
        />
      </PTAccessValidator>
    );
  }

  return (
    <PTAccessValidator>
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10">
        {/* Header */}
        <ModernWorkoutHeader
          programTitle={program?.title_override || "Isiklik programm"}
          dayTitle={day?.title || "Treening"}
          dayOrder={day?.day_order || undefined}
          onBack={() => navigate("/programs")}
          startedAt={session?.started_at || new Date().toISOString()}
          isFinished={!!session?.ended_at}
          onFinish={handleFinishWorkout}
          completedSets={completedSets}
          totalSets={totalSets}
        />

        {/* Workout Rest Timer - Positioned above chat bubble */}
        <WorkoutRestTimer
          isOpen={restTimer.isOpen}
          initialSeconds={restTimer.seconds}
          exerciseName={restTimer.exerciseName}
          onClose={() => setRestTimer(prev => ({ ...prev, isOpen: false }))}
          onStartRest={(seconds) => setRestTimer(prev => ({ ...prev, seconds }))}
        />

        {/* Day Notes */}
        {day?.note && (
          <div className="px-4 py-3 border-b bg-muted/30">
            <p className="text-sm text-muted-foreground">
              <strong>Märkus:</strong> {day.note}
            </p>
          </div>
        )}

        {/* Exercises */}
        <div className="px-4 py-6 space-y-6 relative">
          {/* Loading overlay for set completion */}
          {getLoadingState(LOADING_KEYS.SET_COMPLETE).isLoading && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-lg">
              <LoadingIndicator
                isLoading={true}
                loadingMessage={getLoadingState(LOADING_KEYS.SET_COMPLETE).loadingMessage}
                size="md"
                showMessage={true}
                className="justify-center"
              />
            </div>
          )}
          
          {exercises.map((exercise) => (
            <SmartExerciseCard
              key={exercise.id}
              exercise={exercise}
              completedSets={getCompletedSetsForExercise(exercise.id)}
              onSetComplete={(setNumber) => handleSetComplete(exercise.id, setNumber)}
              onStartRest={() => handleStartRest(exercise)}
              setInputs={setInputs}
              onSetInputChange={(setNumber, field, value) => 
                handleSetInputChange(exercise.id, setNumber, field, value)
              }
              notes={exerciseNotes[exercise.id] || ""}
              onNotesChange={(notes) => handleNotesChange(exercise.id, notes)}
              rpe={exerciseRPE[exercise.id]}
              onRPEChange={(rpe) => handleRPEChange(exercise.id, rpe)}
              onSwitchToAlternative={switchToAlternative}
              showAlternatives={openAlternativesFor[exercise.id] || false}
              onToggleAlternatives={(exerciseId) => setOpenAlternativesFor(prev => ({ ...prev, [exerciseId]: !prev[exerciseId] }))}
              // New feedback system props
              onExerciseFeedback={handleExerciseFeedback}
              showExerciseFeedback={exerciseFeedbackEnabled}
              // Weight update props
              onUpdateSingleSetWeight={handleUpdateSingleSetWeight}
              onUpdateAllSetsWeight={handleUpdateAllSetsWeight}
            />
          ))}
        </div>


        {/* Completion Dialog */}
        <PersonalTrainingCompletionDialog
          isOpen={showCompletionDialog}
          onClose={() => {
            setShowCompletionDialog(false);
            navigate("/programs/stats");
          }}
        />


        {/* Alternative Exercise Auto-Switch - No confirmation needed */}

        {/* Workout Feedback */}
        {showWorkoutFeedback && (
          <WorkoutFeedback
            workoutSummary={getWorkoutSummary()}
            onComplete={handleWorkoutFeedback}
            onSkip={() => setShowWorkoutFeedback(false)}
          />
        )}

        {/* Loading Overlay */}
        {saving && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-background rounded-lg p-6 shadow-lg">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Salvestame...</p>
            </div>
          </div>
        )}
      </div>
    </PTAccessValidator>
  );
}