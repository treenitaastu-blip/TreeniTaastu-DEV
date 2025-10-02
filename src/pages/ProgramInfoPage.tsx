import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Target, 
  Calendar, 
  Trophy, 
  Users, 
  CheckCircle, 
  ArrowRight,
  Clock,
  BookOpen,
  Dumbbell,
  Heart
} from 'lucide-react';

export default function ProgramInfoPage() {
  const features = [
    {
      icon: Calendar,
      title: "12-nädalane programm",
      description: "Struktureeritud treening, mis viib sind sammhaaval eesmärgini"
    },
    {
      icon: Target,
      title: "Personaalne lähenemine",
      description: "Programm kohandub sinu tasemele ja edeneb sinuga kaasa"
    },
    {
      icon: BookOpen,
      title: "Detailsed juhendid",
      description: "Iga harjutus on selgelt kirjeldatud koos videojuhenditega"
    },
    {
      icon: Trophy,
      title: "Edenemise jälgimine",
      description: "Näe oma arengut ja saavutusi iga nädal"
    }
  ];

  const benefits = [
    "Lihasjõu kasv ja keha kujundamine",
    "Parem kehahoiak ja liikuvus", 
    "Suurenenud energia ja vastupidavus",
    "Stressivaba ja meeldiv treenimine",
    "Professionaalne toetus kogu protsessi vältel"
  ];

  const whoIsItFor = [
    "Algajad, kes alustavad treeningutega",
    "Kogenud sportlased, kes soovivad struktuuri",
    "Inimesed, kellel on vähe aega, kuid soovivad tulemusi",
    "Need, kes tahavad treenida kodus või jõusaalis"
  ];

  return (
    <div className="min-h-screen p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4" variant="secondary">
            <Heart className="w-4 h-4 mr-2" />
            Treenitaastu Programm
          </Badge>
          <h1 className="text-4xl font-bold mb-4">
            12-nädalane struktureeritud treninguprogramm
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Professionaalselt koostatud programm, mis viib sind sammhaaval tugevamate tulemusteni. 
            Sobib nii algajatele kui ka kogenud sportlastele.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {features.map((feature, index) => (
            <Card key={index} className="border-0 shadow-soft">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* What you get */}
        <Card className="mb-12 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Dumbbell className="h-6 w-6" />
              Mida saad programmiga
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3">Tulemused:</h4>
                <ul className="space-y-2">
                  {benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-3">Kellele sobib:</h4>
                <ul className="space-y-2">
                  {whoIsItFor.map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Users className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Program structure preview */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Programmi ülesehitus
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-secondary/50 rounded-lg">
                <div className="text-2xl font-bold text-primary mb-1">1-4</div>
                <div className="font-medium mb-2">Alustamine</div>
                <div className="text-sm text-muted-foreground">
                  Põhiliikumiste õppimine ja tehniku omandamine
                </div>
              </div>
              <div className="text-center p-4 bg-secondary/50 rounded-lg">
                <div className="text-2xl font-bold text-primary mb-1">5-8</div>
                <div className="font-medium mb-2">Areng</div>
                <div className="text-sm text-muted-foreground">
                  Koormuse suurendamine ja jõu kasvatamine
                </div>
              </div>
              <div className="text-center p-4 bg-secondary/50 rounded-lg">
                <div className="text-2xl font-bold text-primary mb-1">9-12</div>
                <div className="font-medium mb-2">Tippvorm</div>
                <div className="text-sm text-muted-foreground">
                  Tulemuste maksimeerimine ja keha kujundamine
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <Card className="text-center bg-gradient-to-br from-primary/10 to-secondary/20 border-primary/30">
          <CardContent className="p-8">
            <h3 className="text-2xl font-bold mb-4">
              Valmis alustama oma treeninguteed?
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Liitu täisprogrammiga ja saa ligipääs kõikidele harjutustele, 
              jälgimisvahenditele ja professionaalsele toetusele.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link to="/pricing">
                  Vaata hinnaplaane
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/teenused">
                  Professionaalsed teenused
                </Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Kui soovid veel individuaalsemat lähenemist, uuri meie personaaltreeningu võimalusi
            </p>
          </CardContent>
        </Card>

        {/* Back link */}
        <div className="text-center mt-8">
          <Button variant="ghost" asChild>
            <Link to="/home">
              ← Tagasi avalehele
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}