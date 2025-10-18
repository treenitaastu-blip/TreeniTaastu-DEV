import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Activity, Target } from "lucide-react";

type JournalEntry = {
  id: string;
  date: string;
  program_title: string;
  day_title: string;
  duration_minutes: number;
  exercises_completed: number;
  total_sets: number;
  avg_rpe: number;
  notes?: string;
};

export default function TrainingJournal() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadJournal = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("workout_sessions")
          .select(`
            id,
            started_at,
            ended_at,
            duration_minutes,
            avg_rpe,
            notes,
            client_programs!inner (
              title_override,
              client_days!inner (
                title,
                client_items!inner (
                  id
                )
              )
            )
          `)
          .eq("user_id", user.id)
          .not("ended_at", "is", null)
          .order("started_at", { ascending: false })
          .limit(50);

        if (error) throw error;

        const journalEntries: JournalEntry[] = (data || []).map(session => ({
          id: session.id,
          date: session.started_at,
          program_title: session.client_programs?.title_override || "Unknown Program",
          day_title: session.client_programs?.client_days?.[0]?.title || "Unknown Day",
          duration_minutes: session.duration_minutes || 0,
          exercises_completed: session.client_programs?.client_days?.[0]?.client_items?.length || 0,
          total_sets: 0, // Would need to calculate from set_logs
          avg_rpe: session.avg_rpe || 0,
          notes: session.notes
        }));

        setEntries(journalEntries);
      } catch (error) {
        console.error("Error loading training journal:", error);
      } finally {
        setLoading(false);
      }
    };

    loadJournal();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Treeningu päevik</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Laadin päevikut...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Treeningu päevik
            </CardTitle>
          </CardHeader>
          <CardContent>
            {entries.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Päevik on tühi</h3>
                <p className="text-muted-foreground">
                  Alusta oma esimest treeningut, et näha siin oma edusammud!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {entries.map((entry) => (
                  <Card key={entry.id} className="border-l-4 border-l-primary">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{entry.program_title}</h3>
                            <Badge variant="outline">{entry.day_title}</Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {new Date(entry.date).toLocaleDateString('et-EE')}
                            </div>
                            <div className="flex items-center gap-1">
                              <Activity className="h-4 w-4" />
                              {entry.duration_minutes} min
                            </div>
                            <div className="flex items-center gap-1">
                              <Target className="h-4 w-4" />
                              {entry.exercises_completed} harjutust
                            </div>
                            {entry.avg_rpe > 0 && (
                              <Badge variant="secondary">
                                RPE {entry.avg_rpe}
                              </Badge>
                            )}
                          </div>
                          {entry.notes && (
                            <p className="text-sm text-muted-foreground mt-2">
                              {entry.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
