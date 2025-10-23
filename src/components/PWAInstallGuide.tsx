import { useState, useEffect } from "react";
import { X, Download, Smartphone, Share, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePWA } from "@/hooks/usePWA";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function PWAInstallGuide() {
  const [isVisible, setIsVisible] = useState(false);
  const { isInstalled, installApp, canPromptInstall } = usePWA();
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (isInstalled) return;
    if (!user) return; // Only show for logged-in users
    if (location.pathname !== '/') return; // Only show on homepage

    // Check if already shown to this user
    const hasShownPWA = localStorage.getItem(`pwa-shown-${user.id}`);
    if (hasShownPWA) return;

    // Show guide after a short delay
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 3000); // Show after 3 seconds

    return () => clearTimeout(timer);
  }, [isInstalled, user, location.pathname]);

  const handleInstallClick = async () => {
    const success = await installApp();
    if (success) {
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Mark as shown for this user
    if (user?.id) {
      localStorage.setItem(`pwa-shown-${user.id}`, 'true');
    }
  };

  const getDeviceInstructions = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      return {
        device: "iPhone/iPad",
        message: "Ava brauseri menüü, vali 'Add to Home Screen'",
        icon: Share
      };
    } else if (userAgent.includes('android')) {
      return {
        device: "Android",
        message: "Ava brauseri menüü, vali 'Add to Home Screen'",
        icon: Download
      };
    } else {
      return {
        device: "Desktop",
        message: "Otsi aadressirealt install ikooni",
        icon: Download
      };
    }
  };

  if (isInstalled || !isVisible) return null;

  const instructions = getDeviceInstructions();

  return (
    <div className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto">
      <Card className="border-2 border-orange-200 bg-orange-50 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-full">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h4 className="font-bold text-orange-800 text-base">Tähtis info</h4>
                <p className="text-orange-700 text-sm font-medium">Installi äpp oma telefoni!</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-6 w-6 p-0 text-orange-600 hover:bg-orange-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-3 mb-4 p-3 bg-white rounded-lg border border-orange-200">
            <div className="p-2 bg-blue-100 rounded-full">
              <instructions.icon className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">{instructions.message}</p>
              <Badge variant="outline" className="text-xs mt-1 border-orange-300 text-orange-700">
                {instructions.device}
              </Badge>
            </div>
          </div>

          <div className="flex gap-2">
            {canPromptInstall && (
              <Button 
                onClick={handleInstallClick}
                size="sm" 
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium"
              >
                <Download className="mr-2 h-4 w-4" />
                Installi kohe
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDismiss}
              className="text-sm border-orange-300 text-orange-700 hover:bg-orange-50"
            >
              Hiljem
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}