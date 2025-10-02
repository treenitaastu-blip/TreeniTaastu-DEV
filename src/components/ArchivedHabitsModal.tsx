import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RotateCcw, Archive } from "lucide-react";
import { useCustomHabits } from "@/hooks/useCustomHabits";
import { useToast } from "@/hooks/use-toast";

type ArchivedHabit = {
  id: string;
  title: string;
  icon_name: string;
  updated_at: string;
};

export function ArchivedHabitsModal() {
  const { getArchivedHabits, restoreHabit } = useCustomHabits();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [archivedHabits, setArchivedHabits] = useState<ArchivedHabit[]>([]);
  const [loading, setLoading] = useState(false);

  const loadArchivedHabits = async () => {
    setLoading(true);
    try {
      const archived = await getArchivedHabits();
      setArchivedHabits(archived);
    } catch (e) {
      console.error("Error loading archived habits:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadArchivedHabits();
    }
  }, [open]);

  const handleRestore = async (habitId: string, habitTitle: string) => {
    try {
      await restoreHabit(habitId);
      toast({
        title: "Taastatud!",
        description: `"${habitTitle}" on taastatud`,
      });
      // Remove from archived list
      setArchivedHabits(prev => prev.filter(h => h.id !== habitId));
    } catch (e) {
      toast({
        title: "Viga",
        description: "Harjumuse taastamine ebaõnnestus",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 w-9 p-0">
          <Archive className="h-4 w-4" />
          <span className="sr-only">Arhiveeritud harjumused</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Arhiveeritud harjumused
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-4 text-muted-foreground">
              Laen...
            </div>
          ) : archivedHabits.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              Arhiveeritud harjumusi ei ole
            </div>
          ) : (
            archivedHabits.map((habit) => (
              <div
                key={habit.id}
                className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{habit.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Arhiveeritud: {new Date(habit.updated_at).toLocaleDateString('et-EE')}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 ml-2 flex-shrink-0"
                  onClick={() => handleRestore(habit.id, habit.title)}
                >
                  <RotateCcw className="h-3 w-3" />
                  <span className="sr-only">Taasta</span>
                </Button>
              </div>
            ))
          )}
        </div>

        {archivedHabits.length > 0 && (
          <div className="text-xs text-muted-foreground mt-4 text-center">
            Kliki taastamise nuppu, et harjumus tagasi tuua
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}