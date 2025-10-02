import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface WeekendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WeekendModal({ isOpen, onClose }: WeekendModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Puhkepäev programmile</DialogTitle>
          <DialogDescription className="text-muted-foreground leading-relaxed">
            Täna on nädalavahetus ja Kontorikeha Reset programmis on paus. Kui tunned, et tahad liikuda, ava "Harjutused" – sealt leiad 10-minutilised juhendatud kavad. Lisaks võid lugeda "Tervisetõed" lehte, kus on lühikesed tõed tervisest.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button asChild className="w-full sm:w-auto" size="lg">
            <Link to="/harjutused" onClick={onClose}>
              Ava Harjutused
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto" size="lg">
            <Link to="/tervisetood" onClick={onClose}>
              Loe Tervisetõdesid
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}