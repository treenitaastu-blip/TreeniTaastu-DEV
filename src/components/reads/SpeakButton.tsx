import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface SpeakButtonProps {
  text: string;
  className?: string;
}

export function SpeakButton({ text, className = "" }: SpeakButtonProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleSpeak = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!window.speechSynthesis) {
      toast("Vabandust", {
        description: "Sinu brauser ei toeta kõnesünteesi.",
        icon: <AlertCircle className="w-4 h-4" />
      });
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'et-EE';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => {
      setIsSpeaking(false);
      toast("Viga", {
        description: "Kõnesüntees ebaõnnestus.",
        icon: <AlertCircle className="w-4 h-4" />
      });
    };

    window.speechSynthesis.speak(utterance);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className={`h-8 w-8 p-0 ${className}`}
      onClick={handleSpeak}
      title={isSpeaking ? "Peata ettelugemine" : "Loe ette"}
    >
      {isSpeaking ? (
        <VolumeX className="w-4 h-4 text-primary" />
      ) : (
        <Volume2 className="w-4 h-4 text-muted-foreground hover:text-primary" />
      )}
    </Button>
  );
}