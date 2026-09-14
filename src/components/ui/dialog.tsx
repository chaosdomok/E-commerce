'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
  className?: string;
}

function Dialog({
  open,
  onOpenChange,
  children,
  title = 'Okno dialogowe',
  className,
}: DialogProps) {
  const ref = React.useRef<HTMLDialogElement>(null);
  React.useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    const focused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      focused?.focus();
    };
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onOpenChange?.(false);
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onOpenChange?.(false);
      }}
      className={cn(
        'fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-32px)] max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface p-0 text-foreground shadow-xl backdrop:bg-overlay/85 backdrop:backdrop-blur-sm open:animate-fade-in',
        className,
      )}
    >
      {open && (
        <div className="relative p-5 sm:p-7">
          <button
            type="button"
            aria-label="Zamknij okno"
            className="icon-button absolute right-2 top-2"
            onClick={() => onOpenChange?.(false)}
          >
            <X className="size-5" />
          </button>
          {children}
        </div>
      )}
    </dialog>
  );
}
const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('space-y-2 pr-8', className)} {...props} />
);
const DialogTitle = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2
    className={cn(
      'font-display text-xl font-semibold tracking-tight',
      className,
    )}
    {...props}
  />
);
const DialogDescription = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('text-sm text-muted-foreground', className)} {...props} />
);
const DialogContent = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('py-5', className)} {...props} />
);
const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:justify-end',
      className,
    )}
    {...props}
  />
);
export {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter,
};
