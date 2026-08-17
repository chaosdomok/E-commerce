import * as React from "react"
import { cn } from "@/lib/utils"

export interface DropdownMenuProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const DropdownMenu = ({ children, open, onOpenChange }: DropdownMenuProps) => {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isOpen = open !== undefined ? open : internalOpen
  
  const handleOpenChange = (newOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(newOpen)
    } else {
      setInternalOpen(newOpen)
    }
  }
  
  return (
    <div className="relative inline-block text-left">
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as any, { 
            isOpen, 
            onOpenChange: handleOpenChange 
          })
        }
        return child
      })}
    </div>
  )
}

const DropdownMenuTrigger = ({ 
  children, 
  isOpen, 
  onOpenChange 
}: { 
  children: React.ReactNode
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void 
}) => (
  <div onClick={() => onOpenChange?.(!isOpen)}>
    {children}
  </div>
)

const DropdownMenuContent = ({ 
  children, 
  isOpen, 
  onOpenChange,
  className 
}: { 
  children: React.ReactNode
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
}) => {
  if (!isOpen) return null
  
  return (
    <div 
      className={cn(
        "absolute right-0 mt-2 w-56 rounded-md border border-zinc-800 bg-zinc-950 shadow-lg z-50",
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="py-1">
        {children}
      </div>
    </div>
  )
}

const DropdownMenuItem = ({ 
  children, 
  className, 
  onClick 
}: { 
  children: React.ReactNode
  className?: string
  onClick?: () => void
}) => (
  <button
    onClick={onClick}
    className={cn(
      "block w-full text-left px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800 hover:text-sue transition-colors",
      className
    )}
  >
    {children}
  </button>
)

export { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem 
}
