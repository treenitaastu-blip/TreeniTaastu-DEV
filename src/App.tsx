// src/App.tsx
import React from "react";
import { Outlet } from "react-router-dom";
import Header from "@/components/Header";
import { SupportChatWidget } from "@/components/support/SupportChatWidget";
import { PWAInstallGuide } from "@/components/PWAInstallGuide";
import { PullToRefresh } from "@/components/PullToRefresh";
import { DropdownManagerProvider } from "@/contexts/DropdownManager";
import { useAuth } from "@/hooks/useAuth";

export default function App({ children }: { children?: React.ReactNode }) {
  const { user } = useAuth();
  
  const handleRefresh = async () => {
    // Reload the current page
    window.location.reload();
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
        </div>
      </PullToRefresh>
    </DropdownManagerProvider>
  );
}
