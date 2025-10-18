import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, Target, Zap } from 'lucide-react';

interface RPERIRDialogProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseName: string;
  onSave: (rpe: number, rir: number) => void;
  initialRPE?: number;
  initialRIR?: number;
}

export default function RPERIRDialog({
  isOpen,
  onClose,
  exerciseName,
  onSave,
  initialRPE = 6,
  initialRIR = 0
}: RPERIRDialogProps) {
  const [rpe, setRPE] = useState(initialRPE);
  const [rir, setRIR] = useState(initialRIR);

  const rpeScale = [
    { value: 6, label: '6 - Väga kerge', description: 'Võid jätkata tundmata väsimust' },
    { value: 7, label: '7 - Kerge', description: 'Väga kerge, saad rääkida lauldes' },
    { value: 8, label: '8 - Mõõdukalt kerge', description: 'Kerge, saad rääkida lauldes' },
    { value: 9, label: '9 - Mõõdukalt', description: 'Mõõdukalt raske, saad rääkida lauseid' },
    { value: 10, label: '10 - Raske', description: 'Raske, saad rääkida sõnu' },
    { value: 11, label: '11 - Väga raske', description: 'Väga raske, saad rääkida sõnu' },
    { value: 12, label: '12 - Äärmiselt raske', description: 'Äärmiselt raske, saad rääkida sõnu' },
    { value: 13, label: '13 - Maksimaalne', description: 'Maksimaalne, saad rääkida sõnu' },
    { value: 14, label: '14 - Üle maksimaalse', description: 'Üle maksimaalse, saad rääkida sõnu' },
    { value: 15, label: '15 - Maksimaalne', description: 'Maksimaalne, saad rääkida sõnu' },
    { value: 16, label: '16 - Üle maksimaalse', description: 'Üle maksimaalse, saad rääkida sõnu' },
    { value: 17, label: '17 - Maksimaalne', description: 'Maksimaalne, saad rääkida sõnu' },
    { value: 18, label: '18 - Üle maksimaalse', description: 'Üle maksimaalse, saad rääkida sõnu' },
    { value: 19, label: '19 - Maksimaalne', description: 'Maksimaalne, saad rääkida sõnu' },
    { value: 20, label: '20 - Maksimaalne', description: 'Maksimaalne, saad rääkida sõnu' }
  ];

  const rirScale = [
    { value: 0, label: '0 - Maksimaalne', description: 'Ei suuda teha ühtegi kordust' },
    { value: 1, label: '1 - Väga raske', description: 'Võid teha 1 korduse' },
    { value: 2, label: '2 - Raske', description: 'Võid teha 2 kordust' },
    { value: 3, label: '3 - Mõõdukalt raske', description: 'Võid teha 3 kordust' },
    { value: 4, label: '4 - Mõõdukalt', description: 'Võid teha 4 kordust' },
    { value: 5, label: '5 - Kerge', description: 'Võid teha 5 kordust' },
    { value: 6, label: '6 - Väga kerge', description: 'Võid teha 6 kordust' },
    { value: 7, label: '7 - Väga kerge', description: 'Võid teha 7 kordust' },
    { value: 8, label: '8 - Väga kerge', description: 'Võid teha 8 kordust' },
    { value: 9, label: '9 - Väga kerge', description: 'Võid teha 9 kordust' },
    { value: 10, label: '10 - Väga kerge', description: 'Võid teha 10 kordust' }
  ];

  const getRpeColor = (value: number) => {
    if (value <= 8) return 'bg-green-100 text-green-800';
    if (value <= 12) return 'bg-yellow-100 text-yellow-800';
    if (value <= 16) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const getRirColor = (value: number) => {
    if (value <= 2) return 'bg-red-100 text-red-800';
    if (value <= 4) return 'bg-orange-100 text-orange-800';
    if (value <= 6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const handleSave = () => {
    onSave(rpe, rir);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>RPE ja RIR hinnang - {exerciseName}</DialogTitle>
          <DialogDescription>
            Vali, kui raske oli see harjutus ja kui palju kordusi saaksid veel teha.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* RPE Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                RPE (Rated Perceived Exertion)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {rpeScale.map((item) => (
                <Button
                  key={item.value}
                  variant={rpe === item.value ? "default" : "ghost"}
                  onClick={() => setRPE(item.value)}
                  className="w-full justify-start h-auto p-3"
                >
                  <div className="flex items-center gap-3 w-full">
                    <Badge className={getRpeColor(item.value)}>
                      {item.value}
                    </Badge>
                    <div className="text-left">
                      <div className="font-medium">{item.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.description}
                      </div>
                    </div>
                  </div>
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* RIR Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                RIR (Reps In Reserve)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {rirScale.map((item) => (
                <Button
                  key={item.value}
                  variant={rir === item.value ? "default" : "ghost"}
                  onClick={() => setRIR(item.value)}
                  className="w-full justify-start h-auto p-3"
                >
                  <div className="flex items-center gap-3 w-full">
                    <Badge className={getRirColor(item.value)}>
                      {item.value}
                    </Badge>
                    <div className="text-left">
                      <div className="font-medium">{item.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.description}
                      </div>
                    </div>
                  </div>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Valitud hinnang:</div>
              <div className="text-sm text-muted-foreground">
                RPE: {rpe} | RIR: {rir}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Tühista
              </Button>
              <Button onClick={handleSave}>
                Salvesta
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
