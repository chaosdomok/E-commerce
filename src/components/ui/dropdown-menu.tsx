'use client';
import * as React from 'react';
import { cn } from '@/lib/utils';
import { Dialog } from '@/components/ui/dialog';

const subscribeMobile = (callback: () => void) => {
  const query = window.matchMedia('(max-width: 639px)');
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
};
const getMobileSnapshot = () => window.matchMedia('(max-width: 639px)').matches;
const getServerSnapshot = () => false;

const Context = React.createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
  id: string;
}>({ open: false, setOpen: () => {}, id: '' });
export function DropdownMenu({
  children,
  open,
  onOpenChange,
}: {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const id = React.useId();
  const isOpen = open ?? internalOpen;
  const setOpen = React.useCallback(
    (value: boolean) => {
      setInternalOpen(value);
      onOpenChange?.(value);
    },
    [onOpenChange],
  );
  React.useEffect(() => {
    if (!isOpen) return;
    const close = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const keys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        ref.current?.querySelector<HTMLButtonElement>('button')?.focus();
      }
    };
    const focus = (event: FocusEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', keys);
    document.addEventListener('focusin', focus);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', keys);
      document.removeEventListener('focusin', focus);
    };
  }, [isOpen, setOpen]);
  return (
    <Context.Provider value={{ open: isOpen, setOpen, id }}>
      <div
        ref={ref}
        className="relative inline-block text-left"
      >
        {children}
      </div>
    </Context.Provider>
  );
}
export function DropdownMenuTrigger({
  children,
}: {
  children: React.ReactNode;
}) {
  const { open, setOpen, id } = React.useContext(Context);
  if (!React.isValidElement(children)) return null;
  return React.cloneElement(
    children as React.ReactElement<
      React.ButtonHTMLAttributes<HTMLButtonElement>
    >,
    {
      'aria-expanded': open,
      'aria-controls': id,
      onClick: () => setOpen(!open),
      onKeyDown: (event) => {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setOpen(true);
        }
      },
    },
  );
}
export function DropdownMenuContent({
  children,
  className,
  mobileSheetTitle,
}: {
  children: React.ReactNode;
  className?: string;
  mobileSheetTitle?: string;
}) {
  const isMobile = React.useSyncExternalStore(
    subscribeMobile,
    getMobileSnapshot,
    getServerSnapshot,
  );
  const { open, id, setOpen } = React.useContext(Context);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (open) ref.current?.querySelector<HTMLElement>('button,a')?.focus();
  }, [open]);
  if (!open) return null;
  if (mobileSheetTitle && isMobile) {
    return (
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={mobileSheetTitle}
        className="inset-x-0 bottom-0 top-auto m-0 max-h-[85dvh] w-full max-w-none rounded-b-none rounded-t-2xl pb-[env(safe-area-inset-bottom)] [&>div]:p-0 [&>div>button]:z-20"
      >
        <div id={id} className="pt-2">
          {children}
        </div>
      </Dialog>
    );
  }
  return (
    <div
      ref={ref}
      id={id}
      className={cn(
        'absolute right-0 z-50 mt-3 w-64 max-w-[calc(100vw-32px)] rounded-xl border border-border bg-surface p-1.5 shadow-xl animate-fade-in',
        className,
      )}
    >
      {children}
    </div>
  );
}
export function DropdownMenuItem({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const classes = cn(
    'flex min-h-11 w-full items-center rounded-lg px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-sue-soft hover:text-sue',
    className,
  );
  return onClick ? (
    <button type="button" onClick={onClick} className={classes}>
      {children}
    </button>
  ) : (
    <div className={classes}>{children}</div>
  );
}
