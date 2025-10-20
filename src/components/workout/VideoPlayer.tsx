import { Play } from "lucide-react";

interface VideoPlayerProps {
  src: string;
  title?: string;
  className?: string;
}

// Convert various video URLs to embeddable format (YouTube, Vimeo)
function toEmbedUrl(url: string): string {
  if (!url) return "";

  const trimmed = url.trim();

  // Already an embed URL
  if (trimmed.includes("/embed/")) return trimmed;

  // YouTube patterns
  // - Standard watch: https://www.youtube.com/watch?v=VIDEO_ID
  // - Short link:     https://youtu.be/VIDEO_ID
  // - Shorts:         https://www.youtube.com/shorts/VIDEO_ID
  // - Live:           https://www.youtube.com/live/VIDEO_ID
  // - Mobile:         https://m.youtube.com/watch?v=VIDEO_ID
  const ytMatch = trimmed.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/)|youtu\.be\/|m\.youtube\.com\/watch\?v=)([A-Za-z0-9_-]{6,})/
  );
  if (ytMatch && ytMatch[1]) {
    const id = ytMatch[1];
    // Use privacy-enhanced domain to reduce cookies
    return `https://www.youtube-nocookie.com/embed/${id}`;
  }

  // Vimeo: https://vimeo.com/VIDEO_ID -> https://player.vimeo.com/video/VIDEO_ID
  const vimeoMatch = trimmed.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch && vimeoMatch[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  // Fallback to original
  return trimmed;
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
        src={`${embedUrl}${embedUrl.includes("?") ? "&" : "?"}autoplay=0&mute=0&controls=1&rel=0`}
        title={title}
        className="w-full h-full min-h-[240px] lg:min-h-[320px]"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
      />
      <div className="bg-black/70 text-xs text-muted-foreground px-3 py-2">
        Kui video ei kuva, 
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="underline ml-1"
          title="Ava video uues vahelehes"
        >
          ava YouTube'is
        </a>
        .
      </div>
    </div>
  );
}
