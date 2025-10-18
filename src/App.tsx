// src/App.tsx
import React from "react";
import { Outlet } from "react-router-dom";
import Header from "@/components/Header";
import { SupportChatWidget } from "@/components/support/SupportChatWidget";
import { PWAInstallGuide } from "@/components/PWAInstallGuide";
import { PullToRefresh } from "@/components/PullToRefresh";
import { DropdownManagerProvider } from "@/contexts/DropdownManager";
import { UpgradePromptManager } from "@/components/subscription/UpgradePromptManager";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useNavigate } from "react-router-dom";
import { trackPageView, trackLoadTime, uxMetricsTracker } from "@/utils/uxMetricsTracker";
import { useEffect } from "react";

export default function App({ children }: { children?: React.ReactNode }) {
  const { user } = useAuth();
  const { subscribe } = useSubscription();
  const navigate = useNavigate();
  
  // Track page load performance
  useEffect(() => {
    const startTime = performance.now();
    
    // Track page view
    trackPageView(window.location.pathname, {
      userId: user?.id,
      additionalData: { 
        userAgent: navigator.userAgent,
        screenResolution: `${screen.width}x${screen.height}`,
        deviceType: screen.width <= 768 ? 'mobile' : screen.width <= 1024 ? 'tablet' : 'desktop'
      }
    });

    // Track load time when page is fully loaded
    const handleLoad = () => {
      const loadTime = performance.now() - startTime;
      trackLoadTime(loadTime, window.location.pathname, {
        userId: user?.id
      });
    };

    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
    }

    // Track session duration on page unload
    const handleBeforeUnload = () => {
      uxMetricsTracker.trackSessionDuration();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('load', handleLoad);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user?.id]);
  
  const handleRefresh = async () => {
    // Reload the current page
    window.location.reload();
  };

  const handleUpgrade = async (planId: string) => {
    try {
      await subscribe(planId);
      navigate('/pricing');
    } catch (error) {
      console.error('Upgrade failed:', error);
    }
  };

  const handleDismissPrompt = (promptId: string) => {
    // Store dismissed prompt in localStorage
    const dismissed = JSON.parse(localStorage.getItem('dismissedUpgradePrompts') || '[]');
    dismissed.push(promptId);
    localStorage.setItem('dismissedUpgradePrompts', JSON.stringify(dismissed));
  };
  
  return (
    <DropdownManagerProvider>
      <PullToRefresh onRefresh={handleRefresh}>
        <div 
          id="root" 
          className="min-h-screen bg-background text-foreground"
        >
          <Header />
          <main className="w-full">
            {children ?? <Outlet />}
          </main>
          <SupportChatWidget />
          {user && <PWAInstallGuide />}
          {user && (
            <UpgradePromptManager
              onUpgrade={handleUpgrade}
              onDismiss={handleDismissPrompt}
            />
          )}
        </div>
      </PullToRefresh>
    </DropdownManagerProvider>
  );
}
