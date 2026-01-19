import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calculator, AlertCircle, RotateCcw, Copy, Check } from 'lucide-react';

export default function BMICalculator() {
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [bmi, setBmi] = useState<number | null>(null);
  const [errors, setErrors] = useState<{ height?: string; weight?: string }>({});
  const [copied, setCopied] = useState(false);

  const validateInputs = (): boolean => {
    const newErrors: { height?: string; weight?: string } = {};
    
    const h = parseFloat(height);
    const w = parseFloat(weight);
    
    if (!height || height.trim() === '') {
      newErrors.height = 'Pikkus on kohustuslik';
    } else if (isNaN(h)) {
      newErrors.height = 'Pikkus peab olema number';
    } else if (h <= 0) {
      newErrors.height = 'Pikkus peab olema suurem kui 0';
    } else if (h < 50 || h > 250) {
      newErrors.height = 'Pikkus peab olema vahemikus 50-250 cm';
    }
    
    if (!weight || weight.trim() === '') {
      newErrors.weight = 'Kaal on kohustuslik';
    } else if (isNaN(w)) {
      newErrors.weight = 'Kaal peab olema number';
    } else if (w <= 0) {
      newErrors.weight = 'Kaal peab olema suurem kui 0';
    } else if (w < 10 || w > 500) {
      newErrors.weight = 'Kaal peab olema vahemikus 10-500 kg';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateBMI = () => {
    // Clear previous results
    setBmi(null);
    
    // Validate inputs
    if (!validateInputs()) {
      return;
    }
    
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
                min="50"
                max="250"
                step="0.1"
                value={height}
                onChange={(e) => {
                  setHeight(e.target.value);
                  if (errors.height) {
                    setErrors(prev => ({ ...prev, height: undefined }));
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    calculateBMI();
                  }
                }}
                className={errors.height ? "border-destructive" : ""}
              />
              {errors.height && (
                <p id="height-error" className="text-sm text-destructive flex items-center gap-1" role="alert">
                  <AlertCircle className="h-3 w-3" aria-hidden="true" />
                  {errors.height}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">Kaal (kg)</Label>
              <Input
                id="weight"
                type="number"
                placeholder="70"
                min="10"
                max="500"
                step="0.1"
                value={weight}
                onChange={(e) => {
                  setWeight(e.target.value);
                  if (errors.weight) {
                    setErrors(prev => ({ ...prev, weight: undefined }));
                  }
                }}
                className={errors.weight ? "border-destructive" : ""}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    calculateBMI();
                  }
                }}
              />
              {errors.weight && (
                <p id="weight-error" className="text-sm text-destructive flex items-center gap-1" role="alert">
                  <AlertCircle className="h-3 w-3" aria-hidden="true" />
                  {errors.weight}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={calculateBMI} className="flex-1" aria-label="Arvuta kehamassiindeks">
              Arvuta KMI
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setHeight('');
                setWeight('');
                setBmi(null);
                setErrors({});
              }}
              className="flex items-center gap-2"
              disabled={!height && !weight && !bmi}
              aria-label="Tühjenda väljad ja tulemused"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Tühjenda
            </Button>
          </div>

          {bmi && (
            <div className="bg-muted/50 rounded-lg p-6 text-center relative animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                aria-label={copied ? "Kopeeritud" : "Kopeeri tulemus lõikelauale"}
                onClick={async () => {
                  const resultText = `KMI: ${bmi}\n${getBMICategory(bmi).category}\nPikkus: ${height} cm\nKaal: ${weight} kg`;
                  try {
                    await navigator.clipboard.writeText(resultText);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  } catch (err) {
                    console.error('Failed to copy:', err);
                  }
                }}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Kopeeritud
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Kopeeri
                  </>
                )}
              </Button>
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