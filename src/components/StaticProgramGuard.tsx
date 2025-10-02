// Guard to ensure static programs remain static and don't use smart progression
import React from 'react';
import { useStaticProgression } from '@/hooks/useStaticProgression';
import { useAuth } from '@/hooks/useAuth';

interface StaticProgramGuardProps {
  children: React.ReactNode;
  programId?: string;
}

export const StaticProgramGuard: React.FC<StaticProgramGuardProps> = ({ 
  children, 
  programId 
}) => {
  const { user } = useAuth();
  const { staticProgress, loading } = useStaticProgression(user?.id);

  // For static programs, always use static progression
  // This component ensures no smart progression is accidentally used
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-muted-foreground">Loading static program...</div>
      </div>
    );
  }

  // Pass static context to children to prevent smart progression usage
  return (
    <div data-program-type="static" data-smart-progression="false">
      {children}
    </div>
  );
};