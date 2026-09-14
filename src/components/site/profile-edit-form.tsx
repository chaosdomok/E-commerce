'use client';

import { useState, useTransition } from 'react';
import { updateProfileData } from '@/lib/frontend/profile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Edit3, CheckCircle2, AlertCircle, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { getPolishPhoneDigits } from '@/lib/profile';
import {
  CASH_PAYOUT_METHOD,
  PHONE_BLIK_PAYOUT_METHOD,
  normalizePayoutMethod,
} from '@/lib/frontend/payout-display';

interface ProfileEditFormProps {
  profile: {
    fullName?: string | null;
    phone?: string | null;
    class?: string | null;
    refundMethod?: string | null;
    accountType?: string | null;
  };
}

export function ProfileEditForm({ profile }: ProfileEditFormProps) {
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSuccess(false);
    setError(null);

    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateProfileData(formData);
      if (result.success) {
        setSuccess(true);
        toast.success('Dane zostały pomyślnie zaktualizowane.');
      } else {
        setError(result.error || 'Wystąpił błąd podczas zapisu.');
        toast.error('Nie udało się zapisać zmian', {
          description: result.error || 'Wystąpił błąd.',
        });
      }
    });
  };

  return (
    <Card className="border-border bg-surface ">
      <CardHeader>
        <CardTitle className="font-display text-lg text-foreground flex items-center gap-2">
          <Edit3 className="h-4 w-4 text-sue" />
          Edycja Danych Kontaktowych i Rozliczeń
        </CardTitle>
        <CardDescription className="text-muted-foreground text-xs">
          Zaktualizuj numer telefonu lub preferowaną metodę odbioru środków
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="fullName"
                className="text-foreground text-xs font-medium"
              >
                Imię i nazwisko
              </Label>
              <div className="relative">
                <Input
                  id="fullName"
                  name="fullName"
                  defaultValue={profile.fullName || ''}
                  required
                  readOnly
                  aria-readonly="true"
                  aria-describedby="identity-change-help"
                  className="cursor-not-allowed border-border bg-surface-soft pr-10 text-sm text-muted-foreground focus:border-border focus:ring-0"
                />
                <Lock
                  className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="phone"
                className="text-foreground text-xs font-medium"
              >
                Telefon kontaktowy
              </Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                inputMode="numeric"
                maxLength={9}
                pattern="[0-9]{9}"
                title="Podaj 9 cyfr numeru telefonu; prefiks +48 zostanie dodany automatycznie."
                defaultValue={getPolishPhoneDigits(profile.phone)}
                placeholder="123456789"
                className="border-border bg-elevated text-foreground placeholder:text-muted-foreground text-sm focus:border-sue"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {profile.accountType !== 'other' && (
              <div className="space-y-1.5">
                <Label
                  htmlFor="class"
                  className="text-foreground text-xs font-medium"
                >
                  Klasa
                </Label>
                <div className="relative">
                  <Input
                    id="class"
                    name="class"
                    defaultValue={profile.class || ''}
                    readOnly
                    aria-readonly="true"
                    aria-describedby="identity-change-help"
                    className="cursor-not-allowed border-border bg-surface-soft pr-10 text-sm text-muted-foreground focus:border-border focus:ring-0"
                  />
                  <Lock
                    className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label
                htmlFor="refundMethod"
                className="text-foreground text-xs font-medium"
              >
                Preferowana forma wypłaty środków
              </Label>
              <select
                id="refundMethod"
                name="refundMethod"
                defaultValue={normalizePayoutMethod(profile.refundMethod)}
                className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm text-foreground focus:outline-none focus:border-sue"
              >
                {profile.refundMethod && ![CASH_PAYOUT_METHOD, PHONE_BLIK_PAYOUT_METHOD].includes(profile.refundMethod) && (
                  <option value={profile.refundMethod}>{profile.refundMethod}</option>
                )}
                <option value={CASH_PAYOUT_METHOD}>Gotówka</option>
                <option value={PHONE_BLIK_PAYOUT_METHOD}>
                  Przelew na telefon BLIK
                </option>
              </select>
            </div>
          </div>

          <p
            id="identity-change-help"
            className="rounded-lg border border-border bg-surface-soft px-3 py-2.5 text-xs leading-relaxed text-muted-foreground"
          >
            Chcesz zmienić imię, nazwisko lub klasę? Skontaktuj się z obsługą:{' '}
            <a
              href="mailto:targi.pomoc@postol.tech"
              className="font-medium text-green-ink hover:underline"
            >
              targi.pomoc@postol.tech
            </a>
          </p>

          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-danger/10 border border-danger/20 text-xs text-danger">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-success/10 border border-success/20 text-xs text-success">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
              <span>Zmiany zostały pomyślnie zapisane.</span>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <Button
              type="submit"
              disabled={isPending}
              className="bg-sue text-primary-foreground hover:bg-sue-deep text-xs font-semibold px-6"
            >
              {isPending ? 'Zapisywanie…' : 'Zapisz zmiany'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
