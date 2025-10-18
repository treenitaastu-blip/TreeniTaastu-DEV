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
import ModernRestTimer from "@/components/workout/ModernRestTimer";
import PersonalTrainingCompletionDialog from "@/components/workout/PersonalTrainingCompletionDialog";
import PTAccessValidator from "@/components/PTAccessValidator";
import ErrorRecovery from "@/components/ErrorRecovery";
import RPERIRDialog from "@/components/workout/EnhancedRPERIRDialog";

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
  const [alternativeConfirmation, setAlternativeConfirmation] = useState<{
    show: boolean;
    exerciseId: string;
    alternativeName: string;
    originalName: string;
  }>({ show: false, exerciseId: '', alternativeName: '', originalName: '' });
  
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

  // RPE/RIR dialog state
  const [rpeRirDialog, setRpeRirDialog] = useState<{
    isOpen: boolean;
    exerciseId: string;
    exerciseName: string;
    setNumber: number;
  }>({
    isOpen: false,
    exerciseId: "",
    exerciseName: "",
    setNumber: 0
  });

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
            *,
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
        
        // Show RPE/RIR dialog with slight delay for better UX
        setTimeout(() => {
          setRpeRirDialog({
            isOpen: true,
            exerciseId,
            exerciseName: exercise.exercise_name,
            setNumber
          });
        }, 500); // Slightly longer delay for better user experience
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
            onConflict: "session_id,client_item_id"
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

  const handleRPERIRSubmit = useCallback(async (rpe: number, rir: number) => {
    if (!session || !user || !rpeRirDialog.exerciseId) return;

    try {
      // Update RPE
      setExerciseRPE(prev => ({ ...prev, [rpeRirDialog.exerciseId]: rpe }));

      // Save RPE and RIR to database with comprehensive data
      await supabase.from("exercise_notes").upsert({
        session_id: session.id,
        client_day_id: dayId!,
        client_item_id: rpeRirDialog.exerciseId,
        program_id: programId!,
        user_id: user.id,
        rpe: rpe,
        rir_done: rir,
        // Store RPE history for trend analysis
        rpe_history: {
          [new Date().toISOString()]: { rpe, rir, session_id: session.id }
        }
      }, {
        onConflict: "session_id,client_item_id"
      });

      // Track RPE/RIR submission
      trackFeatureUsage('rpe_rir', 'submitted', {
        exercise_id: rpeRirDialog.exerciseId,
        exercise_name: rpeRirDialog.exerciseName,
        rpe: rpe,
        rir: rir,
        program_id: programId,
        day_id: dayId
      });

      // Apply intelligent progression immediately
      await applyIntelligentProgression(rpeRirDialog.exerciseId, rpe, rir);

      toast.success(`Hinnang salvestatud: RPE ${rpe}, RIR ${rir}`, {
        description: "Järgmine treening kohaneb sinu tulemustel"
      });

      // Close RPE/RIR dialog
      setRpeRirDialog(prev => ({ ...prev, isOpen: false }));
      
    } catch (error) {
      const errorInfo = getErrorMessage(error, 'exercise_save');
      toast.error(errorInfo.title, {
        description: errorInfo.description,
        action: errorInfo.action ? {
          label: getActionButtonText(errorInfo.action),
          onClick: () => {
            // Retry the operation
            handleSaveRPERIR(rpeRirDialog.exerciseId, rpeRirDialog.exerciseName, rpeRirDialog.rpe, rpeRirDialog.rir);
          }
        } : undefined
      });
    }
  }, [session, user, dayId, programId, rpeRirDialog.exerciseId, rpeRirDialog.exerciseName, trackFeatureUsage]);

  // Apply intelligent progression based on RPE and RIR
  const applyIntelligentProgression = useCallback(async (exerciseId: string, rpe: number, rir: number) => {
    if (!exerciseId || !rpe) return;

    try {
      const exercise = exercises.find(ex => ex.id === exerciseId);
      if (!exercise) return;

      // Use the sophisticated database function for analysis first
      try {
        const { data: analysis, error } = await supabase.rpc('analyze_exercise_progression_enhanced', {
          p_client_item_id: exerciseId,
          p_weeks_back: 2
        });

        if (!error && analysis) {
          const progression = analysis as unknown as ExerciseProgression;
          
          // Apply the suggested progression
          if (progression.action !== 'maintain' && progression.suggested_weight && progression.current_weight) {
            await supabase
              .from("client_items")
              .update({ weight_kg: progression.suggested_weight })
              .eq("id", exercise.id);
            
            // Update local state
            setExercises(prev => prev.map(ex => 
              ex.id === exerciseId ? { ...ex, weight_kg: progression.suggested_weight } : ex
            ));
            
            // Track intelligent progression
            trackFeatureUsage('intelligent_progression', 'applied', {
              exercise_name: exercise.exercise_name,
              old_weight: progression.current_weight,
              new_weight: progression.suggested_weight,
              rpe: rpe,
              rir: rir,
              action: progression.action,
              reason: progression.reason,
              confidence: progression.confidence_score
            });
            
            toast.success(`🧠 ${exercise.exercise_name}: ${progression.current_weight}kg → ${progression.suggested_weight}kg`, {
              description: `${progression.reason} (Confidence: ${Math.round((progression.confidence_score || 0) * 100)}%)`
            });
            return;
          }
        }
      } catch (dbError) {
        // Try simple fallback function
        try {
          const { data: simpleAnalysis, error: simpleError } = await supabase.rpc('analyze_exercise_progression_simple', {
            p_client_item_id: exerciseId,
            p_weeks_back: 2
          });

          if (!simpleError && simpleAnalysis) {
            const progression = simpleAnalysis as unknown as ExerciseProgression;
            
            if (progression.action !== 'maintain' && progression.suggested_weight && progression.current_weight) {
              await supabase
                .from("client_items")
                .update({ weight_kg: progression.suggested_weight })
                .eq("id", exercise.id);
              
              setExercises(prev => prev.map(ex => 
                ex.id === exerciseId ? { ...ex, weight_kg: progression.suggested_weight } : ex
              ));
              
              toast.success(`🧠 ${exercise.exercise_name}: ${progression.current_weight}kg → ${progression.suggested_weight}kg`, {
                description: `Database analysis (simple)`
              });
              return;
            }
          }
        } catch (simpleDbError) {
          // Both database functions failed, using local logic
        }
      }

      // Fallback to enhanced local progression logic
      const currentWeight = exercise.weight_kg;
      let newWeight = currentWeight;
      let progressionType = 'maintain';
      let reason = '';
      
      // Advanced progression logic considering both RPE and RIR
      if (rpe <= 5 && rir >= 4) {
        // Very easy - significant increase
        newWeight = currentWeight ? Math.round(currentWeight * 1.1 * 2) / 2 : currentWeight; // 10% increase
        progressionType = 'increase_significant';
        reason = 'Liiga kerge (RPE≤5, RIR≥4) - suurem tõus';
      } else if (rpe <= 6 && rir >= 3) {
        // Too easy - standard increase
        newWeight = currentWeight ? Math.round(currentWeight * 1.075 * 2) / 2 : currentWeight; // 7.5% increase
        progressionType = 'increase_standard';
        reason = 'Kerge (RPE≤6, RIR≥3) - tõus';
      } else if (rpe <= 7 && rir >= 2) {
        // Slightly easy - micro increase
        newWeight = currentWeight ? Math.round(currentWeight * 1.025 * 2) / 2 : currentWeight; // 2.5% increase
        progressionType = 'increase_micro';
        reason = 'Veidi kerge (RPE≤7, RIR≥2) - väike tõus';
      } else if ((rpe >= 9 && rir === 0) || rpe >= 10) {
        // Too hard - decrease
        newWeight = currentWeight ? Math.round(currentWeight * 0.925 * 2) / 2 : currentWeight; // 7.5% decrease
        progressionType = 'decrease';
        reason = 'Liiga raske (RPE≥9, RIR=0) - vähendus';
      } else if (rpe >= 8.5 && rir <= 1) {
        // Slightly too hard - micro decrease
        newWeight = currentWeight ? Math.round(currentWeight * 0.975 * 2) / 2 : currentWeight; // 2.5% decrease
        progressionType = 'decrease_micro';
        reason = 'Veidi raske (RPE≥8.5, RIR≤1) - väike vähendus';
      } else {
        // Perfect range RPE 7-8, RIR 1-3 - maintain
        reason = `Ideaalne vahemik (RPE ${rpe}, RIR ${rir}) - säilita`;
      }

      // Apply progression if weight changed
      if (newWeight !== currentWeight && newWeight && currentWeight) {
        await supabase
          .from("client_items")
          .update({ weight_kg: newWeight })
          .eq("id", exercise.id);
        
        // Update local state
        setExercises(prev => prev.map(ex => 
          ex.id === exerciseId ? { ...ex, weight_kg: newWeight } : ex
        ));
        
        // Track progression
        trackFeatureUsage('smart_progression', 'applied', {
          exercise_name: exercise.exercise_name,
          old_weight: currentWeight,
          new_weight: newWeight,
          rpe: rpe,
          rir: rir,
          progression_type: progressionType
        });
        
        toast.success(`⚡ ${exercise.exercise_name}: ${currentWeight}kg → ${newWeight}kg`, {
          description: reason
        });
      } else if (progressionType === 'maintain') {
        toast.success(`✅ ${exercise.exercise_name}: Kaal jääb samaks`, {
          description: reason
        });
      }
    } catch (error) {
      const errorInfo = getErrorMessage(error, 'progression_update');
      toast.error(errorInfo.title, {
        description: errorInfo.description,
        action: errorInfo.action ? {
          label: getActionButtonText(errorInfo.action),
          onClick: () => {
            // Retry the operation
            applyIntelligentProgression(exerciseId, rpe, rir);
          }
        } : undefined
      });
    }
  }, [exercises, trackFeatureUsage]);

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
            result.deload_exercises && result.deload_exercises > 0 ? "Deload Applied!" : "Program Optimized!",
            {
              description: `${result.updates_made} exercises automatically adjusted based on your RPE/RIR data${result.deload_exercises ? ` (${result.deload_exercises} deloaded)` : ''}.`,
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
            onConflict: "session_id,client_item_id"
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
      setShowCompletionDialog(true);

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

  // Function to show alternative exercise confirmation
  const switchToAlternative = useCallback((exerciseId: string, alternativeName: string) => {
    const originalName = exercises.find(e => e.id === exerciseId)?.exercise_name || '';
    setAlternativeConfirmation({
      show: true,
      exerciseId,
      alternativeName,
      originalName
    });
  }, [exercises]);

  // Function to confirm alternative exercise switch
  const confirmAlternativeSwitch = useCallback(async () => {
    const { exerciseId, alternativeName } = alternativeConfirmation;
    
    try {
      // Update the exercise name in the database
      const { error } = await supabase
        .from("client_items")
        .update({ exercise_name: alternativeName })
        .eq("id", exerciseId);

      if (error) throw error;

      // Update local state
      setExercises(prev => prev.map(item => 
        item.id === exerciseId 
          ? { ...item, exercise_name: alternativeName }
          : item
      ));

      // Close alternatives panel
      setOpenAlternativesFor(prev => ({ ...prev, [exerciseId]: false }));
      
      // Track mobile interaction for UX metrics
      trackMobileInteraction('alternative_exercise_switch', {
        userId: user?.id,
        sessionId: session?.id,
        programId: programId,
        dayId: dayId,
        exerciseId: exerciseId,
        additionalData: {
          alternativeName,
          originalExerciseName: alternativeConfirmation.originalName
        }
      });
      
      // Show success message
      toast.success(`Harjutus vahetatud: ${alternativeName}`);
      
      // Close confirmation dialog
      setAlternativeConfirmation({ show: false, exerciseId: '', alternativeName: '', originalName: '' });
    } catch (error) {
      // Log the error with context
      logWorkoutError(error, {
        userId: user?.id,
        sessionId: session?.id,
        programId: programId,
        dayId: dayId,
        exerciseId: exerciseId,
        action: 'switch_alternative',
        component: 'ModernWorkoutSession',
        additionalData: {
          alternativeName,
          originalExerciseName: alternativeConfirmation.originalName
        }
      });
      
      console.error("Error switching to alternative:", error);
      toast.error("Viga harjutuse vahetamisel");
    }
  }, [alternativeConfirmation, supabase, exercises, user?.id, session?.id, programId, dayId, trackMobileInteraction, logWorkoutError]);

  // Function to cancel alternative exercise switch
  const cancelAlternativeSwitch = useCallback(() => {
    setAlternativeConfirmation({ show: false, exerciseId: '', alternativeName: '', originalName: '' });
  }, []);

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
            />
          ))}
        </div>

        {/* Rest Timer */}
        <ModernRestTimer
          isOpen={restTimer.isOpen}
          initialSeconds={restTimer.seconds}
          exerciseName={restTimer.exerciseName}
          onClose={() => setRestTimer(prev => ({ ...prev, isOpen: false }))}
        />

        {/* Completion Dialog */}
        <PersonalTrainingCompletionDialog
          isOpen={showCompletionDialog}
          onClose={() => {
            setShowCompletionDialog(false);
            navigate("/programs/stats");
          }}
        />

        {/* RPE/RIR Dialog */}
        <RPERIRDialog
          isOpen={rpeRirDialog.isOpen}
          onClose={() => setRpeRirDialog(prev => ({ ...prev, isOpen: false }))}
          onSubmit={handleRPERIRSubmit}
          exerciseName={rpeRirDialog.exerciseName}
          setNumber={rpeRirDialog.setNumber}
          currentWeight={exercises.find(ex => ex.id === rpeRirDialog.exerciseId)?.weight_kg || undefined}
          previousRPE={exerciseRPE[rpeRirDialog.exerciseId] || undefined}
        />

        {/* Alternative Exercise Confirmation Dialog */}
        {alternativeConfirmation.show && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-lg p-6 shadow-xl max-w-sm w-full mx-4">
              <div className="text-center space-y-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Alternatiivne harjutus
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Kas soovid vahetada harjutust?
                  </p>
                  
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Praegune:</span>
                      <span className="text-sm font-medium">{alternativeConfirmation.originalName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Uus:</span>
                      <span className="text-sm font-medium text-blue-600">{alternativeConfirmation.alternativeName}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={cancelAlternativeSwitch}
                    className="flex-1"
                  >
                    Tühista
                  </Button>
                  <Button
                    onClick={confirmAlternativeSwitch}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    Vali
                  </Button>
                </div>
              </div>
            </div>
          </div>
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