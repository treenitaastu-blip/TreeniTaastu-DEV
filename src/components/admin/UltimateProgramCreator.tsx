import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
  Search,
  Eye,
  Smartphone,
  Zap,
  Brain,
  CheckCircle,
  AlertTriangle,
  Star,
  TrendingUp
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Client = {
  id: string;
  email: string | null;
  full_name: string | null;
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
  exercise_type?: 'compound' | 'isolation' | 'accessory' | 'cardio' | 'mobility' | 'stability';
  alternatives?: ExerciseAlternative[];
};

type ExerciseAlternative = {
  id: string;
  alternative_name: string;
  alternative_description?: string;
  alternative_video_url?: string;
  difficulty_level: 'easier' | 'same' | 'harder';
};

type TrainingDay = {
  day_number: number;
  title: string;
  exercises: Exercise[];
  is_open: boolean;
};

type ProgramTemplate = {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty_level: string;
  duration_weeks: number;
  training_days_per_week: number;
  program_structure: any;
};

interface UltimateProgramCreatorProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function UltimateProgramCreator({ 
  isOpen, 
  onOpenChange, 
  onSuccess 
}: UltimateProgramCreatorProps) {
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
  
  // Smart features
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [templates, setTemplates] = useState<ProgramTemplate[]>([]);
  const [smartRecommendations, setSmartRecommendations] = useState<any[]>([]);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  
  // Creating state
  const [creating, setCreating] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Load clients and templates on dialog open
  useEffect(() => {
    if (isOpen) {
      loadClients();
      loadTemplates();
    }
  }, [isOpen]);

  const loadClients = async () => {
    setLoadingClients(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .not("email", "is", null)
        .order("full_name");

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      toast({
        title: "Viga",
        description: "Klientide laadimine ebaõnnestus",
        variant: "destructive",
      });
    } finally {
      setLoadingClients(false);
    }
  };

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const { data, error } = await supabase
        .from("program_templates")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      toast({
        title: "Viga",
        description: "Mallide laadimine ebaõnnestus",
        variant: "destructive",
      });
    } finally {
      setLoadingTemplates(false);
    }
  };

  const generateSmartRecommendations = async () => {
    if (!selectedClientId || trainingDays.length === 0) return;

    try {
      const { data, error } = await supabase.rpc('get_smart_exercise_recommendations', {
        p_program_id: selectedClientId, // Using client ID as placeholder
        p_day_number: 1,
        p_target_muscle_groups: ['shoulders', 'back', 'chest'],
        p_equipment_available: ['kangid', 'hantlid', 'pink'],
        p_difficulty_level: 'intermediate'
      });

      if (error) throw error;
      setSmartRecommendations(data || []);
    } catch (error: any) {
      console.error("Smart recommendations error:", error);
    }
  };

  const applyTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      const { data, error } = await supabase.rpc('generate_program_from_template', {
        p_template_id: selectedTemplate,
        p_client_id: selectedClientId,
        p_start_date: startDate,
        p_duration_weeks: durationWeeks
      });

      if (error) throw error;
      
      toast({
        title: "Mall rakendatud!",
        description: `Programm genereeritud mallist`,
      });
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Viga",
        description: "Malli rakendamine ebaõnnestus",
        variant: "destructive",
      });
    }
  };

  const addTrainingDay = () => {
    const newDayNumber = trainingDays.length + 1;
    setTrainingDays(prev => [...prev, {
      day_number: newDayNumber,
      title: `Treeningpäev ${newDayNumber}`,
      exercises: [],
      is_open: true
    }]);
  };

  const removeTrainingDay = (dayIndex: number) => {
    setTrainingDays(prev => prev.filter((_, idx) => idx !== dayIndex)
      .map((day, idx) => ({ ...day, day_number: idx + 1 })));
  };

  const addExercise = (dayIndex: number) => {
    setTrainingDays(prev => prev.map((day, idx) => 
      idx === dayIndex 
        ? {
            ...day,
            exercises: [...day.exercises, {
              exercise_name: "",
              sets: 3,
              reps: "8-12",
              rest_seconds: 60,
              weight_kg: 0,
              order_in_day: day.exercises.length + 1,
              is_unilateral: false,
              exercise_type: 'compound'
            }]
          }
        : day
    ));
  };

  const updateExercise = (dayIndex: number, exerciseIndex: number, updates: Partial<Exercise>) => {
    setTrainingDays(prev => prev.map((day, dayIdx) => 
      dayIdx === dayIndex 
        ? {
            ...day,
            exercises: day.exercises.map((exercise, exIdx) => 
              exIdx === exerciseIndex ? { ...exercise, ...updates } : exercise
            )
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

  const handleCreateProgram = async () => {
    if (!selectedClientId) {
      toast({
        title: "Viga",
        description: "Palun vali klient",
        variant: "destructive",
      });
      return;
    }

    const emptyDays = trainingDays.filter(day => day.exercises.length === 0);
    if (emptyDays.length > 0) {
      toast({
        title: "Viga",
        description: "Kõik päevad peavad sisaldama vähemalt üht harjutust",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      // Create template first
      const { data: templateData, error: templateError } = await supabase
        .from("workout_templates")
        .insert({
          title: programTitle || `Programm ${selectedClientEmail}`,
          goal: "Personalized program",
          is_active: true
        })
        .select("id")
        .single();

      if (templateError) throw templateError;

      // Create template days and items
      for (const day of trainingDays) {
        const { data: dayData, error: dayError } = await supabase
          .from("template_days")
          .insert({
            template_id: templateData.id,
            day_number: day.day_number,
            title: day.title
          })
          .select("id")
          .single();

        if (dayError) throw dayError;

        for (const exercise of day.exercises) {
          await supabase.from("template_items").insert({
            template_day_id: dayData.id,
            exercise_name: exercise.exercise_name,
            sets: exercise.sets,
            reps: exercise.reps,
            rest_seconds: exercise.rest_seconds,
            weight_kg: exercise.weight_kg || 0,
            order_in_day: exercise.order_in_day,
            is_unilateral: exercise.is_unilateral || false,
            coach_notes: exercise.coach_notes
          });
        }
      }

      // Create client program
      const { data: userData } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", selectedClientId)
        .single();

      if (!userData) throw new Error("User not found");

      const { data: programData, error: programError } = await supabase
        .from("client_programs")
        .insert({
          template_id: templateData.id,
          assigned_to: userData.id,
          assigned_by: (await supabase.auth.getUser()).data.user?.id || userData.id,
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

      // Copy template to client
      const { error: copyError } = await supabase.rpc("assign_template_to_user_v2", {
        p_template_id: templateData.id,
        p_target_email: selectedClientEmail,
        p_start_date: startDate
      });

      if (copyError) {
        console.warn("Template copy warning:", copyError);
      }

      toast({
        title: "Programm loodud!",
        description: `${durationWeeks}-nädalane programm on määratud kasutajale ${selectedClientEmail}`,
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

  const renderMobilePreview = () => {
    return (
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <Smartphone className="h-4 w-4" />
          <span className="text-sm font-medium">Mobiilne eelvaade</span>
        </div>
        
        <div className="space-y-3">
          {trainingDays.map((day, dayIndex) => (
            <Card key={dayIndex} className="p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-sm">{day.title}</h4>
                <Badge variant="secondary" className="text-xs">
                  {day.exercises.length} harjutust
                </Badge>
              </div>
              
              <div className="space-y-2">
                {day.exercises.slice(0, 2).map((exercise, exIndex) => (
                  <div key={exIndex} className="flex items-center justify-between text-xs">
                    <span className="truncate">{exercise.exercise_name}</span>
                    <span className="text-gray-500">{exercise.sets}x{exercise.reps}</span>
                  </div>
                ))}
                {day.exercises.length > 2 && (
                  <div className="text-xs text-gray-500">
                    +{day.exercises.length - 2} veel...
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Ultimate Program Creation Hub
          </DialogTitle>
          <DialogDescription>
            Professional program creation with smart recommendations and mobile preview
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Setup</TabsTrigger>
            <TabsTrigger value="smart">Smart Features</TabsTrigger>
            <TabsTrigger value="program">Program Structure</TabsTrigger>
            <TabsTrigger value="preview">Mobile Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Klient</Label>
                <Select value={selectedClientId} onValueChange={(value) => {
                  setSelectedClientId(value);
                  const client = clients.find(c => c.id === value);
                  setSelectedClientEmail(client?.email || "");
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Vali klient" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.full_name || client.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Programmi pealkiri</Label>
                <Input
                  value={programTitle}
                  onChange={(e) => setProgramTitle(e.target.value)}
                  placeholder="Kohandatud programmi pealkiri"
                />
              </div>

              <div className="space-y-2">
                <Label>Alguskuupäev</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Kestus (nädalad)</Label>
                <Select value={durationWeeks.toString()} onValueChange={(value) => setDurationWeeks(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 nädalat</SelectItem>
                    <SelectItem value="4">4 nädalat</SelectItem>
                    <SelectItem value="8">8 nädalat</SelectItem>
                    <SelectItem value="12">12 nädalat</SelectItem>
                    <SelectItem value="16">16 nädalat</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Treeningpäevi nädalas</Label>
                <Select value={trainingDaysPerWeek.toString()} onValueChange={(value) => setTrainingDaysPerWeek(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 päeva</SelectItem>
                    <SelectItem value="3">3 päeva</SelectItem>
                    <SelectItem value="4">4 päeva</SelectItem>
                    <SelectItem value="5">5 päeva</SelectItem>
                    <SelectItem value="6">6 päeva</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="smart" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Smart Templates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Vali mall</Label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Vali professionaalne mall" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex flex-col">
                            <span>{template.title}</span>
                            <span className="text-xs text-gray-500">
                              {template.difficulty_level} • {template.duration_weeks} nädalat
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedTemplate && (
                  <div className="flex gap-2">
                    <Button onClick={applyTemplate} className="flex-1">
                      <Play className="h-4 w-4 mr-2" />
                      Rakenda mall
                    </Button>
                    <Button variant="outline" onClick={generateSmartRecommendations}>
                      <Brain className="h-4 w-4 mr-2" />
                      Smart soovitused
                    </Button>
                  </div>
                )}

                {smartRecommendations.length > 0 && (
                  <div className="space-y-2">
                    <Label>Smart soovitused</Label>
                    <div className="grid grid-cols-1 gap-2">
                      {smartRecommendations.slice(0, 5).map((rec, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded">
                          <span className="text-sm">{rec.exercise_name}</span>
                          <Badge variant="secondary">
                            {Math.round(rec.recommendation_score * 100)}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="program" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Programmi struktuur</h3>
              <Button onClick={addTrainingDay}>
                <Plus className="h-4 w-4 mr-2" />
                Lisa päev
              </Button>
            </div>

            <div className="space-y-4">
              {trainingDays.map((day, dayIndex) => (
                <Card key={dayIndex}>
                  <Collapsible open={day.is_open} onOpenChange={(open) => 
                    setTrainingDays(prev => prev.map((d, idx) => 
                      idx === dayIndex ? { ...d, is_open: open } : d
                    ))
                  }>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer">
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2">
                            <Dumbbell className="h-4 w-4" />
                            {day.title}
                            <Badge variant="secondary">
                              {day.exercises.length} harjutust
                            </Badge>
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                addExercise(dayIndex);
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeTrainingDay(dayIndex);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            {day.is_open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>Päeva pealkiri</Label>
                          <Input
                            value={day.title}
                            onChange={(e) => setTrainingDays(prev => prev.map((d, idx) => 
                              idx === dayIndex ? { ...d, title: e.target.value } : d
                            ))}
                            placeholder="Näiteks: Ülemine keha"
                          />
                        </div>

                        <div className="space-y-3">
                          {day.exercises.map((exercise, exerciseIndex) => (
                            <Card key={exerciseIndex} className="p-4">
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <div className="space-y-2">
                                  <Label>Harjutus</Label>
                                  <Input
                                    value={exercise.exercise_name}
                                    onChange={(e) => updateExercise(dayIndex, exerciseIndex, { exercise_name: e.target.value })}
                                    placeholder="Harjutuse nimi"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label>Seeriad</Label>
                                  <Input
                                    type="number"
                                    value={exercise.sets}
                                    onChange={(e) => updateExercise(dayIndex, exerciseIndex, { sets: parseInt(e.target.value) || 0 })}
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label>Kordused</Label>
                                  <Input
                                    value={exercise.reps}
                                    onChange={(e) => updateExercise(dayIndex, exerciseIndex, { reps: e.target.value })}
                                    placeholder="8-12"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label>Puhkeaeg (sek)</Label>
                                  <Input
                                    type="number"
                                    value={exercise.rest_seconds}
                                    onChange={(e) => updateExercise(dayIndex, exerciseIndex, { rest_seconds: parseInt(e.target.value) || 0 })}
                                  />
                                </div>
                              </div>

                              <div className="flex justify-end mt-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeExercise(dayIndex, exerciseIndex)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </Card>
                          ))}

                          {day.exercises.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                              <Dumbbell className="h-8 w-8 mx-auto mb-2" />
                              <p>Lisa harjutusi sellele päevale</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              ))}

              {trainingDays.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Dumbbell className="h-12 w-12 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Alusta programmi loomist</h3>
                  <p>Lisa esimene treeningpäev</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Mobiilne eelvaade</h3>
              <Button 
                variant="outline" 
                onClick={() => setShowMobilePreview(!showMobilePreview)}
              >
                <Eye className="h-4 w-4 mr-2" />
                {showMobilePreview ? 'Peida' : 'Näita'} eelvaade
              </Button>
            </div>

            {showMobilePreview && renderMobilePreview()}

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Programmi kvaliteedikontroll
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Kõik päevad sisaldavad harjutusi</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Programmi kestus: {durationWeeks} nädalat</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Treeningpäevi: {trainingDaysPerWeek} nädalas</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">Auto-progression: {autoProgressionEnabled ? 'Lubatud' : 'Keelatud'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Tühista
          </Button>
          <Button 
            onClick={handleCreateProgram} 
            disabled={creating || !selectedClientId || trainingDays.length === 0}
            className="flex items-center gap-2"
          >
            {creating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Loon programmi...
              </>
            ) : (
              <>
                <Star className="h-4 w-4" />
                Loo programm
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
