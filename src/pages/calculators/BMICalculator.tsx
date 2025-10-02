import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calculator } from 'lucide-react';

export default function BMICalculator() {
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [bmi, setBmi] = useState<number | null>(null);

  const calculateBMI = () => {
    const h = parseFloat(height) / 100; // convert cm to m
    const w = parseFloat(weight);
    
    if (h > 0 && w > 0) {
      const bmiValue = w / (h * h);
      setBmi(Math.round(bmiValue * 10) / 10);
    }
  };

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { category: 'Alakaal', color: 'text-blue-600' };
    if (bmi < 25) return { category: 'Normaalkaal', color: 'text-green-600' };
    if (bmi < 30) return { category: 'Ülekaal', color: 'text-yellow-600' };
    return { category: 'Rasvumine', color: 'text-red-600' };
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">KMI Kalkulaator</h1>
        <p className="text-muted-foreground">
          Kehamassiindeks (KMI) aitab hinnata, kas teie kehakaal on tervisliku piirkonnas.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Arvuta oma KMI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="height">Pikkus (cm)</Label>
              <Input
                id="height"
                type="number"
                placeholder="175"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">Kaal (kg)</Label>
              <Input
                id="weight"
                type="number"
                placeholder="70"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
          </div>
          
          <Button onClick={calculateBMI} className="w-full">
            Arvuta KMI
          </Button>

          {bmi && (
            <div className="bg-muted/50 rounded-lg p-6 text-center">
              <div className="text-4xl font-bold mb-2">{bmi}</div>
              <div className={`text-lg font-semibold ${getBMICategory(bmi).color}`}>
                {getBMICategory(bmi).category}
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                <p className="mb-2">KMI kategooriad:</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>Alakaal: &lt; 18.5</div>
                  <div>Normaalkaal: 18.5-24.9</div>
                  <div>Ülekaal: 25-29.9</div>
                  <div>Rasvumine: ≥ 30</div>
                </div>
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            <p className="font-semibold mb-1">Märkus:</p>
            <p>
              KMI on üldine suunav näitaja ega arvesta lihasmasse, luude tihedust ega rasva jaotust. 
              Konsulteerige arsti või toitumisspetsialistiga personaalsete soovituste saamiseks.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}