import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator, Info, AlertCircle, RotateCcw, Copy, Check } from 'lucide-react';

export default function EERCalculator() {
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [gender, setGender] = useState('');
  const [activityLevel, setActivityLevel] = useState('');
  const [eer, setEER] = useState<number | null>(null);
  const [errors, setErrors] = useState<{ age?: string; weight?: string; height?: string; gender?: string; activityLevel?: string }>({});
  const [copied, setCopied] = useState(false);

  const activityLevels = [
    { 
      value: 'sedentary', 
      label: 'Istuv eluviis', 
      description: 'Ainult igapäevased tegevused',
      pa_male: 1.0,
      pa_female: 1.0
    },
    { 
      value: 'low', 
      label: 'Väheaktiivne', 
      description: 'Kerge aktiivsus 1-3 korda nädalas',
      pa_male: 1.11,
      pa_female: 1.12
    },
    { 
      value: 'active', 
      label: 'Aktiivne', 
      description: 'Mõõdukas aktiivsus 3-5 korda nädalas',
      pa_male: 1.25,
      pa_female: 1.27
    },
    { 
      value: 'very_active', 
      label: 'Väga aktiivne', 
      description: 'Intensiivne aktiivsus 6-7 korda nädalas',
      pa_male: 1.48,
      pa_female: 1.45
    }
  ];

  const validateInputs = (): boolean => {
    const newErrors: { age?: string; weight?: string; height?: string; gender?: string; activityLevel?: string } = {};
    
    const ageNum = parseFloat(age);
    const weightNum = parseFloat(weight);
    const heightNum = parseFloat(height);
    
    if (!age || age.trim() === '') {
      newErrors.age = 'Vanus on kohustuslik';
    } else if (isNaN(ageNum)) {
      newErrors.age = 'Vanus peab olema number';
    } else if (ageNum < 19) {
      newErrors.age = 'Valem on mõeldud 19+ aastastele';
    } else if (ageNum > 120) {
      newErrors.age = 'Vanus peab olema väiksem kui 120';
    }
    
    if (!weight || weight.trim() === '') {
      newErrors.weight = 'Kaal on kohustuslik';
    } else if (isNaN(weightNum)) {
      newErrors.weight = 'Kaal peab olema number';
    } else if (weightNum <= 0) {
      newErrors.weight = 'Kaal peab olema suurem kui 0';
    } else if (weightNum > 500) {
      newErrors.weight = 'Kaal peab olema väiksem kui 500 kg';
    }
    
    if (!height || height.trim() === '') {
      newErrors.height = 'Pikkus on kohustuslik';
    } else if (isNaN(heightNum)) {
      newErrors.height = 'Pikkus peab olema number';
    } else if (heightNum <= 0) {
      newErrors.height = 'Pikkus peab olema suurem kui 0';
    } else if (heightNum < 50 || heightNum > 250) {
      newErrors.height = 'Pikkus peab olema vahemikus 50-250 cm';
    }
    
    if (!gender) {
      newErrors.gender = 'Sugu on kohustuslik';
    }
    
    if (!activityLevel) {
      newErrors.activityLevel = 'Aktiivsuse tase on kohustuslik';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateEER = () => {
    // Clear previous results
    setEER(null);
    
    // Validate inputs
    if (!validateInputs()) {
      return;
    }
    
    const ageNum = parseFloat(age);
    const weightNum = parseFloat(weight);
    const heightNum = parseFloat(height) / 100; // convert cm to m
    
    if (ageNum > 0 && weightNum > 0 && heightNum > 0 && gender && activityLevel) {
      const activity = activityLevels.find(a => a.value === activityLevel);
      if (!activity) return;

      let eerValue: number;
      
      if (gender === 'male') {
        const pa = activity.pa_male;
        eerValue = 662 - (9.53 * ageNum) + pa * ((15.91 * weightNum) + (539.6 * heightNum));
      } else {
        const pa = activity.pa_female;
        eerValue = 354 - (6.91 * ageNum) + pa * ((9.36 * weightNum) + (726 * heightNum));
      }
      
      setEER(Math.round(eerValue));
    }
  };

  const getEERCategory = (eer: number) => {
    if (eer < 1500) return { category: 'Madal energiavajadus', color: 'text-blue-600' };
    if (eer < 2000) return { category: 'Mõõdukas energiavajadus', color: 'text-green-600' };
    if (eer < 2500) return { category: 'Kõrge energiavajadus', color: 'text-yellow-600' };
    return { category: 'Väga kõrge energiavajadus', color: 'text-red-600' };
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">EER Kalkulaator</h1>
        <p className="text-muted-foreground">
          Estimated Energy Requirement (EER) arvutab teie päevase kalorivajaduse teaduslikult valideeritud valemi abil.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Arvuta oma energiavajadus
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="age">Vanus (aastat)</Label>
              <Input
                id="age"
                type="number"
                placeholder="25"
                min="19"
                max="120"
                step="1"
                value={age}
                onChange={(e) => {
                  setAge(e.target.value);
                  if (errors.age) {
                    setErrors(prev => ({ ...prev, age: undefined }));
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    calculateEER();
                  }
                }}
                className={errors.age ? "border-destructive" : ""}
              />
              {errors.age && (
                <p id="age-error" className="text-sm text-destructive flex items-center gap-1" role="alert">
                  <AlertCircle className="h-3 w-3" aria-hidden="true" />
                  {errors.age}
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    calculateEER();
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
          </div>

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
                    calculateEER();
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
              <Label htmlFor="gender">Sugu</Label>
              <Select 
                value={gender} 
                onValueChange={(value) => {
                  setGender(value);
                  if (errors.gender) {
                    setErrors(prev => ({ ...prev, gender: undefined }));
                  }
                }}
              >
                <SelectTrigger 
                  className={errors.gender ? "border-destructive" : ""}
                  aria-label="Vali sugu"
                  aria-describedby={errors.gender ? "gender-error" : undefined}
                  aria-invalid={!!errors.gender}
                >
                  <SelectValue placeholder="Vali sugu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Mees</SelectItem>
                  <SelectItem value="female">Naine</SelectItem>
                </SelectContent>
              </Select>
              {errors.gender && (
                <p id="gender-error" className="text-sm text-destructive flex items-center gap-1" role="alert">
                  <AlertCircle className="h-3 w-3" aria-hidden="true" />
                  {errors.gender}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="activity">Aktiivsuse tase</Label>
            <Select 
              value={activityLevel} 
              onValueChange={(value) => {
                setActivityLevel(value);
                if (errors.activityLevel) {
                  setErrors(prev => ({ ...prev, activityLevel: undefined }));
                }
              }}
            >
              <SelectTrigger className={errors.activityLevel ? "border-destructive" : ""}>
                <SelectValue placeholder="Vali aktiivsuse tase" />
              </SelectTrigger>
              <SelectContent>
                {activityLevels.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{level.label}</span>
                      <span className="text-xs text-muted-foreground">{level.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.activityLevel && (
              <p id="activity-error" className="text-sm text-destructive flex items-center gap-1" role="alert">
                <AlertCircle className="h-3 w-3" aria-hidden="true" />
                {errors.activityLevel}
              </p>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button onClick={calculateEER} className="flex-1" aria-label="Arvuta päevane energiavajadus">
              Arvuta energiavajadus
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setAge('');
                setWeight('');
                setHeight('');
                setGender('');
                setActivityLevel('');
                setEER(null);
                setErrors({});
              }}
              className="flex items-center gap-2"
              disabled={!age && !weight && !height && !gender && !activityLevel && !eer}
              aria-label="Tühjenda väljad ja tulemused"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Tühjenda
            </Button>
          </div>

          {eer && (
            <div className="bg-muted/50 rounded-lg p-6 text-center relative animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                aria-label={copied ? "Kopeeritud" : "Kopeeri tulemus lõikelauale"}
                onClick={async () => {
                  const activityText = activityLevel === 'sedentary' ? 'Istuv' : 
                                     activityLevel === 'low' ? 'Väheaktiivne' :
                                     activityLevel === 'active' ? 'Aktiivne' :
                                     activityLevel === 'very_active' ? 'Väga aktiivne' : activityLevel;
                  const genderText = gender === 'male' ? 'Mees' : gender === 'female' ? 'Naine' : gender;
                  const resultText = `Päevane energiavajadus: ${eer.toFixed(0)} kcal\n\nVanus: ${age} aastat\nKaal: ${weight} kg\nPikkus: ${height} cm\nSugu: ${genderText}\nAktiivsustase: ${activityText}`;
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
              <div className="text-4xl font-bold mb-2">{eer}</div>
              <div className="text-lg text-muted-foreground mb-2">kcal päevas</div>
              <div className={`text-lg font-semibold ${getEERCategory(eer).color}`}>
                {getEERCategory(eer).category}
              </div>
              
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="bg-background rounded-lg p-3">
                  <div className="font-semibold text-green-600">Kaalukaotus</div>
                  <div className="text-lg font-bold">{Math.round(eer * 0.8)}</div>
                  <div className="text-xs text-muted-foreground">kcal/päev</div>
                </div>
                <div className="bg-background rounded-lg p-3">
                  <div className="font-semibold text-blue-600">Kaaluhoidmine</div>
                  <div className="text-lg font-bold">{eer}</div>
                  <div className="text-xs text-muted-foreground">kcal/päev</div>
                </div>
                <div className="bg-background rounded-lg p-3">
                  <div className="font-semibold text-orange-600">Kaalutõus</div>
                  <div className="text-lg font-bold">{Math.round(eer * 1.15)}</div>
                  <div className="text-xs text-muted-foreground">kcal/päev</div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 space-y-2">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Teaduslik alus:</p>
                <ul className="text-blue-800 dark:text-blue-200 space-y-1 text-xs">
                  <li>• EER valem põhineb USA Toitumise Instituudi uuringutel</li>
                  <li>• Arvesse võetakse vanust, sugu, kaalu, pikkust ja aktiivsust</li>
                  <li>• Sobib tervetele täiskasvanutele (19+ aastat)</li>
                  <li>• Tulemused on hinnangulised - individuaalsed erinevused võivad esineda</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            <p className="font-semibold mb-1">Märkus:</p>
            <p>
              EER kalkulaator annab hinnangulise päevase energiavajaduse. Individuaalsed erinevused, 
              terviseseisund ja konkreetsed eesmärgid võivad mõjutada tegelikku kalorivajadust. 
              Konsulteerige toitumisspetsialistiga isikupärastatud soovituste saamiseks.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}