'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Reveal({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      element.dataset.revealed = 'true';
      return;
    }
    if (!('IntersectionObserver' in window)) {
      element.dataset.revealed = 'true';
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        element.dataset.revealed = 'true';
        observer.unobserve(element);
      },
      { threshold: 0.12, rootMargin: '0px 0px -32px' },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn('viewport-reveal', className)}>
      {children}
    </div>
  );
}
