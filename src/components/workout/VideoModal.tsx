// src/components/workout/VideoModal.tsx
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoPlayer } from "./VideoPlayer";

interface VideoModalProps {
  src: string;
  title?: string;
  onClose: () => void;
}

// Detect if URL is a YouTube Short
function isYouTubeShort(url: string): boolean {
  return url.includes('youtube.com/shorts/') || url.includes('/shorts/');
}

export function VideoModal({ src, title, onClose }: VideoModalProps) {
  const isShort = isYouTubeShort(src);
  
  // For shorts: use 9:16 aspect ratio, narrower max-width
  // For regular videos: use 16:9 aspect ratio, wider max-width
  const maxWidth = isShort ? 'max-w-md' : 'max-w-6xl lg:max-w-7xl';
  const aspectClass = isShort ? 'aspect-[9/16]' : 'aspect-video';
  
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className={`bg-background rounded-2xl shadow-2xl ${maxWidth} w-full max-h-[95vh] overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between p-2 sm:p-3 border-b flex-shrink-0">
          <h3 className="font-semibold text-sm sm:text-base truncate">
            {title || "Harjutuse video"}
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Video Content - Optimized for shorts (9:16) or regular (16:9) */}
        <div className={`${isShort ? 'p-2' : 'p-2 sm:p-4'} flex-1 flex items-center justify-center min-h-0`}>
          <div className="w-full max-w-full h-full flex items-center justify-center">
            <VideoPlayer 
              src={src} 
              title={title}
              className={`${aspectClass} w-full ${isShort ? 'max-h-[85vh]' : ''}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}