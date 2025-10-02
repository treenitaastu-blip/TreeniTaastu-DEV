import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Edit2, Trash2, BookOpen, Smile, Battery, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type JournalEntry = {
  id: string;
  title: string;
  content: string;
  mood: number | null;
  energy_level: number | null;
  motivation: number | null;
  created_at: string;
  updated_at: string;
  session_id: string | null;
};

const MOOD_ICONS = ["😞", "😕", "😐", "😊", "😁"];
const ENERGY_ICONS = ["🪫", "🔋", "⚡", "🔥", "💪"];
const MOTIVATION_ICONS = ["😴", "😑", "🤔", "💪", "🚀"];

export default function TrainingJournal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    mood: "",
    energy_level: "",
    motivation: ""
  });

  useEffect(() => {
    loadEntries();
  }, [user]);

  const loadEntries = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("training_journal")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error("Error loading journal entries:", error);
      toast({ 
        title: "Viga", 
        description: "Märkmiku laadimise viga", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const payload = {
      user_id: user.id,
      title: formData.title || "Märge",
      content: formData.content,
      mood: formData.mood ? parseInt(formData.mood) : null,
      energy_level: formData.energy_level ? parseInt(formData.energy_level) : null,
      motivation: formData.motivation ? parseInt(formData.motivation) : null,
    };

    try {
      if (editingEntry) {
        const { error } = await supabase
          .from("training_journal")
          .update(payload)
          .eq("id", editingEntry.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("training_journal")
          .insert([payload]);
        if (error) throw error;
      }

      toast({ 
        title: "Salvestatud!", 
        description: editingEntry ? "Märge uuendatud" : "Uus märge lisatud" 
      });
      
      setDialogOpen(false);
      resetForm();
      loadEntries();
    } catch (error) {
      console.error("Error saving entry:", error);
      toast({ 
        title: "Viga", 
        description: "Salvestamise viga", 
        variant: "destructive" 
      });
    }
  };

  const handleEdit = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setFormData({
      title: entry.title,
      content: entry.content,
      mood: entry.mood?.toString() || "",
      energy_level: entry.energy_level?.toString() || "",
      motivation: entry.motivation?.toString() || ""
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Kas oled kindel, et soovid kustutada?")) return;

    try {
      const { error } = await supabase
        .from("training_journal")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      toast({ title: "Kustutatud!", description: "Märge eemaldatud" });
      loadEntries();
    } catch (error) {
      console.error("Error deleting entry:", error);
      toast({ 
        title: "Viga", 
        description: "Kustutamise viga", 
        variant: "destructive" 
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      mood: "",
      energy_level: "",
      motivation: ""
    });
    setEditingEntry(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("et-EE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 rounded-lg bg-muted"></div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl border bg-card p-6 shadow-soft space-y-4">
                <div className="h-6 w-32 rounded bg-muted"></div>
                <div className="h-20 w-full rounded bg-muted"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8">
          <Button onClick={() => navigate("/programs")} variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tagasi programmide juurde
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Treeningu märkmik
              </h1>
              <p className="mt-2 text-muted-foreground">
                Jälgi oma treeningu kogemusi ja mõtteid
              </p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Uus märge
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    {editingEntry ? "Muuda märget" : "Uus märge"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Pealkiri</label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Treeningu märge..."
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Sisu</label>
                    <Textarea
                      value={formData.content}
                      onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                      placeholder="Kirjuta oma mõtted ja kogemused..."
                      rows={6}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                        <Smile className="h-4 w-4" />
                        Meeleolu
                      </label>
                      <Select value={formData.mood} onValueChange={(value) => setFormData(prev => ({ ...prev, mood: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Vali..." />
                        </SelectTrigger>
                        <SelectContent>
                          {MOOD_ICONS.map((icon, index) => (
                            <SelectItem key={index + 1} value={(index + 1).toString()}>
                              <span className="flex items-center gap-2">
                                {icon} {index + 1}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                        <Battery className="h-4 w-4" />
                        Energia
                      </label>
                      <Select value={formData.energy_level} onValueChange={(value) => setFormData(prev => ({ ...prev, energy_level: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Vali..." />
                        </SelectTrigger>
                        <SelectContent>
                          {ENERGY_ICONS.map((icon, index) => (
                            <SelectItem key={index + 1} value={(index + 1).toString()}>
                              <span className="flex items-center gap-2">
                                {icon} {index + 1}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Motivatsioon
                      </label>
                      <Select value={formData.motivation} onValueChange={(value) => setFormData(prev => ({ ...prev, motivation: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Vali..." />
                        </SelectTrigger>
                        <SelectContent>
                          {MOTIVATION_ICONS.map((icon, index) => (
                            <SelectItem key={index + 1} value={(index + 1).toString()}>
                              <span className="flex items-center gap-2">
                                {icon} {index + 1}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setDialogOpen(false)}
                    >
                      Tühista
                    </Button>
                    <Button type="submit">
                      {editingEntry ? "Uenda" : "Salvesta"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="text-center py-12">
            <div className="rounded-full bg-primary/10 w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Pole veel märkmeid</h3>
            <p className="text-muted-foreground mb-6">
              Alusta oma treeningu märkmiku pidamist
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {entries.map((entry) => (
              <Card key={entry.id} className="rounded-2xl shadow-soft">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{entry.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatDate(entry.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(entry)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(entry.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <p className="text-foreground whitespace-pre-wrap">{entry.content}</p>
                  </div>
                  
                  {(entry.mood || entry.energy_level || entry.motivation) && (
                    <div className="flex items-center gap-6 pt-4 border-t">
                      {entry.mood && (
                        <div className="flex items-center gap-2">
                          <Smile className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {MOOD_ICONS[entry.mood - 1]} Meeleolu: {entry.mood}/5
                          </span>
                        </div>
                      )}
                      {entry.energy_level && (
                        <div className="flex items-center gap-2">
                          <Battery className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {ENERGY_ICONS[entry.energy_level - 1]} Energia: {entry.energy_level}/5
                          </span>
                        </div>
                      )}
                      {entry.motivation && (
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {MOTIVATION_ICONS[entry.motivation - 1]} Motivatsioon: {entry.motivation}/5
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}