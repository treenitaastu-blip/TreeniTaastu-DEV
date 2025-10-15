// src/pages/admin/ProgramEdit.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Save, Trash2, UserCheck, Calendar, AlertTriangle, UserPlus, UserMinus, BarChart3, Edit3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminCard, AdminCardHeader, AdminCardTitle, AdminCardContent } from "@/components/ui/admin-card";
import { ProgramProgressCard } from "@/components/smart-progression/ProgramProgressCard";
import { useSmartProgression } from "@/hooks/useSmartProgression";
import ProgramContentEditor from "@/components/admin/ProgramContentEditor";

type UUID = string;

type ProgramData = {
  id: UUID;
  title_override: string | null;
  start_date: string | null;
  is_active: boolean | null;
  assigned_to: UUID;
  assigned_by: UUID;
  template_id: UUID | null;
};

type UserProfile = {
  id: UUID;
  email: string | null;
};


export default function ProgramEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [program, setProgram] = useState<ProgramData | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form data
  const [titleOverride, setTitleOverride] = useState("");
  const [startDate, setStartDate] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [newAssigneeEmail, setNewAssigneeEmail] = useState("");
  const [showContentEditor, setShowContentEditor] = useState(false);

  // Smart progression hook
  const { 
    programProgress, 
    loading: progressLoading, 
    autoProgressProgram, 
    completeDuePrograms,
    updateProgramSettings 
  } = useSmartProgression(id);

  const loadProgram = async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      // Load program data
      const { data: programData, error: programError } = await supabase
        .from("client_programs")
        .select("*")
        .eq("id", id)
        .single();

      if (programError) throw programError;

      // Load user profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, email")
        .eq("id", programData.assigned_to)
        .single();

      if (profileError) throw profileError;

      setProgram(programData);
      setUserProfile(profileData);
      setTitleOverride(programData.title_override || "");
      setStartDate(programData.start_date || "");
      setIsActive(programData.is_active !== false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Viga programmi laadimisel";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProgram();
  }, [id]);

  const handleSave = async () => {
    if (!id || !program) return;

    setSaving(true);
    setError(null);

    try {
      const { error } = await supabase
        .from("client_programs")
        .update({
          title_override: titleOverride.trim() || null,
          start_date: startDate || null,
          is_active: isActive,
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Programm salvestatud",
        description: "Muudatused on edukalt salvestatud.",
      });

      // Navigate back after successful save
      setTimeout(() => navigate("/admin/programs"), 1000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Viga salvestamisel";
      setError(message);
      toast({
        title: "Viga",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !program) return;

    if (!confirm("Kas oled kindel, et soovid selle programmi kustutada? Seda tegevust ei saa tühistada.")) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      const { error } = await supabase.rpc("admin_delete_client_program_cascade", {
        p_program_id: id,
      });

      if (error) throw error;

      toast({
        title: "Programm kustutatud",
        description: "Programm ja seotud andmed on edukalt kustutatud.",
      });

      navigate("/admin/programs");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Viga kustutamisel";
      setError(message);
      toast({
        title: "Viga",
        description: message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleReassign = async () => {
    if (!id || !program || !newAssigneeEmail.trim()) return;

    setSaving(true);
    setError(null);

    try {
      // Find user by email
      const { data: userData, error: userError } = await supabase
        .from("profiles")
        .select("id, email")
        .eq("email", newAssigneeEmail.trim())
        .single();

      if (userError) throw new Error("Kasutajat ei leitud antud e-maili aadressiga");

      // Update program assignment
      const { error } = await supabase
        .from("client_programs")
        .update({ assigned_to: userData.id })
        .eq("id", id);

      if (error) throw error;

      setUserProfile(userData);
      setNewAssigneeEmail("");
      toast({
        title: "Programm määratud ümber",
        description: `Programm on nüüd määratud kasutajale ${userData.email}.`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Viga ümbermääramisel";
      setError(message);
      toast({
        title: "Viga",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUnassign = async () => {
    if (!id || !program) return;

    if (!confirm("Kas oled kindel, et soovid selle programmi määramise tühistada?")) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { error } = await supabase
        .from("client_programs")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;

      setIsActive(false);
      setProgram({ ...program, is_active: false });
      toast({
        title: "Programm deaktiveeritud",
        description: "Programm on kasutajale enam kättesaadav.",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Viga deaktiveerimisel";
      setError(message);
      toast({
        title: "Viga",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Muuda Programmi" description="Halda isikliku treeningprogrammi detaile ja staatust">
        <div className="animate-pulse space-y-6">
          <AdminCard>
            <AdminCardContent className="space-y-4">
              <div className="h-6 w-32 rounded bg-muted"></div>
              <div className="h-10 w-full rounded-lg bg-muted"></div>
              <div className="h-6 w-32 rounded bg-muted"></div>
              <div className="h-10 w-full rounded-lg bg-muted"></div>
            </AdminCardContent>
          </AdminCard>
        </div>
      </AdminLayout>
    );
  }

  if (error && !program) {
    return (
      <AdminLayout title="Viga" description="Programmi ei õnnestunud laadida" showBackButton backPath="/admin/programs">
        <AdminCard>
          <AdminCardContent className="text-center p-8">
            <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-destructive" />
            <h2 className="text-xl font-semibold text-destructive mb-2">Viga programmi laadimisel</h2>
            <p className="text-muted-foreground">{error}</p>
          </AdminCardContent>
        </AdminCard>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout 
      title="Muuda Programmi" 
      description="Halda isikliku treeningprogrammi detaile ja staatust"
      showBackButton
      backPath="/admin/programs"
    >
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-destructive">
          {error}
        </div>
      )}

      {/* User Info */}
      {userProfile && (
        <AdminCard>
          <AdminCardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <UserCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Määratud kasutajale</h3>
                  <p className="text-sm text-muted-foreground">{userProfile.email}</p>
                </div>
              </div>
              <Button
                onClick={handleUnassign}
                variant="outline"
                size="sm"
                disabled={saving || deleting}
                className="flex items-center gap-2"
              >
                <UserMinus className="h-4 w-4" />
                Deaktiveeri
              </Button>
            </div>
          </AdminCardContent>
        </AdminCard>
      )}

      {/* Smart Progression Card */}
      {programProgress && (
        <ProgramProgressCard 
          programProgress={programProgress}
          onAutoProgress={autoProgressProgram}
          onComplete={completeDuePrograms}
          onSettings={() => {
            // Could open a settings modal in future
            toast({
              title: "Settings",
              description: "Progression settings coming soon!",
            });
          }}
        />
      )}

      {/* Reassign Section */}
      <AdminCard>
        <AdminCardHeader>
          <AdminCardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Määra teisele kasutajale
          </AdminCardTitle>
        </AdminCardHeader>
        <AdminCardContent>
          <div className="flex gap-3">
            <input
              type="email"
              value={newAssigneeEmail}
              onChange={(e) => setNewAssigneeEmail(e.target.value)}
              placeholder="Kasutaja e-mail..."
              className="flex-1 rounded-lg border border-input bg-background px-4 py-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
            <Button
              onClick={handleReassign}
              disabled={saving || deleting || !newAssigneeEmail.trim()}
              className="flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Määra ümber
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Sisesta kasutaja e-maili aadress, kellele soovid selle programmi määrata
          </p>
        </AdminCardContent>
      </AdminCard>

      {/* Edit Form */}
      <AdminCard>
        <AdminCardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Programmi pealkiri (valikuline)
              </label>
              <input
                type="text"
                value={titleOverride}
                onChange={(e) => setTitleOverride(e.target.value)}
                placeholder="Sisesta kohandatud pealkiri..."
                className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Kui tühi, kasutatakse malli vaikimisi pealkirja
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                <Calendar className="mr-2 inline h-4 w-4" />
                Alguskuupäev
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-input p-4">
              <div>
                <h4 className="font-medium">Programmi staatus</h4>
                <p className="text-sm text-muted-foreground">
                  Määra, kas programm on kasutajale aktiivne või mitte
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="relative w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <div className="flex gap-3">
              <Button
                onClick={handleDelete}
                variant="destructive"
                disabled={deleting || saving}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {deleting ? "Kustutan..." : "Kustuta programm"}
              </Button>
              
              <Button
                onClick={() => setShowContentEditor(true)}
                variant="outline"
                disabled={saving || deleting}
                className="flex items-center gap-2"
              >
                <Edit3 className="h-4 w-4" />
                Redigeeri sisu
              </Button>
              
              <Button
                onClick={() => navigate(`/admin/programs/${id}/analytics`)}
                variant="outline"
                disabled={saving || deleting}
                className="flex items-center gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                Vaata analytics
              </Button>
            </div>

            <Button
              onClick={handleSave}
              disabled={saving || deleting}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? "Salvestan..." : "Salvesta muudatused"}
            </Button>
          </div>
        </AdminCardContent>
      </AdminCard>

      {/* Program Content Editor Modal */}
      {showContentEditor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <ProgramContentEditor
              programId={id!}
              isOpen={showContentEditor}
              onOpenChange={setShowContentEditor}
              onSuccess={() => {
                setShowContentEditor(false);
                // Optionally reload program data
                loadProgram();
              }}
            />
          </div>
        </div>
      )}
    </AdminLayout>
  );
}