import { useState } from "react";
import { Play } from "lucide-react";

interface VideoPlayerProps {
  src: string;
  title?: string;
  className?: string;
}

// Extract YouTube video ID from various URL formats
function extractYouTubeId(url: string): string | null {
  if (!url) return null;

  const trimmed = url.trim();

  // YouTube patterns
  // - Standard watch: https://www.youtube.com/watch?v=VIDEO_ID
  // - Short link:     https://youtu.be/VIDEO_ID
  // - Shorts:         https://www.youtube.com/shorts/VIDEO_ID
  // - Live:           https://www.youtube.com/live/VIDEO_ID
  // - Mobile:         https://m.youtube.com/watch?v=VIDEO_ID
  // - Embed:          https://www.youtube.com/embed/VIDEO_ID
  const ytMatch = trimmed.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/|embed\/)|youtu\.be\/|m\.youtube\.com\/watch\?v=)([A-Za-z0-9_-]{6,})/
  );
  
  return ytMatch && ytMatch[1] ? ytMatch[1] : null;
}

// Convert various video URLs to embeddable format (YouTube, Vimeo)
function toEmbedUrl(url: string): string {
  if (!url) return "";

  const trimmed = url.trim();

  // Already an embed URL
  if (trimmed.includes("/embed/")) return trimmed;

  const ytId = extractYouTubeId(trimmed);
  if (ytId) {
    // Use privacy-enhanced domain to reduce cookies
    return `https://www.youtube-nocookie.com/embed/${ytId}`;
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
  const [isLoaded, setIsLoaded] = useState(false);
  const embedUrl = toEmbedUrl(src);
  const youtubeId = extractYouTubeId(src);

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

  // Get YouTube thumbnail URL (max quality with fallback)
  const getThumbnailUrl = (videoId: string, quality: 'maxresdefault' | 'hqdefault' | 'sddefault' = 'maxresdefault') => {
    return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
  };
  
  const thumbnailUrl = youtubeId ? getThumbnailUrl(youtubeId) : null;

  // Show thumbnail first, load iframe on click
  if (!isLoaded && thumbnailUrl) {
    return (
      <div className={`relative rounded-lg overflow-hidden bg-black cursor-pointer group ${className}`}>
        {/* YouTube Thumbnail */}
        <div 
          className="relative w-full min-h-[240px] lg:min-h-[320px] bg-black flex items-center justify-center"
          onClick={() => setIsLoaded(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsLoaded(true);
            }
          }}
          aria-label={`Play ${title}`}
        >
          <img
            src={thumbnailUrl || undefined}
            alt={`${title} thumbnail`}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              // Fallback to lower quality if maxresdefault fails
              if (youtubeId && e.currentTarget.src.includes('maxresdefault')) {
                e.currentTarget.src = getThumbnailUrl(youtubeId, 'hqdefault');
              } else if (youtubeId && e.currentTarget.src.includes('hqdefault')) {
                e.currentTarget.src = getThumbnailUrl(youtubeId, 'sddefault');
              }
            }}
          />
          {/* Play Button Overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
            <div className="bg-red-600 rounded-full p-4 shadow-2xl transform group-hover:scale-110 transition-transform">
              <Play className="w-8 h-8 text-white fill-white ml-1" />
            </div>
          </div>
          {/* Title overlay on hover */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <p className="text-white text-sm font-medium">{title}</p>
            <p className="text-white/80 text-xs mt-1">Klõpsa videot vaatamiseks</p>
          </div>
        </div>
      </div>
    );
  }

  // Load iframe when user clicks thumbnail or if no thumbnail available
  return (
    <div className={`relative rounded-lg overflow-hidden bg-black ${className}`}>
      <iframe
        src={`${embedUrl}${embedUrl.includes("?") ? "&" : "?"}autoplay=${isLoaded ? '1' : '0'}&mute=0&controls=1&rel=0&modestbranding=1&iv_load_policy=3&fs=1&cc_load_policy=0`}
        title={title}
        className="w-full h-full min-h-[240px] lg:min-h-[320px]"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
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
