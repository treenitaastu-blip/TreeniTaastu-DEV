import { useEffect, useState } from "react";
import { AlertCircle, Loader2, Target } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface RIRDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rir: number) => Promise<void> | void;
  exerciseName: string;
  initialValue?: number;
}

export default function RIRDialog({
  isOpen,
  onClose,
  onSave,
  exerciseName,
  initialValue,
}: RIRDialogProps) {
  const [rir, setRir] = useState<number | null>(initialValue ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setRir(initialValue ?? null);
      setSaveError(null);
    }
  }, [isOpen, initialValue]);

  const handleSave = async () => {
    if (rir === null || isSaving) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      await onSave(rir);
      setIsSaving(false);
      onClose();
    } catch {
      setSaveError("RIR ei salvestunud. Proovi uuesti.");
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isSaving) onClose();
      }}
    >
      <DialogContent className="tt-rir-dialog">
        <DialogHeader className="tt-rir-dialog__head">
          <span className="tt-rir-dialog__mark" aria-hidden="true">
            <Target size={22} />
          </span>
          <p className="tt-app-eyebrow">Harjutuse tagasiside</p>
          <DialogTitle>{exerciseName}</DialogTitle>
          <DialogDescription>
            Mitu korrektset kordust oleksid suutnud veel teha?
          </DialogDescription>
        </DialogHeader>

        <div className="tt-rir-dialog__body">
          <div className="tt-rir-options" role="group" aria-label="Varusse jäänud kordused">
            {[0, 1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                className={rir === value ? "is-selected" : undefined}
                onClick={() => setRir(value)}
                aria-pressed={rir === value}
                disabled={isSaving}
              >
                {value === 5 ? "5+" : value}
              </button>
            ))}
          </div>

          <div className="tt-rir-dialog__scale">
            <span><strong>0</strong> Rohkem ei oleks saanud</span>
            <span><strong>2–3</strong> Hea töövahemik</span>
            <span><strong>5+</strong> Raskust jäi palju varuks</span>
          </div>

          {saveError ? (
            <p className="tt-feedback-error" role="alert">
              <AlertCircle size={17} aria-hidden="true" />
              {saveError}
            </p>
          ) : null}

          <div className="tt-rir-dialog__actions">
            <button type="button" className="tt-feedback-skip" onClick={onClose} disabled={isSaving}>
              Jäta vahele
            </button>
            <button
              type="button"
              className="tt-app-button"
              onClick={handleSave}
              disabled={rir === null || isSaving}
            >
              {isSaving ? <Loader2 className="animate-spin" size={17} aria-hidden="true" /> : null}
              {isSaving ? "Salvestan…" : "Salvesta RIR"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
