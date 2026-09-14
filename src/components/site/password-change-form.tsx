'use client';

import { useState, useTransition } from 'react';
import { changePassword } from '@/lib/frontend/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export function PasswordChangeForm() {
  const [isPending, startTransition] = useTransition();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await changePassword(formData);
      if (result.success) {
        setCurrentPassword('');
        setNewPassword('');
        setPasswordConfirmation('');
        toast.success('Hasło zostało zmienione.');
      } else {
        toast.error(result.error || 'Nie udało się zmienić hasła.');
      }
    });
  };

  return (
    <Card className="border-border bg-surface ">
      <CardHeader>
        <CardTitle className="font-display text-lg text-foreground">Zmiana hasła</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-3 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="current-password" className="text-foreground text-xs">Obecne hasło</Label>
            <Input
              id="current-password"
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="border-border bg-elevated text-foreground"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-password" className="text-foreground text-xs">Nowe hasło</Label>
            <Input
              id="new-password"
              name="newPassword"
              type="password"
              minLength={8}
              required
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="border-border bg-elevated text-foreground"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-new-password" className="text-foreground text-xs">Potwierdź nowe hasło</Label>
            <Input
              id="confirm-new-password"
              name="passwordConfirmation"
              type="password"
              minLength={8}
              required
              autoComplete="new-password"
              value={passwordConfirmation}
              onChange={(event) => setPasswordConfirmation(event.target.value)}
              className="border-border bg-elevated text-foreground"
            />
          </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-relaxed text-muted-foreground">
              Minimum 8 znaków, w tym co najmniej jedna litera i jedna cyfra.
            </p>
            <Button type="submit" disabled={isPending} className="shrink-0 bg-primary text-primary-foreground hover:bg-sue-deep">
            {isPending ? 'Zapisywanie...' : 'Zmień hasło'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
