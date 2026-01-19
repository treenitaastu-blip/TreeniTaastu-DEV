import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calculator, AlertCircle, RotateCcw, Copy, Check } from 'lucide-react';

export default function OneRepMaxCalculator() {
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [oneRM, setOneRM] = useState<number | null>(null);
  const [percentages, setPercentages] = useState<{ percent: number; weight: number }[]>([]);
  const [errors, setErrors] = useState<{ weight?: string; reps?: string }>({});

  const validateInputs = (): boolean => {
    const newErrors: { weight?: string; reps?: string } = {};
    
    const w = parseFloat(weight);
    const r = parseInt(reps);
    
    if (!weight || weight.trim() === '') {
      newErrors.weight = 'Kaal on kohustuslik';
    } else if (isNaN(w)) {
      newErrors.weight = 'Kaal peab olema number';
    } else if (w <= 0) {
      newErrors.weight = 'Kaal peab olema suurem kui 0';
    } else if (w > 1000) {
      newErrors.weight = 'Kaal peab olema väiksem kui 1000 kg';
    }
    
    if (!reps || reps.trim() === '') {
      newErrors.reps = 'Kordused on kohustuslikud';
    } else if (isNaN(r)) {
      newErrors.reps = 'Kordused peavad olema number';
    } else if (r < 1) {
      newErrors.reps = 'Kordused peavad olema vähemalt 1';
    } else if (r > 15) {
      newErrors.reps = 'Kordused peavad olema maksimaalselt 15 (valem on täpsem 2-10 korduse vahemikus)';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateOneRM = () => {
    // Clear previous results
    setOneRM(null);
    setPercentages([]);
    
    // Validate inputs
    if (!validateInputs()) {
      return;
    }
    
    const w = parseFloat(weight);
    const r = parseInt(reps);
    
    if (w > 0 && r > 0 && r <= 15) {
      // Brzycki formula: 1RM = weight / (1.0278 - 0.0278 × reps)
      const oneRMValue = w / (1.0278 - 0.0278 * r);
      const rounded = Math.round(oneRMValue * 10) / 10;
      setOneRM(rounded);
      
      // Calculate percentage weights
      const percentages = [
        { percent: 95, weight: Math.round(rounded * 0.95 * 10) / 10 },
        { percent: 90, weight: Math.round(rounded * 0.90 * 10) / 10 },
        { percent: 85, weight: Math.round(rounded * 0.85 * 10) / 10 },
        { percent: 80, weight: Math.round(rounded * 0.80 * 10) / 10 },
        { percent: 75, weight: Math.round(rounded * 0.75 * 10) / 10 },
        { percent: 70, weight: Math.round(rounded * 0.70 * 10) / 10 },
        { percent: 65, weight: Math.round(rounded * 0.65 * 10) / 10 },
        { percent: 60, weight: Math.round(rounded * 0.60 * 10) / 10 },
      ];
      setPercentages(percentages);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">1KM Kalkulaator</h1>
        <p className="text-muted-foreground">
          Arvutab teie ühe korduse maksimumi (1RM) Brzycki valemi abil. 
          Kasulik treeningkoormuste planeerimiseks.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Arvuta 1RM
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weight">Kaal (kg)</Label>
              <Input
                id="weight"
                type="number"
                placeholder="100"
                min="0.1"
                max="1000"
                step="0.1"
                value={weight}
                onChange={(e) => {
                  setWeight(e.target.value);
                  if (errors.weight) {
                    setErrors(prev => ({ ...prev, weight: undefined }));
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    calculateOneRM();
                  }
                }}
                className={errors.weight ? "border-destructive" : ""}
              />
              {errors.weight && (
                <p id="weight-error" className="text-sm text-destructive flex items-center gap-1" role="alert">
                  <AlertCircle className="h-3 w-3" aria-hidden="true" />
                  {errors.weight}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reps">Kordused</Label>
              <Input
                id="reps"
                type="number"
                placeholder="8"
                min="1"
                max="15"
                value={reps}
                onChange={(e) => {
                  setReps(e.target.value);
                  if (errors.reps) {
                    setErrors(prev => ({ ...prev, reps: undefined }));
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    calculateOneRM();
                  }
                }}
                className={errors.reps ? "border-destructive" : ""}
              />
              {errors.reps && (
                <p id="reps-error" className="text-sm text-destructive flex items-center gap-1" role="alert">
                  <AlertCircle className="h-3 w-3" aria-hidden="true" />
                  {errors.reps}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={calculateOneRM} className="flex-1" aria-label="Arvuta ühe korduse maksimum">
              Arvuta 1RM
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setWeight('');
                setReps('');
                setOneRM(null);
                setPercentages([]);
                setErrors({});
              }}
              className="flex items-center gap-2"
              disabled={!weight && !reps && !oneRM}
              aria-label="Tühjenda väljad ja tulemused"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Tühjenda
            </Button>
          </div>

          {oneRM && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-muted/50 rounded-lg p-6 text-center relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2"
                  aria-label={copied ? "Kopeeritud" : "Kopeeri tulemus lõikelauale"}
                  onClick={async () => {
                    const resultText = `1RM: ${oneRM} kg\nKaal: ${weight} kg\nKordused: ${reps}\n\n${percentages.map(p => `${p.percent}%: ${p.weight} kg`).join('\n')}`;
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
                <div className="text-4xl font-bold mb-2">{oneRM} kg</div>
                <div className="text-lg font-semibold text-primary">
                  Hinnangeline 1RM
                </div>
              </div>

              <div className="bg-muted/30 rounded-lg p-4">
                <h3 className="mb-3 font-semibold">Treeningkaalud protsentides:</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  {percentages.map(({ percent, weight }) => (
                    <div key={percent} className="flex justify-between p-2 bg-background rounded">
                      <span>{percent}%:</span>
                      <span className="font-semibold">{weight} kg</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            <p className="font-semibold mb-1">Märkused:</p>
            <ul className="space-y-1">
              <li>• Valem töötab kõige paremini 2-10 korduse vahemikus</li>
              <li>• Tulemus on hinnanguline ja võib erineda tegelikust 1RM-st</li>
              <li>• Alati soojendu korralikult enne raskete kaalude tõstmist</li>
              <li>• 1RM testimist soovitame teha kogenud treener juuresolekul</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}