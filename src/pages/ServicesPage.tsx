import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Mail, Phone, User, MessageSquare, Package, AlertCircle, CreditCard, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export default function ServicesPage() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    service: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ name?: string; email?: string; service?: string }>({});
  const [showSuccess, setShowSuccess] = useState(false);

  // Stripe Price IDs - TODO: Create these products in Stripe and update the IDs
  // You need to create these products in your Stripe dashboard:
  // 1. Personal Coaching 1:1 (50€ one-time payment)
  // 2. 60-min Counseling (40€ one-time payment)
  // 3. 4-week Training Plan (80€ one-time payment)
  const SERVICES_WITH_STRIPE = {
    "personal-coaching": "price_XXXXX_PERSONAL_COACHING", // TODO: Replace with actual Stripe price ID
    "counseling": "price_XXXXX_COUNSELING", // TODO: Replace with actual Stripe price ID
    "training-plan": "price_XXXXX_TRAINING_PLAN", // TODO: Replace with actual Stripe price ID
  };

  const services = [
    {
      id: "personal-coaching",
      name: "Personaaltreening 1:1",
      price: "50€",
      description: "Individuaalne treeningkohtumine personaaltreeneriga",
      stripePriceId: SERVICES_WITH_STRIPE["personal-coaching"]
    },
    {
      id: "counseling",
      name: "60-minutiline nõustamine",
      price: "40€", 
      description: "Põhjalik nõustamine treeningu ja toitumise küsimustes",
      stripePriceId: SERVICES_WITH_STRIPE["counseling"]
    },
    {
      id: "training-plan",
      name: "4-nädalane treeningplaan",
      price: "80€",
      description: "Isikupärastatud treeningplaan 4 nädalaks",
      stripePriceId: SERVICES_WITH_STRIPE["training-plan"]
    }
  ];

  const validateForm = (): boolean => {
    const newErrors: { name?: string; email?: string; service?: string } = {};
    
    // Validate name
    if (!formData.name || formData.name.trim() === '') {
      newErrors.name = 'Nimi on kohustuslik';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Nimi peab olema vähemalt 2 tähemärki';
    }
    
    // Validate email
    if (!formData.email || formData.email.trim() === '') {
      newErrors.email = 'E-post on kohustuslik';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = 'Palun sisesta kehtiv e-maili aadress';
      }
    }
    
    // Validate service
    if (!formData.service || formData.service.trim() === '') {
      newErrors.service = 'Palun vali teenus';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      toast({
        title: "Palun täida kõik nõutud väljad",
        description: "Kontrolli väljad ja proovi uuesti",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    setErrors({}); // Clear errors when submitting

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          // Required by Web3Forms
          access_key: "43bdd7e8-c2c4-4680-b0cf-eb7b49a6275e",
          subject: `Uus teenuse päring: ${formData.service || "Teenused"}`,
          from_name: formData.name,
          from_email: formData.email,
          replyto: formData.email,
          botcheck: "",
          // Ensure recipient (falls back to dashboard default if omitted)
          to: "treenitaastu@gmail.com",

          // Optional/Custom fields
          phone: formData.phone,
          service: formData.service,
          message: formData.message,
          source: "treeni-taastu-dev",
        }),
      });

      const data = await response.json().catch(() => null);
      console.log("Web3Forms response", { status: response.status, ok: response.ok, data });

      if (response.ok && data?.success) {
        setShowSuccess(true);
        toast({
          title: "Taotlus saadetud!",
          description: "Võtame teiega ühendust 24 tunni jooksul.",
        });
        setFormData({
          name: "",
          email: "",
          phone: "",
          service: "",
          message: ""
        });
        setSelectedServiceId(null);
        // Hide success message after 5 seconds
        setTimeout(() => setShowSuccess(false), 5000);
      } else {
        // Handle different error scenarios
        let errMsg = "Saatmine ebaõnnestus. Palun proovi uuesti.";
        
        if (!response.ok) {
          if (response.status >= 500) {
            errMsg = "Serveri viga. Palun proovi mõne minuti pärast uuesti.";
          } else if (response.status === 429) {
            errMsg = "Liiga palju päringuid. Palun oota mõni minut ja proovi uuesti.";
          } else if (response.status >= 400) {
            errMsg = data?.message || "Vigased andmed. Palun kontrolli välju.";
          }
        } else if (data && !data.success) {
          errMsg = data.message || "Saatmine ebaõnnestus.";
        }
        
        throw new Error(errMsg);
      }
    } catch (error) {
      // Handle network errors separately
      if (error instanceof TypeError && error.message.includes('fetch')) {
        toast({
          title: "Võrgu viga",
          description: "Internetiühenduse viga. Palun kontrolli oma ühendust ja proovi uuesti.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Viga",
          description: error instanceof Error ? error.message : "Taotluse saatmine ebaõnnestus. Palun proovige uuesti.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleServiceCardClick = (serviceId: string, serviceName: string) => {
    setSelectedServiceId(serviceId);
    setFormData(prev => ({ ...prev, service: serviceName }));
  };

  const handlePurchaseService = async (serviceId: string, serviceName: string, priceId: string) => {
    // Check if Stripe price ID is configured
    if (priceId.startsWith('price_XXXXX')) {
      toast({
        title: "Stripe seadistus vajalik",
        description: "See teenus pole veel Stripe'is seadistatud. Palun kontakteeru toega või kasuta kontaktivormi.",
        variant: "destructive",
      });
      // Still allow them to fill out the form as fallback
      handleServiceCardClick(serviceId, serviceName);
      return;
    }

    setCheckoutLoading(serviceId);

    try {
      // Get auth token if user is logged in
      const session = user ? (await supabase.auth.getSession()).data.session : null;
      const headers = session ? {
        Authorization: `Bearer ${session.access_token}`
      } : undefined;

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId },
        ...(headers && { headers })
      });

      if (error) throw error;

      if (data?.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        throw new Error("Checkout URL not received");
      }

    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: "Viga makse algatamisel",
        description: error instanceof Error ? error.message : "Proovi hiljem uuesti või kasuta kontaktivormi",
        variant: "destructive",
      });
      setCheckoutLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
      <div className="max-w-6xl mx-auto py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Personaaltreeningu teenused</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Saavuta oma tervise- ja treeningueesmärgid professionaalse juhendamisega
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Services */}
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold">Teenused</h2>
              <Button asChild variant="outline" className="flex items-center gap-2">
                <Link to="/pricing">
                  <Package className="h-4 w-4" />
                  Vaata kõiki pakette
                </Link>
              </Button>
            </div>
            {services.map((service) => (
              <Card 
                key={service.id} 
                className={`border-2 hover:border-primary/50 transition-colors ${
                  selectedServiceId === service.id 
                    ? 'border-primary bg-primary/5 shadow-md' 
                    : 'hover:shadow-md'
                }`}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{service.name}</CardTitle>
                      <p className="text-muted-foreground mt-2">{service.description}</p>
                    </div>
                    <div className="text-right ml-4">
                      <span className="text-2xl font-bold text-primary">{service.price}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <Button
                    onClick={() => handlePurchaseService(service.id, service.name, service.stripePriceId)}
                    disabled={checkoutLoading === service.id}
                    className="w-full"
                    size="lg"
                  >
                    {checkoutLoading === service.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Laen...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Osta kohe
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleServiceCardClick(service.id, service.name)}
                    className="w-full"
                    size="sm"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Küsita pakkumist
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Contact Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Taotle teenust
              </CardTitle>
            </CardHeader>
            <CardContent>
              {showSuccess && (
                <Alert className="mb-6 bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <strong>Taotlus saadetud!</strong> Võtame teiega ühendust 24 tunni jooksul.
                  </AlertDescription>
                </Alert>
              )}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Nimi *
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => {
                        handleInputChange("name", e.target.value);
                        if (errors.name) {
                          setErrors(prev => ({ ...prev, name: undefined }));
                        }
                      }}
                      required
                      placeholder="Sinu täisnimi"
                      className={errors.name ? "border-destructive" : ""}
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.name}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      E-post *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => {
                        handleInputChange("email", e.target.value);
                        if (errors.email) {
                          setErrors(prev => ({ ...prev, email: undefined }));
                        }
                      }}
                      required
                      placeholder="sinu@email.com"
                      className={errors.email ? "border-destructive" : ""}
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.email}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Telefon
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="+372 5xxx xxxx"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="service">Vali teenus *</Label>
                  <Select 
                    value={formData.service} 
                    onValueChange={(value) => {
                      handleInputChange("service", value);
                      // Find the service ID for the selected service name
                      const selectedService = services.find(s => s.name === value);
                      if (selectedService) {
                        setSelectedServiceId(selectedService.id);
                      }
                      if (errors.service) {
                        setErrors(prev => ({ ...prev, service: undefined }));
                      }
                    }}
                  >
                    <SelectTrigger className={errors.service ? "border-destructive" : ""}>
                      <SelectValue placeholder="Vali teenus" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.name}>
                          {service.name} - {service.price}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.service && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.service}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Lisainfo</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => handleInputChange("message", e.target.value)}
                    placeholder="Kirjelda oma eesmärke, treeningkogemust või muud olulist..."
                    rows={4}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isSubmitting}
                  size="lg"
                >
                  {isSubmitting ? (
                    "Saadan..."
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Saada taotlus
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <h3 className="font-semibold mb-2">Mida saad oodata:</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Vastame 24 tunni jooksul</li>
                  <li>• Isikupärastatud lähenemine</li>
                  <li>• Professionaalne juhendamine</li>
                  <li>• Tulemuste jälgimine ja kohandamine</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
