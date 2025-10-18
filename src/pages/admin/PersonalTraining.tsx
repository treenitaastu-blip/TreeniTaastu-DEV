import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTrackEvent } from "@/hooks/useTrackEvent";
import { handleProgramAccessError, handleTemplateAccessError, isPermissionError } from "@/utils/errorHandling";
import { useConfirmationDialog, ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { MobileOptimizedCard, MobileStatsCard, MobileFilterBar } from "@/components/admin/MobileOptimizedCard";
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
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  UserCheck,
  Send,
  Eye,
  UserPlus,
  Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
import EnhancedProgramCreator from "@/components/admin/EnhancedProgramCreator";
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
};

export default function PersonalTraining() {
  const { toast } = useToast();
  const { trackPageView, trackFeatureUsage, trackButtonClick } = useTrackEvent();
  const { showDeleteConfirmation, dialog, hideDialog } = useConfirmationDialog();

  const [stats, setStats] = useState<ProgramStats>({
    totalPrograms: 0,
    activePrograms: 0,
    totalClients: 0,
    completedSessions: 0,
  });
  const [programs, setPrograms] = useState<ClientProgram[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [users, setUsers] = useState<{id: string, email: string, full_name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  
  // Quick assign modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [assignDate, setAssignDate] = useState(new Date().toISOString().slice(0, 10));
  const [assigning, setAssigning] = useState(false);

  // New template form
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ title: "", goal: "" });
  const [creating, setCreating] = useState(false);

  // Enhanced program creator
  const [showEnhancedCreator, setShowEnhancedCreator] = useState(false);

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

  const handleDeleteProgram = async (programId: string, programName: string) => {
    console.log("handleDeleteProgram called", { programId, programName });
    
    showDeleteConfirmation({
      itemName: programName,
      itemType: 'Programm',
      onConfirm: () => performDeleteProgram(programId, programName),
      additionalWarning: 'See kustutab ka kõik seotud andmed (päevad, harjutused, sessioonid).'
    });
  };

  const performDeleteProgram = async (programId: string, programName: string) => {

    try {
      // Track deletion attempt
      trackFeatureUsage('program_deletion', 'attempted', {
        program_id: programId
      });

      console.log("Calling admin_delete_client_program_cascade with:", { p_program_id: programId });
      
      const { data, error } = await supabase.rpc("admin_delete_client_program_cascade", {
        p_program_id: programId,
      });

      console.log("Deletion result:", { data, error });

      if (error) throw error;

      // Track successful deletion
      trackFeatureUsage('program_deletion', 'completed', {
        program_id: programId
      });

      toast({
        title: "Programm kustutatud",
        description: "Programm ja seotud andmed on edukalt kustutatud",
      });
      
      // Reload data to update the list
      await loadData();
    } catch (error: unknown) {
      console.error("Error deleting program:", error);
      
      // Check if it's a permission error and handle accordingly
      if (isPermissionError(error)) {
        handleProgramAccessError(error, programId);
      } else {
        // Handle other types of errors
        const errorMessage = (error as Error).message || "Programmi kustutamine ebaõnnestus";
        
        toast({
          title: "Viga",
          description: errorMessage,
          variant: "destructive",
        });
      }
      
      // Track deletion failure
      trackFeatureUsage('program_deletion', 'failed', {
        program_id: programId,
        error_message: (error as Error).message,
        error_type: isPermissionError(error) ? 'permission_error' : 'general_error'
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

      console.log("Calling admin_delete_template RPC", { p_template_id: templateId });
      const { data, error } = await supabase.rpc("admin_delete_template", {
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
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.title.trim()) return;

    setCreating(true);
    try {
      // Track template creation attempt
      trackFeatureUsage('template_creation', 'attempted', {
        template_title: newTemplate.title,
        template_goal: newTemplate.goal
      });

      const { data, error } = await supabase
        .from("workout_templates")
        .insert({
          title: newTemplate.title.trim(),
          goal: newTemplate.goal.trim() || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      // Track successful template creation
      trackFeatureUsage('template_creation', 'completed', {
        template_id: data.id,
        template_title: newTemplate.title,
        template_goal: newTemplate.goal
      });

      toast({
        title: "Mall loodud",
        description: `Mall "${newTemplate.title}" on edukalt loodud`,
      });

      setShowNewTemplate(false);
      setNewTemplate({ title: "", goal: "" });
      loadData();
    } catch (error: unknown) {
      // Track template creation failure
      trackFeatureUsage('template_creation', 'failed', {
        template_title: newTemplate.title,
        template_goal: newTemplate.goal,
        error_message: (error as Error).message
      });

      toast({
        title: "Viga",
        description: (error as Error).message || "Malli loomine ebaõnnestus",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-64 rounded-lg bg-muted"></div>
            <div className="grid gap-6 md:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 rounded-2xl bg-muted"></div>
              ))}
            </div>
            <div className="h-96 rounded-2xl bg-muted"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PTAccessValidator requireAdmin={true}>
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10">
        <div className="container mx-auto px-4 py-8">
          {/* Header - Mobile optimized */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Personaaltreeningu Haldus
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
                  Halda malle, määra programme ja jälgi klientide progressi
                </p>
              </div>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                <Button
                onClick={() => {
                  trackButtonClick('smart_program_creator', 'smart_program', 'admin_dashboard');
                  setShowEnhancedCreator(true);
                }}
                size="sm"
                className="flex-1 sm:flex-initial bg-gradient-to-r from-primary to-accent"
              >
                <Target className="mr-2 h-4 w-4" />
                <span className="hidden xs:inline">Smart </span>Program
              </Button>
              

              <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline"
                    size="sm"
                    className="flex-1 sm:flex-initial"
                    onClick={() => trackButtonClick('assign_template_modal', 'program_assignment', 'admin_dashboard')}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    <span className="hidden xs:inline">Määra </span>mall
                  </Button>
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
                            {user.email} {user.full_name ? `(${user.full_name})` : ''}
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
                    <div className="flex gap-3 pt-4">
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
                </DialogContent>
               </Dialog>
             </div>
           </div>

           {/* Enhanced Program Creator */}
        <EnhancedProgramCreator
          isOpen={showEnhancedCreator}
          onOpenChange={setShowEnhancedCreator}
          onSuccess={loadData}
        />


        {/* Stats Cards - Mobile Optimized */}
        <div className="grid gap-3 mb-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <MobileStatsCard
            title="Kokku Programme"
            value={stats.totalPrograms}
            icon={<Target className="h-5 w-5 lg:h-6 lg:w-6 text-purple-600" />}
            className="bg-gradient-to-br from-purple-500/10 to-purple-600/5"
          />
          <MobileStatsCard
            title="Aktiivsed Programme"
            value={stats.activePrograms}
            icon={<Activity className="h-5 w-5 lg:h-6 lg:w-6 text-green-600" />}
            className="bg-gradient-to-br from-green-500/10 to-green-600/5"
          />
          <MobileStatsCard
            title="Aktiivsed Kliendid"
            value={stats.totalClients}
            icon={<Users className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />}
            className="bg-gradient-to-br from-primary/10 to-primary/5"
          />
          <MobileStatsCard
            title="Lõpetatud Sessioone"
            value={stats.completedSessions}
            icon={<TrendingUp className="h-5 w-5 lg:h-6 lg:w-6 text-blue-600" />}
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/5"
          />
        </div>

        {/* Template Management Section */}
        <Card className="border-0 shadow-soft bg-card/50 backdrop-blur-sm mb-6">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">Mallide Haldus</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Halda treeningmalle ja vaata nende kasutamist
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {templates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Malle pole veel loodud</p>
                <p className="text-sm">Loo esimene mall, et hakata määrama programme klientidele</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {templates.map((template) => (
                  <div key={template.id} className="p-4 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-base mb-1">{template.title}</h3>
                        <p className="text-sm text-muted-foreground">{template.goal || "Eesmärk määramata"}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {template.is_active ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Aktiivne
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Mitteaktiivne
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Loodud: {new Date(template.inserted_at).toLocaleDateString('et-EE')}</span>
                      <div className="flex gap-1">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-xs"
                            >
                              <MoreHorizontal className="h-3 w-3 mr-1" />
                              Muuda
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                // Navigate to template editing page
                                window.location.href = `/admin/templates/${template.id}`;
                              }}
                            >
                              <Edit className="h-3 w-3 mr-2" />
                              Muuda malli
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                // Delete template
                                handleDeleteTemplate(template.id, template.title);
                              }}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-3 w-3 mr-2" />
                              Kustuta mall
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-xs"
                          onClick={() => {
                            // Open template assignment modal
                            setSelectedTemplate(template);
                            setShowAssignModal(true);
                          }}
                        >
                          <UserPlus className="h-3 w-3 mr-1" />
                          Määra
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Programs List - Cleaner Interface */}
        <Card className="border-0 shadow-soft bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">Klientide Programmid</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Halda määratud programme ja jälgi klientide arengut
                </p>
              </div>
              
              {/* Mobile Optimized Filters */}
              <MobileFilterBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                filterStatus={filterStatus}
                onFilterChange={(status) => setFilterStatus(status as "all" | "active" | "inactive")}
                totalItems={programs.length}
                filteredItems={filteredPrograms.length}
              />
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <div className="min-w-full">
                {filteredPrograms.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {searchQuery || filterStatus !== "all" ? "Otsingu tulemusi ei leitud" : "Programme pole veel määratud"}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {filteredPrograms.map((program) => (
                      <div key={program.id} className="p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            {/* Program Info - Cleaner display */}
                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                                <h3 className="font-medium text-sm lg:text-base truncate">
                                  {program.title_override || program.template_title || "Nimetu programm"}
                                </h3>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                                    program.is_active !== false
                                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                  }`}>
                                    {program.is_active !== false ? 'Aktiivne' : 'Mitteaktiivne'}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs lg:text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <UserCheck className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{program.user_email}</span>
                                </div>
                                {program.start_date && (
                                  <div className="flex items-center gap-1">
                                    <Send className="h-3 w-3 flex-shrink-0" />
                                    <span>Algas: {new Date(program.start_date).toLocaleDateString('et-EE')}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                          {/* Actions - Mobile Friendly */}
                          <div className="flex items-center justify-end gap-2 flex-shrink-0">
                            <Button
                              onClick={() => {
                                trackButtonClick('view_program', `/admin/programs/${program.id}/edit`, 'admin_dashboard');
                                window.location.href = `/admin/programs/${program.id}/edit`;
                              }}
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs"
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              <span className="hidden sm:inline">Muuda</span>
                            </Button>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem
                                  onClick={() => {
                                    trackButtonClick('delete_program_from_menu', 'program_deletion', 'admin_dashboard');
                                    handleDeleteProgram(
                                      program.id!,
                                      program.title_override || program.template_title || "Programm"
                                    );
                                  }}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Kustuta programm
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
         </Card>

         </div>
         </div>
       </div>
       
       {/* Confirmation Dialog */}
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