'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { completePasswordReset } from '@/lib/frontend/auth';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ResetPasswordPage() {
  const [state, formAction, pending] = useActionState(completePasswordReset, {});

  return (
    <Card className="mx-auto w-full max-w-md border-border bg-surface">
      <CardHeader className="text-center">
        <CardTitle className="font-display text-2xl text-foreground">
          Ustaw nowe hasło
        </CardTitle>
        <CardDescription>
          Nowe hasło powinno mieć minimum 8 znaków oraz zawierać literę i cyfrę.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {state.success ? (
          <div className="space-y-4">
            <p role="status" className="rounded-xl border border-success/20 bg-success/10 p-4 text-sm text-foreground">
              {state.message}
            </p>
            <Link href="/login" className={buttonVariants({ className: 'w-full' })}>
              Przejdź do logowania
            </Link>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nowe hasło</Label>
              <Input id="new-password" name="newPassword" type="password" required minLength={8} autoComplete="new-password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Potwierdź nowe hasło</Label>
              <Input id="confirm-password" name="passwordConfirmation" type="password" required minLength={8} autoComplete="new-password" />
            </div>
            {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? 'Zapisywanie…' : 'Ustaw nowe hasło'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
