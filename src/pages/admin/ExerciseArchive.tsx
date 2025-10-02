import { useState, useEffect } from "react";
import { Search, Plus, Filter, Edit, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ExerciseForm } from "@/components/admin/ExerciseForm";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Exercise {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  description: string;
  video_url: string | null;
  duration: string;
  created_at: string;
  updated_at: string;
}

interface Program {
  id: string;
  title: string;
}

interface Day {
  id: string;
  title: string;
  day_order: number;
}

const CATEGORIES = ["Kõik", "Jalad", "Rind", "Selg", "Õlad", "Käed", "Kõht", "Kardio", "Tasakaal"];
const DIFFICULTIES = ["Kõik", "Algaja", "Keskmine", "Edasijõudnu"];

export default function ExerciseArchive() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [programDays, setProgramDays] = useState<Day[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Kõik");
  const [selectedDifficulty, setSelectedDifficulty] = useState("Kõik");
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadExercises();
    loadPrograms();
  }, []);

  useEffect(() => {
    filterExercises();
  }, [exercises, searchQuery, selectedCategory, selectedDifficulty]);

  const loadExercises = async () => {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExercises(data || []);
    } catch (error) {
      console.error('Error loading exercises:', error);
      toast({
        title: "Viga",
        description: "Harjutuste laadimine ebaõnnestus",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPrograms = async () => {
    try {
      const { data, error } = await supabase
        .from('workout_templates')
        .select('id, title')
        .order('title');

      if (error) throw error;
      setPrograms(data || []);
    } catch (error) {
      console.error('Error loading programs:', error);
    }
  };

  const loadProgramDays = async (programId: string) => {
    try {
      const { data, error } = await supabase
        .from('template_days')
        .select('id, title, day_order')
        .eq('template_id', programId)
        .order('day_order');

      if (error) throw error;
      setProgramDays(data || []);
    } catch (error) {
      console.error('Error loading program days:', error);
    }
  };

  const filterExercises = () => {
    let filtered = exercises;

    if (searchQuery) {
      filtered = filtered.filter(ex => 
        ex.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ex.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory !== "Kõik") {
      filtered = filtered.filter(ex => ex.category === selectedCategory);
    }

    if (selectedDifficulty !== "Kõik") {
      filtered = filtered.filter(ex => ex.difficulty === selectedDifficulty);
    }

    setFilteredExercises(filtered);
  };

  const handleAssignExercise = async (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setShowAssignDialog(true);
  };

  const assignToDay = async (dayId: string) => {
    if (!selectedExercise) return;

    try {
      // Get the next order for this day
      const { data: existingItems, error: countError } = await supabase
        .from('template_items')
        .select('order_in_day')
        .eq('template_day_id', dayId)
        .order('order_in_day', { ascending: false })
        .limit(1);

      if (countError) throw countError;

      const nextOrder = (existingItems?.[0]?.order_in_day || 0) + 1;

      // Determine if this is a weight-based or time-based exercise
      const isTimeBasedExercise = selectedExercise.category === 'Kardio' || 
                                 selectedExercise.description.toLowerCase().includes('sek') ||
                                 selectedExercise.description.toLowerCase().includes('minut');

      // Add exercise to the day
      const insertData: any = {
        template_day_id: dayId,
        exercise_name: selectedExercise.title,
        sets: 3,
        reps: "8-12",
        order_in_day: nextOrder,
        coach_notes: selectedExercise.description,
        video_url: selectedExercise.video_url
      };

      // Add either weight_kg OR seconds based on exercise type (constraint requirement)
      if (isTimeBasedExercise) {
        insertData.seconds = 30; // Default 30 seconds for time-based exercises
      } else {
        insertData.weight_kg = 10; // Default 10kg for weight-based exercises
      }

      const { error } = await supabase
        .from('template_items')
        .insert(insertData);

      if (error) throw error;

      toast({
        title: "Õnnestus",
        description: `Harjutus "${selectedExercise.title}" lisatud programmile`,
      });

      setShowAssignDialog(false);
      setSelectedExercise(null);
      setSelectedProgram(null);
      setProgramDays([]);
    } catch (error) {
      console.error('Error assigning exercise:', error);
      toast({
        title: "Viga",
        description: `Harjutuse lisamine ebaõnnestus: ${error instanceof Error ? error.message : 'Tundmatu viga'}`,
        variant: "destructive"
      });
    }
  };

  const moveExercise = async (exerciseId: string, direction: 'up' | 'down') => {
    const currentIndex = filteredExercises.findIndex(ex => ex.id === exerciseId);
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === filteredExercises.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const newFilteredExercises = [...filteredExercises];
    [newFilteredExercises[currentIndex], newFilteredExercises[newIndex]] = 
    [newFilteredExercises[newIndex], newFilteredExercises[currentIndex]];
    
    setFilteredExercises(newFilteredExercises);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'algaja': return 'bg-green-100 text-green-800 border-green-200';
      case 'keskmine': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'edasijõudnu': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleProgramSelect = (program: Program) => {
    setSelectedProgram(program);
    loadProgramDays(program.id);
  };

  const handleCreateExercise = () => {
    setShowCreateDialog(true);
  };

  const handleEditExercise = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setShowEditDialog(true);
  };

  const handleDeleteExercise = async (exercise: Exercise) => {
    if (!confirm(`Kas oled kindel, et soovid kustutada harjutuse "${exercise.title}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('exercises')
        .delete()
        .eq('id', exercise.id);

      if (error) throw error;

      toast({
        title: "Õnnestus",
        description: "Harjutus on edukalt kustutatud",
      });

      loadExercises();
    } catch (error) {
      console.error('Error deleting exercise:', error);
      toast({
        title: "Viga",
        description: "Harjutuse kustutamine ebaõnnestus",
        variant: "destructive"
      });
    }
  };

  const handleFormSuccess = () => {
    setShowCreateDialog(false);
    setShowEditDialog(false);
    setSelectedExercise(null);
    loadExercises();
  };

  const handleFormCancel = () => {
    setShowCreateDialog(false);
    setShowEditDialog(false);
    setSelectedExercise(null);
  };

  if (loading) {
    return (
      <AdminLayout title="Harjutuste arhiiv" description="Harjutuste haldamine ja programmidele määramine">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Laen harjutusi...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout 
      title="Harjutuste arhiiv" 
      description="Halda harjutusi ja määra neid programmidele"
      headerActions={
        <Button size="sm" onClick={handleCreateExercise} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Lisa harjutus</span>
          <span className="sm:hidden">Lisa</span>
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Otsing ja filtrid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Otsi harjutusi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full sm:min-w-32">
                      <Filter className="mr-2 h-4 w-4" />
                      Kategooria: {selectedCategory}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-full">
                    {CATEGORIES.map(category => (
                      <DropdownMenuItem
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={selectedCategory === category ? "bg-primary/10" : ""}
                      >
                        {category}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full sm:min-w-32">
                      <Filter className="mr-2 h-4 w-4" />
                      Raskus: {selectedDifficulty}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-full">
                    {DIFFICULTIES.map(difficulty => (
                      <DropdownMenuItem
                        key={difficulty}
                        onClick={() => setSelectedDifficulty(difficulty)}
                        className={selectedDifficulty === difficulty ? "bg-primary/10" : ""}
                      >
                        {difficulty}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="mt-4 text-sm text-muted-foreground">
              Leiti {filteredExercises.length} harjutust
            </div>
          </CardContent>
        </Card>

        {/* Exercise List */}
        <Card>
          <CardHeader>
            <CardTitle>Harjutused</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredExercises.map((exercise, index) => (
                <div key={exercise.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="font-semibold text-sm sm:text-base truncate">{exercise.title}</h3>
                      <Badge className={`text-xs ${getDifficultyColor(exercise.difficulty)}`}>
                        {exercise.difficulty}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {exercise.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {exercise.description}
                    </p>
                    <div className="text-xs text-muted-foreground mt-1">
                      Kestus: {exercise.duration}
                    </div>
                  </div>
                  
                  {/* Mobile Actions - Stacked */}
                  <div className="flex flex-col sm:hidden gap-2">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => moveExercise(exercise.id, 'up')}
                        disabled={index === 0}
                        className="flex-1"
                      >
                        <ArrowUp className="h-4 w-4 mr-1" />
                        Üles
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => moveExercise(exercise.id, 'down')}
                        disabled={index === filteredExercises.length - 1}
                        className="flex-1"
                      >
                        <ArrowDown className="h-4 w-4 mr-1" />
                        Alla
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleAssignExercise(exercise)}
                        className="flex-1"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Määra
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditExercise(exercise)}
                        className="flex-1"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Muuda
                      </Button>
                    </div>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleDeleteExercise(exercise)}
                      className="w-full"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Kustuta
                    </Button>
                  </div>

                  {/* Desktop Actions - Horizontal */}
                  <div className="hidden sm:flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => moveExercise(exercise.id, 'up')}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => moveExercise(exercise.id, 'down')}
                      disabled={index === filteredExercises.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleAssignExercise(exercise)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Määra
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditExercise(exercise)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDeleteExercise(exercise)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Assignment Dialog */}
        <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
          <DialogContent className="max-w-md mx-4 sm:mx-auto">
            <DialogHeader>
              <DialogTitle className="text-lg">Määra harjutus programmile</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {selectedExercise && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <h4 className="font-medium text-sm">Valitud harjutus:</h4>
                  <p className="text-sm font-semibold text-primary">{selectedExercise.title}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-3 block">1. Vali programm</label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-start h-11">
                      {selectedProgram ? selectedProgram.title : "Kliki siia programmi valimiseks"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-full min-w-[300px]">
                    {programs.length === 0 ? (
                      <div className="p-4 text-sm text-muted-foreground text-center">
                        Programmid puuduvad
                      </div>
                    ) : (
                      programs.map(program => (
                        <DropdownMenuItem
                          key={program.id}
                          onClick={() => handleProgramSelect(program)}
                          className={selectedProgram?.id === program.id ? "bg-primary/10" : ""}
                        >
                          {program.title}
                        </DropdownMenuItem>
                      ))
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {selectedProgram && (
                <div>
                  <label className="text-sm font-medium mb-3 block">
                    2. Vali päev ja kliki "Lisa harjutus" nuppu
                  </label>
                  {programDays.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground text-center border border-dashed rounded-lg">
                      Valitud programmil pole päevi
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {programDays.map(day => (
                        <div key={day.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium text-sm">Päev {day.day_order}</div>
                            <div className="text-sm text-muted-foreground">{day.title}</div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => assignToDay(day.id)}
                            className="bg-primary hover:bg-primary/90"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Lisa harjutus
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!selectedProgram && (
                <div className="p-4 text-sm text-muted-foreground text-center border border-dashed rounded-lg">
                  Vali esmalt programm, et näha päevi
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Create Exercise Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Lisa uus harjutus</DialogTitle>
            </DialogHeader>
            <ExerciseForm
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
            />
          </DialogContent>
        </Dialog>

        {/* Edit Exercise Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Muuda harjutust</DialogTitle>
            </DialogHeader>
            <ExerciseForm
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
              editingExercise={selectedExercise}
            />
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}