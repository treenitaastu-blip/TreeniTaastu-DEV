import { Play } from "lucide-react";

interface VideoPlayerProps {
  src: string;
  title?: string;
  className?: string;
}

// Convert YouTube URLs to embeddable format
function toEmbedUrl(url: string): string {
  if (!url) return "";

  // YouTube watch URL
  if (url.includes("youtube.com/watch?v=")) {
    const videoId = url.split("v=")[1]?.split("&")[0];
    return `https://www.youtube.com/embed/${videoId}`;
  }

  // YouTube short URL
  if (url.includes("youtu.be/")) {
    const videoId = url.split("youtu.be/")[1]?.split("?")[0];
    return `https://www.youtube.com/embed/${videoId}`;
  }

  // Already embedded or other video
  return url;
}

export function VideoPlayer({
  src,
  title = "Exercise Video",
  className = "",
}: VideoPlayerProps) {
  const embedUrl = toEmbedUrl(src);

  if (!embedUrl) {
    return (
      <div
        className={`bg-muted rounded-lg flex items-center justify-center min-h-[240px] ${className}`}
      >
        <div className="text-center text-muted-foreground">
          <Play className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Video not available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative rounded-lg overflow-hidden bg-black ${className}`}>
      <iframe
        src={`${embedUrl}?autoplay=0&mute=0&controls=1&rel=0`}
        title={title}
        className="w-full h-full min-h-[240px] lg:min-h-[320px]"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
}
