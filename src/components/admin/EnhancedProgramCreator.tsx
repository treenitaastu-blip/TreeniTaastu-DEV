import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Calendar, 
  Users, 
  Target, 
  Plus, 
  Trash2, 
  ChevronDown,
  ChevronUp,
  Play,
  Settings,
  Dumbbell,
  Clock,
  Search
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Template = {
  id: string;
  title: string;
  goal: string | null;
  is_active: boolean | null;
};

type Client = {
  id: string;
  email: string | null;
  created_at: string;
};

type ExerciseAlternative = {
  id?: string;
  alternative_name: string;
  alternative_description?: string;
  alternative_video_url?: string;
  difficulty_level: 'easier' | 'same' | 'harder';
  equipment_required?: string[];
  muscle_groups?: string[];
};

type Exercise = {
  id?: string;
  exercise_name: string;
  sets: number;
  reps: string;
  rest_seconds: number;
  weight_kg?: number;
  coach_notes?: string;
  video_url?: string;
  order_in_day: number;
  is_unilateral?: boolean;
  reps_per_side?: number | null;
  total_reps?: number | null;
  alternatives?: ExerciseAlternative[];
};

type TrainingDay = {
  day_number: number;
  title: string;
  exercises: Exercise[];
  is_open: boolean;
};

interface EnhancedProgramCreatorProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function EnhancedProgramCreator({ 
  isOpen, 
  onOpenChange, 
  onSuccess 
}: EnhancedProgramCreatorProps) {
  const { toast } = useToast();
  
  // Program settings
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedClientEmail, setSelectedClientEmail] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [trainingDaysPerWeek, setTrainingDaysPerWeek] = useState(3);
  const [programTitle, setProgramTitle] = useState("");
  const [autoProgressionEnabled, setAutoProgressionEnabled] = useState(true);
  
  // Training days structure
  const [trainingDays, setTrainingDays] = useState<TrainingDay[]>([]);
  
  // Creating state
  const [creating, setCreating] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);

  // Load clients on dialog open
  useEffect(() => {
    if (isOpen) {
      loadClients();
    }
  }, [isOpen]);

  // Initialize training days when trainingDaysPerWeek changes
  useEffect(() => {
    const days: TrainingDay[] = [];
    for (let i = 1; i <= trainingDaysPerWeek; i++) {
      days.push({
        day_number: i,
        title: `Päev ${i}`,
        exercises: [],
        is_open: i === 1, // Open first day by default
      });
    }
    setTrainingDays(days);
  }, [trainingDaysPerWeek]);

  const loadClients = async () => {
    setLoadingClients(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setClients((data || []).filter(client => client.email !== null));
    } catch (error: any) {
      console.error("Error loading clients:", error);
      toast({
        title: "Viga",
        description: "Klientide laadimine ebaõnnestus",
        variant: "destructive",
      });
    } finally {
      setLoadingClients(false);
    }
  };

  const addExercise = (dayIndex: number) => {
    const newExercise: Exercise = {
      exercise_name: "Uus harjutus",
      sets: 3,
      reps: "8-12",
      rest_seconds: 60,
      coach_notes: "",
      video_url: "",
      order_in_day: trainingDays[dayIndex].exercises.length + 1,
      is_unilateral: false,
      reps_per_side: null,
      total_reps: null,
      alternatives: [],
    };

    setTrainingDays(prev => prev.map((day, idx) => 
      idx === dayIndex 
        ? { ...day, exercises: [...day.exercises, newExercise] }
        : day
    ));
  };

  const addAlternative = (dayIndex: number, exerciseIndex: number) => {
    const newAlternative: ExerciseAlternative = {
      alternative_name: "Alternatiivne harjutus",
      alternative_description: "",
      alternative_video_url: "",
      difficulty_level: "same",
      equipment_required: [],
      muscle_groups: [],
    };

    setTrainingDays(prev => prev.map((day, dayIdx) => 
      dayIdx === dayIndex 
        ? {
            ...day,
            exercises: day.exercises.map((exercise, exIdx) => 
              exIdx === exerciseIndex 
                ? {
                    ...exercise,
                    alternatives: [...(exercise.alternatives || []), newAlternative]
                  }
                : exercise
            )
          }
        : day
    ));
  };

  const updateAlternative = (dayIndex: number, exerciseIndex: number, altIndex: number, field: keyof ExerciseAlternative, value: any) => {
    setTrainingDays(prev => prev.map((day, dayIdx) => 
      dayIdx === dayIndex 
        ? {
            ...day,
            exercises: day.exercises.map((exercise, exIdx) => 
              exIdx === exerciseIndex 
                ? {
                    ...exercise,
                    alternatives: exercise.alternatives?.map((alt, idx) => 
                      idx === altIndex ? { ...alt, [field]: value } : alt
                    ) || []
                  }
                : exercise
            )
          }
        : day
    ));
  };

  const removeAlternative = (dayIndex: number, exerciseIndex: number, altIndex: number) => {
    setTrainingDays(prev => prev.map((day, dayIdx) => 
      dayIdx === dayIndex 
        ? {
            ...day,
            exercises: day.exercises.map((exercise, exIdx) => 
              exIdx === exerciseIndex 
                ? {
                    ...exercise,
                    alternatives: exercise.alternatives?.filter((_, idx) => idx !== altIndex) || []
                  }
                : exercise
            )
          }
        : day
    ));
  };

  const processExerciseInput = (exercise: Exercise) => {
    const { reps, is_unilateral, weight_kg } = exercise;

    let reps_per_side: number | null = null;
    let total_reps: number;
    let display_reps: string;

    if (is_unilateral) {
      const repsNumber = parseInt(reps.replace(/[^\d]/g, ''));
      reps_per_side = repsNumber;
      total_reps = repsNumber * 2;
      display_reps = `${repsNumber} per side`;
    } else {
      const repsNumber = parseInt(reps.replace(/[^\d]/g, ''));
      total_reps = repsNumber;
      display_reps = repsNumber.toString();
    }

    return {
      ...exercise,
      reps: display_reps,
      reps_per_side,
      total_reps,
    };
  };

  const updateExercise = (dayIndex: number, exerciseIndex: number, updates: Partial<Exercise>) => {
    setTrainingDays(prev => prev.map((day, dayIdx) => 
      dayIdx === dayIndex 
        ? {
            ...day,
            exercises: day.exercises.map((exercise, exIdx) => {
              if (exIdx === exerciseIndex) {
                const updatedExercise = { ...exercise, ...updates };
                return processExerciseInput(updatedExercise);
              }
              return exercise;
            })
          }
        : day
    ));
  };

  const removeExercise = (dayIndex: number, exerciseIndex: number) => {
    setTrainingDays(prev => prev.map((day, dayIdx) => 
      dayIdx === dayIndex 
        ? {
            ...day,
            exercises: day.exercises.filter((_, exIdx) => exIdx !== exerciseIndex)
              .map((exercise, idx) => ({ ...exercise, order_in_day: idx + 1 }))
          }
        : day
    ));
  };

  const updateDayTitle = (dayIndex: number, title: string) => {
    setTrainingDays(prev => prev.map((day, idx) => 
      idx === dayIndex ? { ...day, title } : day
    ));
  };

  const toggleDay = (dayIndex: number) => {
    setTrainingDays(prev => prev.map((day, idx) => 
      idx === dayIndex ? { ...day, is_open: !day.is_open } : day
    ));
  };

  const handleCreateProgram = async () => {
    if (!selectedClientId) {
      toast({
        title: "Viga",
        description: "Palun vali klient",
        variant: "destructive",
      });
      return;
    }

    // Validate that each day has at least one exercise
    const emptyDays = trainingDays.filter(day => day.exercises.length === 0);
    if (emptyDays.length > 0) {
      toast({
        title: "Viga",
        description: `Päevad ${emptyDays.map(d => d.day_number).join(", ")} vajavad vähemalt ühte harjutust`,
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      // 1. Get selected user data
      const selectedClient = clients.find(c => c.id === selectedClientId);
      if (!selectedClient) throw new Error("Valitud klienti ei leitud");

      const userData = { id: selectedClientId, email: selectedClient.email };

      // 2. Create template first (to have a structure)
      const { data: templateData, error: templateError } = await supabase
        .from("workout_templates")
        .insert({
          title: programTitle || `${userData.email} personaalprogramm`,
          goal: `${durationWeeks} nädala personaalprogramm (${trainingDaysPerWeek} päeva nädalas)`,
          is_active: true
        })
        .select("id")
        .single();

      if (templateError) throw templateError;

      // 3. Create template days and items
      for (const day of trainingDays) {
        const { data: dayData, error: dayError } = await supabase
          .from("template_days")
          .insert({
            template_id: templateData.id,
            day_order: day.day_number,
            title: day.title,
            note: null
          })
          .select("id")
          .single();

        if (dayError) throw dayError;

        // Add exercises for this day
        if (day.exercises.length > 0) {
          const exercisesData = day.exercises.map(exercise => ({
            template_day_id: dayData.id,
            exercise_name: exercise.exercise_name,
            sets: exercise.sets,
            reps: exercise.reps,
            rest_seconds: exercise.rest_seconds,
            seconds: null,
            weight_kg: exercise.weight_kg || null,
            coach_notes: exercise.coach_notes || null,
            video_url: exercise.video_url || null,
            order_in_day: exercise.order_in_day,
            is_unilateral: exercise.is_unilateral || false,
            reps_per_side: exercise.reps_per_side || null,
            total_reps: exercise.total_reps || null
          }));

          const { data: insertedExercises, error: exercisesError } = await supabase
            .from("template_items")
            .insert(exercisesData)
            .select("id");

          if (exercisesError) throw exercisesError;

          // Add alternatives for each exercise
          for (let i = 0; i < day.exercises.length; i++) {
            const exercise = day.exercises[i];
            const templateItemId = insertedExercises[i].id;
            
            if (exercise.alternatives && exercise.alternatives.length > 0) {
              const alternativesData = exercise.alternatives.map(alt => ({
                primary_exercise_id: templateItemId,
                alternative_name: alt.alternative_name,
                alternative_description: alt.alternative_description || null,
                alternative_video_url: alt.alternative_video_url || null,
                difficulty_level: alt.difficulty_level,
                equipment_required: alt.equipment_required || null,
                muscle_groups: alt.muscle_groups || null
              }));

              const { error: alternativesError } = await supabase
                .from("template_alternatives")
                .insert(alternativesData);

              if (alternativesError) {
                console.error("Error inserting alternatives:", alternativesError);
                // Don't throw here, just log the error as alternatives are optional
              }
            }
          }
        }
      }

      // 4. Create client program
      const currentUser = await supabase.auth.getUser();
      const { data: programData, error: programError } = await supabase
        .from("client_programs")
        .insert({
          template_id: templateData.id,
          assigned_to: userData.id,
          assigned_by: currentUser.data.user?.id || userData.id,
          start_date: startDate,
          duration_weeks: durationWeeks,
          training_days_per_week: trainingDaysPerWeek,
          auto_progression_enabled: autoProgressionEnabled,
          status: 'active',
          title_override: programTitle || null,
          is_active: true
        })
        .select("id")
        .single();

      if (programError) throw programError;

      // 5. Copy template structure to client structure
      const { data: programId, error: copyError } = await supabase.rpc("assign_template_to_user_v2", {
        p_template_id: templateData.id,
        p_target_email: userData.email ?? "",
        p_start_date: startDate
      });

      if (copyError) {
        console.error("Template copy error:", copyError);
        throw new Error(`Mall kopeerimisel tekkis viga: ${copyError.message}`);
      }

      if (!programId) {
        throw new Error("Programm loodi, kuid ID-d ei saadud tagasi");
      }

      // 6. Verify the program was created with content
      const { data: programCheck, error: checkError } = await supabase
        .from("client_days")
        .select("id")
        .eq("client_program_id", programId)
        .limit(1);

      if (checkError) {
        console.warn("Program verification warning:", checkError);
      } else if (!programCheck || programCheck.length === 0) {
        throw new Error("Programm loodi, kuid sellel pole päevi. Palun kontrolli malli sisu.");
      }

      // 7. Copy alternatives from template to client program
      try {
        // Get all template items with their alternatives
        const { data: templateItems, error: templateItemsError } = await supabase
          .from("template_items")
          .select(`
            id,
            template_alternatives (
              alternative_name,
              alternative_description,
              alternative_video_url,
              difficulty_level,
              equipment_required,
              muscle_groups
            )
          `)
          .eq("template_day_id", templateData.id);

        if (templateItemsError) {
          console.warn("Error fetching template alternatives:", templateItemsError);
        } else if (templateItems && templateItems.length > 0) {
          // Get corresponding client items
          const { data: clientItems, error: clientItemsError } = await supabase
            .from("client_items")
            .select("id, exercise_name")
            .eq("client_day_id", programCheck[0].id);

          if (!clientItemsError && clientItems && clientItems.length > 0) {
            // Match template items with client items by exercise name and copy alternatives
            for (const templateItem of templateItems) {
              if (templateItem.template_alternatives && templateItem.template_alternatives.length > 0) {
                const matchingClientItem = clientItems.find(ci => 
                  ci.exercise_name === templateItem.exercise_name
                );
                
                if (matchingClientItem) {
                  const alternativesData = templateItem.template_alternatives.map(alt => ({
                    primary_exercise_id: matchingClientItem.id,
                    alternative_name: alt.alternative_name,
                    alternative_description: alt.alternative_description,
                    alternative_video_url: alt.alternative_video_url,
                    difficulty_level: alt.difficulty_level,
                    equipment_required: alt.equipment_required,
                    muscle_groups: alt.muscle_groups
                  }));

                  const { error: alternativesError } = await supabase
                    .from("exercise_alternatives")
                    .insert(alternativesData);

                  if (alternativesError) {
                    console.warn("Error copying alternatives:", alternativesError);
                  }
                }
              }
            }
          }
        }
      } catch (altError) {
        console.warn("Error in alternatives copying process:", altError);
        // Don't fail the entire process for alternatives
      }

      toast({
        title: "Programm loodud!",
        description: `${durationWeeks}-nädalane programm on määratud kasutajale ${userData.email}`,
      });

      // Reset form
      setSelectedClientId("");
      setSelectedClientEmail("");
      setProgramTitle("");
      setTrainingDays([]);
      onOpenChange(false);
      onSuccess();

    } catch (error: any) {
      console.error("Program creation error:", error);
      toast({
        title: "Viga",
        description: error.message || "Programmi loomine ebaõnnestus",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Target className="h-5 w-5 text-primary" />
            Loo Smart Personaalprogramm
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* Program Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Programmi seaded</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    <Users className="inline mr-1 h-4 w-4" />
                    Vali klient
                  </label>
                  <Select 
                    value={selectedClientId} 
                    onValueChange={(value) => {
                      setSelectedClientId(value);
                      const client = clients.find(c => c.id === value);
                      setSelectedClientEmail(client?.email ?? "");
                    }}
                    disabled={loadingClients}
                  >
                    <SelectTrigger className="w-full text-sm">
                      <SelectValue placeholder={loadingClients ? "Laen kliente..." : "Vali klient dropdownist"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id} className="text-sm">
                          <div className="flex flex-col">
                            <span className="font-medium">{client.email}</span>
                            <span className="text-xs text-muted-foreground">
                              Liitunud: {new Date(client.created_at).toLocaleDateString('et-EE')}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>  
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Programmi pealkiri (valikuline)</label>
                  <input
                    type="text"
                    value={programTitle}
                    onChange={(e) => setProgramTitle(e.target.value)}
                    placeholder="nt. Jõuprogramm algajale"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    <Calendar className="inline mr-1 h-4 w-4" />
                    Alguskuupäev
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    <Clock className="inline mr-1 h-4 w-4" />
                    Kestus nädalates
                  </label>
                  <select
                    value={durationWeeks}
                    onChange={(e) => setDurationWeeks(Number(e.target.value))}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  >
                    {[2, 4, 6, 8, 10, 12, 16, 20, 24].map(weeks => (
                      <option key={weeks} value={weeks}>
                        {weeks} nädalat
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    <Dumbbell className="inline mr-1 h-4 w-4" />
                    Treeninguid nädalas
                  </label>
                  <select
                    value={trainingDaysPerWeek}
                    onChange={(e) => setTrainingDaysPerWeek(Number(e.target.value))}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  >
                    {[1, 2, 3, 4, 5].map(days => (
                      <option key={days} value={days}>
                        {days} päeva
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-input p-4">
                <div>
                  <h4 className="font-medium">Smart Progression</h4>
                  <p className="text-sm text-muted-foreground">
                    Automaatne raskusastme reguleerimine RPE põhjal
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoProgressionEnabled}
                    onChange={(e) => setAutoProgressionEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="relative w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Training Days */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Treeningpäevad</CardTitle>
              <p className="text-sm text-muted-foreground">
                Loo igaks päevaks treening{trainingDaysPerWeek > 1 ? 'uid' : ''}. Kokku {trainingDaysPerWeek} päeva nädalas.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {trainingDays.map((day, dayIndex) => (
                <Collapsible key={day.day_number} open={day.is_open} onOpenChange={() => toggleDay(dayIndex)}>
                  <Card className="border-l-4 border-l-primary">
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="rounded-full bg-primary/10 w-8 h-8 flex items-center justify-center text-sm font-semibold text-primary">
                              {day.day_number}
                            </div>
                            <input
                              type="text"
                              value={day.title}
                              onChange={(e) => {
                                e.stopPropagation();
                                updateDayTitle(dayIndex, e.target.value);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="text-lg font-semibold bg-transparent border-none outline-none focus:bg-background focus:border focus:border-input rounded px-2 py-1"
                            />
                            <span className="text-sm text-muted-foreground">
                              ({day.exercises.length} harjutus{day.exercises.length !== 1 ? 't' : ''})
                            </span>
                          </div>
                          {day.is_open ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <CardContent className="pt-0 space-y-3">
                        {day.exercises.map((exercise, exerciseIndex) => (
                          <div key={exerciseIndex} className="p-4 border rounded-lg bg-muted/30">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-start">
                              <div className="sm:col-span-2 lg:col-span-3">
                                <label className="block text-xs font-medium mb-1">Harjutus</label>
                                <input
                                  type="text"
                                  value={exercise.exercise_name}
                                  onChange={(e) => updateExercise(dayIndex, exerciseIndex, { exercise_name: e.target.value })}
                                  className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
                                />
                              </div>
                              <div className="sm:col-span-1 lg:col-span-2">
                                <label className="block text-xs font-medium mb-1">Seeriad</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="10"
                                  value={exercise.sets}
                                  onChange={(e) => updateExercise(dayIndex, exerciseIndex, { sets: Number(e.target.value) })}
                                  className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
                                />
                              </div>
                              <div className="sm:col-span-1 lg:col-span-2">
                                <label className="block text-xs font-medium mb-1">
                                  Kordused {exercise.is_unilateral ? "(per side)" : ""}
                                </label>
                                <input
                                  type="text"
                                  value={exercise.reps}
                                  onChange={(e) => updateExercise(dayIndex, exerciseIndex, { reps: e.target.value })}
                                  placeholder={exercise.is_unilateral ? "8" : "8-12"}
                                  className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
                                />
                                {exercise.is_unilateral && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Sisesta ainult number (nt. 8), süsteem näitab "8 per side"
                                  </p>
                                )}
                              </div>
                              <div className="sm:col-span-1 lg:col-span-2">
                                <label className="block text-xs font-medium mb-1">Paus (s)</label>
                                <input
                                  type="number"
                                  min="30"
                                  max="300"
                                  step="15"
                                  value={exercise.rest_seconds}
                                  onChange={(e) => updateExercise(dayIndex, exerciseIndex, { rest_seconds: Number(e.target.value) })}
                                  className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
                                />
                              </div>
                              <div className="sm:col-span-1 lg:col-span-2">
                                <label className="block text-xs font-medium mb-1">Kaal (kg)</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  value={exercise.weight_kg || ""}
                                  onChange={(e) => updateExercise(dayIndex, exerciseIndex, { weight_kg: e.target.value ? Number(e.target.value) : undefined })}
                                  className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
                                />
                              </div>
                              <div className="sm:col-span-2 lg:col-span-1 flex items-end">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeExercise(dayIndex, exerciseIndex)}
                                  className="w-full h-8"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            
                            {/* Unilateral Toggle */}
                            <div className="flex items-center space-x-2 mt-3">
                              <Checkbox
                                id={`unilateral-${dayIndex}-${exerciseIndex}`}
                                checked={exercise.is_unilateral || false}
                                onCheckedChange={(checked) =>
                                  updateExercise(dayIndex, exerciseIndex, { is_unilateral: checked as boolean })
                                }
                              />
                              <Label htmlFor={`unilateral-${dayIndex}-${exerciseIndex}`} className="text-sm">
                                Ühepoolne harjutus
                              </Label>
                            </div>

                            {/* Preview Section */}
                            {exercise.exercise_name && (
                              <div className="mt-3 p-3 border rounded-lg bg-muted/50">
                                <h4 className="font-medium mb-2 text-sm">Eelvaade:</h4>
                                <div className="space-y-1 text-sm">
                                  <p><strong>Harjutus:</strong> {exercise.exercise_name}</p>
                                  <p><strong>Seeriat:</strong> {exercise.sets}</p>
                                  <p><strong>Kordusi:</strong> {exercise.is_unilateral ? `${exercise.reps} per side` : exercise.reps}</p>
                                  <p><strong>Kaal:</strong> {exercise.weight_kg === 0 || exercise.weight_kg === null ? "ilma lisaraskuseta" : `${exercise.weight_kg}kg`}</p>
                                  {exercise.is_unilateral && exercise.total_reps && (
                                    <p><strong>Kokku kordusi:</strong> {exercise.total_reps}</p>
                                  )}
                                  <div className="flex gap-2 mt-2">
                                    {exercise.is_unilateral && (
                                      <Badge variant="secondary" className="text-xs">Ühepoolne</Badge>
                                    )}
                                    {(exercise.weight_kg === 0 || exercise.weight_kg === null) && (
                                      <Badge variant="outline" className="text-xs">Ilma lisaraskuseta</Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            <div className="grid md:grid-cols-2 gap-3 mt-3">
                              <div>
                                <label className="block text-xs font-medium mb-1">Märkused</label>
                                <input
                                  type="text"
                                  value={exercise.coach_notes || ""}
                                  onChange={(e) => updateExercise(dayIndex, exerciseIndex, { coach_notes: e.target.value })}
                                  placeholder="Tehnika vihjed..."
                                  className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium mb-1">Video URL</label>
                                <input
                                  type="url"
                                  value={exercise.video_url || ""}
                                  onChange={(e) => updateExercise(dayIndex, exerciseIndex, { video_url: e.target.value })}
                                  placeholder="https://youtube.com/..."
                                  className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
                                />
                              </div>
                            </div>

                            {/* Alternatives Section */}
                            <div className="mt-4 p-4 border rounded-lg bg-muted/30">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-medium text-sm">Alternatiivsed harjutused</h4>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addAlternative(dayIndex, exerciseIndex)}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Lisa alternatiiv
                                </Button>
                              </div>
                              
                              {exercise.alternatives && exercise.alternatives.length > 0 ? (
                                <div className="space-y-3">
                                  {exercise.alternatives.map((alt, altIndex) => (
                                    <div key={altIndex} className="p-3 border rounded-lg bg-background">
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                          <label className="block text-xs font-medium mb-1">Alternatiivne harjutus</label>
                                          <input
                                            type="text"
                                            value={alt.alternative_name}
                                            onChange={(e) => updateAlternative(dayIndex, exerciseIndex, altIndex, 'alternative_name', e.target.value)}
                                            placeholder="nt. Kükk ilma raskuseta"
                                            className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-medium mb-1">Raskusaste</label>
                                          <select
                                            value={alt.difficulty_level}
                                            onChange={(e) => updateAlternative(dayIndex, exerciseIndex, altIndex, 'difficulty_level', e.target.value)}
                                            className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
                                          >
                                            <option value="easier">Lihtsam</option>
                                            <option value="same">Sama raskus</option>
                                            <option value="harder">Raskem</option>
                                          </select>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                                        <div>
                                          <label className="block text-xs font-medium mb-1">Kirjeldus (valikuline)</label>
                                          <input
                                            type="text"
                                            value={alt.alternative_description || ""}
                                            onChange={(e) => updateAlternative(dayIndex, exerciseIndex, altIndex, 'alternative_description', e.target.value)}
                                            placeholder="Lühike kirjeldus..."
                                            className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-medium mb-1">Video URL (valikuline)</label>
                                          <input
                                            type="url"
                                            value={alt.alternative_video_url || ""}
                                            onChange={(e) => updateAlternative(dayIndex, exerciseIndex, altIndex, 'alternative_video_url', e.target.value)}
                                            placeholder="https://youtube.com/..."
                                            className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
                                          />
                                        </div>
                                      </div>
                                      <div className="flex justify-end mt-3">
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => removeAlternative(dayIndex, exerciseIndex, altIndex)}
                                        >
                                          <Trash2 className="h-3 w-3 mr-1" />
                                          Eemalda
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                  Alternatiivseid harjutusi pole veel lisatud
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                        
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => addExercise(dayIndex)}
                          className="w-full"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Lisa harjutus
                        </Button>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="flex-1"
              disabled={creating}
            >
              Tühista
            </Button>
            <Button
              onClick={handleCreateProgram}
              disabled={creating || !selectedClientId || trainingDays.some(day => day.exercises.length === 0)}
              className="flex-1 bg-gradient-to-r from-primary to-accent"
            >
              {creating ? "Loon programmi..." : "Loo programm"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}