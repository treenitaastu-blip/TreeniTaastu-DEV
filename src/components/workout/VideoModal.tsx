// src/components/workout/VideoModal.tsx
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoPlayer } from "./VideoPlayer";

interface VideoModalProps {
  src: string;
  title?: string;
  onClose: () => void;
}

export function VideoModal({ src, title, onClose }: VideoModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="bg-background rounded-2xl shadow-2xl max-w-6xl lg:max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b flex-shrink-0">
          <h3 className="font-semibold text-base sm:text-lg truncate">
            {title || "Harjutuse video"}
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Video Content - Maximize video area */}
        <div className="p-2 sm:p-4 flex-1 flex items-center justify-center min-h-0">
          <div className="w-full max-w-full">
            <VideoPlayer 
              src={src} 
              title={title}
              className="aspect-video w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}