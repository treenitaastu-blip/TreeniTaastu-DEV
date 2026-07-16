import { FormEvent, useState } from "react";
import { Activity, AlertCircle, BatteryMedium, Check, Loader2, MessageSquareText, X } from "lucide-react";

export type WorkoutFeedbackValue = {
  joint_pain: boolean;
  joint_pain_location?: string;
  fatigue_level: number;
  energy_level: "low" | "normal" | "high";
  notes?: string;
};

interface WorkoutFeedbackProps {
  workoutSummary?: {
    setsCompleted: number;
    totalReps: number;
    totalWeight: number;
    duration: number;
  };
  onComplete: (feedback: WorkoutFeedbackValue) => Promise<void> | void;
  onSkip?: () => void;
}

const energyOptions: Array<{
  value: WorkoutFeedbackValue["energy_level"];
  label: string;
  description: string;
}> = [
  { value: "low", label: "Madal", description: "Jõudu oli vähe" },
  { value: "normal", label: "Hea", description: "Tavapärane energia" },
  { value: "high", label: "Kõrge", description: "Jõudu jäi üle" },
];

export default function WorkoutFeedback({ workoutSummary, onComplete, onSkip }: WorkoutFeedbackProps) {
  const [rpe, setRpe] = useState<number | null>(null);
  const [energy, setEnergy] = useState<WorkoutFeedbackValue["energy_level"] | null>(null);
  const [jointPain, setJointPain] = useState<boolean | null>(null);
  const [jointPainLocation, setJointPainLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isComplete = rpe !== null && energy !== null && jointPain !== null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isComplete || isSubmitting) return;

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await onComplete({
        joint_pain: jointPain,
        joint_pain_location: jointPain && jointPainLocation.trim()
          ? jointPainLocation.trim()
          : undefined,
        fatigue_level: rpe,
        energy_level: energy,
        notes: notes.trim() || undefined,
      });
    } catch {
      setSubmitError("Tagasiside ei salvestunud. Kontrolli ühendust ja proovi uuesti.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="tt-feedback-overlay" role="presentation">
      <section
        className="tt-feedback-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="workout-feedback-title"
        aria-describedby="workout-feedback-description"
      >
        <header className="tt-feedback-dialog__head">
          <div>
            <p className="tt-app-eyebrow">Treening lõpetatud</p>
            <h2 id="workout-feedback-title">Kuidas treening läks?</h2>
            <p id="workout-feedback-description">
              Sinu vastused aitavad treeneril järgmisi treeninguid paremini kohandada.
            </p>
          </div>
          {onSkip ? (
            <button
              type="button"
              className="tt-feedback-dialog__close"
              onClick={onSkip}
              aria-label="Jäta tagasiside vahele"
              disabled={isSubmitting}
            >
              <X size={19} aria-hidden="true" />
            </button>
          ) : null}
        </header>

        {workoutSummary ? (
          <dl className="tt-feedback-summary" aria-label="Treeningu kokkuvõte">
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

        <form className="tt-feedback-form" onSubmit={handleSubmit}>
          <fieldset className="tt-feedback-fieldset">
            <legend>
              <Activity size={17} aria-hidden="true" />
              Kui raske treening tundus?
            </legend>
            <p className="tt-feedback-help">1 on väga kerge, 10 maksimaalne pingutus.</p>
            <div className="tt-feedback-rpe" role="group" aria-label="Pingutuse hinnang ühest kümneni">
              {Array.from({ length: 10 }, (_, index) => {
                const value = index + 1;
                return (
                  <button
                    key={value}
                    type="button"
                    className={rpe === value ? "is-selected" : undefined}
                    onClick={() => setRpe(value)}
                    aria-pressed={rpe === value}
                    disabled={isSubmitting}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="tt-feedback-fieldset">
            <legend>
              <BatteryMedium size={17} aria-hidden="true" />
              Kui palju energiat sul oli?
            </legend>
            <div className="tt-feedback-options tt-feedback-options--three">
              {energyOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={energy === option.value ? "is-selected" : undefined}
                  onClick={() => setEnergy(option.value)}
                  aria-pressed={energy === option.value}
                  disabled={isSubmitting}
                >
                  <strong>{option.label}</strong>
                  <span>{option.description}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="tt-feedback-fieldset">
            <legend>
              <AlertCircle size={17} aria-hidden="true" />
              Kas tundsid liigesevalu?
            </legend>
            <div className="tt-feedback-options tt-feedback-options--two">
              <button
                type="button"
                className={jointPain === false ? "is-selected" : undefined}
                onClick={() => {
                  setJointPain(false);
                  setJointPainLocation("");
                }}
                aria-pressed={jointPain === false}
                disabled={isSubmitting}
              >
                <strong>Ei tundnud</strong>
                <span>Kõik oli korras</span>
              </button>
              <button
                type="button"
                className={jointPain === true ? "is-selected is-warning" : undefined}
                onClick={() => setJointPain(true)}
                aria-pressed={jointPain === true}
                disabled={isSubmitting}
              >
                <strong>Jah, tundsin</strong>
                <span>Lisan asukoha</span>
              </button>
            </div>
            {jointPain ? (
              <label className="tt-feedback-label">
                Kus valu tundsid?
                <input
                  value={jointPainLocation}
                  onChange={(event) => setJointPainLocation(event.target.value)}
                  placeholder="Näiteks parem põlv või õlg"
                  maxLength={160}
                  disabled={isSubmitting}
                />
              </label>
            ) : null}
          </fieldset>

          <label className="tt-feedback-label">
            <span>
              <MessageSquareText size={17} aria-hidden="true" />
              Märkus treenerile <small>valikuline</small>
            </span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Mis tundus hästi või mida võiks järgmine kord muuta?"
              rows={3}
              maxLength={1000}
              disabled={isSubmitting}
            />
          </label>

          {submitError ? (
            <p className="tt-feedback-error" role="alert">
              <AlertCircle size={17} aria-hidden="true" />
              {submitError}
            </p>
          ) : null}

          <footer className="tt-feedback-actions">
            <button
              type="submit"
              className="tt-app-button tt-app-button--wide"
              disabled={!isComplete || isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin" size={17} aria-hidden="true" />
              ) : (
                <Check size={17} aria-hidden="true" />
              )}
              {isSubmitting ? "Salvestan…" : "Salvesta tagasiside"}
            </button>
            {onSkip ? (
              <button
                type="button"
                className="tt-feedback-skip"
                onClick={onSkip}
                disabled={isSubmitting}
              >
                Jäta seekord vahele
              </button>
            ) : null}
          </footer>
        </form>
      </section>
    </div>
  );
}
