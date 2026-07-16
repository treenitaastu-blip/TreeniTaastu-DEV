import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  Check,
  Dumbbell,
  Edit3,
  Loader2,
  RefreshCw,
  Target,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type ProgramRow = Pick<
  Database["public"]["Tables"]["client_programs"]["Row"],
  "id" | "assigned_to" | "start_date" | "is_active" | "title_override" | "inserted_at" | "template_id"
> & {
  templates?: { title: string } | null;
};

type ShapedProgram = {
  id: string;
  title: string;
  start: string;
  status: "Aktiivne" | "Mitteaktiivne";
  isActive: boolean;
  created: string;
};

function fmtDate(date: string | null): string {
  if (!date) return "—";
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString("et-EE");
}

export default function ProgramsList() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ProgramRow[]>([]);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [savingTitleId, setSavingTitleId] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const load = useCallback(async () => {
    if (!user) {
      setRows([]);
      setLoading(false);
      return;
    }

    const isInitialLoad = !hasLoadedRef.current;
    setError(null);
    if (isInitialLoad) setLoading(true);
    else setReloading(true);

    try {
      const { data, error: queryError } = await supabase
        .from("client_programs")
        .select(
          "id, assigned_to, start_date, is_active, title_override, inserted_at, template_id, templates:template_id(title)",
        )
        .eq("assigned_to", user.id)
        .order("inserted_at", { ascending: false })
        .limit(100)
        .returns<ProgramRow[]>();

      if (queryError) throw queryError;

      setRows((data ?? []).filter((program) => program.is_active !== false));
    } catch (loadError) {
      console.error("Programmide laadimine ebaõnnestus:", loadError);
      setError("Programme ei õnnestunud laadida. Palun proovi uuesti.");
    } finally {
      setLoading(false);
      setReloading(false);
      hasLoadedRef.current = true;
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const shapedPrograms = useMemo<ShapedProgram[]>(
    () =>
      rows.map((row) => {
        const isActive = row.is_active !== false;
        return {
          id: row.id,
          title: row.title_override || row.templates?.title || "Isiklik programm",
          start: fmtDate(row.start_date),
          status: isActive ? "Aktiivne" : "Mitteaktiivne",
          isActive,
          created: fmtDate(row.inserted_at),
        };
      }),
    [rows],
  );

  const startEditingTitle = (program: ShapedProgram) => {
    setEditingTitleId(program.id);
    setEditingTitle(program.title);
  };

  const cancelEditingTitle = () => {
    if (savingTitleId) return;
    setEditingTitleId(null);
    setEditingTitle("");
  };

  const saveTitle = async (programId: string) => {
    if (!user || savingTitleId) return;

    const titleOverride = editingTitle.trim() || null;
    setSavingTitleId(programId);

    try {
      const { error: updateError } = await supabase
        .from("client_programs")
        .update({ title_override: titleOverride })
        .eq("id", programId)
        .eq("assigned_to", user.id);

      if (updateError) throw updateError;

      setRows((currentRows) =>
        currentRows.map((row) => (row.id === programId ? { ...row, title_override: titleOverride } : row)),
      );
      setEditingTitleId(null);
      setEditingTitle("");
      toast({
        title: "Nimetus muudetud",
        description: "Programmi uus nimetus on salvestatud.",
      });
    } catch (updateError) {
      console.error("Programmi nimetuse muutmine ebaõnnestus:", updateError);
      toast({
        title: "Nimetust ei saanud muuta",
        description: "Palun proovi hetke pärast uuesti.",
        variant: "destructive",
      });
    } finally {
      setSavingTitleId(null);
    }
  };

  const handleTitleSubmit = (event: FormEvent<HTMLFormElement>, programId: string) => {
    event.preventDefault();
    void saveTitle(programId);
  };

  return (
    <div className="tt-app-home tt-programs-page">
      <main className="tt-app-shell">
        <section className="tt-app-hero" aria-labelledby="programs-title">
          <div>
            <p className="tt-app-kicker">Sinu treeninguruum</p>
            <h1 id="programs-title" className="tt-app-hero__title">
              Minu programmid.
            </h1>
          </div>
          <p className="tt-app-hero__note">
            Kõik treeneri koostatud kavad ühes kohas. Ava programm ja jätka täpselt sealt, kus pooleli jäid.
          </p>
        </section>

        <section aria-labelledby="program-tools-title">
          <header className="tt-app-section-head">
            <h2 id="program-tools-title" className="tt-app-section-head__title">
              Tööriistad
            </h2>
            <span className="tt-app-section-head__label">Treeningu tugi</span>
          </header>
          <div className="tt-app-quick-grid tt-programs-tools">
            <Link to="/programs/journal" className="tt-app-quick-link">
              <BookOpen size={21} aria-hidden="true" />
              <span className="tt-app-quick-link__label">
                Märkmik
                <ArrowRight size={17} aria-hidden="true" />
              </span>
            </Link>
            <Link to="/programs/stats" className="tt-app-quick-link">
              <BarChart3 size={21} aria-hidden="true" />
              <span className="tt-app-quick-link__label">
                Minu statistika
                <ArrowRight size={17} aria-hidden="true" />
              </span>
            </Link>
            <button
              type="button"
              className="tt-app-quick-link tt-programs-tool-button"
              onClick={() => void load()}
              disabled={loading || reloading}
              aria-busy={reloading}
            >
              <RefreshCw className={reloading ? "animate-spin" : ""} size={21} aria-hidden="true" />
              <span className="tt-app-quick-link__label">
                {reloading ? "Värskendan…" : "Värskenda"}
                <ArrowRight size={17} aria-hidden="true" />
              </span>
            </button>
          </div>
        </section>

        <section className="tt-programs-section" aria-labelledby="assigned-programs-title">
          <header className="tt-app-section-head tt-programs-section__head">
            <h2 id="assigned-programs-title" className="tt-app-section-head__title">
              Sulle määratud
            </h2>
            {!loading && !error ? (
              <span className="tt-programs-count">
                {shapedPrograms.length} {shapedPrograms.length === 1 ? "programm" : "programmi"}
              </span>
            ) : null}
          </header>

          {loading ? (
            <div className="tt-programs-skeleton" role="status" aria-label="Programmide laadimine">
              <div className="tt-programs-skeleton__line tt-programs-skeleton__line--short" />
              <div className="tt-programs-skeleton__line tt-programs-skeleton__line--title" />
              <div className="tt-programs-skeleton__line" />
              <span className="sr-only">Laen programme…</span>
            </div>
          ) : error ? (
            <div className="tt-programs-empty" role="alert">
              <span className="tt-programs-empty__icon" aria-hidden="true">
                <RefreshCw size={22} />
              </span>
              <div>
                <h3 className="tt-app-empty__title">Programme ei saanud laadida</h3>
                <p className="tt-app-empty__copy">{error}</p>
                <button
                  type="button"
                  className="tt-app-button tt-programs-empty__button"
                  onClick={() => void load()}
                  disabled={reloading}
                >
                  <RefreshCw className={reloading ? "animate-spin" : ""} size={17} aria-hidden="true" />
                  Proovi uuesti
                </button>
              </div>
            </div>
          ) : shapedPrograms.length === 0 ? (
            <div className="tt-programs-empty">
              <span className="tt-programs-empty__icon" aria-hidden="true">
                <Target size={23} />
              </span>
              <div>
                <h3 className="tt-app-empty__title">Praegu pole sulle programmi määratud</h3>
                <p className="tt-app-empty__copy">
                  Kui treener kava määrab, ilmub see siia automaatselt. Seni saad vaadata teisi teenuseid.
                </p>
                <Link to="/teenused" className="tt-app-button tt-programs-empty__button">
                  Vaata teenuseid
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="tt-programs-list" role="list">
              {shapedPrograms.map((program) => (
                <article key={program.id} className="tt-program-card" role="listitem">
                  <header className="tt-program-card__head">
                    <div className="tt-program-card__title-block">
                      <p className="tt-app-eyebrow">Personaaltreening</p>
                      {editingTitleId === program.id ? (
                        <form
                          className="tt-program-card__edit"
                          onSubmit={(event) => handleTitleSubmit(event, program.id)}
                        >
                          <label className="sr-only" htmlFor={`program-title-${program.id}`}>
                            Programmi nimetus
                          </label>
                          <input
                            id={`program-title-${program.id}`}
                            value={editingTitle}
                            onChange={(event) => setEditingTitle(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Escape") cancelEditingTitle();
                            }}
                            className="tt-program-card__input"
                            maxLength={120}
                            autoFocus
                            disabled={savingTitleId === program.id}
                          />
                          <button
                            type="submit"
                            className="tt-program-card__icon-button"
                            aria-label="Salvesta nimetus"
                            disabled={savingTitleId === program.id}
                          >
                            {savingTitleId === program.id ? (
                              <Loader2 className="animate-spin" size={17} aria-hidden="true" />
                            ) : (
                              <Check size={17} aria-hidden="true" />
                            )}
                          </button>
                          <button
                            type="button"
                            className="tt-program-card__icon-button"
                            onClick={cancelEditingTitle}
                            aria-label="Tühista nimetuse muutmine"
                            disabled={savingTitleId === program.id}
                          >
                            <X size={17} aria-hidden="true" />
                          </button>
                        </form>
                      ) : (
                        <button
                          type="button"
                          className="tt-program-card__title-button"
                          onClick={() => startEditingTitle(program)}
                          aria-label={`Muuda programmi „${program.title}” nimetust`}
                        >
                          <span>{program.title}</span>
                          <Edit3 size={17} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                    <span className={`tt-app-status${program.isActive ? " is-active" : ""}`}>
                      <span className="tt-program-card__status-dot" aria-hidden="true" />
                      {program.status}
                    </span>
                  </header>

                  <dl className="tt-program-card__meta">
                    <div>
                      <dt>
                        <CalendarDays size={16} aria-hidden="true" />
                        Programmi algus
                      </dt>
                      <dd>{program.start}</dd>
                    </div>
                    <div>
                      <dt>
                        <Dumbbell size={16} aria-hidden="true" />
                        Lisatud
                      </dt>
                      <dd>{program.created}</dd>
                    </div>
                  </dl>

                  <footer className="tt-program-card__footer">
                    <div>
                      <p className="tt-app-eyebrow">Järgmine samm</p>
                      <p className="tt-program-card__footer-copy">Ava kava ja jätka oma treeningut.</p>
                    </div>
                    <Link
                      to={`/programs/${program.id}`}
                      className="tt-app-button tt-app-button--paper tt-app-button--wide"
                      aria-label={`Ava programm: ${program.title}`}
                    >
                      Ava programm
                      <ArrowRight size={17} aria-hidden="true" />
                    </Link>
                  </footer>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
