import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, Activity, Target, Plus, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEntry, setNewEntry] = useState({
    title: "",
    content: "",
    mood: 3,
    energy_level: 3,
    motivation: 3
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadJournal = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("training_journal")
          .select(`
            id,
            title,
            content,
            mood,
            energy_level,
            motivation,
            created_at,
            session_id,
            client_program_id
          `)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) throw error;

        const journalEntries: JournalEntry[] = (data || []).map(entry => ({
          id: entry.id,
          date: entry.created_at,
          program_title: entry.title || "Märkmik",
          day_title: "Märkus",
          duration_minutes: 0,
          exercises_completed: 0,
          total_sets: 0,
          avg_rpe: 0,
          notes: entry.content || ""
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

  const handleSaveEntry = async () => {
    if (!user || !newEntry.title.trim() || !newEntry.content.trim()) {
      toast({
        title: "Viga",
        description: "Palun täida pealkiri ja sisu",
        variant: "destructive"
      });
      return;
    }

    try {
      setSaving(true);
      const { data, error } = await supabase
        .from("training_journal")
        .insert({
          user_id: user.id,
          title: newEntry.title.trim(),
          content: newEntry.content.trim(),
          mood: newEntry.mood,
          energy_level: newEntry.energy_level,
          motivation: newEntry.motivation
        })
        .select()
        .single();

      if (error) throw error;

      // Add to local state
      const newJournalEntry: JournalEntry = {
        id: data.id,
        date: data.created_at,
        program_title: data.title,
        day_title: "Märkus",
        duration_minutes: 0,
        exercises_completed: 0,
        total_sets: 0,
        avg_rpe: 0,
        notes: data.content
      };

      setEntries(prev => [newJournalEntry, ...prev]);
      
      // Reset form
      setNewEntry({
        title: "",
        content: "",
        mood: 3,
        energy_level: 3,
        motivation: 3
      });
      setShowAddForm(false);

      toast({
        title: "Edukas!",
        description: "Märkmik salvestatud"
      });
    } catch (error) {
      console.error("Error saving journal entry:", error);
      toast({
        title: "Viga",
        description: "Märkmiku salvestamine ebaõnnestus",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

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
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Treeningu päevik
              </CardTitle>
              <Button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Lisa märkus
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showAddForm && (
              <Card className="mb-6 border-2 border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg">Lisa uus märkmik</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Pealkiri</label>
                    <Input
                      value={newEntry.title}
                      onChange={(e) => setNewEntry(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Näiteks: Tänane treening"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Sisu</label>
                    <Textarea
                      value={newEntry.content}
                      onChange={(e) => setNewEntry(prev => ({ ...prev, content: e.target.value }))}
                      placeholder="Kirjuta oma mõtted treeningu kohta..."
                      className="mt-1 min-h-[100px]"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium">Tuju (1-5)</label>
                      <div className="flex gap-1 mt-1">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <Button
                            key={value}
                            variant={newEntry.mood === value ? "default" : "outline"}
                            size="sm"
                            onClick={() => setNewEntry(prev => ({ ...prev, mood: value }))}
                            className="w-8 h-8 p-0"
                          >
                            {value}
                          </Button>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Energia (1-5)</label>
                      <div className="flex gap-1 mt-1">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <Button
                            key={value}
                            variant={newEntry.energy_level === value ? "default" : "outline"}
                            size="sm"
                            onClick={() => setNewEntry(prev => ({ ...prev, energy_level: value }))}
                            className="w-8 h-8 p-0"
                          >
                            {value}
                          </Button>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Motivatsioon (1-5)</label>
                      <div className="flex gap-1 mt-1">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <Button
                            key={value}
                            variant={newEntry.motivation === value ? "default" : "outline"}
                            size="sm"
                            onClick={() => setNewEntry(prev => ({ ...prev, motivation: value }))}
                            className="w-8 h-8 p-0"
                          >
                            {value}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveEntry}
                      disabled={saving}
                      className="flex items-center gap-2"
                    >
                      <Save className="h-4 w-4" />
                      {saving ? "Salvestan..." : "Salvesta"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowAddForm(false)}
                    >
                      Tühista
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
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
