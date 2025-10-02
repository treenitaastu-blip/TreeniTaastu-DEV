import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
import SmartProgramDashboard from "@/components/admin/SmartProgramDashboard";
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

  const [stats, setStats] = useState<ProgramStats>({
    totalPrograms: 0,
    activePrograms: 0,
    totalClients: 0,
    completedSessions: 0,
  });
  const [programs, setPrograms] = useState<ClientProgram[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  
  // Quick assign modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [assignEmail, setAssignEmail] = useState("");
  const [assignDate, setAssignDate] = useState(new Date().toISOString().slice(0, 10));
  const [assigning, setAssigning] = useState(false);

  // New template form
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ title: "", goal: "" });
  const [creating, setCreating] = useState(false);

  // Enhanced program creator
  const [showEnhancedCreator, setShowEnhancedCreator] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Simplified program stats query
      const { data: programData, error: programError } = await supabase
        .from("client_programs")
        .select("id, is_active, assigned_to");

      if (programError) {
        console.error("Program stats error:", programError);
        throw programError;
      }

      const totalPrograms = programData?.length || 0;
      const activePrograms = programData?.filter(p => p.is_active !== false).length || 0;
      const totalClients = new Set(programData?.map(p => p.assigned_to)).size || 0;

      // Load completed sessions count
      const { count: completedCount, error: sessionsError } = await supabase
        .from("workout_sessions")
        .select("*", { count: "exact", head: true })
        .not("ended_at", "is", null);

      if (sessionsError) {
        console.error("Sessions count error:", sessionsError);
      }

      setStats({
        totalPrograms,
        activePrograms,
        totalClients,
        completedSessions: completedCount || 0,
      });

      // Load programs with user emails using separate queries to avoid join issues
      const { data: programsList, error: programsError } = await supabase
        .from("client_programs")
        .select(`
          id,
          title_override,
          start_date,
          is_active,
          assigned_to,
          template_id,
          inserted_at,
          workout_templates(title)
        `)
        .order("inserted_at", { ascending: false })
        .limit(50);

      if (programsError) {
        console.error("Programs list error:", programsError);
        throw programsError;
      }

      // Get user emails for the programs
      const userIds = [...new Set(programsList?.map(p => p.assigned_to).filter(Boolean))];
      const { data: usersData } = await supabase
        .from("profiles")
        .select("id, email")
        .in("id", userIds);

      const usersMap = new Map(usersData?.map(u => [u.id, u.email]) || []);

      const mappedPrograms: ClientProgram[] = (programsList || []).map(p => ({
        id: p.id,
        title_override: p.title_override,
        start_date: p.start_date,
        is_active: p.is_active,
        assigned_to: p.assigned_to,
        user_email: usersMap.get(p.assigned_to) || "Tundmatu kasutaja",
        template_title: p.workout_templates?.title || "Nimetu mall",
        template_id: p.template_id,
        inserted_at: p.inserted_at,
      }));

      setPrograms(mappedPrograms);

      // Load templates
      const { data: templatesData, error: templatesError } = await supabase
        .from("workout_templates")
        .select("id, title, goal, is_active")
        .eq("is_active", true)
        .order("title");

      if (templatesError) {
        console.error("Templates error:", templatesError);
      }

      setTemplates(templatesData || []);
    } catch (error) {
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
    if (!selectedTemplate || !assignEmail.trim()) return;

    setAssigning(true);
    try {
      const { data: programId, error } = await supabase.rpc("assign_template_to_user_v2", {
        p_template_id: selectedTemplate.id,
        p_target_email: assignEmail.trim().toLowerCase(),
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

      toast({
        title: "Mall määratud",
        description: `Mall "${selectedTemplate.title}" on määratud kasutajale ${assignEmail}`,
      });

      setShowAssignModal(false);
      setSelectedTemplate(null);
      setAssignEmail("");
      loadData();
    } catch (error: unknown) {
      toast({
        title: "Viga",
        description: (error as Error).message || "Malli määramine ebaõnnestus",
        variant: "destructive",
      });
    } finally {
      setAssigning(false);
    }
  };

  const handleDeleteProgram = async (programId: string, programName: string) => {
    if (!confirm(`Kas oled kindel, et soovid programmi "${programName}" kustutada? See kustutab ka kõik seotud andmed (päevad, harjutused, sessioonid).`)) return;

    try {
      const { error } = await supabase.rpc("admin_delete_client_program_cascade", {
        p_program_id: programId,
      });

      if (error) throw error;

      toast({
        title: "Programm kustutatud",
        description: "Programm ja seotud andmed on edukalt kustutatud",
      });
      
      // Reload data to update the list
      await loadData();
    } catch (error: unknown) {
      console.error("Error deleting program:", error);
      toast({
        title: "Viga",
        description: (error as Error).message || "Programmi kustutamine ebaõnnestus",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTemplate = async (templateId: string, templateTitle: string) => {
    if (!confirm(`Kas oled kindel, et soovid malli "${templateTitle}" kustutada? See kustutab ka kõik sellel mallil põhinevad programmid.`)) return;

    try {
      const { error } = await supabase.rpc("admin_delete_template_cascade", {
        p_template_id: templateId,
      });

      if (error) throw error;

      toast({
        title: "Mall kustutatud",
        description: "Mall ja seotud programmid on edukalt kustutatud",
      });
      loadData();
    } catch (error: unknown) {
      toast({
        title: "Viga",
        description: (error as Error).message || "Malli kustutamine ebaõnnestus",
        variant: "destructive",
      });
    }
  };

  const handleCreateTemplate = async () => {
    const title = newTemplate.title.trim();
    if (!title) return;

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("workout_templates")
        .insert({ title, goal: newTemplate.goal.trim() || null })
        .select("id, title, goal, is_active")
        .single();

      if (error) throw error;

      setTemplates(prev => [data, ...prev]);
      setNewTemplate({ title: "", goal: "" });
      setShowNewTemplate(false);
      toast({
        title: "Mall loodud",
        description: "Uus mall on edukalt loodud",
      });
    } catch (error: any) {
      toast({
        title: "Viga",
        description: error.message || "Malli loomine ebaõnnestus",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const filteredPrograms = programs.filter((program) => {
    const matchesSearch = 
      program.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      program.template_title?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = 
      filterStatus === "all" ||
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
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Personaaltreeningu Haldus
                </h1>
                <p className="text-muted-foreground mt-2">
                  Halda malle, määra programme ja jälgi klientide progressi
                </p>
              </div>
            <div className="flex gap-3">
              <Dialog open={showNewTemplate} onOpenChange={setShowNewTemplate}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Uus mall
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Loo uus mall</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Malli pealkiri</label>
                      <input
                        type="text"
                        value={newTemplate.title}
                        onChange={(e) => setNewTemplate(s => ({ ...s, title: e.target.value }))}
                        placeholder="nt. Algaja jõutreening"
                        className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Eesmärk (valikuline)</label>
                      <input
                        type="text"
                        value={newTemplate.goal}
                        onChange={(e) => setNewTemplate(s => ({ ...s, goal: e.target.value }))}
                        placeholder="nt. Jõu ja vastupidavuse arendamine"
                        className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <Button onClick={() => setShowNewTemplate(false)} variant="outline" className="flex-1">
                        Tühista
                      </Button>
                      <Button 
                        onClick={handleCreateTemplate} 
                        disabled={creating || !newTemplate.title.trim()}
                        className="flex-1"
                      >
                        {creating ? "Loob..." : "Loo mall"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Button
                onClick={() => setShowEnhancedCreator(true)}
                className="bg-gradient-to-r from-primary to-accent"
              >
                <Target className="mr-2 h-4 w-4" />
                Smart Programm
              </Button>

              <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Määra mall
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
                            {template.title} {template.goal && `(${template.goal})`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Kliendi e-mail</label>
                      <input
                        type="email"
                        value={assignEmail}
                        onChange={(e) => setAssignEmail(e.target.value)}
                        placeholder="klient@email.com"
                        className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      />
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
                      <Button onClick={() => setShowAssignModal(false)} variant="outline" className="flex-1">
                        Tühista
                      </Button>
                      <Button 
                        onClick={handleQuickAssign} 
                        disabled={assigning || !selectedTemplate || !assignEmail.trim()}
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
        </div>

        {/* Enhanced Program Creator */}
        <EnhancedProgramCreator
          isOpen={showEnhancedCreator}
          onOpenChange={setShowEnhancedCreator}
          onSuccess={loadData}
        />

        {/* Stats Cards - Mobile Optimized */}
        <div className="grid gap-3 mb-6 grid-cols-2 lg:grid-cols-4">
          <Card className="border-0 shadow-soft bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="p-3 lg:p-6">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Users className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
                  <p className="text-xs lg:text-sm font-medium text-muted-foreground">Programme</p>
                </div>
                <p className="text-xl lg:text-3xl font-bold text-primary">{stats.totalPrograms}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft bg-gradient-to-br from-accent/10 to-accent/5">
            <CardContent className="p-3 lg:p-6">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <TrendingUp className="h-5 w-5 lg:h-6 lg:w-6 text-accent" />
                  <p className="text-xs lg:text-sm font-medium text-muted-foreground">Aktiivsed</p>
                </div>
                <p className="text-xl lg:text-3xl font-bold text-accent">{stats.activePrograms}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft bg-gradient-to-br from-green-500/10 to-green-500/5">
            <CardContent className="p-3 lg:p-6">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <UserCheck className="h-5 w-5 lg:h-6 lg:w-6 text-green-600" />
                  <p className="text-xs lg:text-sm font-medium text-muted-foreground">Kliendid</p>
                </div>
                <p className="text-xl lg:text-3xl font-bold text-green-600">{stats.totalClients}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft bg-gradient-to-br from-blue-500/10 to-blue-500/5">
            <CardContent className="p-3 lg:p-6">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Activity className="h-5 w-5 lg:h-6 lg:w-6 text-blue-600" />
                  <p className="text-xs lg:text-sm font-medium text-muted-foreground">Treeninguid</p>
                </div>
                <p className="text-xl lg:text-3xl font-bold text-blue-600">{stats.completedSessions}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Programs List */}
        <Card className="border-0 shadow-soft">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-xl">Aktiivsed programmid</CardTitle>
              <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <input
                    placeholder="Otsi kliente..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full rounded-lg border border-input bg-background text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as "all" | "active" | "inactive")}
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                >
                  <option value="all">Kõik</option>
                  <option value="active">Aktiivsed</option>
                  <option value="inactive">Mitteaktiivsed</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="min-w-full">
                {/* Mobile layout */}
                <div className="block sm:hidden space-y-4">
                  {filteredPrograms.map((program) => (
                    <div key={program.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="rounded-full bg-primary/10 w-8 h-8 flex items-center justify-center">
                            <Users className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium text-sm">{program.user_email}</div>
                            <div className="font-medium text-xs text-muted-foreground">{program.template_title}</div>
                          </div>
                        </div>
                        <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          program.is_active !== false
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }`}>
                          {program.is_active !== false ? "Aktiivne" : "Mitteaktiivne"}
                        </div>
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        Algus: {program.start_date 
                          ? new Date(program.start_date).toLocaleDateString("et-EE")
                          : "—"
                        }
                      </div>

                      <div className="flex gap-2">
                        <Button asChild size="sm" variant="outline" className="flex-1">
                          <Link to={`/admin/programs/${program.id}`}>
                            <Eye className="mr-1 h-3 w-3" />
                            Vaata
                          </Link>
                        </Button>
                        <Button asChild size="sm" variant="outline" className="flex-1">
                          <Link to={`/admin/programs/${program.id}/edit`}>
                            <Edit className="mr-1 h-3 w-3" />
                            Muuda
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop layout */}
                <table className="w-full hidden sm:table">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-4 font-medium text-muted-foreground">Klient</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Programm</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Algus</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Staatus</th>
                      <th className="text-right p-4 font-medium text-muted-foreground">Tegevused</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPrograms.map((program) => (
                      <tr key={program.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="rounded-full bg-primary/10 w-8 h-8 flex items-center justify-center">
                              <Users className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">{program.user_email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-medium">{program.template_title}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm text-muted-foreground">
                            {program.start_date 
                              ? new Date(program.start_date).toLocaleDateString("et-EE")
                              : "—"
                            }
                          </div>
                        </td>
                        <td className="p-4">
                          <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            program.is_active !== false
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}>
                            {program.is_active !== false ? "Aktiivne" : "Mitteaktiivne"}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover border z-50">
                              <DropdownMenuItem asChild>
                                <Link to={`/admin/programs/${program.id}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Vaata detaile
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link to={`/admin/programs/${program.id}/edit`}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Muuda
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link to={`/admin/programs/${program.id}/analytics`}>
                                  <TrendingUp className="mr-2 h-4 w-4" />
                                  Analytics
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => 
                                  handleDeleteProgram(
                                    program.id!,
                                    program.template_title || "Nimetu programm"
                                  )
                                }
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Kustuta
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {filteredPrograms.length === 0 && (
                <div className="py-12 text-center">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Programmid ei leitud</h3>
                  <p className="text-muted-foreground mb-6">
                    {searchQuery || filterStatus !== "all" 
                      ? "Proovi muuta otsingukriteeriumeid"
                      : "Alusta esimese programmi määramisest"
                    }
                  </p>
                  <Button onClick={() => setShowAssignModal(true)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Määra programm
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </PTAccessValidator>
  );
}