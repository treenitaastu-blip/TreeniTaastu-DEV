import React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MobileOptimizedButtonProps extends ButtonProps {
  children: React.ReactNode;
  className?: string;
  mobileSize?: 'sm' | 'md' | 'lg';
  fullWidthOnMobile?: boolean;
}

export default function MobileOptimizedButton({
  children,
  className,
  mobileSize = 'md',
  fullWidthOnMobile = true,
  ...props
}: MobileOptimizedButtonProps) {
  const sizeClasses = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-6 text-base'
  };

  return (
    <Button
      className={cn(
        sizeClasses[mobileSize],
        fullWidthOnMobile && 'w-full sm:w-auto',
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
}
