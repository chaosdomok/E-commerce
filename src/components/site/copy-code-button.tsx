'use client';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
export function CopyCodeButton({ code }: { code: string }) {
  return (
    <button
      type="button"
      className="icon-button"
      aria-label={`Kopiuj kod ${code}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          toast.success('Kod rezerwacji skopiowany');
        } catch {
          toast.error(
            'Nie udało się skopiować. Zaznacz kod i skopiuj go ręcznie.',
          );
        }
      }}
    >
      <Copy className="size-4" />
    </button>
  );
}
