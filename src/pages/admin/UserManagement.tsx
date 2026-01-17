// src/pages/admin/UserManagement.tsx
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getAdminClient } from "@/utils/adminClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { Users, Plus, Pause, Play, Trash2, Search, Mail, BarChart3 } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminData, UserProfile } from "@/hooks/useAdminData";

// Types (UserProfile imported from useAdminData hook)

type UserEntitlement = {
  user_id: string;
  product: string;
  status: string;
  trial_ends_at: string | null;
  expires_at: string | null;
  paused: boolean;
  source: string | null;
  note: string | null;
  created_at: string;
};

type AccessMatrix = {
  user_id: string | null;
  is_admin: boolean | null;
  can_static: boolean | null;
  can_pt: boolean | null;
  reason: string | null;
};

export default function UserManagement() {
  const navigate = useNavigate();
  const { users, loading, error, refetch } = useAdminData();
  const [entitlements, setEntitlements] = useState<UserEntitlement[]>([]);
  const [accessMatrix, setAccessMatrix] = useState<AccessMatrix[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [grantForm, setGrantForm] = useState({
    product: "static",
    status: "active",
    days: 30,
    note: ""
  });

         // Load entitlements and access matrix data
         useEffect(() => {
           const loadEntitlementsData = async () => {
             try {
               const adminClient = getAdminClient();
               
               // Load entitlements using admin function
               const { data: entitlementsData, error: entitlementsError } = await adminClient
                 .rpc('get_admin_entitlements');
               if (entitlementsError) {
                 console.error("Error loading entitlements:", entitlementsError);
               } else {
                 setEntitlements(entitlementsData || []);
               }

               // Load access matrix using admin function
               const { data: accessData, error: accessError } = await adminClient
                 .rpc('get_admin_access_matrix');
               if (accessError) {
                 console.error("Error loading access matrix:", accessError);
               } else {
                 setAccessMatrix(accessData || []);
               }
             } catch (err) {
               console.error("Error loading entitlements data:", err);
             }
           };

           if (users.length > 0) {
             loadEntitlementsData();
           }
         }, [users]);


  // Handle errors from the hook
  useEffect(() => {
    if (error) {
      toast({
        title: "Viga",
        description: "Ei õnnestunud kasutajate andmeid laadida",
        variant: "destructive",
      });
    }
  }, [error]);

  // Grant access to user
  const handleGrantAccess = async () => {
    if (!selectedUser) return;

    try {
      const { error } = await getAdminClient().rpc("admin_set_entitlement_service", {
        p_user: selectedUser.id,
        p_product: grantForm.product,
        p_status: grantForm.status,
        p_days: grantForm.days,
        p_note: grantForm.note || undefined
      });

      if (error) throw error;

      toast({
        title: "Õnnestus",
        description: `Ligipääs edukalt määratud kasutajale ${selectedUser.email || 'tundmatu kasutaja'}`
      });

      setGrantModalOpen(false);
      setSelectedUser(null);
      setGrantForm({ product: "static", status: "active", days: 30, note: "" });
      await refetch();
    } catch (error) {
      console.error("Error granting access:", error);
      toast({
        title: "Viga",
        description: "Ei õnnestunud ligipääsu määrata",
        variant: "destructive"
      });
    }
  };

  // Pause/unpause entitlement
  const handleTogglePause = async (user: UserProfile, product: string, currentlyPaused: boolean) => {
    try {
      const { error } = await getAdminClient().rpc("admin_pause_entitlement_service", {
        p_user: user.id,
        p_product: product,
        p_pause: !currentlyPaused
      });

      if (error) throw error;

      toast({
        title: "Õnnestus",
        description: `Ligipääs ${!currentlyPaused ? "peatatud" : "taastatud"} kasutajale ${user.email || 'tundmatu kasutaja'}`
      });

      await refetch();
    } catch (error) {
      console.error("Error toggling pause:", error);
      toast({
        title: "Viga",
        description: "Ei õnnestunud ligipääsu muuta",
        variant: "destructive"
      });
    }
  };

  // Clear entitlement
  const handleClearAccess = async (user: UserProfile, product: string) => {
    if (!confirm(`Kas oled kindel, et soovid eemaldada ${product} ligipääsu kasutajalt ${user.email || 'tundmatu kasutaja'}?`)) {
      return;
    }

    try {
      const { error } = await getAdminClient().rpc("admin_clear_entitlement_service", {
        p_user: user.id,
        p_product: product
      });

      if (error) throw error;

      toast({
        title: "Õnnestus",
        description: `Ligipääs eemaldatud kasutajalt ${user.email || 'tundmatu kasutaja'}`
      });

      await refetch();
    } catch (error) {
      console.error("Error clearing access:", error);
      toast({
        title: "Viga",
        description: "Ei õnnestunud ligipääsu eemaldada",
        variant: "destructive"
      });
    }
  };

  // Get user entitlements
  const getUserEntitlements = (userId: string) => {
    return entitlements.filter(e => e.user_id === userId);
  };

  // Get user access info
  const getUserAccess = (userId: string) => {
    return accessMatrix.find(a => a.user_id === userId);
  };

  // Filter users based on search
  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    const variants = {
      active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      trialing: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      inactive: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    };

    return (
      <Badge className={variants[status as keyof typeof variants] || variants.inactive}>
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <AdminLayout title="Kasutajate haldus" description="Halda kasutajate ligipääse ja tellimuseid">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm text-muted-foreground">Laadin kasutajaid...</span>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout 
      title="Kasutajate haldus" 
      description="Halda kasutajate ligipääse ja tellimuseid"
      headerActions={
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {filteredUsers.length} kasutajat
          </span>
        </div>
      }
    >

      {/* Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="user-search"
            name="user-search"
            placeholder="Otsi e-maili või ID järgi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={refetch} variant="outline" size="sm" className="w-full sm:w-auto">
          Uuenda
        </Button>
      </div>

      {/* Users List */}
      <div className="space-y-4">
        {filteredUsers.map((user) => {
          const userEntitlements = getUserEntitlements(user.id);
          const access = getUserAccess(user.id);

          return (
            <Card key={user.id} className="overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <CardTitle className="text-base break-all">{user.email || 'No email'}</CardTitle>
                      {user.role === "admin" && (
                        <Badge variant="secondary">Admin</Badge>
                      )}
                    </div>
                    <CardDescription>
                      Registreeritud: {new Date(user.created_at).toLocaleDateString("et-EE")}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    {user.role !== "admin" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/admin/client-analytics/${user.id}`)}
                        className="w-full sm:w-auto"
                      >
                        <BarChart3 className="h-4 w-4 mr-1" />
                        Analüütika
                      </Button>
                    )}
                    <Dialog open={grantModalOpen} onOpenChange={setGrantModalOpen}>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          onClick={() => setSelectedUser(user)}
                          className="w-full sm:w-auto"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Lisa ligipääs
                        </Button>
                      </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Lisa ligipääs</DialogTitle>
                        <DialogDescription>
                          {selectedUser?.email || 'Tundmatu kasutaja'} kasutajale ligipääsu andmine
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="product">Toode</Label>
                          <Select value={grantForm.product} onValueChange={(value) => 
                            setGrantForm(prev => ({ ...prev, product: value }))
                          }>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="static">Static Program</SelectItem>
                              <SelectItem value="pt">Personal Training</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="status">Staatus</Label>
                          <Select value={grantForm.status} onValueChange={(value) => 
                            setGrantForm(prev => ({ ...prev, status: value }))
                          }>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="trialing">Trialing</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="days">Kestus (päeva)</Label>
                          <Input
                            type="number"
                            value={grantForm.days}
                            onChange={(e) => setGrantForm(prev => ({ ...prev, days: parseInt(e.target.value) || 0 }))}
                            min="1"
                            max="365"
                          />
                        </div>

                        <div>
                          <Label htmlFor="note">Märkus (valikuline)</Label>
                          <Input
                            value={grantForm.note}
                            onChange={(e) => setGrantForm(prev => ({ ...prev, note: e.target.value }))}
                            placeholder="Näiteks: Sularahas tasutud"
                          />
                        </div>
                      </div>

                      <DialogFooter>
                        <Button variant="outline" onClick={() => {
                          setGrantModalOpen(false);
                          setSelectedUser(null);
                          setGrantForm({ product: "static", status: "active", days: 30, note: "" });
                        }}>
                          Tühista
                        </Button>
                        <Button onClick={handleGrantAccess}>
                          Anna ligipääs
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-6">
                  {/* Access Summary */}
                  <div className="space-y-3 p-4 rounded-lg bg-muted/30 border">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-sm">Ligipääs:</span>
                      {access?.can_static && <Badge className="text-xs">Static</Badge>}
                      {access?.can_pt && <Badge className="text-xs">PT</Badge>}
                      {access?.is_admin && <Badge variant="secondary" className="text-xs">Admin</Badge>}
                      {!access?.can_static && !access?.can_pt && !access?.is_admin && (
                        <span className="text-muted-foreground text-sm">Puudub</span>
                      )}
                    </div>
                    {access?.reason && (
                      <div className="text-xs text-muted-foreground pt-1 border-t border-muted-foreground/20">
                        Põhjus: {access.reason}
                      </div>
                    )}
                  </div>

                  {/* Entitlements */}
                  {userEntitlements.length > 0 ? (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-foreground">Aktiivsed tellimused:</h4>
                      <div className="space-y-3">
                        {userEntitlements.map((ent) => (
                          <div
                            key={`${ent.user_id}-${ent.product}`}
                            className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 p-4 border rounded-lg bg-card"
                          >
                            <div className="space-y-2 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className="text-xs">{ent.product}</Badge>
                                <StatusBadge status={ent.status} />
                                {ent.paused && <Badge variant="secondary" className="text-xs">Peatatud</Badge>}
                              </div>
                              <div className="text-xs text-muted-foreground space-y-1">
                                {ent.status === "trialing" && ent.trial_ends_at && (
                                  <div>Trial kuni: {new Date(ent.trial_ends_at).toLocaleDateString("et-EE")}</div>
                                )}
                                {ent.status === "active" && ent.expires_at && (
                                  <div>Kehtib kuni: {new Date(ent.expires_at).toLocaleDateString("et-EE")}</div>
                                )}
                                {ent.note && <div>Märkus: {ent.note}</div>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 lg:flex-shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleTogglePause(user, ent.product, ent.paused)}
                                className="flex-1 lg:flex-initial"
                              >
                                {ent.paused ? (
                                  <><Play className="h-4 w-4 mr-1" />Taasta</>
                                ) : (
                                  <><Pause className="h-4 w-4 mr-1" />Peata</>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleClearAccess(user, ent.product)}
                                className="flex-1 lg:flex-initial"
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Eemalda
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 px-4 border rounded-lg bg-muted/20">
                      <div className="text-sm text-muted-foreground">
                        Ligipääsud puuduvad
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AdminLayout>
  );
}