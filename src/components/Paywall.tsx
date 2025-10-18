import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Lock, Star, Zap } from 'lucide-react';

interface PaywallProps {
  title?: string;
  description?: string;
  features?: string[];
  onUpgrade?: () => void;
  onClose?: () => void;
  className?: string;
}

export default function Paywall({
  title = "Täiustatud funktsioonid",
  description = "Lülitu üle tasulisele plaanile, et saada juurdepääs kõigile funktsioonidele.",
  features = [
    "Piiramatu treeningute arv",
    "Isiklikud treeningprogrammid",
    "Täpsemad analüütikad",
    "Eelistatud tugi"
  ],
  onUpgrade,
  onClose,
  className
}: PaywallProps) {
  return (
    <Card className={className}>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl">{title}</CardTitle>
        <p className="text-muted-foreground">{description}</p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Features List */}
        <div className="space-y-3">
          {features.map((feature, index) => (
            <div key={index} className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              <span className="text-sm">{feature}</span>
            </div>
          ))}
        </div>

        {/* Premium Badge */}
        <div className="flex justify-center">
          <Badge variant="default" className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
            <Star className="h-3 w-3 mr-1" />
            Premium
          </Badge>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={onUpgrade}
            className="w-full"
            size="lg"
          >
            <Zap className="h-4 w-4 mr-2" />
            Uuenda plaanile
          </Button>
          
          {onClose && (
            <Button
              onClick={onClose}
              variant="outline"
              className="w-full"
            >
              Hiljem
            </Button>
          )}
        </div>

        {/* Additional Info */}
        <div className="text-center text-xs text-muted-foreground">
          <p>Alusta 7-päevase tasuta prooviversiooniga</p>
        </div>
      </CardContent>
    </Card>
  );
}
