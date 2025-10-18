import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { WEB3FORMS_CONFIG } from '@/config/web3forms';
import { Loader2, Send, CheckCircle, Users, Dumbbell, FileText, Calendar, Phone, Mail, User } from 'lucide-react';

interface ServiceOption {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  price?: string;
  duration?: string;
}

const serviceOptions: ServiceOption[] = [
  {
    id: 'online-consultation',
    name: 'Online konsultatsioonid',
    description: 'Individuaalne konsultatsioon videokõne kaudu. Analüüsin sinu eesmärke, toitumist ja treeningplaani.',
    icon: <Users className="h-6 w-6" />,
    price: '40€',
    duration: '60 min'
  },
  {
    id: 'personal-training-gym',
    name: '1:1 personaaltreening jõusaalis',
    description: 'Individuaalne treening jõusaalis minu juhendamisel. Kohandatud harjutused ja tehnikaõpetus.',
    icon: <Dumbbell className="h-6 w-6" />,
    price: '50€',
    duration: '60 min'
  },
  {
    id: 'training-plan-creation',
    name: 'Personaaltreeningu plaan (1 kuu)',
    description: 'Täielik treeningplaan sinu eesmärkide ja võimaluste järgi. Sisaldab harjutusi, kordusi ja edenemist.',
    icon: <FileText className="h-6 w-6" />,
    price: '80€',
    duration: '1 kuu'
  }
];

interface FormData {
  selectedServices: string[];
  name: string;
  email: string;
  phone: string;
  message: string;
  preferredTime: string;
  experience: string;
  goals: string;
}

export default function ServicesPage() {
  const { toast } = useToast();
  const [formData, setFormData] = useState<FormData>({
    selectedServices: [],
    name: '',
    email: '',
    phone: '',
    message: '',
    preferredTime: '',
    experience: '',
    goals: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleServiceToggle = (serviceId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedServices: prev.selectedServices.includes(serviceId)
        ? prev.selectedServices.filter(id => id !== serviceId)
        : [...prev.selectedServices, serviceId]
    }));
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getSelectedServicesInfo = () => {
    return serviceOptions.filter(service => 
      formData.selectedServices.includes(service.id)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.selectedServices.length === 0) {
      toast({
        title: "Vali vähemalt üks teenus",
        description: "Palun vali vähemalt üks teenus, millest soovid rohkem teada saada.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.name || !formData.email) {
      toast({
        title: "Täida kohustuslikud väljad",
        description: "Nimi ja e-posti aadress on kohustuslikud.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Check if Web3Forms access key is configured
      if (!WEB3FORMS_CONFIG.ACCESS_KEY) {
        throw new Error('Web3Forms access key not configured. Please set VITE_WEB3FORMS_ACCESS_KEY environment variable.');
      }

      const selectedServicesInfo = getSelectedServicesInfo();
      
      const formPayload = {
        access_key: WEB3FORMS_CONFIG.ACCESS_KEY,
        name: formData.name,
        email: formData.email,
        message: `
Uus teenuse päring:

Valitud teenused:
${selectedServicesInfo.map(service => `- ${service.name} (${service.price}, ${service.duration})`).join('\n')}

Kontaktandmed:
Nimi: ${formData.name}
E-post: ${formData.email}
Telefon: ${formData.phone || 'Määramata'}

Lisainfo:
Eelistatud aeg: ${formData.preferredTime || 'Määramata'}
Kogemus: ${formData.experience || 'Määramata'}
Eesmärgid: ${formData.goals || 'Määramata'}

Sõnum:
${formData.message || 'Sõnum puudub'}

---
Saadetud: ${new Date().toLocaleString('et-EE')}
        `.trim()
      };

      const response = await fetch(WEB3FORMS_CONFIG.ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formPayload)
      });

      const result = await response.json();
      if (result.success) {
        setIsSubmitted(true);
        toast({
          title: "Päring saadetud!",
          description: "Sinu päring on edukalt saadetud. Võtame sinuga ühendust 24 tunni jooksul.",
        });
      } else {
        throw new Error('Form submission failed');
      }
    } catch (error) {
      // Use secure logger instead of console.error
      const { error: logError } = await import("@/utils/secureLogger");
      logError('Error submitting services form', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        selectedServices: formData.selectedServices.length
      });
      toast({
        title: "Viga",
        description: "Päringu saatmine ebaõnnestus. Palun proovi uuesti või võta meiega otse ühendust.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
        <div className="max-w-2xl mx-auto">
          <Card className="mt-20">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              <CardTitle className="text-2xl text-green-600">Päring saadetud!</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                Täname sinu huvi meie teenuste vastu! Võtame sinuga ühendust 24 tunni jooksul.
              </p>
              <Button 
                onClick={() => {
                  setIsSubmitted(false);
                  setFormData({
                    selectedServices: [],
                    name: '',
                    email: '',
                    phone: '',
                    message: '',
                    preferredTime: '',
                    experience: '',
                    goals: ''
                  });
                }}
                variant="outline"
              >
                Saada uus päring
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-2 sm:p-4">
      <div className="max-w-4xl mx-auto">
        <Card className="mt-4 sm:mt-20">
          <CardHeader className="text-center p-4 sm:p-6">
            <CardTitle className="text-2xl sm:text-3xl font-bold">Meie teenused</CardTitle>
            <p className="text-muted-foreground text-sm sm:text-base">
              Vali teenused, millest soovid rohkem teada saada
            </p>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
              {/* Service Selection */}
              <div className="space-y-4">
                <Label className="text-lg font-semibold">Vali teenused</Label>
                <div className="grid gap-4">
                  {serviceOptions.map((service) => (
                    <Card 
                      key={service.id}
                      className={`cursor-pointer transition-all select-none ${
                        formData.selectedServices.includes(service.id)
                          ? 'ring-2 ring-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        handleServiceToggle(service.id);
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <Checkbox
                            checked={formData.selectedServices.includes(service.id)}
                            readOnly
                            className="mt-1 pointer-events-none w-4 h-4 sm:w-5 sm:h-5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                              <div className="flex items-center space-x-2">
                                {service.icon}
                                <h3 className="text-base sm:text-lg font-semibold">{service.name}</h3>
                              </div>
                              {service.price && (
                                <span className="text-primary font-bold text-sm sm:text-base">{service.price}</span>
                              )}
                            </div>
                            <p className="text-muted-foreground text-sm mb-2 leading-relaxed">
                              {service.description}
                            </p>
                            {service.duration && (
                              <div className="flex items-center space-x-2 text-xs sm:text-sm text-muted-foreground">
                                <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                                <span>{service.duration}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <Label className="text-lg font-semibold">Kontaktandmed</Label>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nimi *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="Sinu nimi"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-post *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="sinu@email.com"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefon</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="+372 5xxx xxxx"
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="preferredTime">Eelistatud aeg</Label>
                    <Input
                      id="preferredTime"
                      value={formData.preferredTime}
                      onChange={(e) => handleInputChange('preferredTime', e.target.value)}
                      placeholder="nt. Õhtud, nädalavahetused"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-4">
                <Label className="text-lg font-semibold">Lisainfo</Label>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="experience">Treeningkogemus</Label>
                    <Input
                      id="experience"
                      value={formData.experience}
                      onChange={(e) => handleInputChange('experience', e.target.value)}
                      placeholder="nt. Algaja, 1 aasta kogemus"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="goals">Eesmärgid</Label>
                    <Input
                      id="goals"
                      value={formData.goals}
                      onChange={(e) => handleInputChange('goals', e.target.value)}
                      placeholder="nt. Kaalulangus, lihasmassi kasv"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Sõnum</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => handleInputChange('message', e.target.value)}
                    placeholder="Lisa siia kõik, mida soovid meile öelda..."
                    rows={4}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-center pt-6">
                <Button
                  type="submit"
                  size="lg"
                  disabled={isSubmitting}
                  className="min-w-[200px]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saadan...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Saada päring
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
