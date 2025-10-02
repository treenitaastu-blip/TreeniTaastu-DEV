import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, BookOpen, CheckCircle, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";

interface PersonalTrainingCompletionDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PersonalTrainingCompletionDialog({
  isOpen,
  onClose
}: PersonalTrainingCompletionDialogProps) {
  const navigate = useNavigate();

  const handleViewStats = () => {
    navigate("/programs/stats");
    onClose();
  };

  const handleAddNote = () => {
    navigate("/programs/journal");
    onClose();
  };

  const handleGoHome = () => {
    navigate("/programs");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
            <CheckCircle className="h-8 w-8 text-success" />
          </div>
          <DialogTitle className="text-xl font-bold">
            Suurepärane! Treening lõpetatud! 🎉
          </DialogTitle>
          <DialogDescription className="text-center">
            Hästi tehtud! Mida soovid edasi teha?
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          <Button 
            onClick={handleViewStats}
            className="w-full h-12 text-left justify-start"
            variant="outline"
          >
            <BarChart3 className="mr-3 h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Vaata statistikat</div>
              <div className="text-sm text-muted-foreground">Jälgi oma arengut</div>
            </div>
          </Button>

          <Button 
            onClick={handleAddNote}
            className="w-full h-12 text-left justify-start"
            variant="outline"
          >
            <BookOpen className="mr-3 h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Lisa märkus märkmikusse</div>
              <div className="text-sm text-muted-foreground">Salvesta mõtted treeningu kohta</div>
            </div>
          </Button>

          <Button 
            onClick={handleGoHome}
            className="w-full h-12 text-left justify-start"
          >
            <Home className="mr-3 h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Tagasi programmide juurde</div>
              <div className="text-sm text-muted-foreground">Vaata teisi programme</div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}