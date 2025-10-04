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

export default function App({ children }: { children?: React.ReactNode }) {
  const { user } = useAuth();
  const { subscribe } = useSubscription();
  const navigate = useNavigate();
  
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
