import { useState, useEffect } from "react";
import { X, Download, Smartphone, Share } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePWA } from "@/hooks/usePWA";

export function PWAInstallGuide() {
  const [isVisible, setIsVisible] = useState(false);
  const { isInstalled, installApp, canPromptInstall } = usePWA();

  useEffect(() => {
    if (isInstalled) return;

    // Show guide after a delay if not installed
    const timer = setTimeout(() => {
      if (!isInstalled) {
        setIsVisible(true);
      }
    }, 120000); // Show after 2 minutes to avoid being annoying

    return () => clearTimeout(timer);
  }, [isInstalled]);

  const handleInstallClick = async () => {
    const success = await installApp();
    if (success) {
      setIsVisible(false);
    }
  };

  const getDeviceInstructions = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      return {
        device: "iOS (iPhone/iPad)",
        steps: [
          "Ava Safari brauseris see leht",
          "Vajuta Share nuppu (ruut nooltega üles)",
          "Keri alla ja vali 'Add to Home Screen'",
          "Vajuta 'Add' et kinnitada"
        ],
        icon: Share
      };
    } else if (userAgent.includes('android')) {
      return {
        device: "Android",
        steps: [
          "Ava Chrome brauseris see leht",
          "Vajuta menüü nuppu (3 punkti)",
          "Vali 'Add to Home screen' või 'Install app'",
          "Vajuta 'Add' et kinnitada"
        ],
        icon: Download
      };
    } else {
      return {
        device: "Desktop/Other",
        steps: [
          "Ava Chrome või Edge brauseris",
          "Otsi aadressirealt install ikooni",
          "Vajuta 'Install' nuppu",
          "Kinnita installimine"
        ],
        icon: Download
      };
    }
  };

  if (isInstalled || !isVisible) return null;

  const instructions = getDeviceInstructions();

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-sm mx-auto">
      <Card className="border-2 border-primary/20 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-full">
                <Smartphone className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-sm">Lisa rakendus telefoni</h4>
                <Badge variant="secondary" className="text-xs mt-1">
                  {instructions.device}
                </Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2 mb-4">
            {instructions.steps.map((step, index) => (
              <div key={index} className="flex items-start gap-2 text-xs">
                <div className="bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0 text-xs font-medium">
                  {index + 1}
                </div>
                <span className="text-muted-foreground">{step}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            {canPromptInstall && (
              <Button 
                onClick={handleInstallClick}
                size="sm" 
                className="flex-1 text-xs"
              >
                <Download className="mr-1 h-3 w-3" />
                Installi kohe
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsVisible(false)}
              className="text-xs"
            >
              Hiljem
            </Button>
          </div>

          <div className="mt-3 pt-3 border-t text-center">
            <p className="text-xs text-muted-foreground">
              💡 Installitud rakendus töötab kiiremini ja saab töötada ilma internetita
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}