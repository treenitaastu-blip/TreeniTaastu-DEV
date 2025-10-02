import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trophy, Zap, Activity, CheckCircle, Heart, Coffee, Book, Target } from "lucide-react";
import { useCustomHabits } from "@/hooks/useCustomHabits";
import { useToast } from "@/hooks/use-toast";

const ICON_OPTIONS = [
  { name: "CheckCircle", icon: CheckCircle, label: "Linnuke" },
  { name: "Trophy", icon: Trophy, label: "Trofee" },
  { name: "Zap", icon: Zap, label: "Energia" },
  { name: "Activity", icon: Activity, label: "Aktiivsus" },
  { name: "Heart", icon: Heart, label: "Süda" },
  { name: "Coffee", icon: Coffee, label: "Kohv" },
  { name: "Book", icon: Book, label: "Raamat" },
  { name: "Target", icon: Target, label: "Sihtmärk" },
];

export function AddHabitModal() {
  const { addHabit, canAddMore, maxHabits, habits } = useCustomHabits();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("CheckCircle");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast({
        title: "Viga",
        description: "Palun sisesta harjumuse nimetus",
        variant: "destructive",
      });
      return;
    }

    if (title.trim().length > 100) {
      toast({
        title: "Viga", 
        description: "Harjumuse nimetus on liiga pikk (max 100 tähemärki)",
        variant: "destructive",
      });
      return;
    }

    if (!canAddMore) {
      toast({
        title: "Limiit täis",
        description: `Maksimaalselt ${maxHabits} harjumust lubatud`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await addHabit(title.trim(), selectedIcon);
      toast({
        title: "Edu!",
        description: "Uus harjumus on lisatud",
      });
      setOpen(false);
      setTitle("");
      setSelectedIcon("CheckCircle");
    } catch (e) {
      toast({
        title: "Viga",
        description: e instanceof Error ? e.message : "Harjumuse lisamine ebaõnnestus",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 w-9 p-0" disabled={!canAddMore}>
          <Plus className="h-4 w-4" />
          <span className="sr-only">
            {canAddMore ? "Lisa harjumus" : `Maksimum ${maxHabits} harjumust`}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Lisa uus harjumus
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="habit-title">Harjumuse nimetus</Label>
            <Input
              id="habit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="nt. Lugesin 30 minutit"
              maxLength={100}
              disabled={loading}
            />
            <p className="text-sm text-muted-foreground">
              {title.length}/100 tähemärki
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="habit-icon">Ikoon</Label>
            <Select value={selectedIcon} onValueChange={setSelectedIcon}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ICON_OPTIONS.map((option) => {
                  const IconComponent = option.icon;
                  return (
                    <SelectItem key={option.name} value={option.name}>
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-4 w-4" />
                        {option.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="flex-1"
            >
              Tühista
            </Button>
            <Button type="submit" disabled={loading || !title.trim()} className="flex-1">
              {loading ? "Lisab..." : "Lisa harjumus"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}