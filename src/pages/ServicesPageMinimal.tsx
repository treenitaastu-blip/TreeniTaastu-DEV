import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Send, CheckCircle } from 'lucide-react';

export default function ServicesPageMinimal() {
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const services = [
    {
      id: 'online-consultation',
      name: 'Online konsultatsioonid',
      description: 'Individuaalne konsultatsioon videokõne kaudu.',
      price: '40€',
      duration: '60 min'
    },
    {
      id: 'personal-training-gym',
      name: '1:1 personaaltreening jõusaalis',
      description: 'Individuaalne treening jõusaalis minu juhendamisel.',
      price: '50€',
      duration: '60 min'
    },
    {
      id: 'training-plan-creation',
      name: 'Personaaltreeningu plaan (1 kuu)',
      description: 'Täielik treeningplaan sinu eesmärkide ja võimaluste järgi.',
      price: '80€',
      duration: '1 kuu'
    }
  ];

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (selectedServices.length === 0) {
      setError('Palun vali vähemalt üks teenus.');
      return;
    }

    if (!name || !email) {
      setError('Palun täida nõutud väljad.');
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedServicesInfo = services.filter(service => 
        selectedServices.includes(service.id)
      );

      const formPayload = {
        access_key: import.meta.env.VITE_WEB3FORMS_ACCESS_KEY || 'your-access-key-here',
        name: name,
        email: email,
        message: `
Uus teenuse päring:

Valitud teenused:
${selectedServicesInfo.map(service => `- ${service.name} (${service.price}, ${service.duration})`).join('\n')}

Kontaktandmed:
Nimi: ${name}
E-post: ${email}
Telefon: ${phone || 'Määramata'}

Lisainfo:
${message || 'Puudub'}

---
Saadetud: ${new Date().toLocaleString('et-EE')}
        `,
        from_name: name,
        reply_to: email
      };

      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formPayload)
      });

      if (response.ok) {
        setIsSubmitted(true);
      } else {
        throw new Error('Form submission failed');
      }
    } catch (error) {
      setError('Päringu saatmine ebaõnnestus. Palun proovi uuesti.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setIsSubmitted(false);
    setSelectedServices([]);
    setName('');
    setEmail('');
    setPhone('');
    setMessage('');
    setError('');
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-700 mb-2">Edukalt saadetud!</h2>
            <p className="text-gray-600 mb-6">
              Sinu päring on saadetud. Võtame sinuga ühendust 24 tunni jooksul.
            </p>
            <Button onClick={resetForm} className="w-full">
              Saada uus päring
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="text-center p-4 sm:p-6">
            <CardTitle className="text-2xl sm:text-3xl font-bold">Meie teenused</CardTitle>
            <p className="text-muted-foreground text-sm sm:text-base">
              Vali teenused, millest soovid rohkem teada saada
            </p>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              {/* Service Selection */}
              <div className="space-y-4">
                <Label className="text-lg font-semibold">Vali teenused</Label>
                <div className="grid gap-4">
                  {services.map((service) => (
                    <Card 
                      key={service.id}
                      className={`cursor-pointer transition-all select-none ${
                        selectedServices.includes(service.id)
                          ? 'ring-2 ring-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => toggleService(service.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <div className="mt-1">
                            <Checkbox
                              checked={selectedServices.includes(service.id)}
                              className="pointer-events-none"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                              <div className="flex items-center space-x-2">
                                <h3 className="text-base sm:text-lg font-semibold">{service.name}</h3>
                              </div>
                              <span className="text-primary font-bold text-sm sm:text-base">{service.price}</span>
                            </div>
                            <p className="text-muted-foreground text-sm mb-2 leading-relaxed">
                              {service.description}
                            </p>
                            <div className="flex items-center space-x-2 text-xs sm:text-sm text-muted-foreground">
                              <span>{service.duration}</span>
                            </div>
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
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nimi *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Sinu nimi"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-post *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="sinu@email.com"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+372 5xxx xxxx"
                  />
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-4">
                <Label className="text-lg font-semibold">Lisainfo</Label>
                <div className="space-y-2">
                  <Label htmlFor="message">Sõnum</Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Kirjelda oma eesmärke, kogemust või küsimusi..."
                    rows={4}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isSubmitting}
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
