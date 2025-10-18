import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  Target, 
  TrendingUp, 
  Activity, 
  Trophy,
  Clock,
  Weight,
  BarChart3
} from 'lucide-react';

interface ProgressData {
  totalWorkouts: number;
  weeklyGoal: number;
  currentStreak: number;
  totalVolume: number;
  avgRPE: number;
  completedDays: number;
  totalDays: number;
}

export default function Progress() {
  const { user } = useAuth();
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week');

  useEffect(() => {
    const loadProgressData = async () => {
      if (!user) return;

      try {
        setLoading(true);

        // Load workout sessions
        const { data: sessions, error: sessionsError } = await supabase
          .from('workout_sessions')
          .select('*')
          .eq('user_id', user.id)
          .not('ended_at', 'is', null)
          .order('started_at', { ascending: false });

        if (sessionsError) throw sessionsError;

        // Load user progress
        const { data: userProgress, error: progressError } = await supabase
          .from('userprogress')
          .select('*')
          .eq('user_id', user.id)
          .eq('done', true)
          .order('completed_at', { ascending: false });

        if (progressError) throw progressError;

        // Calculate progress metrics
        const totalWorkouts = sessions?.length || 0;
        const weeklyGoal = 3; // Default weekly goal
        const currentStreak = calculateStreak(sessions || []);
        const totalVolume = calculateTotalVolume(userProgress || []);
        const avgRPE = calculateAvgRPE(sessions || []);
        const completedDays = userProgress?.length || 0;
        const totalDays = 30; // Default total days

        setProgressData({
          totalWorkouts,
          weeklyGoal,
          currentStreak,
          totalVolume,
          avgRPE,
          completedDays,
          totalDays
        });
      } catch (error) {
        console.error('Error loading progress data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProgressData();
  }, [user]);

  const calculateStreak = (sessions: any[]) => {
    if (!sessions.length) return 0;
    
    let streak = 0;
    const today = new Date();
    const sortedSessions = sessions.sort((a, b) => 
      new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    );

    for (const session of sortedSessions) {
      const sessionDate = new Date(session.started_at);
      const daysDiff = Math.floor((today.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= streak + 1) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  };

  const calculateTotalVolume = (progress: any[]) => {
    return progress.reduce((total, item) => {
      const volume = (item.weight_kg || 0) * (item.reps || 0);
      return total + volume;
    }, 0);
  };

  const calculateAvgRPE = (sessions: any[]) => {
    const sessionsWithRPE = sessions.filter(s => s.avg_rpe);
    if (!sessionsWithRPE.length) return 0;
    
    const totalRPE = sessionsWithRPE.reduce((sum, s) => sum + s.avg_rpe, 0);
    return Math.round(totalRPE / sessionsWithRPE.length);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Laadin progressi...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!progressData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Progressi andmeid ei leitud.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const weeklyProgress = (progressData.totalWorkouts / progressData.weeklyGoal) * 100;
  const dayProgress = (progressData.completedDays / progressData.totalDays) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              Minu progress
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Progress Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Activity className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{progressData.totalWorkouts}</div>
                  <div className="text-sm text-muted-foreground">Treeningut</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Trophy className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{progressData.currentStreak}</div>
                  <div className="text-sm text-muted-foreground">Päeva järjest</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Weight className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{Math.round(progressData.totalVolume)}</div>
                  <div className="text-sm text-muted-foreground">kg kokku</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{progressData.avgRPE}</div>
                  <div className="text-sm text-muted-foreground">Keskmine RPE</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Goal Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Nädala eesmärk
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {progressData.totalWorkouts}/{progressData.weeklyGoal} treeningut
              </span>
              <Badge variant={weeklyProgress >= 100 ? "default" : "outline"}>
                {Math.round(weeklyProgress)}%
              </Badge>
            </div>
            <Progress value={Math.min(weeklyProgress, 100)} className="h-3" />
          </CardContent>
        </Card>

        {/* Daily Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Päevane progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {progressData.completedDays}/{progressData.totalDays} päeva
              </span>
              <Badge variant={dayProgress >= 100 ? "default" : "outline"}>
                {Math.round(dayProgress)}%
              </Badge>
            </div>
            <Progress value={Math.min(dayProgress, 100)} className="h-3" />
          </CardContent>
        </Card>

        {/* Time Range Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Ajavahemik</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {(['week', 'month', 'year'] as const).map((range) => (
                <Button
                  key={range}
                  variant={timeRange === range ? "default" : "outline"}
                  onClick={() => setTimeRange(range)}
                  size="sm"
                >
                  {range === 'week' ? 'Nädal' : range === 'month' ? 'Kuu' : 'Aasta'}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
