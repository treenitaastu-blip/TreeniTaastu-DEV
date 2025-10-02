import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Instagram, Users, Heart, MessageCircle } from "lucide-react";

const Kogukond = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Treenitaastu kogukond
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Ühenda end nendega, kes mõistavad kontoritöötaja väljakutseid. Siin jagame praktilisi nõuandeid, 
          motiveerivaid lugusid ja toetame üksteist tervislikuma eluviisi poole liikumisel.
        </p>
      </div>

      {/* Main Community Card */}
      <div className="max-w-4xl mx-auto">
        <Card className="bg-gradient-card shadow-strong border-0 mb-8">
          <CardHeader className="text-center pb-6">
            <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <Instagram className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-2xl mb-2">
              Järgi meid Instagramis
            </CardTitle>
            <CardDescription className="text-base">
              @treenitaastu - siin jagame harivat sisu, harjutusi ja tervislikke eluviisinäpunäiteid. 
              Ühenda end meiega ja ole kursis meie tegemistega.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Content highlights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-center">
              <div className="space-y-2">
                <div className="text-lg font-semibold text-brand-primary">Hariv sisu</div>
                <div className="text-sm text-muted-foreground">
                  Teaduspõhised faktid ja praktilised nõuanded kontoritöötajate tervisele
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-lg font-semibold text-brand-primary">Harjutused</div>
                <div className="text-sm text-muted-foreground">
                  Lihtsad ja tõhusad harjutused, mida saab teha kontoris või kodus
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-lg font-semibold text-brand-primary">Eluviisinõuanded</div>
                <div className="text-sm text-muted-foreground">
                  Väikesed muudatused igapäevaelus, mis toovad suuri tulemusi
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-lg font-semibold text-brand-primary">Kogukond</div>
                <div className="text-sm text-muted-foreground">
                  Suhtle meiega, jaga oma kogemusi ja saa inspiratsiooni
                </div>
              </div>
            </div>

            {/* Call to Action */}
            <div className="text-center">
              <Button 
                variant="outline" 
                size="lg"
                className="mb-4 border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white"
                onClick={() => window.open('https://instagram.com/treenitaastu', '_blank')}
              >
                <Instagram className="w-5 h-5 mr-2" />
                Vaata meie Instagrami
              </Button>
              
              <p className="text-sm text-muted-foreground">
                Jälgi meie tegemisi ja saa väärtuslikku sisu otse telefoni
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Community Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Educational Content */}
          <Card className="text-center hover:shadow-medium transition-all duration-200">
            <CardHeader>
              <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Heart className="w-8 h-8 text-success" />
              </div>
              <CardTitle className="text-lg">Hariv sisu</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Jagame teaduspõhiseid faktideid, uurimusi ja praktilisi nõuandeid, mis aitavad sul teha teadlikke otsuseid oma tervise heaks.
              </CardDescription>
            </CardContent>
          </Card>

          {/* Exercise Tips */}
          <Card className="text-center hover:shadow-medium transition-all duration-200">
            <CardHeader>
              <div className="w-16 h-16 bg-brand-primary/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users className="w-8 h-8 text-brand-primary" />
              </div>
              <CardTitle className="text-lg">Harjutused & Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Lihtsad ja kiired harjutused, mida saab teha kontoris, kodus või väikeses ruumis. Kaasame ka toitumise ja une näpunäiteid.
              </CardDescription>
            </CardContent>
          </Card>

          {/* Community Connection */}
          <Card className="text-center hover:shadow-medium transition-all duration-200">
            <CardHeader>
              <div className="w-16 h-16 bg-warning/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <MessageCircle className="w-8 h-8 text-warning" />
              </div>
              <CardTitle className="text-lg">Ühendus & Uudised</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Suhtle meiega, küsi küsimusi ja ole kursis meie projektide ning uuendustega. Jagame ka kogukonna lugusid ja edusamme.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Why Follow Us */}
        <Card className="mt-8 bg-muted/30">
          <CardHeader>
            <CardTitle className="text-lg">Miks meid jälgida?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-brand-primary rounded-full mt-2 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                Saad regulaarset, kvaliteetset sisu, mis on spetsiaalselt koostatud kontoritöötajate vajadustele.
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-brand-primary rounded-full mt-2 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                Oled esimeste hulgas kursis meie uute programmide, teenuste ja võimalustega.
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-brand-primary rounded-full mt-2 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                Saad osaleda meie kogukonna diskussioonides ja jagada oma kogemusi teiste samameelsetega.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Kogukond;