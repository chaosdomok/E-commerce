import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SwitchProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type'
> {}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, ...props }, ref) => {
    return (
      <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" className="sr-only peer" ref={ref} {...props} />
        <div
          className={cn(
            "w-11 h-6 bg-elevated peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-sue/50 rounded-xl peer peer-checked:after:translate-x-full peer-checked:after:border-foreground after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-foreground after:border-border after:border after:rounded-xl after:h-5 after:w-5 after:transition-all peer-checked:bg-sue",
            className,
          )}
        />
      </label>
    );
  },
);
Switch.displayName = 'Switch';

export { Switch };
