import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";


interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceType: 'initial_assessment' | 'personal_program' | 'monthly_support';
  serviceName: string;
}

export function BookingModal({ isOpen, onClose, serviceType, serviceName }: BookingModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<'form' | 'confirmation'>('form');
  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: user?.email || '',
    clientPhone: '',
    experience: '',
    goals: '',
    healthConditions: '',
    preferredTime: ''
  });
  const [loading, setLoading] = useState(false);

  const handleFormSubmit = async () => {
    if (!formData.clientName || !formData.clientEmail || !formData.preferredTime) {
      toast({
        title: "Viga",
        description: "Palun täitke kõik kohustuslikud väljad",
        variant: "destructive"
      });
      return;
    }

    if (!user) {
      toast({
        title: "Sisselogimine vajalik",
        description: "Palun logige sisse, et broneeringut vormistada",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Store form data in session storage for after payment
      sessionStorage.setItem('bookingFormData', JSON.stringify({
        ...formData,
        serviceName,
        serviceType
      }));

      // Call create-checkout with counseling price
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          priceId: "price_1SBCpECirvfSO0IRX4tqictw" // Online counseling price ID
        }
      });

      if (error) throw error;

      if (data?.url) {
        // Redirect to Stripe checkout
        window.open(data.url, '_blank');
        setStep('confirmation');
      } else {
        throw new Error("Checkout URL not received");
      }

    } catch (error: any) {
      toast({
        title: "Viga",
        description: error.message || "Makse ettevalmistamine ebaõnnestus",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setStep('form');
    setFormData({
      clientName: '',
      clientEmail: user?.email || '',
      clientPhone: '',
      experience: '',
      goals: '',
      healthConditions: '',
      preferredTime: ''
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <div className="p-4 sm:p-6">
          <DialogHeader className="mb-4 sm:mb-6">
            <DialogTitle className="text-lg sm:text-xl">Broneerige: {serviceName}</DialogTitle>
          </DialogHeader>

          {step === 'form' && (
            <div className="space-y-4">
              <div className="bg-primary/10 p-4 rounded-lg mb-4">
                <h4 className="font-medium mb-2">📝 Täitke andmed enne maksmist</h4>
                <p className="text-sm text-muted-foreground">
                  Pärast andmete täitmist suunatakse teid Stripe'i maksma
                </p>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="clientName">Nimi *</Label>
                  <Input
                    id="clientName"
                    value={formData.clientName}
                    onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                    placeholder="Teie nimi"
                  />
                </div>
                <div>
                  <Label htmlFor="clientEmail">E-post *</Label>
                  <Input
                    id="clientEmail"
                    type="email"
                    value={formData.clientEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, clientEmail: e.target.value }))}
                    placeholder="teie@email.ee"
                  />
                </div>
                <div>
                  <Label htmlFor="clientPhone">Telefon</Label>
                  <Input
                    id="clientPhone"
                    value={formData.clientPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, clientPhone: e.target.value }))}
                    placeholder="+372 12345678"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="preferredTime">Eelistatud aeg *</Label>
                <Select onValueChange={(value) => setFormData(prev => ({ ...prev, preferredTime: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Valige sobiv aeg" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Kolmapäev 15:30">Kolmapäev 15:30</SelectItem>
                    <SelectItem value="Kolmapäev 16:00">Kolmapäev 16:00</SelectItem>
                    <SelectItem value="Kolmapäev 16:30">Kolmapäev 16:30</SelectItem>
                    <SelectItem value="Kolmapäev 17:00">Kolmapäev 17:00</SelectItem>
                    <SelectItem value="Kolmapäev 17:30">Kolmapäev 17:30</SelectItem>
                    <SelectItem value="Laupäev 15:30">Laupäev 15:30</SelectItem>
                    <SelectItem value="Laupäev 16:00">Laupäev 16:00</SelectItem>
                    <SelectItem value="Laupäev 16:30">Laupäev 16:30</SelectItem>
                    <SelectItem value="Laupäev 17:00">Laupäev 17:00</SelectItem>
                    <SelectItem value="Laupäev 17:30">Laupäev 17:30</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="experience">Treeningukogemus</Label>
                <Select onValueChange={(value) => setFormData(prev => ({ ...prev, experience: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Valige oma kogemus" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Algaja</SelectItem>
                    <SelectItem value="intermediate">Keskmine</SelectItem>
                    <SelectItem value="advanced">Kõrgtase</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="goals">Eesmärgid</Label>
                <Textarea
                  id="goals"
                  value={formData.goals}
                  onChange={(e) => setFormData(prev => ({ ...prev, goals: e.target.value }))}
                  placeholder="Kirjeldage oma treeningu eesmärke..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="healthConditions">Terviseseisund ja vigastused</Label>
                <Textarea
                  id="healthConditions"
                  value={formData.healthConditions}
                  onChange={(e) => setFormData(prev => ({ ...prev, healthConditions: e.target.value }))}
                  placeholder="Kirjeldage olulisi terviseprobleeme või vigastusi..."
                  rows={3}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-4">
                <Button onClick={resetAndClose} variant="outline" className="flex-1 order-2 sm:order-1">
                  Tühista
                </Button>
                <Button 
                  onClick={handleFormSubmit} 
                  className="flex-1 order-1 sm:order-2"
                  disabled={loading}
                >
                  {loading ? "Ümbersuunamine..." : "Jätka maksmisega"}
                </Button>
              </div>
            </div>
          )}

          {step === 'confirmation' && (
            <div className="space-y-4 text-center py-6">
              <div className="text-primary text-6xl">💳</div>
              <h3 className="text-xl font-semibold">Suunatud maksmisele!</h3>
              <div className="bg-muted p-4 rounded-lg text-left">
                <h4 className="font-medium mb-2">Järgmised sammud:</h4>
                <div className="text-sm space-y-2">
                  <p>1. Sooritke makse Stripe'is</p>
                  <p>2. Pärast edukat makset võtame teiega ühendust</p>
                  <p>3. Kinnitame broneeringu detailid</p>
                </div>
              </div>
              <p className="text-muted-foreground text-sm">
                Teie andmed on salvestatud ja võtame teiega ühendust pärast makse sooritamist.
              </p>
              <Button onClick={resetAndClose} className="w-full">
                Sulge
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}