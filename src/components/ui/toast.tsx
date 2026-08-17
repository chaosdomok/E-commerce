import * as React from "react"
import { cn } from "@/lib/utils"

export interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ className, open, onOpenChange, ...props }, ref) => {
    if (!open) return null
    
    return (
      <div
        ref={ref}
        className={cn(
          "fixed right-4 top-4 z-50 w-full max-w-sm rounded-lg border border-zinc-800 bg-zinc-950 p-4 shadow-lg",
          className
        )}
        {...props}
      />
    )
  }
)
Toast.displayName = "Toast"

const ToastTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("font-semibold text-sm", className)}
    {...props}
  />
))
ToastTitle.displayName = "ToastTitle"

const ToastDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-zinc-400", className)}
    {...props}
  />
))
ToastDescription.displayName = "ToastDescription"

const ToastAction = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-zinc-800 bg-transparent px-3 text-sm font-medium transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-sue focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = "ToastAction"

export { Toast, ToastTitle, ToastDescription, ToastAction }
