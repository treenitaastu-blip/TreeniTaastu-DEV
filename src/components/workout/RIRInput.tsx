import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, Zap } from 'lucide-react';

interface RIRInputProps {
  value: number;
  onChange: (rir: number) => void;
  exerciseName: string;
  className?: string;
}

export default function RIRInput({ value, onChange, exerciseName, className }: RIRInputProps) {
  const [isOpen, setIsOpen] = useState(false);

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

  const getRirColor = (rir: number) => {
    if (rir <= 2) return 'bg-red-100 text-red-800';
    if (rir <= 4) return 'bg-orange-100 text-orange-800';
    if (rir <= 6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getRirIcon = (rir: number) => {
    if (rir <= 2) return <Target className="h-4 w-4" />;
    if (rir <= 4) return <Zap className="h-4 w-4" />;
    return <Target className="h-4 w-4" />;
  };

  return (
    <div className={className}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between"
      >
        <span className="flex items-center gap-2">
          {getRirIcon(value)}
          RIR: {value}
        </span>
        <span className="text-sm text-muted-foreground">
          {isOpen ? 'Sulge' : 'Vali'}
        </span>
      </Button>

      {isOpen && (
        <Card className="mt-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">RIR skaala - {exerciseName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {rirScale.map((rir) => (
              <Button
                key={rir.value}
                variant={value === rir.value ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  onChange(rir.value);
                  setIsOpen(false);
                }}
                className="w-full justify-start h-auto p-3"
              >
                <div className="flex items-center gap-3 w-full">
                  <Badge className={getRirColor(rir.value)}>
                    {rir.value}
                  </Badge>
                  <div className="text-left">
                    <div className="font-medium">{rir.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {rir.description}
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
