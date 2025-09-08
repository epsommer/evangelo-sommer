import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-semibold uppercase tracking-wide transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 font-space-grotesk",
  {
    variants: {
      variant: {
        default: "bg-gold text-dark-grey hover:bg-gold-dark border-0",
        destructive: "bg-red-600 text-white hover:bg-red-700 border-0",
        outline: "border-2 border-gold bg-transparent text-dark-grey hover:bg-gold hover:text-dark-grey",
        secondary: "bg-dark-grey text-white hover:bg-medium-grey border-0",
        ghost: "hover:bg-light-grey hover:text-dark-grey text-medium-grey",
        link: "text-gold underline-offset-4 hover:underline hover:text-gold-dark",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3 text-xs",
        lg: "h-12 px-8 text-base",
        icon: "h-10 w-10",
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
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
