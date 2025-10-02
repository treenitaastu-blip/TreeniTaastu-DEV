// src/components/admin/AdminLayout.tsx
import React from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  showBackButton?: boolean;
  backPath?: string;
  headerActions?: React.ReactNode;
}

export function AdminLayout({
  children,
  title,
  description,
  showBackButton = false,
  backPath = "/admin",
  headerActions,
}: AdminLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      {/* Header */}
      <header className="mb-6">
        {showBackButton && (
          <Button
            onClick={() => navigate(backPath)}
            variant="ghost"
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tagasi
          </Button>
        )}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {description && (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {headerActions && (
            <div className="flex items-center gap-2">{headerActions}</div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="space-y-6">
        {children}
      </main>
    </div>
  );
}