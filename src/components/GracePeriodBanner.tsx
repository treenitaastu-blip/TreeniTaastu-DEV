import { Link } from "react-router-dom";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Clock, AlertCircle, Sparkles } from "lucide-react";

interface GracePeriodBannerProps {
  hoursRemaining: number;
}

export function GracePeriodBanner({ hoursRemaining }: GracePeriodBannerProps) {
  const daysRemaining = Math.floor(hoursRemaining / 24);
  const hoursOnly = hoursRemaining % 24;
  
  return (
    <Alert className="border-l-4 border-l-orange-500 bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800 animate-slide-in-top">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
        
        <div className="flex-1 space-y-3">
          <AlertTitle className="text-base font-semibold text-orange-800 dark:text-orange-200">
            ⏰ Proov on lõppenud – Sul on veel {hoursRemaining}h ligipääsu
          </AlertTitle>
          
          <AlertDescription className="space-y-3">
            <div className="text-sm text-orange-700 dark:text-orange-300">
              <p className="font-medium mb-2">
                Oleme andnud sulle <strong>48-tunnise lisaaja</strong> oma treeningteekonna jätkamiseks.
              </p>
              <p className="text-sm">
                {daysRemaining > 0 ? (
                  <>
                    Täielik ligipääs lõpeb <strong>{daysRemaining} päeva ja {hoursOnly} tunni</strong> pärast.
                    Pärast seda ei saa sa enam programmidele ligi.
                  </>
                ) : (
                  <>
                    Täielik ligipääs lõpeb <strong>{hoursOnly} tunni</strong> pärast.
                    Pärast seda ei saa sa enam programmidele ligi.
                  </>
                )}
              </p>
            </div>

            <div className="bg-white/80 dark:bg-black/20 rounded-lg p-3 border border-orange-200 dark:border-orange-800">
              <p className="text-xs text-orange-800 dark:text-orange-200 mb-2 font-medium">
                💡 Ära kaota oma progressi:
              </p>
              <ul className="text-xs text-orange-700 dark:text-orange-300 space-y-1">
                <li>✓ Sinu treeningajalugu jääb alles</li>
                <li>✓ Statistika ja saavutused säilivad</li>
                <li>✓ Jätka kohe sealt, kus pooleli jäid</li>
              </ul>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="default" asChild className="bg-orange-600 hover:bg-orange-700 text-white">
                <Link to="/pricing" className="flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  Jätka treeningut – Vali tellimus
                </Link>
              </Button>
              
              <Button size="sm" variant="outline" asChild className="border-orange-300 text-orange-700 hover:bg-orange-100">
                <Link to="/konto">
                  Vaata oma kontot
                </Link>
              </Button>
            </div>

            <p className="text-xs text-orange-600 dark:text-orange-400 pt-2 border-t border-orange-200 dark:border-orange-700">
              ⏱️ Lisaaeg lõpeb automaatselt {hoursRemaining}h pärast. Telli enne, et vältida ligipääsu katkemist.
            </p>
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}

