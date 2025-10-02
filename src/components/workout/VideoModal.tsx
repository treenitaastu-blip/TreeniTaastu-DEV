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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-background rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-lg truncate">
            {title || "Harjutuse video"}
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Video Content */}
        <div className="p-4">
          <VideoPlayer 
            src={src} 
            title={title}
            className="aspect-video"
          />
        </div>
      </div>
    </div>
  );
}