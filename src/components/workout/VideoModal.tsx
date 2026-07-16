import { useEffect } from "react";
import { X } from "lucide-react";
import { VideoPlayer } from "./VideoPlayer";

interface VideoModalProps {
  src: string;
  title?: string;
  onClose: () => void;
}

function isYouTubeShort(url: string): boolean {
  return url.includes("youtube.com/shorts/") || url.includes("/shorts/");
}

export function VideoModal({ src, title, onClose }: VideoModalProps) {
  const isShort = isYouTubeShort(src);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="tt-video-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={`tt-video-dialog${isShort ? " tt-video-dialog--short" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="workout-video-title"
      >
        <header className="tt-video-dialog__head">
          <div>
            <p className="tt-app-eyebrow">Harjutuse juhend</p>
            <h2 id="workout-video-title">{title || "Harjutuse video"}</h2>
          </div>
          <button
            type="button"
            className="tt-video-dialog__close"
            onClick={onClose}
            aria-label="Sulge video"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="tt-video-dialog__content">
          <VideoPlayer
            src={src}
            title={title}
            className={`${isShort ? "aspect-[9/16]" : "aspect-video"} w-full`}
          />
        </div>
      </section>
    </div>
  );
}
