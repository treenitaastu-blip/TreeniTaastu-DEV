import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Mail, Phone, User, MessageSquare } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function ServicesPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    service: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const services = [
    {
      id: "personal-coaching",
      name: "Personaaltreening 1:1",
      price: "50€",
      description: "Individuaalne treeningkohtumine personaaltreeneriga"
    },
    {
      id: "counseling",
      name: "60-minutiline nõustamine",
      price: "40€", 
      description: "Põhjalik nõustamine treeningu ja toitumise küsimustes"
    },
    {
      id: "training-plan",
      name: "4-nädalane treeningplaan",
      price: "80€",
      description: "Isikupärastatud treeningplaan 4 nädalaks"
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          access_key: "43bdd7e8-c2c4-4680-b0cf-eb7b49a6275e",
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          service: formData.service,
          message: formData.message,
          subject: `Uus teenuse taotlus: ${formData.service}`,
        }),
      });

      if (response.ok) {
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
      } else {
        throw new Error("Failed to submit");
      }
    } catch (error) {
      toast({
        title: "Viga",
        description: "Taotluse saatmine ebaõnnestus. Palun proovige uuesti.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
            <h2 className="text-2xl font-semibold mb-6">Saadaolevad teenused</h2>
            {services.map((service) => (
              <Card key={service.id} className="border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{service.name}</CardTitle>
                      <p className="text-muted-foreground mt-2">{service.description}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-primary">{service.price}</span>
                    </div>
                  </div>
                </CardHeader>
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
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      required
                      placeholder="Sinu täisnimi"
                    />
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
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      required
                      placeholder="sinu@email.com"
                    />
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
                  <Select value={formData.service} onValueChange={(value) => handleInputChange("service", value)}>
                    <SelectTrigger>
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
