import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Calculator, Activity, Zap } from 'lucide-react';

export default function CalculatorsPage() {
  const calculators = [
    {
      title: 'KMI Kalkulaator',
      description: 'Arvuta oma kehamassiindeks ja hinda oma kehakaalu tervislikku taset',
      icon: Calculator,
      path: '/kalkulaatorid/kmi',
      color: 'bg-blue-50 hover:bg-blue-100 border-blue-200'
    },
    {
      title: '1KM Kalkulaator',
      description: 'Leia oma ühe korduse maksimum Brzycki valemi abil treeningute planeerimiseks',
      icon: Activity,
      path: '/kalkulaatorid/1km',
      color: 'bg-green-50 hover:bg-green-100 border-green-200'
    },
    {
      title: 'EER Kalkulaator',
      description: 'Teaduslikult valideeritud tööriist päevase kalorivajaduse määramiseks',
      icon: Zap,
      path: '/kalkulaatorid/eer',
      color: 'bg-orange-50 hover:bg-orange-100 border-orange-200'
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Kalkulaatorid</h1>
        <p className="text-muted-foreground">
          Kasulikud tööriistad oma treeningu ja tervise jälgimiseks
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {calculators.map((calc) => (
          <Link key={calc.path} to={calc.path}>
            <Card className={`h-full transition-all duration-200 hover:shadow-md ${calc.color}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <calc.icon className="h-6 w-6 text-primary" />
                  </div>
                  {calc.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{calc.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}