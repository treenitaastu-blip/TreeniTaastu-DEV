import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTrackEvent } from "@/hooks/useTrackEvent";
import { handleTemplateAccessError, isPermissionError } from "@/utils/errorHandling";
import { useConfirmationDialog, ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { 
  getClientProgramsOptimized, 
  getTemplatesOptimized, 
  getUsersOptimized, 
  getPTStatsOptimized,
  clearPTCache 
} from "@/utils/optimizedQueries";
import { 
  Users, 
  TrendingUp, 
  Activity,
  MoreHorizontal,
  Edit,
  Trash2,
  UserCheck,
  Send,
  UserPlus,
  UserMinus,
  Target,
  Check,
  X,
  AlertTriangle
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import EnhancedProgramCreator, {
  PROGRAM_DRAFT_STORAGE_KEY,
} from "@/components/admin/EnhancedProgramCreator";
import PTAccessValidator from "@/components/PTAccessValidator";

type UUID = string;

type ProgramStats = {
  totalPrograms: number;
  activePrograms: number;
  totalClients: number;
  completedSessions: number;
};

type ClientProgram = {
  id: UUID | null;
  title_override: string | null;
  start_date: string | null;
  is_active: boolean | null;
  assigned_to: UUID | null;
  user_email: string | null;
  template_title: string | null;
  template_id: UUID | null;
  inserted_at: string | null;
};

type Template = {
  id: UUID;
  title: string;
  goal: string | null;
  is_active: boolean | null;
  inserted_at: string | null;
};

export default function PersonalTraining() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { trackPageView, trackFeatureUsage, trackButtonClick } = useTrackEvent();
  const { showDeleteConfirmation, showDialog, dialog, hideDialog } = useConfirmationDialog();

  const [stats, setStats] = useState<ProgramStats>({
    totalPrograms: 0,
    activePrograms: 0,
    totalClients: 0,
    completedSessions: 0,
  });
  const [programs, setPrograms] = useState<ClientProgram[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [users, setUsers] = useState<{id: string, email: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  
  // Quick assign modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [assignDate, setAssignDate] = useState(new Date().toISOString().slice(0, 10));
  const [assigning, setAssigning] = useState(false);

  // Enhanced program creator
  const [showEnhancedCreator, setShowEnhancedCreator] = useState(() =>
    typeof window !== "undefined" &&
    Boolean(window.localStorage.getItem(PROGRAM_DRAFT_STORAGE_KEY)),
  );

  // Inline title editing
  const [editingTitleId, setEditingTitleId] = useState<UUID | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  // Track page view
  useEffect(() => {
    trackPageView('admin_personal_training', {
      total_programs: programs.length,
      total_clients: stats.totalClients,
      active_programs: stats.activePrograms
    });
  }, [programs.length, stats, trackPageView]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    console.log("loadData called");
    setLoading(true);
    try {
      // Use optimized queries for better performance
      const [programsData, templatesData, usersData, statsData] = await Promise.all([
        getClientProgramsOptimized(),
        getTemplatesOptimized(),
        getUsersOptimized(),
        getPTStatsOptimized()
      ]);

      console.log("Optimized data loaded:", { programsData, templatesData, usersData, statsData });
      console.log("Users loaded:", usersData?.length, "users");
      
      setPrograms(programsData);
      setTemplates(templatesData);
      setUsers(usersData);
      setStats(statsData);

    } catch (error: unknown) {
      console.error("Error loading data:", error);
      toast({
        title: "Viga",
        description: "Andmete laadimine ebaõnnestus",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAssign = async () => {
    if (!selectedTemplate || !selectedUserId) return;

    setAssigning(true);
    try {
      // Get selected user email
      const selectedUser = users.find(u => u.id === selectedUserId);
      if (!selectedUser) {
        throw new Error("Valitud kasutajat ei leitud");
      }

      // Track assignment attempt
      trackFeatureUsage('program_assignment', 'attempted', {
        template_id: selectedTemplate.id,
        target_email: selectedUser.email
      });

      const { data: programId, error } = await supabase.rpc("assign_template_to_user_v2", {
        p_template_id: selectedTemplate.id,
        p_target_email: selectedUser.email,
        p_start_date: assignDate,
      });

      if (error) throw error;

      // Verify the program was created with content
      if (programId) {
        const { data: programCheck } = await supabase
          .from("client_days")
          .select("id")
          .eq("client_program_id", programId)
          .limit(1);
          
        if (!programCheck || programCheck.length === 0) {
          console.warn("Program created but has no days, something went wrong with template copying");
          throw new Error("Mall kopeerimisel tekkis viga - programm on tühi");
        }
      }

      // Track successful assignment
      trackFeatureUsage('program_assignment', 'completed', {
        template_id: selectedTemplate.id,
        target_email: selectedUser.email,
        program_id: programId
      });

      toast({
        title: "Mall määratud",
        description: `Mall "${selectedTemplate.title}" on määratud kasutajale ${selectedUser.email}`,
      });

      setShowAssignModal(false);
      setSelectedTemplate(null);
      setSelectedUserId("");
      loadData();
    } catch (error: unknown) {
      // Get selected user for error tracking
      const selectedUser = users.find(u => u.id === selectedUserId);
      
      // Check if it's a permission error and handle accordingly
      if (isPermissionError(error)) {
        handleTemplateAccessError(error, selectedTemplate?.id);
      } else {
        // Handle other types of errors
        const errorMessage = (error as Error).message || "Malli määramine ebaõnnestus";
        
        toast({
          title: "Viga",
          description: errorMessage,
          variant: "destructive",
        });
      }
      
      // Track assignment failure
      trackFeatureUsage('program_assignment', 'failed', {
        template_id: selectedTemplate?.id,
        target_email: selectedUser?.email || 'unknown',
        error_message: (error as Error).message,
        error_type: isPermissionError(error) ? 'permission_error' : 'general_error'
      });
    } finally {
      setAssigning(false);
    }
  };

  const handleUnassignProgram = async (programId: string, programName: string) => {
    showDialog({
      title: 'Eemalda programm kliendilt',
      description: `Kas oled kindel, et soovid programmi "${programName}" kliendilt eemaldada? Programm jääb andmebaasi, kuid klient ei näe seda enam.`,
      onConfirm: () => performUnassignProgram(programId, programName),
      variant: 'warning',
      confirmText: 'Eemalda',
      cancelText: 'Tühista',
      icon: <AlertTriangle className="h-6 w-6" />
    });
  };

  const performUnassignProgram = async (programId: string, programName: string) => {
    try {
      hideDialog(); // Close dialog first
      
      const { error } = await supabase
        .from('client_programs')
        .update({ is_active: false })
        .eq('id', programId);

      if (error) throw error;

      toast({
        title: "Programm eemaldatud",
        description: `Programm "${programName}" on kliendilt eemaldatud.`,
      });
      
      await loadData();
    } catch (error: unknown) {
      console.error("Error unassigning program:", error);
      toast({
        title: "Viga",
        description: (error as Error).message || "Programmi eemaldamine ebaõnnestus",
        variant: "destructive",
      });
    }
  };

  const handleSaveTitle = async (programId: string, newTitle: string) => {
    try {
      const { error } = await supabase
        .from('client_programs')
        .update({ title_override: newTitle.trim() || null })
        .eq('id', programId);

      if (error) throw error;

      // Update local state
      setPrograms(prev => prev.map(p => 
        p.id === programId 
          ? { ...p, title_override: newTitle.trim() || null }
          : p
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

  const handleDeleteTemplate = async (templateId: string, templateTitle: string) => {
    console.log("handleDeleteTemplate called", { templateId, templateTitle });
    
    showDeleteConfirmation({
      itemName: templateTitle,
      itemType: 'Mall',
      onConfirm: () => performDeleteTemplate(templateId, templateTitle),
      additionalWarning: 'See kustutab ka kõik sellel mallil põhinevad programmid.'
    });
  };

  const performDeleteTemplate = async (templateId: string, templateTitle: string) => {

    try {
      // Track template deletion attempt
      trackFeatureUsage('template_deletion', 'attempted', {
        template_id: templateId,
        template_title: templateTitle
      });

      console.log("Calling admin_delete_template_cascade RPC", { p_template_id: templateId });
      const { data, error } = await supabase.rpc("admin_delete_template_cascade", {
        p_template_id: templateId,
      });

      console.log("RPC result", { data, error });
      if (error) throw error;

      // Track successful template deletion
      trackFeatureUsage('template_deletion', 'completed', {
        template_id: templateId,
        template_title: templateTitle
      });

      toast({
        title: "Mall kustutatud",
        description: "Mall ja seotud programmid on edukalt kustutatud",
      });
      hideDialog();
      loadData();
    } catch (error: unknown) {
      // Track template deletion failure
      trackFeatureUsage('template_deletion', 'failed', {
        template_id: templateId,
        template_title: templateTitle,
        error_message: (error as Error).message
      });

      toast({
        title: "Viga",
        description: (error as Error).message || "Malli kustutamine ebaõnnestus",
        variant: "destructive",
      });
      hideDialog();
    }
  };

  const filteredPrograms = programs.filter(program => {
    const matchesSearch = !searchQuery || 
      program.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      program.template_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      program.title_override?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = filterStatus === "all" || 
      (filterStatus === "active" && program.is_active !== false) ||
      (filterStatus === "inactive" && program.is_active === false);

    return matchesSearch && matchesFilter;
  });

  // Group programs by client email
  const programsByClient = filteredPrograms.reduce((acc, program) => {
    const email = program.user_email || 'Tundmatu klient';
    if (!acc[email]) {
      acc[email] = [];
    }
    acc[email].push(program);
    return acc;
  }, {} as Record<string, ClientProgram[]>);

  const clientEmails = Object.keys(programsByClient).sort();

  if (loading) {
    return (
      <div className="tt-app-loading">
        <div className="tt-app-loading__inner" role="status" aria-live="polite">
          <div className="tt-app-loading__mark" aria-hidden="true" />
          <p className="tt-app-loading__copy">Laen personaaltreeningu haldust…</p>
        </div>
      </div>
    );
  }

  return (
    <PTAccessValidator requireAdmin={true}>
      <div className="tt-app-home tt-admin-programs">
        <div className="tt-app-shell">
          <section className="tt-app-hero tt-admin-hero" aria-labelledby="admin-programs-title">
            <div>
              <p className="tt-app-kicker">Admin · Personaaltreening</p>
              <h1 id="admin-programs-title" className="tt-app-hero__title">
                Programmid.
              </h1>
            </div>
            <div className="tt-admin-hero__aside">
              <p className="tt-app-hero__note">
                Koosta klientidele kavasid, halda malle ja hoia aktiivsed programmid ühes selges töövaates.
              </p>
              <div className="tt-admin-hero__actions">
                <button
                  type="button"
                  onClick={() => {
                    trackButtonClick('smart_program_creator', 'smart_program', 'admin_dashboard');
                    setShowEnhancedCreator(true);
                  }}
                  className="tt-app-button tt-admin-hero__button"
                >
                  <Target size={17} aria-hidden="true" />
                  Loo uus programm
                </button>

                <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="tt-app-button tt-app-button--secondary tt-admin-hero__button"
                      onClick={() => trackButtonClick('assign_template_modal', 'program_assignment', 'admin_dashboard')}
                    >
                      <UserPlus size={17} aria-hidden="true" />
                      Määra mall
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Määra programm kliendile</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Vali mall</label>
                        <select
                          value={selectedTemplate?.id || ""}
                          onChange={(e) => {
                            const template = templates.find(t => t.id === e.target.value);
                            setSelectedTemplate(template || null);
                          }}
                          className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                        >
                          <option value="">Vali mall...</option>
                          {templates.map(template => (
                            <option key={template.id} value={template.id}>
                              {template.title}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Vali klient</label>
                        <select
                          value={selectedUserId}
                          onChange={(e) => setSelectedUserId(e.target.value)}
                          className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                        >
                          <option value="">Vali klient...</option>
                          {users.map(user => (
                            <option key={user.id} value={user.id}>
                              {user.email}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Alguskuupäev</label>
                        <input
                          type="date"
                          value={assignDate}
                          onChange={(e) => setAssignDate(e.target.value)}
                          className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        {(!selectedTemplate || !selectedUserId) && (
                          <p className="text-xs text-destructive">
                            {!selectedTemplate && !selectedUserId && "Palun vali nii mall kui ka klient"}
                            {!selectedTemplate && selectedUserId && "Palun vali mall"}
                            {selectedTemplate && !selectedUserId && "Palun vali klient"}
                          </p>
                        )}
                        <div className="flex gap-3 pt-2">
                          <Button
                            onClick={() => {
                              trackButtonClick('cancel_program_assignment', 'program_assignment', 'admin_dashboard');
                              setShowAssignModal(false);
                            }}
                            variant="outline"
                            className="flex-1"
                          >
                            Tühista
                          </Button>
                          <Button
                            onClick={() => {
                              trackButtonClick('assign_program', 'program_assignment', 'admin_dashboard');
                              handleQuickAssign();
                            }}
                            disabled={assigning || !selectedTemplate || !selectedUserId}
                            className="flex-1"
                          >
                            {assigning ? "Määran..." : "Määra programm"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </section>

          <EnhancedProgramCreator
            isOpen={showEnhancedCreator}
            onOpenChange={setShowEnhancedCreator}
            onSuccess={() => {
              clearPTCache();
              void loadData();
            }}
          />

          <section className="tt-admin-metrics" aria-label="Personaaltreeningu statistika">
            <article className="tt-admin-metric tt-admin-metric--accent">
              <span className="tt-admin-metric__icon"><Target size={19} /></span>
              <span className="tt-admin-metric__label">Kõik programmid</span>
              <strong className="tt-admin-metric__value">{stats.totalPrograms}</strong>
            </article>
            <article className="tt-admin-metric">
              <span className="tt-admin-metric__icon"><Activity size={19} /></span>
              <span className="tt-admin-metric__label">Aktiivsed</span>
              <strong className="tt-admin-metric__value">{stats.activePrograms}</strong>
            </article>
            <article className="tt-admin-metric">
              <span className="tt-admin-metric__icon"><Users size={19} /></span>
              <span className="tt-admin-metric__label">Kliendid</span>
              <strong className="tt-admin-metric__value">{stats.totalClients}</strong>
            </article>
            <article className="tt-admin-metric">
              <span className="tt-admin-metric__icon"><TrendingUp size={19} /></span>
              <span className="tt-admin-metric__label">Lõpetatud sessioonid</span>
              <strong className="tt-admin-metric__value">{stats.completedSessions}</strong>
            </article>
          </section>

          <section className="tt-admin-section" aria-labelledby="templates-title">
            <header className="tt-admin-section__head">
              <div>
                <p className="tt-app-eyebrow">Korduvkasutatavad põhjad</p>
                <h2 id="templates-title" className="tt-admin-section__title">Treeningmallid</h2>
                <p className="tt-admin-section__description">
                  Halda valmis kavasid ja määra need kiiresti sobivale kliendile.
                </p>
              </div>
              <span className="tt-admin-section__count">{templates.length} {templates.length === 1 ? "mall" : "malli"}</span>
            </header>

            {templates.length === 0 ? (
              <div className="tt-admin-empty">
                <span className="tt-admin-empty__icon" aria-hidden="true"><Target size={22} /></span>
                <div>
                  <h3 className="tt-admin-empty__title">Malle pole veel loodud</h3>
                  <p className="tt-admin-empty__copy">
                    Kui lood korduvkasutatava malli, saad selle uuele kliendile määrata mõne hetkega.
                  </p>
                </div>
              </div>
            ) : (
              <div className="tt-admin-template-grid">
                {templates.map((template) => (
                  <article key={template.id} className="tt-admin-template">
                    <div className="tt-admin-template__topline">
                      <span className={`tt-admin-status ${template.is_active ? "is-active" : "is-inactive"}`}>
                        {template.is_active ? "Aktiivne" : "Mitteaktiivne"}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button type="button" className="tt-admin-icon-button" aria-label={`Halda malli ${template.title}`}>
                            <MoreHorizontal size={18} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/admin/templates/${template.id}`)}>
                            <Edit className="h-3 w-3 mr-2" />
                            Muuda malli
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteTemplate(template.id, template.title)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-3 w-3 mr-2" />
                            Kustuta mall
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="tt-admin-template__body">
                      <h3 className="tt-admin-template__title">{template.title}</h3>
                      <p className="tt-admin-template__goal">{template.goal || "Eesmärk määramata"}</p>
                    </div>
                    <footer className="tt-admin-template__footer">
                      <span>
                        {template.inserted_at
                          ? `Loodud ${new Date(template.inserted_at).toLocaleDateString('et-EE')}`
                          : "Loomise kuupäev teadmata"}
                      </span>
                      <button
                        type="button"
                        className="tt-admin-text-button"
                        onClick={() => {
                          setSelectedTemplate(template);
                          setShowAssignModal(true);
                        }}
                      >
                        <UserPlus size={15} />
                        Määra kliendile
                      </button>
                    </footer>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="tt-admin-section tt-admin-section--programs" aria-labelledby="client-programs-title">
            <header className="tt-admin-section__head tt-admin-section__head--programs">
              <div>
                <p className="tt-app-eyebrow">Klienditöö</p>
                <h2 id="client-programs-title" className="tt-admin-section__title">Klientide programmid</h2>
                <p className="tt-admin-section__description">
                  Vaata määratud kavasid, muuda sisu ja halda aktiivsust.
                </p>
              </div>

              <div className="tt-admin-filters" aria-label="Programmide filtrid">
                <label className="tt-admin-search">
                  <span className="sr-only">Otsi klienti või programmi</span>
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" />
                  </svg>
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Otsi klienti või programmi"
                  />
                </label>
                <div className="tt-admin-filter-pills">
                  {([
                    ["all", "Kõik"],
                    ["active", "Aktiivsed"],
                    ["inactive", "Mitteaktiivsed"],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={filterStatus === value ? "is-active" : undefined}
                      onClick={() => setFilterStatus(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <span className="tt-admin-filter-count">{filteredPrograms.length} / {programs.length}</span>
              </div>
            </header>

            <div className="tt-admin-program-list">
              {clientEmails.length === 0 ? (
                <div className="tt-admin-empty tt-admin-empty--programs">
                  <span className="tt-admin-empty__icon" aria-hidden="true"><Users size={22} /></span>
                  <div>
                    <h3 className="tt-admin-empty__title">
                      {searchQuery || filterStatus !== "all" ? "Sobivaid programme ei leitud" : "Programme pole veel määratud"}
                    </h3>
                    <p className="tt-admin-empty__copy">
                      {searchQuery || filterStatus !== "all"
                        ? "Muuda otsingut või vali teine aktiivsuse filter."
                        : "Loo kliendile esimene personaalne programm või määra olemasolev mall."}
                    </p>
                  </div>
                </div>
              ) : (
                <Accordion type="single" collapsible className="tt-admin-clients">
                  {clientEmails.map((email) => {
                    const clientPrograms = programsByClient[email];
                    return (
                      <AccordionItem key={email} value={email} className="tt-admin-client">
                        <AccordionTrigger className="tt-admin-client__trigger hover:no-underline">
                          <div className="tt-admin-client__identity">
                            <span className="tt-admin-client__avatar" aria-hidden="true">
                              <UserCheck size={18} />
                            </span>
                            <span className="tt-admin-client__copy">
                              <strong>{email}</strong>
                              <small>{clientPrograms.length} {clientPrograms.length === 1 ? 'programm' : 'programmi'}</small>
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="tt-admin-client__content">
                          <div className="tt-admin-client__programs">
                            {clientPrograms.map((program) => (
                              <article key={program.id} className="tt-admin-client-program">
                                <div className="tt-admin-client-program__main">
                                  {editingTitleId === program.id ? (
                                    <div className="tt-admin-title-edit">
                                      <Input
                                        value={editingTitle}
                                        onChange={(e) => setEditingTitle(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            handleSaveTitle(program.id!, editingTitle);
                                          } else if (e.key === 'Escape') {
                                            setEditingTitleId(null);
                                            setEditingTitle("");
                                          }
                                        }}
                                        autoFocus
                                        className="h-10 text-sm"
                                        placeholder={program.template_title || "Nimetu programm"}
                                      />
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleSaveTitle(program.id!, editingTitle)}
                                        className="h-10 w-10 p-0"
                                        aria-label="Salvesta programmi nimi"
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
                                        className="h-10 w-10 p-0"
                                        aria-label="Tühista nime muutmine"
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      className="tt-admin-client-program__title"
                                      onClick={() => {
                                        setEditingTitleId(program.id);
                                        setEditingTitle(program.title_override || "");
                                      }}
                                    >
                                      {program.title_override || program.template_title || "Nimetu programm"}
                                      <Edit size={14} aria-hidden="true" />
                                    </button>
                                  )}

                                  <div className="tt-admin-client-program__meta">
                                    <span className={`tt-admin-status ${program.is_active !== false ? "is-active" : "is-inactive"}`}>
                                      {program.is_active !== false ? 'Aktiivne' : 'Mitteaktiivne'}
                                    </span>
                                    {program.start_date && (
                                      <span><Send size={13} /> Algas {new Date(program.start_date).toLocaleDateString('et-EE')}</span>
                                    )}
                                  </div>
                                </div>

                                <div className="tt-admin-client-program__actions">
                                  <button
                                    type="button"
                                    className="tt-admin-text-button tt-admin-text-button--strong"
                                    onClick={() => {
                                      trackButtonClick('view_program', `/admin/programs/${program.id}/edit`, 'admin_dashboard');
                                      navigate(`/admin/programs/${program.id}/edit`);
                                    }}
                                  >
                                    <Edit size={15} />
                                    Muuda kava
                                  </button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button type="button" className="tt-admin-icon-button" aria-label="Programmi lisavalikud">
                                        <MoreHorizontal size={18} />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                      <DropdownMenuItem
                                        onClick={() => {
                                          trackButtonClick('unassign_program_from_menu', 'program_unassignment', 'admin_dashboard');
                                          handleUnassignProgram(
                                            program.id!,
                                            program.title_override || program.template_title || "Programm"
                                          );
                                        }}
                                        className="text-orange-600 focus:text-orange-600"
                                      >
                                        <UserMinus className="mr-2 h-4 w-4" />
                                        Eemalda kliendilt
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </article>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
            </div>
          </section>
        </div>
      </div>

      <ConfirmationDialog
        isOpen={dialog.isOpen}
        onClose={hideDialog}
        onConfirm={dialog.onConfirm}
        title={dialog.title}
        description={dialog.description}
        variant={dialog.variant}
        confirmText={dialog.confirmText}
        cancelText={dialog.cancelText}
        isLoading={dialog.isLoading}
        loadingText={dialog.loadingText}
        icon={dialog.icon}
      />
    </PTAccessValidator>
  );
}
