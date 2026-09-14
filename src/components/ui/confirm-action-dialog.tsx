'use client';

import { useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  createConfirmationGuard,
  executeConfirmedAction,
} from '@/lib/confirm-action';

export function ConfirmActionDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  loadingLabel = 'Wykonywanie…',
  variant = 'destructive',
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  loadingLabel?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => Promise<boolean | void> | boolean | void;
}) {
  const guard = useRef(createConfirmationGuard());
  const [isExecuting, setIsExecuting] = useState(false);

  const handleConfirm = async () => {
    if (guard.current.running) return;
    setIsExecuting(true);
    let shouldClose = false;
    try {
      const outcome = await executeConfirmedAction({
        confirmed: open,
        guard: guard.current,
        action: onConfirm,
      });
      shouldClose = outcome.executed && outcome.value !== false;
    } finally {
      setIsExecuting(false);
    }
    if (shouldClose) onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isExecuting) onOpenChange(nextOpen);
      }}
      title={title}
    >
      <DialogHeader>
        <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="size-5" aria-hidden="true" />
        </div>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogFooter className="mt-6">
        <Button
          type="button"
          variant="outline"
          disabled={isExecuting}
          autoFocus
          onClick={() => onOpenChange(false)}
        >
          Wróć
        </Button>
        <Button
          type="button"
          variant={variant}
          disabled={isExecuting}
          aria-busy={isExecuting}
          onClick={handleConfirm}
        >
          {isExecuting ? loadingLabel : confirmLabel}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
