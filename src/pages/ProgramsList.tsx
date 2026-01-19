// src/pages/ProgramsList.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw, ArrowRight, BarChart3, BookOpen, Target, Edit, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import useAccess from "@/hooks/useAccess";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type UUID = string;

// Narrow to the columns we read from client_programs
type ProgramRow = Pick<
  Database["public"]["Tables"]["client_programs"]["Row"],
  "id" | "assigned_to" | "start_date" | "is_active" | "title_override" | "inserted_at" | "template_id"
> & {
  templates?: { title: string } | null;
};

type ShapedProgram = {
  id: UUID;
  title: string;
  start: string;
  status: "Aktiivne" | "Mitteaktiivne";
  isActive: boolean;
  created: string;
};

function fmtDate(d: string | null): string {
  if (!d) return "—";
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString("et-EE");
}

export default function ProgramsList() {
  const { user } = useAuth();
  const { canStatic, canPT, loading: accessLoading } = useAccess();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ProgramRow[]>([]);
  const firstLoadRef = useRef(true);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setError(null);

    setReloading(!firstLoadRef.current);
    setLoading(true);

    try {
      const { data, error: err } = await supabase
        .from("client_programs")
        .select("id, assigned_to, start_date, is_active, title_override, inserted_at, template_id, templates:template_id(title)")
        .eq("assigned_to", user.id)
        .not("assigned_to", "is", null) // Ensure assigned_to is not null
        .order("inserted_at", { ascending: false })
        .limit(100)
        .returns<ProgramRow[]>();

      if (err) throw err;
      
      // Filter out inactive programs client-side (is_active = false)
      // Keep programs where is_active is true or null (null is treated as active)
      const activePrograms = (data ?? []).filter(p => p.is_active !== false);
      setRows(activePrograms);
    } catch (e) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message?: unknown }).message)
          : "Viga programmide laadimisel.";
      setError(msg);
    } finally {
      setLoading(false);
      setReloading(false);
      firstLoadRef.current = false;
    }
  }, [user]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  const handleSaveTitle = async (programId: string, newTitle: string, originalTitle: string) => {
    try {
      const { error } = await supabase
        .from('client_programs')
        .update({ title_override: newTitle.trim() || null })
        .eq('id', programId)
        .eq('assigned_to', user!.id);

      if (error) throw error;

      // Update local state
      setRows(prev => prev.map(r => 
        r.id === programId 
          ? { ...r, title_override: newTitle.trim() || null }
          : r
      ));

      toast({
        title: "Nimetus muudetud",
        description: "Programmi nimetus on edukalt muudetud",
      });

      setEditingTitleId(null);
      setEditingTitle("");
    } catch (error) {
      console.error("Error updating title:", error);
      toast({
        title: "Viga",
        description: "Nimetuse muutmine ebaõnnestus",
        variant: "destructive",
      });
    }
  };

  const shaped: ShapedProgram[] = useMemo(() => {
    return rows.map((r) => {
      const isActive = r.is_active !== false; // treat null as active
      return {
        id: r.id as UUID,
        title: r.title_override || r.templates?.title || "Isiklik programm",
        start: fmtDate(r.start_date),
        status: isActive ? "Aktiivne" : "Mitteaktiivne",
        isActive,
        created: fmtDate(r.inserted_at),
      };
    });
  }, [rows]);

  // Determine user status and access logic
  const isTrialUser = !canStatic && !canPT; // No paid access
  const isPaidUser = canStatic || canPT; // Has paid access
  const hasAssignedPrograms = rows.length > 0;
  const shouldShowUpgradePrompt = isTrialUser && !hasAssignedPrograms;

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl p-4 md:p-6">
        <div className="rounded-2xl border bg-card shadow-soft p-6 md:p-8 text-center">
          <div className="text-lg font-medium mb-2">Logi sisse</div>
          <p className="text-muted-foreground">Logi sisse, et näha oma programme.</p>
        </div>
      </div>
    );
  }

  if (loading || accessLoading) {
    return (
      <div className="mx-auto max-w-6xl p-4 md:p-6">
        <div className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
          <div className="flex items-center gap-3">
            <div className="h-9 w-32 animate-pulse rounded-lg bg-muted" />
            <div className="h-9 w-24 animate-pulse rounded-lg bg-muted" />
          </div>
        </div>
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border bg-card shadow-soft p-6 space-y-4">
              <div className="h-6 w-3/4 animate-pulse rounded-md bg-muted" />
              <div className="space-y-2">
                <div className="h-3 w-full animate-pulse rounded bg-muted" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-9 w-20 animate-pulse rounded-lg bg-muted ml-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl p-4 md:p-6">
        <div className="rounded-2xl border-destructive/20 bg-destructive/5 shadow-soft p-6 md:p-8 text-center">
          <div className="text-lg font-medium text-destructive mb-3">Viga laadimisel</div>
          <p className="text-destructive/80 mb-6">{error}</p>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 rounded-lg bg-destructive text-destructive-foreground px-4 py-2 text-sm font-medium hover:bg-destructive/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-destructive transition-colors"
            aria-busy={reloading}
            disabled={reloading}
          >
            <RefreshCw className={`h-4 w-4 ${reloading ? "animate-spin" : ""}`} />
            Proovi uuesti
          </button>
        </div>
      </div>
    );
  }

  // Show upgrade prompt for trial users without assigned programs
  if (shouldShowUpgradePrompt) {
    return (
      <div className="mx-auto max-w-6xl p-4 md:p-6">
        <header className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Minu programmid</h1>
            <p className="text-sm text-muted-foreground mt-1">Vaata ja jätka oma isiklikke programme</p>
          </div>
        </header>

        <div className="rounded-2xl border bg-card shadow-soft p-6 md:p-8 text-center">
          <div className="text-xl font-semibold mb-3">Pole programme</div>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Hetkel pole sulle ühtegi isiklikku programmi määratud. Tasuta tellijana saad vaadata staatilisi programme või tellida isiklikku programmi teenuste kaudu.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link
              to="/programm"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-6 py-3 text-sm font-medium hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors"
            >
              <Target className="h-4 w-4" />
              Vaata staatilisi programme
            </Link>
            <Link
              to="/teenused"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-secondary text-secondary-foreground px-6 py-3 text-sm font-medium hover:bg-secondary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary transition-colors"
            >
              <BookOpen className="h-4 w-4" />
              Vaata teenuseid
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-6">
      <header className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Minu programmid</h1>
          <p className="text-sm text-muted-foreground mt-1">Vaata ja jätka oma isiklikke programme</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Link
            to="/programs/journal"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-secondary text-secondary-foreground px-4 py-2.5 text-sm font-medium hover:bg-secondary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary transition-colors"
          >
            <BookOpen className="h-4 w-4" />
            Märkmik
          </Link>
          <Link
            to="/programs/stats"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors"
          >
            <BarChart3 className="h-4 w-4" />
            Minu statistika
          </Link>
          <button
            onClick={load}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
            aria-busy={reloading}
            title="Värskenda programme"
            disabled={reloading}
          >
            <RefreshCw className={`h-4 w-4 ${reloading ? "animate-spin" : ""}`} />
            Värskenda
          </button>
        </div>
      </header>

      {shaped.length === 0 ? (
        <div className="rounded-2xl border bg-card shadow-soft p-6 md:p-8 text-center">
          <div className="text-xl font-semibold mb-3">Pole programme</div>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            {isTrialUser 
              ? "Hetkel pole sulle ühtegi isiklikku programmi määratud. Tasuta tellijana saad vaadata staatilisi programme või tellida isiklikku programmi teenuste kaudu."
              : "Hetkel pole sulle ühtegi isiklikku programmi määratud. Võta ühendust oma treeneriga või vaata meie teenuseid, et tellida endale isiklik treeningprogramm."
            }
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            {isTrialUser ? (
              <>
                <Link
                  to="/programm"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-6 py-3 text-sm font-medium hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors"
                >
                  <Target className="h-4 w-4" />
                  Vaata staatilisi programme
                </Link>
                <Link
                  to="/teenused"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-secondary text-secondary-foreground px-6 py-3 text-sm font-medium hover:bg-secondary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary transition-colors"
                >
                  <BookOpen className="h-4 w-4" />
                  Vaata teenuseid
                </Link>
              </>
            ) : (
              <Link
                to="/teenused"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-6 py-3 text-sm font-medium hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors"
              >
                <Target className="h-4 w-4" />
                Vaata teenuseid
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3" role="list">
          {shaped.map((p) => (
            <article
              key={p.id}
              className="group rounded-2xl border bg-card shadow-soft hover:shadow-md p-6 transition-all duration-200 hover:border-primary/20 focus-within:ring-2 focus-within:ring-primary/20"
              role="listitem"
            >
              <div className="flex flex-col h-full">
                <div className="flex-1 space-y-3">
                  {editingTitleId === p.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const row = rows.find(r => r.id === p.id);
                            handleSaveTitle(p.id, editingTitle, row?.title_override || row?.templates?.title || "");
                          } else if (e.key === 'Escape') {
                            setEditingTitleId(null);
                            setEditingTitle("");
                          }
                        }}
                        autoFocus
                        className="h-9"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const row = rows.find(r => r.id === p.id);
                          handleSaveTitle(p.id, editingTitle, row?.title_override || row?.templates?.title || "");
                        }}
                        className="h-9 w-9 p-0"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingTitleId(null);
                          setEditingTitle("");
                        }}
                        className="h-9 w-9 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group/title">
                      <h3 
                        className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors cursor-pointer"
                        onClick={() => {
                          const row = rows.find(r => r.id === p.id);
                          setEditingTitleId(p.id);
                          setEditingTitle(row?.title_override || "");
                        }}
                      >
                        {p.title}
                      </h3>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const row = rows.find(r => r.id === p.id);
                          setEditingTitleId(p.id);
                          setEditingTitle(row?.title_override || "");
                        }}
                        className="h-6 w-6 p-0 opacity-0 group-hover/title:opacity-100 transition-opacity"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  <div className="space-y-1.5 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Algus:</span>
                      <span>{p.start}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Staatus:</span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          p.isActive
                            ? "bg-success/10 text-success border border-success/20"
                            : "bg-muted text-muted-foreground border border-border"
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Lisatud:</span>
                      <span>{p.created}</span>
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t border-border/50 mt-4">
                  <Link
                    to={`/programs/${p.id}`}
                    className="inline-flex items-center justify-center w-full gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors"
                    aria-label={`Ava programm: ${p.title}`}
                  >
                    Ava programm
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}