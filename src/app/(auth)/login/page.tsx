'use client';

import Link from 'next/link';
import { Suspense, useActionState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithEmail } from '@/lib/frontend/auth';
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

function LoginRouteError() {
  const searchParams = useSearchParams();

  if (searchParams.get('error') !== 'account_blocked') return null;

  return (
    <p role="alert" className="text-sm text-danger">
      Twoje konto zostało zablokowane. Skontaktuj się z obsługą Targów
      Książek.
    </p>
  );
}

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signInWithEmail, {});
  const router = useRouter();

  useEffect(() => {
    if (state.redirect) {
      router.push(state.redirect);
    }
  }, [state.redirect, router]);

  return (
    <Card className="mx-auto w-full max-w-md border-border bg-surface ">
      <CardHeader className="text-center px-4 sm:px-6">
        <Link href="/" className="mx-auto mb-4 flex items-center gap-2">
          <div className="flex min-h-[44px] min-w-[44px] h-11 w-11 items-center justify-center rounded-xl bg-sue/10 ring-1 ring-sue/30">
            <img
              src="/logo.svg"
              alt="SUE Logo"
              className="h-full w-full object-contain"
            />
          </div>
          <span className="font-display text-xl font-bold text-foreground">
            SUE
          </span>
        </Link>
        <CardTitle className="font-display text-2xl text-foreground">
          Zaloguj się
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Wejdź na giełdę podręczników swojej szkoły
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-4 sm:px-6">
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground">
              E-mail
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="jan.kowalski@example.com"
              className="w-full border-border bg-elevated text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="password" className="text-foreground">
                Hasło
              </Label>
              <Link
                href="/zapomnialem-hasla"
                className="text-xs font-medium text-sue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sue/30"
              >
                Zapomniałem hasła
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full border-border bg-elevated text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {state.error && (
            <p role="alert" className="text-sm text-danger">
              {state.error}
            </p>
          )}
          <Suspense fallback={null}>
            <LoginRouteError />
          </Suspense>

          <Button
            type="submit"
            disabled={pending}
            className="w-full bg-sue text-primary-foreground hover:bg-sue-deep py-5 font-semibold"
          >
            {pending ? 'Logowanie…' : 'Zaloguj się'}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground pt-2">
          Nie masz konta?{' '}
          <Link
            href="/signup"
            className="font-semibold text-sue hover:underline"
          >
            Zarejestruj się
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
