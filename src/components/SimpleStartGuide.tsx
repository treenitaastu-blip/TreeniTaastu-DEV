// src/components/SimpleStartGuide.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Play } from "lucide-react";
import { Link } from "react-router-dom";

export function SimpleStartGuide() {
  const nextMonday = getNextMonday();
  
  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-900">
          <Calendar className="h-5 w-5" />
          Kuidas alustada?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-semibold">
              1
            </div>
            <div>
              <p className="font-medium">Loo konto</p>
              <p className="text-sm text-muted-foreground">Lihtne registreerimine e-mailiga</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-semibold">
              2
            </div>
            <div>
              <p className="font-medium">Alusta programmi</p>
              <p className="text-sm text-muted-foreground">
                Järgmine grupp alustab <strong>{nextMonday}</strong>. Võid registreeruda juba täna!
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-semibold">
              3
            </div>
            <div>
              <p className="font-medium">12 minutit päevas</p>
              <p className="text-sm text-muted-foreground">Lihtsad harjutused videojuhistega</p>
            </div>
          </div>
        </div>
        
        <div className="pt-2">
          <Button asChild size="lg" className="w-full">
            <Link to="/signup">
              <Play className="h-4 w-4 mr-2" />
              Alusta kohe
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function getNextMonday(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilMonday = dayOfWeek === 1 ? 0 : (1 + 7 - dayOfWeek) % 7;
  
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysUntilMonday);
  
  return nextMonday.toLocaleDateString('et-EE', {
    day: 'numeric',
    month: 'long'
  });
}