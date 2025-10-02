import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 relative overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-primary text-primary-foreground shadow-brand hover:scale-[1.02] hover:shadow-glow active:scale-[0.98] transition-all duration-200",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:scale-[1.02] active:scale-[0.98]",
        outline:
          "border border-input bg-background/80 backdrop-blur-sm shadow-sm hover:bg-accent hover:text-accent-foreground hover:scale-[1.02] hover:shadow-md active:scale-[0.98]",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary-hover hover:scale-[1.02] hover:shadow-md active:scale-[0.98]",
        ghost: 
          "hover:bg-accent hover:text-accent-foreground hover:scale-[1.02] active:scale-[0.98]",
        link: 
          "text-primary underline-offset-4 hover:underline hover:scale-[1.01] active:scale-[0.99]",
        hero: 
          "bg-gradient-primary text-white hover:shadow-glow hover:scale-105 transition-all duration-300 font-semibold",
        success: 
          "bg-success text-success-foreground hover:bg-success/90 shadow-soft",
        premium:
          "bg-gradient-hero text-white shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-r before:from-white/20 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300",
        glass:
          "bg-white/10 backdrop-blur-lg border border-white/20 text-foreground shadow-lg hover:bg-white/20 hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-2xl px-8 text-base font-semibold",
        xl: "h-14 rounded-2xl px-10 text-lg font-semibold",
        icon: "h-10 w-10 rounded-xl",
        "icon-sm": "h-8 w-8 rounded-lg",
        "icon-lg": "h-12 w-12 rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
