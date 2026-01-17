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
    navigate("/programs/stats");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm bg-white border-0 shadow-2xl">
        <DialogHeader className="text-center pb-6">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-black">
            <CheckCircle className="h-10 w-10 text-white" />
          </div>
          <DialogTitle className="text-2xl font-bold text-black">
            Treening lõpetatud!
          </DialogTitle>
          <DialogDescription className="text-gray-600 text-base">
            Hästi tehtud!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pb-6">
          <Button 
            onClick={handleViewStats}
            className="w-full h-16 bg-black hover:bg-gray-800 text-white text-lg font-medium rounded-xl border-0"
            variant="default"
          >
            <BarChart3 className="mr-3 h-6 w-6" />
            Statistika
          </Button>

          <Button 
            onClick={handleAddNote}
            className="w-full h-16 bg-white hover:bg-gray-50 text-black text-lg font-medium rounded-xl border-2 border-black"
            variant="outline"
          >
            <BookOpen className="mr-3 h-6 w-6" />
            Märkmik
          </Button>

          <Button 
            onClick={handleGoHome}
            className="w-full h-16 bg-white hover:bg-gray-50 text-black text-lg font-medium rounded-xl border-2 border-black"
            variant="outline"
          >
            <Home className="mr-3 h-6 w-6" />
            Avaleht
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}