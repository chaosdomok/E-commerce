'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AlertCircle } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { toast } from 'sonner';

export function VerificationBanner() {
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user && !user.email_confirmed_at) {
        setUnverifiedEmail(user.email || null);
      } else {
        setUnverifiedEmail(null);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && !session.user.email_confirmed_at) {
        setUnverifiedEmail(session.user.email || null);
      } else {
        setUnverifiedEmail(null);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, [pathname]);

  if (!unverifiedEmail) return null;

  const handleResend = async () => {
    if (isLoading || sent) return;
    setIsLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: unverifiedEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      }
    });
    setIsLoading(false);
    
    if (error) {
      if (error.message.includes('rate limit')) {
        toast.error('Zbyt wiele prób', {
          description: 'Odczekaj chwilę przed kolejną próbą.',
        });
      } else {
        toast.error('Błąd', {
          description: 'Nie udało się wysłać linku. Spróbuj ponownie później.',
        });
      }
    } else {
      setSent(true);
      toast.success('Wysłano', {
        description: 'Link aktywacyjny został wysłany ponownie.',
      });
      setTimeout(() => setSent(false), 60000); // 1 minute cooldown
    }
  };

  return (
    <div className="bg-amber-100 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800 px-4 py-3 flex flex-col sm:flex-row items-center justify-between text-amber-900 dark:text-amber-200 text-sm">
      <div className="flex items-center gap-2 mb-2 sm:mb-0">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <p>
          <strong>Wymagane potwierdzenie:</strong> Najpierw potwierdź adres e-mail, aby móc wystawiać i rezerwować książki.
        </p>
      </div>
      <button 
        onClick={handleResend}
        disabled={isLoading || sent}
        className="px-4 py-1.5 bg-amber-200 hover:bg-amber-300 dark:bg-amber-800 dark:hover:bg-amber-700 text-amber-900 dark:text-amber-100 rounded-full font-medium transition-colors disabled:opacity-50"
      >
        {isLoading ? 'Wysyłanie...' : sent ? 'Wysłano' : 'Wyślij ponownie link'}
      </button>
    </div>
  );
}
