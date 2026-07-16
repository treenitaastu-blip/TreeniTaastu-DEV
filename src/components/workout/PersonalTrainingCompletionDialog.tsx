import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BarChart3, CheckCircle2, Home } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PersonalTrainingCompletionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  programId?: string;
  workoutSummary?: {
    setsCompleted: number;
    duration: number;
  };
}

export default function PersonalTrainingCompletionDialog({
  isOpen,
  onClose,
  programId,
  workoutSummary,
}: PersonalTrainingCompletionDialogProps) {
  const navigate = useNavigate();
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen && pendingNavigation) {
      navigate(pendingNavigation);
      setPendingNavigation(null);
    }
  }, [isOpen, pendingNavigation, navigate]);

  const closeAndNavigate = (path: string) => {
    setPendingNavigation(path);
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="tt-completion-dialog">
        <DialogHeader className="tt-completion-dialog__head">
          <span className="tt-completion-dialog__mark" aria-hidden="true">
            <CheckCircle2 size={30} />
          </span>
          <p className="tt-app-eyebrow">Tänane treening</p>
          <DialogTitle>Tehtud. Hea töö.</DialogTitle>
          <DialogDescription>
            Treening on salvestatud. Järgmisel korral saad jätkata oma kavast.
          </DialogDescription>
        </DialogHeader>

        {workoutSummary ? (
          <dl className="tt-completion-dialog__summary" aria-label="Lõpetatud treeningu kokkuvõte">
            <div>
              <dt>Seeriaid</dt>
              <dd>{workoutSummary.setsCompleted}</dd>
            </div>
            <div>
              <dt>Kestus</dt>
              <dd>{workoutSummary.duration} min</dd>
            </div>
          </dl>
        ) : null}

        <div className="tt-completion-dialog__actions">
          {programId ? (
            <button
              type="button"
              className="tt-app-button tt-app-button--wide"
              onClick={() => closeAndNavigate(`/programs/${programId}`)}
            >
              Tagasi treeningkavasse
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          ) : null}
          <button
            type="button"
            className="tt-completion-dialog__link"
            onClick={() => closeAndNavigate("/programs/stats")}
          >
            <BarChart3 size={17} aria-hidden="true" />
            Vaata statistikat
          </button>
          <button
            type="button"
            className="tt-completion-dialog__link"
            onClick={() => closeAndNavigate("/home")}
          >
            <Home size={17} aria-hidden="true" />
            Avalehele
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
