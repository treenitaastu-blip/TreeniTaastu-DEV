import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, Zap } from 'lucide-react';

interface RPEInputProps {
  value: number;
  onChange: (rpe: number) => void;
  exerciseName: string;
  className?: string;
}

export default function RPEInput({ value, onChange, exerciseName, className }: RPEInputProps) {
  const [isOpen, setIsOpen] = useState(false);

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

  const getRpeColor = (rpe: number) => {
    if (rpe <= 8) return 'bg-green-100 text-green-800';
    if (rpe <= 12) return 'bg-yellow-100 text-yellow-800';
    if (rpe <= 16) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const getRpeIcon = (rpe: number) => {
    if (rpe <= 8) return <Heart className="h-4 w-4" />;
    if (rpe <= 12) return <Zap className="h-4 w-4" />;
    return <Zap className="h-4 w-4" />;
  };

  return (
    <div className={className}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between"
      >
        <span className="flex items-center gap-2">
          {getRpeIcon(value)}
          RPE: {value}
        </span>
        <span className="text-sm text-muted-foreground">
          {isOpen ? 'Sulge' : 'Vali'}
        </span>
      </Button>

      {isOpen && (
        <Card className="mt-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">RPE skaala - {exerciseName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {rpeScale.map((rpe) => (
              <Button
                key={rpe.value}
                variant={value === rpe.value ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  onChange(rpe.value);
                  setIsOpen(false);
                }}
                className="w-full justify-start h-auto p-3"
              >
                <div className="flex items-center gap-3 w-full">
                  <Badge className={getRpeColor(rpe.value)}>
                    {rpe.value}
                  </Badge>
                  <div className="text-left">
                    <div className="font-medium">{rpe.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {rpe.description}
                    </div>
                  </div>
                </div>
              </Button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
