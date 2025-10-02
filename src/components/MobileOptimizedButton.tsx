// src/components/MobileOptimizedButton.tsx
import { Button, ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface MobileOptimizedButtonProps extends ButtonProps {
  touchOptimized?: boolean;
}

export const MobileOptimizedButton = forwardRef<
  HTMLButtonElement,
  MobileOptimizedButtonProps
>(({ className, touchOptimized = true, size = "lg", ...props }, ref) => {
  return (
    <Button
      ref={ref}
      size={size}
      className={cn(
        touchOptimized && [
          "min-h-[44px]", // iOS recommended minimum touch target
          "min-w-[44px]",
          "px-6 py-3", // More generous padding
          "text-base", // Larger text for better readability
          "touch-manipulation", // Optimizes touch events
        ],
        className
      )}
      {...props}
    />
  );
});

MobileOptimizedButton.displayName = "MobileOptimizedButton";