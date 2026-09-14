'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { requestPasswordReset } from '@/lib/frontend/auth';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, {});

  return (
    <Card className="mx-auto w-full max-w-md border-border bg-surface">
      <CardHeader className="text-center">
        <CardTitle className="font-display text-2xl text-foreground">
          Zmień zapomniane hasło
        </CardTitle>
        <CardDescription>
          Podaj adres e-mail konta. Otrzymasz jednorazowy link do ustawienia nowego hasła.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {state.success ? (
          <div className="space-y-4">
            <p role="status" className="rounded-xl border border-success/20 bg-success/10 p-4 text-sm text-foreground">
              {state.message}
            </p>
            <Link href="/login" className={buttonVariants({ variant: 'outline', className: 'w-full' })}>
              Wróć do logowania
            </Link>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">E-mail</Label>
              <Input
                id="reset-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="border-border bg-elevated text-foreground"
              />
            </div>
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? 'Wysyłanie…' : 'Wyślij link do zmiany hasła'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
