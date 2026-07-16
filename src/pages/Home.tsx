// src/pages/Home.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Dumbbell,
  Loader2,
  Target,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProgressTracking } from "@/hooks/useProgressTracking";
import { useOverallPTStats } from "@/hooks/useOverallPTStats";
import { useTrackEvent } from "@/hooks/useTrackEvent";
import { useProgramCalendarState } from "@/hooks/useProgramCalendarState";
import { TrialStatusBanner } from "@/components/TrialStatusBanner";
import { TrialWarningBanner } from "@/components/TrialWarningBanner";
import { GracePeriodBanner } from "@/components/GracePeriodBanner";
import { TrialModal } from "@/components/TrialModal";
import { useTrialStatus } from "@/hooks/useTrialStatus";
import { useTrialPopupManager } from "@/hooks/useTrialPopupManager";

export default function Home() {
  const { status, user } = useAuth();
  const navigate = useNavigate();
  const { streaks } = useProgressTracking();
  const ptStats = useOverallPTStats();
  const { trackButtonClick, trackPageView } = useTrackEvent();
  const {
    program,
    completedDays,
    totalDays,
    hasActiveProgram,
    loading: programLoading,
  } = useProgramCalendarState();
  const trialStatus = useTrialStatus();
  const popupManager = useTrialPopupManager();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (user) {
      trackPageView("home", { user_type: "authenticated" });
    }
  }, [user, trackPageView]);

  useEffect(() => {
    if (!user || trialStatus.loading) return;

    if (trialStatus.isExpired && !trialStatus.isInGracePeriod) {
      const timer = setTimeout(() => {
        navigate("/trial-expired", { replace: true });
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [
    user,
    trialStatus.isExpired,
    trialStatus.isInGracePeriod,
    trialStatus.loading,
    navigate,
  ]);

  const currentStreak = streaks?.current_streak ?? 0;
  const motivationalMessage =
    currentStreak >= 7
      ? "Järjepidevus loob tulemuse. Hoia oma rütmi."
      : currentStreak >= 3
        ? "Hea hoog on sees. Järgmine samm loeb."
        : "Täna on hea päev, et teha üks samm edasi.";
  const fullName = user?.user_metadata?.full_name;
  const firstName = typeof fullName === "string" ? fullName.trim().split(" ")[0] : "";
  const programProgress = totalDays > 0 ? Math.min(100, Math.round((completedDays / totalDays) * 100)) : 0;

  if (status === "loading" || ptStats.loading) {
    return (
      <div className="tt-app-loading">
        <div className="tt-app-loading__inner" role="status" aria-live="polite">
          <div className="tt-app-loading__mark" aria-hidden="true" />
          <p className="tt-app-loading__copy">Laen sinu treeninguruumi…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tt-app-home">
      <div className="tt-app-shell">
        {popupManager.shouldShow && (
          <div className="tt-app-notices">
            {trialStatus.isInGracePeriod && trialStatus.hoursRemainingInGrace !== null && (
              <GracePeriodBanner hoursRemaining={trialStatus.hoursRemainingInGrace} />
            )}

            {!trialStatus.isInGracePeriod &&
              trialStatus.isWarningPeriod &&
              trialStatus.trialEndsAt &&
              trialStatus.daysRemaining !== null && (
                <TrialWarningBanner
                  daysRemaining={trialStatus.daysRemaining}
                  trialEndsAt={trialStatus.trialEndsAt}
                  isUrgent={trialStatus.isUrgent}
                />
              )}

            {!trialStatus.isInGracePeriod &&
              trialStatus.isOnTrial &&
              trialStatus.trialEndsAt &&
              !trialStatus.isWarningPeriod && (
                <TrialStatusBanner
                  trialEndsAt={trialStatus.trialEndsAt}
                  product={trialStatus.product || "staatilistele ja PT"}
                />
              )}
          </div>
        )}

        <TrialModal
          isOpen={popupManager.shouldShow && isMobile}
          onClose={() => popupManager.dismissPopup("close")}
          onDismiss={popupManager.dismissPopup}
          type={
            trialStatus.isInGracePeriod
              ? "grace"
              : trialStatus.isUrgent
                ? "urgent"
                : "warning"
          }
          daysRemaining={trialStatus.daysRemaining || 0}
          hoursRemaining={trialStatus.hoursRemainingInGrace || 0}
          trialEndsAt={trialStatus.trialEndsAt || ""}
          isFirstShow={popupManager.isFirstShow}
        />

        <section className="tt-app-hero" aria-labelledby="dashboard-title">
          <div>
            <p className="tt-app-kicker">Sinu treeninguruum</p>
            <h1 id="dashboard-title" className="tt-app-hero__title">
              {firstName ? `Tere, ${firstName}.` : "Tere tulemast."}
            </h1>
          </div>
          <p className="tt-app-hero__note">{motivationalMessage}</p>
        </section>

        <section className="tt-app-workbench" aria-label="Treeningute ülevaade">
          <article className="tt-app-panel tt-app-panel--ink">
            <header className="tt-app-panel__head">
              <div>
                <p className="tt-app-eyebrow">Personaaltreening</p>
                <h2 className="tt-app-panel__title">Järgmine treening</h2>
                <p className="tt-app-panel__description">
                  {ptStats.lastWorkout
                    ? `Viimane treening ${new Date(ptStats.lastWorkout).toLocaleDateString("et-EE")}`
                    : "Sinu treeningukava on valmis."}
                </p>
              </div>
              <span className="tt-app-panel__icon" aria-hidden="true">
                <Dumbbell size={20} />
              </span>
            </header>

            <div className="tt-app-stats" aria-label="Treeningute statistika">
              <div className="tt-app-stat">
                <span className="tt-app-stat__label">Kogu maht</span>
                <strong className="tt-app-stat__value">{Math.round(ptStats.totalVolumeKg)} kg</strong>
              </div>
              <div className="tt-app-stat">
                <span className="tt-app-stat__label">Keskmine pingutus</span>
                <strong className="tt-app-stat__value">
                  {ptStats.avgRPE > 0 ? ptStats.avgRPE.toFixed(1) : "0"}/10
                </strong>
              </div>
            </div>

            <Link
              to="/programs"
              className="tt-app-button tt-app-button--paper tt-app-button--wide"
              onClick={() => trackButtonClick("continue_pt", "/programs", "progress_card")}
            >
              Ava treeningukava
              <ArrowRight size={17} />
            </Link>
          </article>

          <article className="tt-app-panel">
            <header className="tt-app-panel__head">
              <div>
                <p className="tt-app-eyebrow">Programm</p>
                <h2 className="tt-app-panel__title">Sinu teekond</h2>
              </div>
              <span className="tt-app-panel__icon" aria-hidden="true">
                <Target size={20} />
              </span>
            </header>

            {programLoading ? (
              <div className="tt-app-empty" role="status">
                <Loader2 className="animate-spin" size={22} aria-hidden="true" />
                <p className="tt-app-empty__copy">Laen programmi andmeid…</p>
              </div>
            ) : hasActiveProgram && program ? (
              <>
                <div className="tt-app-program">
                  <div className="tt-app-program__row">
                    <div>
                      <h3 className="tt-app-empty__title">{program.title}</h3>
                      <p className="tt-app-panel__description">{totalDays} päeva programm</p>
                    </div>
                    <span className="tt-app-status">
                      <CheckCircle2 size={13} />
                      Aktiivne
                    </span>
                  </div>

                  <div className="tt-app-progress">
                    <div className="tt-app-progress__row">
                      <span>Edusammud</span>
                      <strong>{completedDays}/{totalDays} päeva</strong>
                    </div>
                    <div
                      className="tt-app-progress__track"
                      role="progressbar"
                      aria-label="Programmi edenemine"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={programProgress}
                    >
                      <div className="tt-app-progress__bar" style={{ width: `${programProgress}%` }} />
                    </div>
                  </div>
                </div>

                <div className="tt-app-actions">
                  <Link
                    to="/programm"
                    className="tt-app-button"
                    onClick={() => trackButtonClick("continue_program", "/programm", "programs_card")}
                  >
                    Jätka programmi
                  </Link>
                  <Link
                    to="/programmid"
                    className="tt-app-button tt-app-button--secondary"
                    onClick={() => trackButtonClick("view_all_programs", "/programmid", "programs_card")}
                  >
                    Vaata kõiki
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div className="tt-app-empty">
                  <h3 className="tt-app-empty__title">Vali oma programm</h3>
                  <p className="tt-app-empty__copy">
                    Programm avaneb päev-päevalt ja aitab sul treeningurütmi hoida.
                  </p>
                </div>
                <Link
                  to="/programmid"
                  className="tt-app-button tt-app-button--wide"
                  onClick={() => trackButtonClick("select_program", "/programmid", "programs_card")}
                >
                  Vali programm
                  <ArrowRight size={17} />
                </Link>
              </>
            )}
          </article>
        </section>

        <section aria-labelledby="quick-actions-title">
          <header className="tt-app-section-head">
            <h2 id="quick-actions-title" className="tt-app-section-head__title">Kiirlingid</h2>
            <span className="tt-app-section-head__label">Tööriistad</span>
          </header>
          <div className="tt-app-quick-grid">
            <Link
              to="/programs/journal"
              className="tt-app-quick-link"
              onClick={() => trackButtonClick("journal", "/programs/journal", "home_quick_actions")}
            >
              <BookOpen size={21} aria-hidden="true" />
              <span className="tt-app-quick-link__label">
                Märkmik
                <ArrowRight size={17} />
              </span>
            </Link>
            <Link
              to="/programs/stats"
              className="tt-app-quick-link"
              onClick={() => trackButtonClick("analytics", "/programs/stats", "home_quick_actions")}
            >
              <BarChart3 size={21} aria-hidden="true" />
              <span className="tt-app-quick-link__label">
                Analüütika
                <ArrowRight size={17} />
              </span>
            </Link>
            <Link
              to="/teenused"
              className="tt-app-quick-link"
              onClick={() => trackButtonClick("teenused", "/teenused", "home_quick_actions")}
            >
              <Target size={21} aria-hidden="true" />
              <span className="tt-app-quick-link__label">
                Teenused
                <ArrowRight size={17} />
              </span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
