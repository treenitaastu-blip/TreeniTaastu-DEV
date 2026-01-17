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
    onClose();
    // Add a small delay to ensure dialog closes before navigation
    setTimeout(() => {
      navigate("/programs/journal");
    }, 100);
  };

  const handleGoHome = () => {
    onClose();
    // Add a small delay to ensure dialog closes before navigation
    setTimeout(() => {
      navigate("/home");
    }, 100);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="text-center pb-4">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-xl font-semibold">
            Treening lõpetatud!
          </DialogTitle>
          <DialogDescription className="text-base">
            Hästi tehtud!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pb-4">
          <Button 
            onClick={handleViewStats}
            className="w-full h-12 text-base"
            variant="default"
            size="lg"
          >
            <BarChart3 className="mr-2 h-5 w-5" />
            Statistika
          </Button>

          <Button 
            onClick={handleAddNote}
            className="w-full h-12 text-base"
            variant="outline"
            size="lg"
          >
            <BookOpen className="mr-2 h-5 w-5" />
            Märkmik
          </Button>

          <Button 
            onClick={handleGoHome}
            className="w-full h-12 text-base"
            variant="outline"
            size="lg"
          >
            <Home className="mr-2 h-5 w-5" />
            Avaleht
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}