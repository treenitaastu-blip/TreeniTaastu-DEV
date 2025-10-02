import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Exercise } from "@/types/program";
import { Loader2, CheckCircle, Video, Calendar, Trophy, Target, Play, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StaticProgressCard } from "@/components/smart-progression/StaticProgressCard";
import { useStaticProgression } from "@/hooks/useStaticProgression";
import { isMondayStart, getTallinnDate } from "@/lib/workweek";
import { CompactTimer } from "@/components/workout/CompactTimer";

// Helper functions for data transformation
const rowToExercises = (row: any): Exercise[] => {
  const exercises: Exercise[] = [];
  for (let i = 1; i <= 5; i++) {
    const name = row[`exercise${i}`];
    if (name && name.trim()) {
      exercises.push({
        order: i,
        name: name.trim(),
        sets: row[`sets${i}`] || null,
        reps: row[`reps${i}`] || null,
        seconds: row[`seconds${i}`] || null,
        cues: row[`hint${i}`] || null,
        video_url: row[`videolink${i}`] || null,
      });
    }
  }
  return exercises;
};

const toEmbedUrl = (url: string | null | undefined): string => {
  if (!url) return "";
  
  // Convert YouTube watch URLs to embed URLs
  const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }
  
  return url;
};

export default function Programm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { staticProgress, loading: progressLoading, completeToday, startProgram } = useStaticProgression(user?.id);

  // Local state
  const [currentProgramDay, setCurrentProgramDay] = useState<any>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  // Load current program day
  const loadCurrentDay = useCallback(async () => {
    if (!user?.id || !staticProgress?.has_started) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get current program day using new function
      const { data: currentDayData, error: currentDayError } = await supabase
        .rpc('get_user_current_program_day', { p_user_id: user.id });

      if (currentDayError) throw currentDayError;

      if (currentDayData && currentDayData.length > 0) {
        const currentDay = currentDayData[0];
        
        // Get the program day details
        const { data: programDayData, error: programDayError } = await supabase
          .from('programday')
          .select('*')
          .eq('id', currentDay.programday_id)
          .single();

        if (programDayError) {
          console.error('Program day fetch error:', programDayError);
          throw programDayError;
        }

        setCurrentProgramDay({ ...programDayData, ...currentDay });
        
        // Convert to exercises format
        const exercisesList = rowToExercises(programDayData);
        setExercises(exercisesList);

        // Set default video
        const firstVideoExercise = exercisesList.find(ex => ex.video_url);
        if (firstVideoExercise) {
          setActiveVideo(toEmbedUrl(firstVideoExercise.video_url || null));
        }
      }
    } catch (err: any) {
      console.error("Load error:", err);
      setError(err.message || "Failed to load current program day");
    } finally {
      setLoading(false);
    }
  }, [user?.id, staticProgress?.has_started]);

  useEffect(() => {
    loadCurrentDay();
  }, [loadCurrentDay]);

  // Handle program start (initial start - requires Monday)
  const handleStartProgram = async () => {
    const isMonday = isMondayStart();
    
    if (!isMonday) {
      toast({
        title: "Programm algab esmaspäeval",
        description: "Uus treeningtsükkel algab järgmisel esmaspäeval. Seni võid vaadata harjutusi.",
        variant: "default",
      });
      return;
    }
    
    try {
      await startProgram();
      toast({
        title: "Programm käivitatud!",
        description: "Sinu staatiline treeningprogramm on aktiveeritud.",
      });
    } catch (err: any) {
      toast({
        title: "Viga",
        description: err.message || "Programmi käivitamine ebaõnnestus",
        variant: "destructive",
      });
    }
  };

  // Handle program restart (also requires Monday)
  const handleRestartProgram = async () => {
    const isMonday = isMondayStart();
    const currentDate = getTallinnDate();
    
    console.log('Restart attempt:', {
      isMonday,
      currentDay: currentDate.getDay(),
      currentDate: currentDate.toISOString(),
      tallinnTime: currentDate.toLocaleString('et-EE', { timeZone: 'Europe/Tallinn' })
    });
    
    if (!isMonday) {
      toast({
        title: "Programm algab esmaspäeval",
        description: "Uus treeningtsükkel algab järgmisel esmaspäeval. Seni võid vaadata harjutusi.",
        variant: "default",
      });
      return;
    }
    
    try {
      console.log('Starting program restart...');
      await startProgram();
      toast({
        title: "Programm taaskäivitatud!",
        description: "Sinu staatiline treeningprogramm on uuesti aktiveeritud.",
      });
    } catch (err: any) {
      console.error('Restart program error:', err);
      toast({
        title: "Viga",
        description: err.message || "Programmi taaskäivitamine ebaõnnestus",
        variant: "destructive",
      });
    }
  };

  // Mark workout as done
  const markDone = async (e?: React.MouseEvent) => {
    console.log('=== markDone CALLED ===');
    e?.preventDefault();
    e?.stopPropagation();
    
    if (!user?.id) {
      console.error('No user ID');
      return;
    }
    
    if (!currentProgramDay?.programday_id) {
      console.error('No program day ID', currentProgramDay);
      return;
    }
    
    if (isCompleting) {
      console.log('Already completing...');
      return;
    }

    console.log('Marking done:', { 
      userId: user.id, 
      programDayId: currentProgramDay.programday_id,
      currentProgramDay,
      hasCompleteToday: !!completeToday
    });

    setIsCompleting(true);
    try {
      console.log('Calling completeToday...');
      const result = await completeToday(currentProgramDay.programday_id);
      console.log('Complete result:', result);

      // Check if completion was successful
      if (result && typeof result === 'object' && 'success' in result && result.success === false) {
        // Already completed - refresh UI to show completion status
        console.log('Already completed today, refreshing UI...');
        await loadCurrentDay();
        
        toast({
          title: "Juba lõpetatud",
          description: "Sa oled selle treeningu juba täna lõpetanud. Suurepärane töö!",
          variant: "default",
        });
        return;
      }

      toast({
        title: "Suurepärane töö! 💪",
        description: "Tänane treening on edukalt lõpetatud!",
      });
      
      // Refresh the data to show completion
      console.log('Reloading current day...');
      await loadCurrentDay();
      console.log('Current day reloaded');
    } catch (err: any) {
      console.error("Mark done error:", err);
      
      // Handle duplicate key constraint violation gracefully
      if (err?.code === '23505') {
        console.log('Duplicate key detected - workout already completed, refreshing UI...');
        await loadCurrentDay();
        
        toast({
          title: "Juba lõpetatud",
          description: "See treening on juba lõpetatud!",
          variant: "default",
        });
      } else {
        toast({
          title: "Viga",
          description: err.message || "Treeningu lõpetatuks märkimine ebaõnnestus",
          variant: "destructive",
        });
      }
    } finally {
      setIsCompleting(false);
      console.log('=== markDone FINISHED ===');
    }
  };

  // Derived state for UI
  const hasStarted = staticProgress?.has_started;
  const canDoWorkout = hasStarted && currentProgramDay && !staticProgress?.completed_today;
  const completedToday = staticProgress?.completed_today;

  if (loading || progressLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Laadin sinu treeningprogrammi...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-orange-200 bg-orange-50">
          <CardContent className="pt-6 text-center">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-orange-100 p-3">
                <svg
                  className="h-6 w-6 text-orange-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>
            <h2 className="mb-2 text-xl font-semibold text-orange-900">Midagi läks valesti</h2>
            <p className="text-sm text-orange-800 mb-6">
              Treeningandmete laadimisel esines viga. Palun proovi uuesti.
            </p>
            <div className="flex gap-3 justify-center">
              <Button 
                onClick={() => window.location.reload()} 
                className="bg-orange-600 hover:bg-orange-700"
              >
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Värskenda lehte
              </Button>
              <Button onClick={loadCurrentDay} variant="outline" className="border-orange-300">
                Proovi uuesti
              </Button>
            </div>
            {/* Only show technical details in development */}
            {import.meta.env.DEV && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-xs text-orange-700 hover:text-orange-900">
                  Tehniline info
                </summary>
                <p className="mt-2 text-xs text-orange-900 bg-orange-100 p-2 rounded">
                  {error}
                </p>
              </details>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not started yet
  if (!hasStarted) {
    const isMonday = isMondayStart();
    const nextMonday = (() => {
      const date = getTallinnDate();
      const daysUntilMonday = (8 - date.getDay()) % 7;
      const nextMon = new Date(date);
      nextMon.setDate(date.getDate() + (daysUntilMonday === 0 ? 7 : daysUntilMonday));
      return nextMon.toLocaleDateString('et-EE', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    })();
    
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center space-y-6">
          <div className="space-y-4">
            <h1 className="text-3xl font-bold">Kontorikeha Treeningprogramm</h1>
            <p className="text-muted-foreground text-lg">
              {isMonday 
                ? "Kas oled valmis alustama oma 20-päevast kontoritöötaja treeningprogrammi?"
                : "Uued treeningtsüklid algavad esmaspäeviti!"
              }
            </p>
          </div>

          {!isMonday && (
            <Card className="max-w-md mx-auto bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 text-blue-700">
                  <Clock className="h-5 w-5" />
                  <div className="text-left">
                    <p className="font-semibold">Järgmine programm algab:</p>
                    <p className="text-sm">{nextMonday}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                {isMonday ? "Alusta oma teekonda" : "Valmista ette"}
              </CardTitle>
              <CardDescription>
                See programm on loodud parandamaks sinu kehahoidet, tugevust ja heaolu harjutustega, mis sobivad ideaalselt kontoritöötajatele.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Programmi kestus</span>
                  <span className="font-semibold">20-päevased tsüklid (korratavad)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Harjutusi päevas</span>
                  <span className="font-semibold">5 harjutust</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Aeg treeningu kohta</span>
                  <span className="font-semibold">~15 minutit</span>
                </div>
              </div>
              <Button 
                onClick={handleStartProgram} 
                className="w-full" 
                size="lg"
                disabled={!isMonday}
              >
                {isMonday ? "Alusta programmi" : "Programm algab esmaspäeval"}
              </Button>
              {!isMonday && (
                <p className="text-xs text-muted-foreground">
                  Seni võid tutvuda harjutustega ja valmistuda järgmiseks tsükliks!
                </p>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Compact Timer for timed exercises */}
        <CompactTimer />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
      {/* Header with progress */}
      <div className="text-center space-y-4">
        <h1 className="text-2xl md:text-3xl font-bold">Kontorikeha Treeningprogramm</h1>
        {staticProgress && (
          <StaticProgressCard 
            staticProgress={staticProgress}
            onContinue={() => {}}
            onViewProgress={() => {}}
            hideButtons={true}
          />
        )}
      </div>

      {/* Main Content */}
      {currentProgramDay === null ? (
        <Card>
          <CardContent className="text-center py-6 md:py-8">
            <p className="text-sm md:text-base text-muted-foreground mb-4">
              Täna ei ole harjutusi saadaval. Sinu programm vajab lähtestamist.
            </p>
            <Button onClick={handleRestartProgram} variant="outline">
              Käivita programm uuesti
            </Button>
          </CardContent>
        </Card>
      ) : currentProgramDay && exercises.length > 0 ? (
        <div className="space-y-6">
          {/* Today's exercises */}
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Tänased harjutused
              </CardTitle>
              <CardDescription>
                Lõpeta kõik allpool olevad harjutused, et tänane treening lõpetada
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <div className="space-y-4 md:space-y-6">
                <h3 className="text-lg font-semibold">Harjutused</h3>
                
                {exercises.map((exercise, index) => {
                  const videoUrl = toEmbedUrl(exercise.video_url);

                  return (
                    <div key={index} className="w-full space-y-3 md:space-y-4">
                      {/* Exercise Header */}
                      <div className="bg-card rounded-xl border p-3 md:p-4">
                        <div className="flex items-center gap-2 md:gap-3 mb-3">
                          <Badge variant="outline" className="text-xs">
                            {exercise.order}
                          </Badge>
                          <h4 className="font-semibold text-base md:text-lg">{exercise.name}</h4>
                        </div>
                        
                        {/* Exercise Details */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3 mb-3 md:mb-4">
                          {exercise.reps && (
                            <div className="rounded-md bg-muted/30 border px-2 md:px-3 py-2 text-center">
                              <div className="text-muted-foreground text-xs">Kordused</div>
                              <div className="font-semibold text-sm md:text-base">{exercise.reps}</div>
                            </div>
                          )}
                          {exercise.seconds && (
                            <div className="rounded-md bg-muted/30 border px-2 md:px-3 py-2 text-center">
                              <div className="text-muted-foreground text-xs">Sekundid</div>
                              <div className="font-semibold text-sm md:text-base">{exercise.seconds}s</div>
                            </div>
                          )}
                          {exercise.sets && (
                            <div className="rounded-md bg-muted/30 border px-2 md:px-3 py-2 text-center">
                              <div className="text-muted-foreground text-xs">Seeriad</div>
                              <div className="font-semibold text-sm md:text-base">{exercise.sets}</div>
                            </div>
                          )}
                        </div>

                        {/* Tip/Hint */}
                        {exercise.cues && (
                          <div className="rounded-md bg-muted/20 border px-2 md:px-3 py-2 mb-3 md:mb-4">
                            <div className="text-muted-foreground text-xs mb-1">Soovitus</div>
                            <div className="text-xs md:text-sm">{exercise.cues}</div>
                          </div>
                        )}

                        {/* Video */}
                        {videoUrl && (
                          <div className="rounded-lg border overflow-hidden">
                            <iframe
                              src={videoUrl}
                              className="w-full h-[200px] md:h-[240px]"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                              allowFullScreen
                              title={`${exercise.name} video`}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Action Button */}
          <div className="text-center px-4">
            {completedToday ? (
              <div className="space-y-2 md:space-y-3">
                <div className="inline-flex items-center gap-2 text-green-600 font-semibold">
                  <CheckCircle className="h-5 w-5" />
                  Treening lõpetatud! 
                </div>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Hästi tehtud! Tule homme tagasi järgmise treeningu jaoks.
                </p>
              </div>
            ) : canDoWorkout ? (
              <Button 
                type="button"
                onClick={markDone} 
                disabled={isCompleting}
                size="lg"
                className="min-w-[200px] w-full md:w-auto"
              >
                {isCompleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Lõpetan...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Märgi lõpetatuks
                  </>
                )}
              </Button>
            ) : (
              <p className="text-sm md:text-base text-muted-foreground">
                Tänane treening pole saadaval või on juba lõpetatud.
              </p>
            )}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-6 md:py-8">
            <p className="text-sm md:text-base text-muted-foreground">
              Tänaseks ei ole harjutusi määratud.
            </p>
          </CardContent>
        </Card>
      )}
      
      {/* Compact Timer for timed exercises */}
      <CompactTimer />
    </div>
  );
}