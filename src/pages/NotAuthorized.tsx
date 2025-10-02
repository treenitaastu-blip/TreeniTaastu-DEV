import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function NotAuthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold text-destructive mb-4">Access Denied</h1>
        <p className="text-muted-foreground mb-6">
          You don't have permission to access this page.
        </p>
        <Button asChild>
          <Link to="/">Go Home</Link>
        </Button>
      </div>
    </div>
  );
}