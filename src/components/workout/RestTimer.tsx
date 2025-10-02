// src/components/workout/RestTimer.tsx
import { useEffect, useRef, useState } from "react";

export type RestTimerProps = {
  isOpen: boolean;
  initialSeconds?: number;
  label?: string;
  onClose: () => void;
  onAddSeconds?: (s: number) => void;
  onReset?: (s: number) => void;
  className?: string;
};

export default function RestTimer({
  isOpen,
  initialSeconds = 60,
  label = "Puhkepaus",
  onClose,
  onAddSeconds,
  onReset,
  className = "",
}: RestTimerProps) {
  const [remaining, setRemaining] = useState(initialSeconds);
  const tick = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setRemaining(initialSeconds);
  }, [isOpen, initialSeconds]);

  useEffect(() => {
    if (!isOpen) return;
    tick.current = window.setInterval(() => {
      setRemaining((s) => Math.max(0, s - 1));
    }, 1000);
    return () => {
      if (tick.current) {
        clearInterval(tick.current);
        tick.current = null;
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (remaining === 0 && isOpen) {
      // auto-close? keep simple: just stop ticking
      if (tick.current) {
        clearInterval(tick.current);
        tick.current = null;
      }
    }
  }, [remaining, isOpen]);

  const mm = Math.floor(remaining / 60)
    .toString()
    .padStart(2, "0");
  const ss = (remaining % 60).toString().padStart(2, "0");

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={`fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 ${className}`}
    >
      <div className="w-full max-w-sm rounded-2xl border bg-card p-4 shadow-lg">
        <div className="mb-2 text-sm text-muted-foreground">{label}</div>
        <div className="mb-3 text-center text-4xl font-semibold tabular-nums">
          {mm}:{ss}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
            onClick={() => {
              const next = remaining + 30;
              setRemaining(next);
              onAddSeconds?.(30);
            }}
          >
            +30s
          </button>
          <button
            className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
            onClick={() => {
              setRemaining(initialSeconds);
              onReset?.(initialSeconds);
            }}
          >
            Lähtesta
          </button>
          <button
            className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
            onClick={onClose}
          >
            Sulge
          </button>
        </div>
      </div>
    </div>
  );
}
