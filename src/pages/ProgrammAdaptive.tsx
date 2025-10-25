import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useProgramCalendarState } from '@/hooks/useProgramCalendarState';
import { useWeekendRedirect } from '@/hooks/useWeekendRedirect';
import { Loader2, RefreshCw, ArrowLeft, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import CalendarGrid from '@/components/calendar/CalendarGrid';
import QuoteDisplay from '@/components/calendar/QuoteDisplay';
import { getTallinnDate, isAfterUnlockTime } from '@/lib/workweek';
import { supabase } from '@/integrations/supabase/client';
import { UnifiedTimer } from '@/components/workout/UnifiedTimer';

export default function ProgrammAdaptive() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { handleWeekendClick } = useWeekendRedirect();
  const { dayNumber: routeDayNumber } = useParams();
  
  const {
    program,
    days,
    totalDays,
    completedDays,
    loading,
    error,
    hasActiveProgram,
    refreshCalendar,
    markDayCompleted
  } = useProgramCalendarState();

  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [activeDayData, setActiveDayData] = useState<any | null>(null);
  const firstExerciseRef = useRef<HTMLDivElement | null>(null);

  const loadProgramDayByNumber = useCallback(async (dayNum: number) => {
    if (!program) return;

    // For now, we'll use the existing programday table structure
    // This would need to be adapted based on your program structure
    const week = Math.ceil(dayNum / 5);
    const day = ((dayNum - 1) % 5) + 1;
    
    const { data, error } = await supabase
      .from('programday')
      .select('*')
      .eq('week', week)
      .eq('day', day)
      .single();
      
    if (error) {
      console.error('programday load error', error);
      toast({ title: 'Viga', description: 'Päeva laadimine ebaõnnestus', variant: 'destructive' });
      setActiveDayData(null);
      return;
    }
    
    setActiveDayData(data);
  }, [program, toast]);

  const handleDayCompletion = useCallback(async (dayNumber: number) => {
    if (!user || !program) return;

    try {
      // This would need to be implemented based on your program structure
      // For now, we'll use the existing complete_static_program_day function
      const { data, error } = await supabase.rpc('complete_static_program_day', {
        p_user_id: user.id,
        p_programday_id: activeDayData?.id // This would need to be adapted
      });

      if (error) {
        console.error('Error completing day:', error);
        toast({ title: 'Viga', description: 'Päeva märkimine ebaõnnestus', variant: 'destructive' });
        return;
      }

      if (data?.success) {
        toast({ title: 'Õnnestus!', description: 'Päev märgitud tehtuks!' });
        await markDayCompleted(dayNumber);
        setActiveDayData(null);
        navigate('/programm');
      }
    } catch (error) {
      console.error('Error completing day:', error);
      toast({ title: 'Viga', description: 'Päeva märkimine ebaõnnestus', variant: 'destructive' });
    }
  }, [user, program, activeDayData, markDayCompleted, navigate, toast]);

  // Handle day click
  const handleDayClick = useCallback((dayNumber: number) => {
    if (days[dayNumber - 1]?.isWeekend) {
      handleWeekendClick();
      return;
    }
    
    setSelectedDay(dayNumber);
    loadProgramDayByNumber(dayNumber);
  }, [days, handleWeekendClick, loadProgramDayByNumber]);

  // Auto-scroll to first exercise when day loads
  useEffect(() => {
    if (activeDayData && firstExerciseRef.current) {
      setTimeout(() => {
        firstExerciseRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 100);
    }
  }, [activeDayData]);

  // Handle route parameter
  useEffect(() => {
    if (routeDayNumber) {
      const dayNum = parseInt(routeDayNumber);
      if (dayNum >= 1 && dayNum <= totalDays) {
        handleDayClick(dayNum);
      }
    }
  }, [routeDayNumber, totalDays, handleDayClick]);

  // Redirect if no active program
  if (!loading && !hasActiveProgram) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Pole aktiivset programmi
          </h2>
          <p className="text-gray-600 mb-6">
            Vali programm, et alustada oma treeningteekonda.
          </p>
          <Button 
            onClick={() => navigate('/programmid')}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Vali programm
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Laen programmi...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <Alert variant="destructive">
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
          <Button 
            onClick={refreshCalendar}
            className="mt-4"
            variant="outline"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Proovi uuesti
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/programmid')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Tagasi
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {program?.title || 'Treeningprogramm'}
              </h1>
              <p className="text-sm text-gray-600">
                {completedDays}/{totalDays} päeva tehtud
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={refreshCalendar}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Värskenda
          </Button>
        </div>

        {/* Calendar Grid */}
        <CalendarGrid 
          days={days}
          onDayClick={handleDayClick}
          selectedDay={selectedDay}
        />

        {/* Day Details */}
        {activeDayData && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Päev {selectedDay}</span>
                <Button 
                  onClick={() => handleDayCompletion(selectedDay!)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Märgi tehtuks
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeDayData.note && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">{activeDayData.note}</p>
                </div>
              )}
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => {
                  const n = i + 1;
                  const name = activeDayData[`exercise${n}`];
                  const reps = activeDayData[`reps${n}`];
                  const seconds = activeDayData[`seconds${n}`];
                  const sets = activeDayData[`sets${n}`];
                  const hint = activeDayData[`hint${n}`];
                  const video = activeDayData[`videolink${n}`];
                  if (!name) return null;
                  return (
                    <div key={n} className="rounded-lg border p-3" ref={n === 1 ? firstExerciseRef : undefined}>
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{name}</div>
                        <div className="text-sm text-muted-foreground">
                          {sets ? `${sets} seeriat` : ''}
                          {reps ? ` • ${reps} kordust` : ''}
                          {seconds ? ` • ${seconds}s` : ''}
                        </div>
                      </div>
                      {hint && <div className="text-sm text-muted-foreground mt-1">{hint}</div>}
                      {video && (
                        <div className="mt-3">
                          <iframe
                            src={video.includes('youtube.com') || video.includes('youtu.be') ?
                              (video.includes('embed') ? `${video}` : `https://www.youtube-nocookie.com/embed/${(video.split('v=')[1]||'').split('&')[0] || video.split('youtu.be/')[1] || ''}`)
                              : video
                            }
                            className="w-full h-[200px]"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            title={`${name} video`}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quote Display Modal */}
        {selectedDay && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 sm:p-4 z-50">
            <Card className="max-w-md w-full max-h-[90vh] overflow-y-auto">
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-4">
                  <QuoteDisplay dayNumber={selectedDay} />
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => setSelectedDay(null)}
                      className="flex-1"
                    >
                      Sulge
                    </Button>
                    <Button 
                      onClick={() => {
                        setSelectedDay(null);
                        loadProgramDayByNumber(selectedDay);
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      Alusta treeningut
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
