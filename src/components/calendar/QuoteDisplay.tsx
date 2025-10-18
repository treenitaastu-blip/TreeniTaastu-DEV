import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Quote } from 'lucide-react';

interface QuoteDisplayProps {
  quote: {
    text: string;
    author: string;
  };
  unlockTime?: string;
  className?: string;
}

export default function QuoteDisplay({ 
  quote, 
  unlockTime, 
  className = "" 
}: QuoteDisplayProps) {
  return (
    <Card className={`bg-muted/50 border-muted-foreground/20 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-1">
            <Quote className="h-5 w-5 text-muted-foreground" />
          </div>
          
          <div className="flex-1 space-y-2">
            <blockquote className="text-sm italic text-muted-foreground">
              "{quote.text}"
            </blockquote>
            
            <div className="flex items-center justify-between">
              <cite className="text-xs text-muted-foreground/80">
                — {quote.author}
              </cite>
              
              {unlockTime && (
                <Badge variant="outline" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {unlockTime}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
