import { useState, useEffect } from "react";
import { Search, Plus, Filter, Target, Clock, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Exercise {
  id: string;
  name: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  equipment: string[];
  muscle_groups: string[];
  description?: string;
  video_url?: string;
  common_sets?: string;
  common_reps?: string;
  rest_time?: number;
}

interface ExerciseLibraryProps {
  onAddExercise?: (exercise: Exercise) => void;
  compact?: boolean;
}

// Mock data - in real app this would come from Supabase
const MOCK_EXERCISES: Exercise[] = [
  {
    id: "1",
    name: "Kükk",
    category: "Jalad",
    difficulty: "beginner",
    equipment: ["Hantel", "Kehakaal"],
    muscle_groups: ["Kvadritseps", "Tuharad", "Säär"],
    description: "Põhiline jalgade harjutus, mis arendab jõudu ja tasakaalu.",
    video_url: "https://example.com/squat",
    common_sets: "3",
    common_reps: "8-12",
    rest_time: 90
  },
  {
    id: "2", 
    name: "Surve lamades",
    category: "Rind",
    difficulty: "beginner",
    equipment: ["Hantel", "Kangid"],
    muscle_groups: ["Rinna lihased", "Trisepsed", "Deltaed"],
    description: "Klassikaline ülemise keha jõuharjutus.",
    common_sets: "3",
    common_reps: "6-10", 
    rest_time: 120
  },
  {
    id: "3",
    name: "Surnud tõstmine",
    category: "Selg",
    difficulty: "intermediate",
    equipment: ["Hantel", "Kangid"],
    muscle_groups: ["Selg", "Tuharad", "Säär"],
    description: "Võimas tagumise ahela harjutus.",
    common_sets: "3",
    common_reps: "5-8",
    rest_time: 150
  },
  {
    id: "4",
    name: "Ülesvõte",
    category: "Õlad",
    difficulty: "beginner",
    equipment: ["Hantel"],
    muscle_groups: ["Deltaed", "Kaela lihased"],
    description: "Õlgade arendamiseks mõeldud harjutus.",
    common_sets: "3",
    common_reps: "10-15",
    rest_time: 60
  },
  {
    id: "5",
    name: "Plank",
    category: "Kõht",
    difficulty: "beginner", 
    equipment: ["Kehakaal"],
    muscle_groups: ["Kõhulihased", "Selg", "Õlad"],
    description: "Staatiline tuuma tugevdamise harjutus.",
    common_sets: "3",
    common_reps: "30-60s",
    rest_time: 45
  }
];

const CATEGORIES = ["Kõik", "Jalad", "Rind", "Selg", "Õlad", "Käed", "Kõht"];
const DIFFICULTIES = ["Kõik", "beginner", "intermediate", "advanced"];

export default function ExerciseLibrary({ onAddExercise, compact = false }: ExerciseLibraryProps) {
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>(MOCK_EXERCISES);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Kõik");
  const [selectedDifficulty, setSelectedDifficulty] = useState("Kõik");
  const [showDetails, setShowDetails] = useState<Exercise | null>(null);

  useEffect(() => {
    let filtered = MOCK_EXERCISES;

    // Filter by search
    if (searchQuery) {
      filtered = filtered.filter(ex => 
        ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ex.muscle_groups.some(mg => mg.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Filter by category
    if (selectedCategory !== "Kõik") {
      filtered = filtered.filter(ex => ex.category === selectedCategory);
    }

    // Filter by difficulty
    if (selectedDifficulty !== "Kõik") {
      filtered = filtered.filter(ex => ex.difficulty === selectedDifficulty);
    }

    setFilteredExercises(filtered);
  }, [searchQuery, selectedCategory, selectedDifficulty]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800 border-green-200';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'advanced': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'Algaja';
      case 'intermediate': return 'Keskmine';  
      case 'advanced': return 'Edasijõudnu';
      default: return difficulty;
    }
  };

  if (compact) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Search className="mr-2 h-4 w-4" />
            Vali harjutus
          </Button>
        </DialogTrigger>
        <DialogContent className="w-[95vw] sm:max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Harjutuste Raamatukogu</DialogTitle>
          </DialogHeader>
          <ExerciseLibrary onAddExercise={onAddExercise} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Otsi harjutusi või lihasgruppe..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="min-w-32">
              <Filter className="mr-2 h-4 w-4" />
              {selectedCategory}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="z-50">
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
            <Button variant="outline" className="min-w-32">
              <Target className="mr-2 h-4 w-4" />
              {selectedDifficulty === "Kõik" ? "Raskus" : getDifficultyText(selectedDifficulty)}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="z-50">
            {DIFFICULTIES.map(difficulty => (
              <DropdownMenuItem
                key={difficulty}
                onClick={() => setSelectedDifficulty(difficulty)}
                className={selectedDifficulty === difficulty ? "bg-primary/10" : ""}
              >
                {difficulty === "Kõik" ? "Kõik" : getDifficultyText(difficulty)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        Leiti {filteredExercises.length} harjutust
      </div>

      {/* Exercise Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredExercises.map((exercise) => (
          <Card key={exercise.id} className="border-0 shadow-soft hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">{exercise.name}</h3>
                    <p className="text-xs text-muted-foreground">{exercise.category}</p>
                  </div>
                  <Badge className={`text-xs ${getDifficultyColor(exercise.difficulty)}`}>
                    {getDifficultyText(exercise.difficulty)}
                  </Badge>
                </div>

                {/* Muscle Groups */}
                <div className="flex flex-wrap gap-1">
                  {exercise.muscle_groups.slice(0, 2).map((muscle, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {muscle}
                    </Badge>
                  ))}
                  {exercise.muscle_groups.length > 2 && (
                    <Badge variant="secondary" className="text-xs">
                      +{exercise.muscle_groups.length - 2}
                    </Badge>
                  )}
                </div>

                {/* Quick Info */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Dumbbell className="h-3 w-3" />
                    <span>{exercise.common_sets} × {exercise.common_reps}</span>
                  </div>
                  {exercise.rest_time && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{exercise.rest_time}s</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => setShowDetails(exercise)}
                  >
                    Vaata detaile
                  </Button>
                  {onAddExercise && (
                    <Button
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => onAddExercise(exercise)}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Lisa
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Exercise Details Modal */}
      {showDetails && (
        <Dialog open={!!showDetails} onOpenChange={() => setShowDetails(null)}>
          <DialogContent className="w-[95vw] sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{showDetails.name}</span>
                <Badge className={getDifficultyColor(showDetails.difficulty)}>
                  {getDifficultyText(showDetails.difficulty)}
                </Badge>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Kirjeldus</h4>
                <p className="text-sm text-muted-foreground">
                  {showDetails.description || "Kirjeldus puudub"}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-semibold mb-2">Lihasgrupid</h4>
                  <div className="flex flex-wrap gap-1">
                    {showDetails.muscle_groups.map((muscle, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {muscle}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Vahendid</h4>
                  <div className="flex flex-wrap gap-1">
                    {showDetails.equipment.map((eq, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {eq}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <h4 className="font-semibold mb-1">Soovituslik seeriad</h4>
                  <p className="text-sm text-muted-foreground">{showDetails.common_sets}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Soovituslik kordused</h4>
                  <p className="text-sm text-muted-foreground">{showDetails.common_reps}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Puhkus</h4>
                  <p className="text-sm text-muted-foreground">
                    {showDetails.rest_time ? `${showDetails.rest_time}s` : "Ei määratud"}
                  </p>
                </div>
              </div>

              {onAddExercise && (
                <Button 
                  onClick={() => {
                    onAddExercise(showDetails);
                    setShowDetails(null);
                  }}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Lisa programmile
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}