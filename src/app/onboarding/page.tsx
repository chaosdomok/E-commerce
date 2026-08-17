'use client';

import { useActionState } from 'react';
import { completeOnboarding } from '@/actions/onboarding';
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

export default function OnboardingPage() {
  const [state, formAction, pending] = useActionState(completeOnboarding, {});

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-12 overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      <div className="pointer-events-none absolute left-1/2 top-24 -z-10 h-[300px] w-[400px] -translate-x-1/2 rounded-full bg-sue/10 blur-[120px] sm:h-[420px] sm:w-[620px]" />

      <Card className="relative w-full max-w-md border-zinc-800 bg-zinc-900/60 backdrop-blur-xl">
        <CardHeader className="text-center px-4 sm:px-6">
          <div className="mx-auto mb-4 flex min-h-[44px] min-w-[44px] h-11 w-11 items-center justify-center rounded-full bg-sue/10 ring-1 ring-sue/30">
            <img src="/logo.svg" alt="SUE Logo" className="h-full w-full object-contain" />
          </div>
          <CardTitle className="font-display text-2xl text-white">
            Uzupełnij profil
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Podaj swoje dane uczniowskie, aby korzystać z platformy SUE
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-zinc-300">
                Imię i nazwisko
              </Label>
              <Input
                id="fullName"
                name="fullName"
                required
                autoComplete="name"
                placeholder="Jan Kowalski"
                className="w-full border-zinc-700 bg-zinc-800/50 text-white placeholder:text-zinc-500"
              />
              {state.fieldErrors?.fullName && (
                <p className="text-sm text-red-400">
                  {state.fieldErrors.fullName[0]}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="class" className="text-zinc-300">
                Klasa
              </Label>
              <Input
                id="class"
                name="class"
                required
                placeholder="np. 3A, 2Tp, 4b"
                className="w-full border-zinc-700 bg-zinc-800/50 text-white placeholder:text-zinc-500"
              />
              {state.fieldErrors?.class && (
                <p className="text-sm text-red-400">
                  {state.fieldErrors.class[0]}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="school" className="text-zinc-300">
                Szkoła
              </Label>
              <Input
                id="school"
                name="school"
                required
                placeholder="np. LO nr 1 w Opolu"
                className="w-full border-zinc-700 bg-zinc-800/50 text-white placeholder:text-zinc-500"
              />
              {state.fieldErrors?.school && (
                <p className="text-sm text-red-400">
                  {state.fieldErrors.school[0]}
                </p>
              )}
            </div>

            {state.error && (
              <p className="text-sm text-red-400">{state.error}</p>
            )}

            <Button
              type="submit"
              disabled={pending}
              className="w-full bg-sue text-white hover:bg-sue-deep"
            >
              {pending ? 'Zapisywanie…' : 'Dokończ rejestrację'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
