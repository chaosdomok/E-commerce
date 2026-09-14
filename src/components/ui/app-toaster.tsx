'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Toaster } from 'sonner';

const closeButtonSelector = '[data-sonner-toast] [data-close-button]';

export function AppToaster() {
  useEffect(() => {
    const updateToaster = () => {
      document.querySelectorAll<HTMLButtonElement>(closeButtonSelector).forEach((button) => {
        button.setAttribute('aria-label', 'Zamknij powiadomienie');
      });
      const headerBottom = document.querySelector('header')?.getBoundingClientRect().bottom;
      if (headerBottom !== undefined) {
        document.documentElement.style.setProperty(
          '--toast-top-offset',
          `${Math.max(0, headerBottom) + 12}px`,
        );
      }
    };

    updateToaster();
    const observer = new MutationObserver(updateToaster);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('scroll', updateToaster, { passive: true });
    window.addEventListener('resize', updateToaster);
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', updateToaster);
      window.removeEventListener('resize', updateToaster);
      document.documentElement.style.removeProperty('--toast-top-offset');
    };
  }, []);

  return (
    <Toaster
      position="top-right"
      theme="light"
      closeButton
      expand={false}
      gap={8}
      visibleToasts={3}
      offset={{ top: 'var(--toast-top-offset)', right: 16 }}
      mobileOffset={{ top: 'var(--toast-top-offset)', right: 12 }}
      containerAriaLabel="Powiadomienia"
      icons={{ close: <X aria-hidden="true" className="size-3.5" /> }}
      toastOptions={{
        duration: 4500,
        style: {
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          color: 'var(--foreground)',
        },
        classNames: {
          toast: 'app-toast',
          content: 'app-toast-content',
          title: 'app-toast-title',
          description: 'app-toast-description',
          icon: 'app-toast-icon',
          closeButton: 'app-toast-close',
        },
      }}
    />
  );
}
