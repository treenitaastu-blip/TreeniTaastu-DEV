// src/pages/ModernWorkoutSession.tsx
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
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
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
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
  const [setInputs, setSetInputs] = useState<Record<string, { reps?: number; seconds?: number; kg?: number }>>({});
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
  
  // Ref for notes debounce timeout cleanup (Bug #4 fix)
  const notesTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
          
          logsData.forEach((log) => {
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
            type ExerciseNote = {
              client_item_id: string;
              notes?: string | null;
              rpe?: number | null;
              updated_at: string;
            };
            const latestNotes = notesData.reduce((acc: Record<string, ExerciseNote>, note: ExerciseNote) => {
              if (!acc[note.client_item_id] || new Date(note.updated_at) > new Date(acc[note.client_item_id].updated_at)) {
                acc[note.client_item_id] = note;
              }
              return acc;
            }, {});
            
            Object.values(latestNotes).forEach((note: ExerciseNote) => {
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
    
    // Bug #2 fix: Check for duplicate before insert (race condition prevention)
    if (setLogs[key]) {
      console.log(`Set ${setNumber} for exercise ${exerciseId} already logged, skipping duplicate`);
      return;
    }
    
    const inputs = setInputs[key] || {};
    const exercise = exercises.find(ex => ex.id === exerciseId);

    try {
      setSaving(true);
      setLoadingState(LOADING_KEYS.SET_COMPLETE, true, getLoadingMessage(LOADING_KEYS.SET_COMPLETE));
      
      // Parse target reps for fallback (only for non-time-based exercises)
      const targetReps = exercise?.reps ? parseInt(exercise.reps.replace(/[^\d]/g, '')) || null : null;
      
      // Determine if this is a time-based exercise
      const isTimeBased = exercise?.seconds !== null && exercise?.seconds !== undefined && exercise.seconds > 0;
      
      // For time-based exercises, allow completion with just seconds_done (reps_done can be null)
      // For weight/bodyweight exercises, require reps_done
      const repsDone = isTimeBased 
        ? (inputs.reps || targetReps) // Optional for time-based, but allow if provided
        : (inputs.reps || targetReps); // Required for non-time-based
      
      const setLogData = {
        session_id: session.id,
        client_item_id: exerciseId,
        client_day_id: dayId!,
        program_id: programId!,
        user_id: user.id,
        set_number: setNumber,
        reps_done: repsDone,
        seconds_done: inputs.seconds || exercise?.seconds,
        weight_kg_done: inputs.kg || exercise?.weight_kg,
        marked_done_at: new Date().toISOString()
      };
      
      // Validation: For time-based exercises, ensure seconds_done is present
      // For non-time-based, ensure reps_done is present
      if (isTimeBased && !setLogData.seconds_done) {
        throw new Error('Ajaharjutus nõuab aja sisestamist');
      }
      if (!isTimeBased && !setLogData.reps_done) {
        throw new Error('Harjutus nõuab korduste sisestamist');
      }
      
      // Bug #1 fix: Use upsert instead of insert to handle duplicates
      const { error: upsertError } = await supabase
        .from("set_logs")
        .upsert([setLogData], {
          onConflict: "session_id,client_item_id,set_number"
        });

      // Bug #7 fix: Fallback conflict handling if upsert fails
      if (upsertError) {
        console.warn('Upsert failed, attempting fallback:', upsertError);
        
        // Check if set already exists
        const { data: existing, error: selectError } = await supabase
          .from("set_logs")
          .select("id")
          .eq("session_id", session.id)
          .eq("client_item_id", exerciseId)
          .eq("set_number", setNumber)
          .limit(1);
          
        if (selectError) throw selectError;
        
        if (!existing || existing.length === 0) {
          // Set doesn't exist, try insert
          const { error: insertError } = await supabase
            .from("set_logs")
            .insert([setLogData]);
          if (insertError) throw insertError;
        } else {
          // Set exists, update it
          const { error: updateError } = await supabase
            .from("set_logs")
            .update({
              reps_done: setLogData.reps_done,
              seconds_done: setLogData.seconds_done,
              weight_kg_done: setLogData.weight_kg_done,
              marked_done_at: setLogData.marked_done_at
            })
            .eq("id", existing[0].id);
          if (updateError) throw updateError;
        }
      }

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
        
        // Persist personalized reps default for this user (use last set reps if available)
        try {
          const repsToPersist = typeof actualReps === 'number' ? actualReps : (typeof actualReps === 'string' ? parseInt(String(actualReps).replace(/[^0-9]/g, '')) : null);
          if (typeof repsToPersist === 'number' && Number.isFinite(repsToPersist) && repsToPersist > 0) {
            await supabase
              .from('client_items')
              .update({ reps: String(repsToPersist) })
              .eq('id', exerciseId);
            // Optimistically reflect in local state so UI shows new default immediately
            setExercises(prev => prev.map(ex => ex.id === exerciseId ? { ...ex, reps: String(repsToPersist) } : ex));
          }
        } catch (persistErr) {
          console.warn('Failed to persist reps default', persistErr);
        }

        // Persist personalized weight default for this user (only for weight-based exercises)
        // Calculate average weight from all completed sets to handle progressive overload
        if (exercise.weight_kg !== null && exercise.weight_kg !== undefined && exercise.weight_kg > 0) {
          try {
            // Get all completed set weights for this exercise from current session
            const allSetWeights: number[] = [];
            for (let setNum = 1; setNum <= completedSets; setNum++) {
              const setKey = `${exerciseId}:${setNum}`;
              const setInput = setInputs[setKey];
              // Use setInput if available (most up-to-date), otherwise use actualWeight for current set
              let setWeight: number | undefined;
              if (setInput?.kg !== undefined) {
                setWeight = setInput.kg;
              } else if (setNum === setNumber) {
                // Current set - use actualWeight from this completion
                setWeight = actualWeight ?? undefined;
              } else {
                // Previous sets - check setLogs as fallback
                const setLog = setLogs[setKey];
                setWeight = setLog?.weight_kg_done ?? undefined;
              }
              
              if (setWeight && typeof setWeight === 'number' && Number.isFinite(setWeight) && setWeight > 0) {
                allSetWeights.push(setWeight);
              }
            }
            
            // If we have weight data from sets, persist it
            if (allSetWeights.length > 0) {
              // Use average weight (more representative of actual training load)
              // Round to 2 decimal places for cleaner storage
              const averageWeight = allSetWeights.reduce((sum, w) => sum + w, 0) / allSetWeights.length;
              const weightToPersist = Math.round(averageWeight * 100) / 100;
              
              // Only update if weight changed (avoid unnecessary DB writes)
              if (Math.abs(weightToPersist - (exercise.weight_kg || 0)) > 0.01) {
                await supabase
                  .from('client_items')
                  .update({ weight_kg: weightToPersist })
                  .eq('id', exerciseId);
                // Optimistically reflect in local state
                setExercises(prev => prev.map(ex => ex.id === exerciseId ? { ...ex, weight_kg: weightToPersist } : ex));
                console.log(`Persisted weight for exercise ${exerciseId}: ${exercise.weight_kg}kg → ${weightToPersist}kg`);
              }
            }
          } catch (persistWeightErr) {
            console.warn('Failed to persist weight default', persistWeightErr);
          }
        }

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
  }, [session, user, dayId, programId, setInputs, exercises, getCompletedSetsForExercise, completedExerciseIds, trackFeatureUsage, setLogs]);

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

  // Bug #4 fix: Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (notesTimeoutRef.current) {
        clearTimeout(notesTimeoutRef.current);
      }
    };
  }, []);

  const handleNotesChange = useCallback(async (exerciseId: string, notes: string) => {
    if (!session || !user) return;
    
    // Bug #4 fix: Clear existing timeout to prevent memory leak
    if (notesTimeoutRef.current) {
      clearTimeout(notesTimeoutRef.current);
    }
    
    // Update local state immediately for responsive UI
    setExerciseNotes(prev => ({ ...prev, [exerciseId]: notes }));
    
    // Save to database with simple debouncing
    const saveNotes = async () => {
      try {
        if (notes.trim()) {
          const { error } = await supabase.from("exercise_notes").upsert({
            session_id: session.id,
            client_day_id: dayId!,
            client_item_id: exerciseId,
            program_id: programId!,
            user_id: user.id,
            notes: notes.trim()
          }, {
            onConflict: 'session_id,client_item_id'
          });
          
          if (error) throw error;
        } else {
          // If notes are empty, delete the record for this session
          const { error } = await supabase
            .from("exercise_notes")
            .delete()
            .eq("session_id", session.id)
            .eq("client_item_id", exerciseId);
            
          if (error) throw error;
        }
      } catch (error) {
        // Bug #5 fix: Proper error handling instead of silent failure
        console.error('Failed to save exercise notes:', error);
        logDatabaseError(error as Error, ErrorCategory.EXERCISE_NOTES_SAVE, {
          exerciseId,
          sessionId: session.id,
          dayId: dayId,
          programId: programId
        });
        // Show user-friendly error message
        toast.error("Märkuste salvestamine ebaõnnestus", {
          description: "Palun proovi uuesti või kontrolli internetiühendust"
        });
      }
    };

    // Bug #4 fix: Store timeout ID in ref for cleanup
    notesTimeoutRef.current = setTimeout(saveNotes, 500);
  }, [session, user, dayId, programId]);

  const handleRPEChange = useCallback(async (exerciseId: string, rpe: number) => {
    if (!session || !user) return;
    
    // Update local state immediately
    setExerciseRPE(prev => ({ ...prev, [exerciseId]: rpe }));
    
    // Save to database in real-time
    try {
      const { error } = await supabase.from("exercise_notes").upsert({
        session_id: session.id,
        client_day_id: dayId!,
        client_item_id: exerciseId,
        program_id: programId!,
        user_id: user.id,
        rpe: rpe
      }, {
        onConflict: "session_id,client_item_id"
      });
      
      if (error) throw error;
    } catch (error) {
      // Bug #5 fix: Proper error handling instead of silent failure
      console.error('Failed to save RPE:', error);
      logDatabaseError(error as Error, ErrorCategory.EXERCISE_RPE_SAVE, {
        exerciseId,
        sessionId: session.id,
        dayId: dayId,
        programId: programId,
        rpe
      });
      // Show user-friendly error message
      toast.error("RPE salvestamine ebaõnnestus", {
        description: "Palun proovi uuesti või kontrolli internetiühendust"
      });
    }
  }, [session, user, dayId, programId]);

  // Per-exercise progression confirmation state
  const [showExerciseProgressionConfirm, setShowExerciseProgressionConfirm] = useState(false);
  const [pendingExerciseProgression, setPendingExerciseProgression] = useState<{
    exerciseId: string;
    exerciseName: string;
    currentWeight: number;
    suggestedWeight: number;
    delta: number;
    reason: string;
  } | null>(null);

  const computeSuggestedWeight = (current: number, sense: 'too_easy' | 'just_right' | 'too_hard') => {
    if (!Number.isFinite(current) || current < 0) current = 0;
    const stepRaw = Math.max(0.25, Math.min(2.5, current * 0.02));
    const step = Math.round(stepRaw * 4) / 4; // 0.25 rounding
    if (sense === 'too_easy') return Math.min(1000, Math.round((current + step) * 4) / 4);
    if (sense === 'too_hard') return Math.max(0, Math.round((current - step) * 4) / 4);
    return current; // just_right -> maintain
  };

  // Handle exercise feedback from new system
  const handleExerciseFeedback = useCallback(async (exerciseId: string, feedback: {
    feedback: 'too_easy' | 'just_right' | 'too_hard';
    newWeight?: number;
    change?: number;
    reason: string;
  }) => {
    if (!session || !user) return;

    try {
      // Save feedback to database (do not auto-change weight here)
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

      // Fetch last two feedbacks for this exercise/user to gate recommendation
      const { data: lastTwo, error: lastErr } = await supabase
        .from('exercise_notes')
        .select('id, created_at, exercise_feedback')
        .eq('user_id', user.id)
        .eq('client_item_id', exerciseId)
        .order('created_at', { ascending: false })
        .limit(2);
      if (!lastErr && Array.isArray(lastTwo) && lastTwo.length === 2) {
        const a = String(lastTwo[0]?.exercise_feedback || '');
        const b = String(lastTwo[1]?.exercise_feedback || '');
        const sameTwice = a && b && a === b && (a === feedback.feedback);
        if (sameTwice) {
          const ex = exercises.find(e => e.id === exerciseId);
          const current = ex?.weight_kg ?? 0;
          const suggested = computeSuggestedWeight(current, feedback.feedback);
          const delta = Math.round((suggested - current) * 4) / 4;
          setPendingExerciseProgression({
            exerciseId,
            exerciseName: ex?.exercise_name || 'Harjutus',
            currentWeight: current,
            suggestedWeight: suggested,
            delta,
            reason: feedback.reason
          });
          setShowExerciseProgressionConfirm(true);
        }
      }

      toast.success("Tagasiside salvestatud!", {
        description: feedback.reason
      });

    } catch (error) {
      console.error('Error saving exercise feedback:', error);
      toast.error("Tagasiside salvestamine ebaõnnestus");
    }
  }, [session, user, dayId, programId, exercises]);

  const confirmApplyExerciseProgression = useCallback(async () => {
    if (!pendingExerciseProgression) return;
    const { exerciseId, suggestedWeight } = pendingExerciseProgression;
    try {
      // Apply new default weight to client_items
      await supabase
        .from('client_items')
        .update({ weight_kg: suggestedWeight })
        .eq('id', exerciseId);
      // Optimistic local update
      setExercises(prev => prev.map(ex => ex.id === exerciseId ? { ...ex, weight_kg: suggestedWeight } : ex));
      toast.success('Uus raskus rakendatud');
    } catch (e) {
      console.error('Apply exercise progression failed', e);
      toast.error('Raskuse rakendamine ebaõnnestus');
    } finally {
      setShowExerciseProgressionConfirm(false);
      setPendingExerciseProgression(null);
    }
  }, [pendingExerciseProgression]);

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

  // Confirmation state for applying progression changes
  const [showProgressionConfirm, setShowProgressionConfirm] = useState(false);
  const [pendingProgressionFeedback, setPendingProgressionFeedback] = useState<{
    fatigue_level: number;
    energy_level: 'low' | 'normal' | 'high';
    joint_pain: boolean;
  } | null>(null);
  const [isApplyingProgression, setIsApplyingProgression] = useState(false);

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

      // Check last two feedback entries for gating condition
      const { data: lastTwo, error: fetchErr } = await supabase
        .from('workout_feedback')
        .select('id, created_at, joint_pain, fatigue_level, energy_level')
        .eq('user_id', user.id)
        .eq('program_id', programId!)
        .order('created_at', { ascending: false })
        .limit(2);
      if (fetchErr) {
        console.warn('Failed to fetch last feedbacks', fetchErr);
      } else if (Array.isArray(lastTwo) && lastTwo.length === 2) {
        const a = lastTwo[0];
        const b = lastTwo[1];
        const samePain = Boolean(a.joint_pain) && Boolean(b.joint_pain);
        const highFatigueTwice = Number(a.fatigue_level) >= 8 && Number(b.fatigue_level) >= 8;
        const lowEnergyTwice = String(a.energy_level) === 'low' && String(b.energy_level) === 'low';
        if (samePain || highFatigueTwice || lowEnergyTwice) {
          setPendingProgressionFeedback({
            fatigue_level: feedback.fatigue_level,
            energy_level: feedback.energy_level,
            joint_pain: feedback.joint_pain
          });
          setShowProgressionConfirm(true);
        }
      }

      toast.success("Treeningu tagasiside salvestatud!");

      setShowWorkoutFeedback(false);
      
      // Show completion dialog after feedback is submitted
      setShowCompletionDialog(true);

    } catch (error) {
      console.error('Error saving workout feedback:', error);
      toast.error("Treeningu tagasiside salvestamine ebaõnnestus");
    }
  }, [session, user, programId]);

  const confirmApplyProgression = useCallback(async () => {
    if (!user || !programId || !pendingProgressionFeedback) {
      setShowProgressionConfirm(false);
      return;
    }
    try {
      setIsApplyingProgression(true);
      const { data: progressionResults, error: progressionError } = await supabase.rpc('apply_volume_progression', {
        p_user_id: user.id,
        p_program_id: programId!,
        p_fatigue_level: pendingProgressionFeedback.fatigue_level,
        p_energy_level: pendingProgressionFeedback.energy_level,
        p_joint_pain: pendingProgressionFeedback.joint_pain
      });
      if (progressionError) {
        console.error('Volume progression error:', progressionError);
      } else if (progressionResults && progressionResults.length > 0) {
        type ProgressionResult = {
          exercise_name: string;
          old_reps: string | number | null;
          new_reps: string | number | null;
          old_sets: number | null;
          new_sets: number | null;
        };
        const summary = (progressionResults as ProgressionResult[]).map((r) => `${r.exercise_name}: ${r.old_reps}→${r.new_reps} reps, ${r.old_sets}→${r.new_sets} sets`).join(', ');
        toast.success('Rakendasime muudatused treeningmahule', { description: summary });
        // Telemetry: confirmed apply
        trackFeatureUsage?.('progression', 'applied', {
          program_id: programId,
          fatigue_level: pendingProgressionFeedback.fatigue_level,
          energy_level: pendingProgressionFeedback.energy_level,
          joint_pain: pendingProgressionFeedback.joint_pain
        });
      }
    } finally {
      setIsApplyingProgression(false);
      setShowProgressionConfirm(false);
      setPendingProgressionFeedback(null);
    }
  }, [user, programId, pendingProgressionFeedback]);


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
            const updateData: { weight_kg?: number; reps?: string } = {};
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

        {/* Workout Rest Timer */}
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
              onSetComplete={(setNumber, data) => {
                // Store timer data (seconds) in setInputs if provided
                if (data) {
                  const key = `${exercise.id}:${setNumber}`;
                  setSetInputs(prev => ({
                    ...prev,
                    [key]: { ...prev[key], ...data }
                  }));
                }
                handleSetComplete(exercise.id, setNumber);
              }}
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
              
            />
          ))}
        </div>


        {/* Completion Dialog */}
        <PersonalTrainingCompletionDialog
          isOpen={showCompletionDialog}
          onClose={() => {
            setShowCompletionDialog(false);
            // Don't auto-navigate on close - let user choose via buttons
          }}
        />


        {/* Alternative Exercise Auto-Switch - No confirmation needed */}

        {/* Workout Feedback */}
        {showWorkoutFeedback && (
          <WorkoutFeedback
            workoutSummary={getWorkoutSummary()}
            onComplete={handleWorkoutFeedback}
            onSkip={() => {
              setShowWorkoutFeedback(false);
              setShowCompletionDialog(true);
            }}
          />
        )}

        {/* Progression confirmation */}
        {showProgressionConfirm && (
          <ConfirmationDialog
            isOpen={showProgressionConfirm}
            onClose={() => {
              setShowProgressionConfirm(false);
              // Telemetry: declined apply
              if (pendingProgressionFeedback) {
                trackFeatureUsage?.('progression', 'declined', {
                  program_id: programId,
                  fatigue_level: pendingProgressionFeedback.fatigue_level,
                  energy_level: pendingProgressionFeedback.energy_level,
                  joint_pain: pendingProgressionFeedback.joint_pain
                });
              }
              setPendingProgressionFeedback(null);
            }}
            onConfirm={confirmApplyProgression}
            title="Rakenda treeningu muudatused?"
            description="Raporteerisid sama tunnet kaks korda järjest. Kas soovid, et kohandaksime automaatselt seeriate arvu ja/või kordusi järgmisteks treeninguteks?"
            confirmText={isApplyingProgression ? "Rakendan..." : "Jah, rakenda"}
            cancelText="Ei, jäta muutmata"
            variant="info"
            isLoading={isApplyingProgression}
            loadingText="Rakendan muudatusi..."
          />
        )}

        {/* Per-exercise recommendation confirmation */}
        {showExerciseProgressionConfirm && pendingExerciseProgression && (
          <ConfirmationDialog
            isOpen={showExerciseProgressionConfirm}
            onClose={() => {
              setShowExerciseProgressionConfirm(false);
              setPendingExerciseProgression(null);
            }}
            onConfirm={confirmApplyExerciseProgression}
            title="Soovitame muuta raskust"
            description={`${pendingExerciseProgression.exerciseName}: ${pendingExerciseProgression.currentWeight.toFixed(2)} kg → ${pendingExerciseProgression.suggestedWeight.toFixed(2)} kg (${pendingExerciseProgression.delta >= 0 ? '+' : ''}${pendingExerciseProgression.delta.toFixed(2)} kg)`}
            confirmText="Rakenda"
            cancelText="Jäta samaks"
            variant="info"
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