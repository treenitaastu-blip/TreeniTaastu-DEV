// src/pages/Konto.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import {
  User as UserIcon,
  Mail,
  Calendar,
  Crown,
  CreditCard,
  Settings,
  LogOut,
  Key,
  Loader2,
  Receipt,
} from "lucide-react";
import { profileSchema, validateAndSanitize } from "@/lib/validations";

type Entitlement = {
  user_id?: string;
  product: string;
  status: string;
  trial_ends_at: string | null;
  expires_at: string | null;
  is_active: boolean;
};

type Payment = {
  id: string | number;
  amount_cents: number;
  currency: string | null;
  created_at: string;
  status: string;
};

const Konto = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  const [email, setEmail] = useState<string | null>(null);
  const [joinDate, setJoinDate] = useState<string | null>(null);
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [profile, setProfile] = useState<{ full_name: string; avatar_url: string }>({
    full_name: "",
    avatar_url: "",
  });
  const [editingProfile, setEditingProfile] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);

  const mounted = useRef(false);

  const fetchAll = async () => {
    setErrorText(null);
    setLoading(true);
    try {
      // 1) Auth user
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;

      const user = userRes.user;
      if (!user) {
        setEmail(null);
        setJoinDate(null);
        setEntitlement(null);
        setLoading(false);
        return;
      }

      setEmail(user.email ?? null);
      setJoinDate(user.created_at ?? null);

      // 2) Load profile data
      try {
        const { data: profileData, error: profileErr } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();
        
        if (profileErr && profileErr.code !== "PGRST116") {
          console.warn("Profile loading error:", profileErr);
        }
        
        if (profileData) {
          setProfile({
            full_name: (profileData as any).full_name ?? "",
            avatar_url: (profileData as any).avatar_url ?? "",
          });
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      }

      // 3) Entitlement (try filtering by user_id first; fall back to RLS-only view)
      const q = supabase.from("v_user_entitlement").select("*");

      let ent: Entitlement | null = null;
      try {
        const { data: entRow, error: entErr } = await q
          .eq("user_id", user.id)
          .maybeSingle();
        if (entErr) throw entErr;
        ent = (entRow as unknown as Entitlement) ?? null;
      } catch {
        const { data: entRow2, error: entErr2 } = await supabase
          .from("v_user_entitlement")
          .select("*")
          .maybeSingle();
        if (entErr2) {
          const { data: entRows, error: entManyErr } = await supabase
            .from("v_user_entitlement")
            .select("*")
            .limit(1);
          if (entManyErr) throw entManyErr;
          ent = (entRows?.[0] as unknown as Entitlement) ?? null;
        } else {
          ent = (entRow2 as unknown as Entitlement) ?? null;
        }
      }

      setEntitlement(ent);

      // 4) Load payments data (stubbed for now)
      try {
        // Example (disabled for now):
        // const { data: paymentsData } = await supabase
        //   .from("payments")
        //   .select("id, amount_cents, currency, created_at, status")
        //   .eq("user_id", user.id)
        //   .order("created_at", { ascending: false });
        
        const paymentsData: Payment[] = []; // keep empty for now
        setPayments(paymentsData || []);
      } catch {
        // Table might not exist yet — that's fine.
        setPayments([]);
      } finally {
        setPaymentsLoading(false);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("Konto laadimise viga:", msg);
      setErrorText("Ei saanud konto andmeid laadida. Proovi värskendada.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;

    // Esmane laadimine
    fetchAll();

    // Auth state muutused (login/logout/token refresh)
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      fetchAll();
    });

    // Tab uuesti fookusesse -> värskenda
    const onVis = () => {
      if (document.visibilityState === "visible") fetchAll();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      sub?.subscription?.unsubscribe();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/"; // redirect peale logouti
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    // Validate input using Zod schema
    const validation = validateAndSanitize(profileSchema, profile);
    
    if (!validation.success) {
      toast({
        title: "Valideerimise viga",
        description: validation.errors?.join(", ") || "Palun kontrolli sisestatud andmeid",
        variant: "destructive",
      });
      return;
    }

    setProfileLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Kasutaja ei ole sisse logitud");

      const payload = {
        id: userData.user.id,
        ...validation.data!,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("profiles").upsert(payload);

      if (error) throw error;

      toast({
        title: "Profiil uuendatud",
        description: "Sinu andmed on edukalt salvestatud.",
      });
      setEditingProfile(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Profiili uuendamine ebaõnnestus.";
      toast({
        title: "Viga",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const planStatus = entitlement?.is_active
    ? entitlement.status === "trialing" 
      ? "Tasuta proov"
      : "Aktiivne"
    : "Pole aktiivne";

  const expiryDate = entitlement?.status === "trialing"
    ? entitlement?.trial_ends_at
    : entitlement?.expires_at;

  const initial = useMemo(() => {
    if (!email || email.length === 0) return "U";
    const ch = email.trim()[0];
    return ch ? ch.toUpperCase() : "U";
  }, [email]);

  if (loading) {
    return <div className="p-8 text-center">Laen konto andmeid…</div>;
    }

  if (!email) {
    return (
      <div className="p-8 text-center">
        <p>Sa ei ole sisse logitud.</p>
        <Button asChild className="mt-4">
          <a href="/login">Logi sisse</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 py-4 sm:px-4 sm:py-8 max-w-4xl">
      <div className="mb-6 sm:mb-8">
        <h1 className="mb-2 text-2xl sm:text-3xl font-bold text-foreground">Minu konto</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Halda oma profiili, ligipääse ja maksete teavet.
        </p>
        {errorText && <p className="mt-2 text-sm text-destructive">{errorText}</p>}
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto p-1">
          <TabsTrigger value="profile" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm">
            <UserIcon className="h-4 w-4" />
            <span className="hidden xs:inline">Profiil</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm">
            <Receipt className="h-4 w-4" />
            <span className="hidden xs:inline">Maksed</span>
          </TabsTrigger>
          <TabsTrigger value="account" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm">
            <Crown className="h-4 w-4" />
            <span className="hidden xs:inline">Tellimus</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
        {/* Profiil */}
        <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <UserIcon className="h-5 w-5" />
                <span>Profiili teave</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-primary">
                  <span className="text-xl font-bold text-white">{initial}</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {profile.full_name || email}
                  </h3>
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span className="text-sm">{email}</span>
                  </div>
                  {joinDate && (
                    <div className="mt-1 flex items-center space-x-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm">
                        Liitunud {new Date(joinDate).toLocaleDateString("et-EE")}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {editingProfile ? (
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Täisnimi</Label>
                    <Input
                      id="fullName"
                      value={profile.full_name}
                      onChange={(e) =>
                        setProfile((p) => ({ ...p, full_name: e.target.value }))
                      }
                      placeholder="Sinu nimi"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="avatarUrl">Profiilipildi URL</Label>
                    <Input
                      id="avatarUrl"
                      value={profile.avatar_url}
                      onChange={(e) =>
                        setProfile((p) => ({ ...p, avatar_url: e.target.value }))
                      }
                      placeholder="https://..."
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <Button type="submit" size="sm" disabled={profileLoading} className="w-full sm:w-auto">
                      {profileLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Salvesta
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setEditingProfile(false)}
                      className="w-full sm:w-auto"
                    >
                      Tühista
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setEditingProfile(true)}
                    className="w-full sm:w-auto justify-center sm:justify-start"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Muuda profiili
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    asChild
                    className="w-full sm:w-auto"
                  >
                    <Link to="/change-password" className="flex items-center justify-center sm:justify-start">
                      <Key className="mr-2 h-4 w-4" />
                      Muuda parooli
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleLogout} className="w-full sm:w-auto justify-center sm:justify-start">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logi välja
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Maksete ajalugu</CardTitle>
            </CardHeader>
            <CardContent>
              {paymentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : payments.length > 0 ? (
                <div className="space-y-4">
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div>
                        <p className="font-medium">
                          {(payment.amount_cents / 100).toFixed(2)}{" "}
                          {(payment.currency || "EUR").toUpperCase()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(payment.created_at).toLocaleDateString("et-EE")}
                        </p>
                      </div>
                      <div
                        className={`rounded px-2 py-1 text-sm ${
                          payment.status === "paid"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {payment.status === "paid" ? "Tasutud" : payment.status}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="mb-4 text-muted-foreground">Makseid pole veel tehtud</p>
                  <p className="text-sm text-muted-foreground">
                    Kui oled tasuta prooviperioodi kasutamas, siis makseid ei ole.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="mt-6">
          {/* Tellimus */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Crown className="h-5 w-5" />
                  <span>Tellimuse detailid</span>
                </div>
                <Badge
                  variant="outline"
                  className="border-success/20 bg-success/20 text-success"
                >
                  {planStatus}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="mb-1 text-sm text-muted-foreground">
                    Staatus
                  </div>
                  <div className="font-medium text-foreground">{planStatus}</div>
                </div>
                <div>
                  <div className="mb-1 text-sm text-muted-foreground">
                    {entitlement?.status === "trialing" ? "Proov lõppeb" : "Lõppkuupäev"}
                  </div>
                  <div className="font-medium text-foreground">
                    {expiryDate
                      ? new Date(expiryDate).toLocaleDateString("et-EE")
                      : "-"}
                  </div>
                </div>
                {entitlement?.product && (
                  <div className="sm:col-span-2">
                    <div className="mb-1 text-sm text-muted-foreground">
                      Toode
                    </div>
                    <div className="font-medium text-foreground capitalize">
                      {entitlement.product}
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  asChild
                  className="w-full sm:w-auto"
                >
                  <Link to="/change-password">
                    <Key className="mr-2 h-4 w-4" />
                    Muuda parooli
                  </Link>
                </Button>
                {entitlement?.is_active && entitlement?.status === "active" && (
                  <Button variant="outline" size="sm">Tühista tellimus</Button>
                )}
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logi välja
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Konto;
