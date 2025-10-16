import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { X, Clock, AlertTriangle, Sparkles, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { et } from "date-fns/locale";

interface TrialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDismiss: (reason: 'remind_tomorrow' | 'dont_show_again' | 'upgrade_later' | 'close') => void;
  type: 'warning' | 'urgent' | 'grace';
  daysRemaining?: number;
  hoursRemaining?: number;
  trialEndsAt?: string;
  isFirstShow?: boolean;
}

export function TrialModal({ 
  isOpen, 
  onClose, 
  onDismiss, 
  type, 
  daysRemaining = 0,
  hoursRemaining = 0,
  trialEndsAt,
  isFirstShow = false
}: TrialModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Small delay for smooth animation
      const timer = setTimeout(() => setIsVisible(true), 100);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  const handleDismiss = (reason: 'remind_tomorrow' | 'dont_show_again' | 'upgrade_later' | 'close') => {
    onDismiss(reason);
    onClose();
  };

  const getModalContent = () => {
    switch (type) {
      case 'grace':
        return {
          title: '⏰ Proov on lõppenud – Sul on veel ligipääsu',
          description: `Oleme andnud sulle 48-tunnise lisaaja oma treeningteekonna jätkamiseks.`,
          details: `Täielik ligipääs lõpeb ${hoursRemaining}h pärast. Pärast seda ei saa sa enam programmidele ligi.`,
          buttonText: 'Jätka treeningut – Vali tellimus',
          buttonVariant: 'default' as const,
          icon: <Clock className="h-6 w-6 text-orange-600" />,
          bgColor: 'bg-orange-50 dark:bg-orange-950/20',
          borderColor: 'border-orange-200 dark:border-orange-800',
          textColor: 'text-orange-800 dark:text-orange-200',
        };

      case 'urgent':
        return {
          title: '⚠️ Viimane päev!',
          description: `Sinu tasuta proov lõpeb ${daysRemaining === 0 ? 'täna' : 'homme'}!`,
          details: 'Tellimata jäädes kaotad kohe ligipääsu kõigile programmidele.',
          buttonText: '🔥 Uuenda kohe',
          buttonVariant: 'destructive' as const,
          icon: <AlertTriangle className="h-6 w-6 text-destructive animate-pulse" />,
          bgColor: 'bg-destructive/10',
          borderColor: 'border-destructive/30',
          textColor: 'text-destructive',
        };

      case 'warning':
      default:
        return {
          title: '⏰ Proov lõpeb peagi',
          description: trialEndsAt 
            ? `Tasuta proov lõpeb: ${format(new Date(trialEndsAt), 'd. MMMM yyyy', { locale: et })}`
            : `Tasuta proov lõpeb ${daysRemaining} päeva pärast`,
          details: 'Jätka treeningteekonda ilma katkestuseta',
          buttonText: 'Vaata tellimusi',
          buttonVariant: 'default' as const,
          icon: <Clock className="h-6 w-6 text-yellow-600" />,
          bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
          borderColor: 'border-yellow-200 dark:border-yellow-800',
          textColor: 'text-yellow-800 dark:text-yellow-200',
        };
    }
  };

  const content = getModalContent();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`
        max-w-md mx-auto p-0 border-0 shadow-2xl
        ${isVisible ? 'animate-slide-in-bottom' : ''}
      `}>
        <div className={`
          rounded-t-lg p-6 border-b-2
          ${content.bgColor} ${content.borderColor}
        `}>
          <DialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              {content.icon}
              <DialogTitle className={`text-lg font-semibold ${content.textColor}`}>
                {content.title}
              </DialogTitle>
            </div>
            <AlertDescription className={`text-sm ${content.textColor}`}>
              <p className="font-medium mb-2">{content.description}</p>
              <p className="text-sm opacity-90">{content.details}</p>
            </AlertDescription>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-4">
          {/* Benefits section for grace period */}
          {type === 'grace' && (
            <div className="bg-white/80 dark:bg-black/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
              <p className="text-xs text-orange-800 dark:text-orange-200 mb-2 font-medium">
                💡 Ära kaota oma progressi:
              </p>
              <ul className="text-xs text-orange-700 dark:text-orange-300 space-y-1">
                <li>✓ Sinu treeningajalugu jääb alles</li>
                <li>✓ Statistika ja saavutused säilivad</li>
                <li>✓ Jätka kohe sealt, kus pooleli jäid</li>
              </ul>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-3">
            <Button 
              size="lg" 
              variant={content.buttonVariant}
              className="w-full"
              asChild
            >
              <Link to="/pricing" className="flex items-center justify-center gap-2">
                <Sparkles className="h-4 w-4" />
                {content.buttonText}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>

            {/* Dismissal options */}
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleDismiss('remind_tomorrow')}
                className="text-xs"
              >
                Meenuta homme
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleDismiss('upgrade_later')}
                className="text-xs"
              >
                Hiljem
              </Button>
            </div>

            {/* Don't show again option */}
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => handleDismiss('dont_show_again')}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Ära näita enam
            </Button>
          </div>

          {/* First show indicator */}
          {isFirstShow && (
            <p className="text-xs text-muted-foreground text-center pt-2 border-t">
              💡 Saad selle teate sulgeda ja see ilmub uuesti 5 minuti pärast
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

