'use client';

import Link from 'next/link';
import { useActionState, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { signUpWithEmail } from '@/lib/frontend/auth';
import { checkStudentEligibility } from '@/lib/frontend/students';
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
import {
  GraduationCap,
  Users,
  CheckCircle2,
  AlertCircle,
  Lock,
  Phone,
  CreditCard,
} from 'lucide-react';
import {
  CASH_PAYOUT_METHOD,
  PHONE_BLIK_PAYOUT_METHOD,
} from '@/lib/frontend/payout-display';

export default function SignUpPage() {
  const [state, formAction, pending] = useActionState(signUpWithEmail, {});
  const router = useRouter();

  const [accountType, setAccountType] = useState<'student' | 'other'>(
    'student',
  );
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [className, setClassName] = useState('');
  const [studentStatus, setStudentStatus] = useState<{
    checked: boolean;
    found: boolean;
    message?: string;
  }>({ checked: false, found: false });
  const [isCheckingStudent, startCheckingStudent] = useTransition();

  const handleCheckStudent = () => {
    if (!firstName.trim() || !lastName.trim()) return;
    startCheckingStudent(async () => {
      const res = await checkStudentEligibility(firstName, lastName);
      setStudentStatus({
        checked: true,
        found: res.found,
        message: res.message,
      });
      setClassName(res.student?.className ?? '');
    });
  };

  if (state.redirect) {
    router.push(state.redirect);
  }

  return (
    <Card className="mx-auto w-full max-w-xl border-border bg-surface  ">
      <CardHeader className="text-center px-4 sm:px-8 pb-4">
        <Link href="/" className="mx-auto mb-3 flex items-center gap-2">
          <div className="flex min-h-[44px] min-w-[44px] h-11 w-11 items-center justify-center rounded-xl bg-sue/10 ring-1 ring-sue/30">
            <img
              src="/logo.svg"
              alt="SUE Logo"
              className="h-full w-full object-contain"
            />
          </div>
          <span className="font-display text-2xl font-bold text-foreground">
            SUE
          </span>
        </Link>
        <CardTitle className="font-display text-2xl sm:text-3xl font-bold text-foreground">
          Dołącz do kiermaszu
        </CardTitle>
        <CardDescription className="text-muted-foreground text-sm">
          Wybierz typ konta, aby szybko wystawiać i rezerwować podręczniki
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 px-4 sm:px-8 pb-8">
        {/* Account Type Selector */}
        <div className="grid grid-cols-2 gap-3 p-1 bg-surface border border-border rounded-xl">
          <button
            type="button"
            onClick={() => {
              setAccountType('student');
              setClassName('');
              setStudentStatus({ checked: false, found: false });
            }}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold transition-all ${
              accountType === 'student'
                ? 'bg-sue text-primary-foreground '
                : 'text-muted-foreground hover:text-foreground hover:bg-elevated'
            }`}
          >
            <GraduationCap className="h-4 w-4" />
            Uczeń szkoły
          </button>
          <button
            type="button"
            onClick={() => {
              setAccountType('other');
              setClassName('');
              setStudentStatus({ checked: false, found: false });
            }}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold transition-all ${
              accountType === 'other'
                ? 'bg-sue text-primary-foreground '
                : 'text-muted-foreground hover:text-foreground hover:bg-elevated'
            }`}
          >
            <Users className="h-4 w-4" />
            Pozostałe osoby
          </button>
        </div>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="accountType" value={accountType} />

          {/* First & Last Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label
                htmlFor="firstName"
                className="text-foreground text-xs font-medium"
              >
                Imię *
              </Label>
              <Input
                id="firstName"
                name="firstName"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  setClassName('');
                  setStudentStatus({ checked: false, found: false });
                }}
                onBlur={
                  accountType === 'student' ? handleCheckStudent : undefined
                }
                required
                placeholder="Jan"
                className="border-border bg-elevated text-foreground placeholder:text-muted-foreground focus:border-sue"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="lastName"
                className="text-foreground text-xs font-medium"
              >
                Nazwisko *
              </Label>
              <Input
                id="lastName"
                name="lastName"
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  setClassName('');
                  setStudentStatus({ checked: false, found: false });
                }}
                onBlur={
                  accountType === 'student' ? handleCheckStudent : undefined
                }
                required
                placeholder="Kowalski"
                className="border-border bg-elevated text-foreground placeholder:text-muted-foreground focus:border-sue"
              />
            </div>
          </div>

          {/* Student Status check feedback */}
          {accountType === 'student' && studentStatus.checked && (
            <div
              className={`flex items-center gap-2 p-2.5 rounded-lg text-xs ${
                studentStatus.found
                  ? 'bg-success/10 border border-success/20 text-success'
                  : 'bg-warning/10 border border-warning/20 text-warning'
              }`}
            >
              {studentStatus.found ? (
                <>
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                  <span>
                    Znaleziono ucznia. Klasa: <strong>{className}</strong>
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 shrink-0 text-warning" />
                  <span>
                    {studentStatus.message ||
                      'Nie znaleźliśmy Cię na liście uczniów. Sprawdź imię i nazwisko albo wybierz rejestrację jako osoba spoza szkoły.'}
                  </span>
                </>
              )}
            </div>
          )}

          {/* Email & Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-foreground text-xs font-medium"
              >
                Adres E-mail *
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="jan.kowalski@example.com"
                className="border-border bg-elevated text-foreground placeholder:text-muted-foreground focus:border-sue"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-foreground text-xs font-medium"
              >
                Hasło *
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="new-password"
                minLength={8}
                placeholder="••••••••"
                className="border-border bg-elevated text-foreground placeholder:text-muted-foreground focus:border-sue"
              />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Minimum 8 znaków, w tym co najmniej jedna litera i jedna cyfra.
              </p>
            </div>
          </div>

          {/* Phone & Class / School */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label
                htmlFor="phone"
                className="text-foreground text-xs font-medium flex items-center gap-1.5"
              >
                <Phone className="h-3 w-3 text-muted-foreground" />
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
                placeholder="+48 123 456 789"
                className="border-border bg-elevated text-foreground placeholder:text-muted-foreground focus:border-sue"
              />
            </div>

            {accountType === 'student' ? (
              <div className="space-y-2">
                <Label
                  htmlFor="className"
                  className="text-foreground text-xs font-medium"
                >
                  <span className="inline-flex items-center gap-1.5">
                    Klasa z listy uczniów *
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  </span>
                </Label>
                <Input
                  id="className"
                  name="className"
                  value={className}
                  readOnly
                  required
                  placeholder="Uzupełni się po weryfikacji"
                  aria-describedby="student-class-help"
                  className="cursor-default border-border bg-surface-soft text-foreground placeholder:text-muted-foreground"
                />
                <p id="student-class-help" className="text-[11px] text-muted-foreground">
                  Klasa jest automatycznie pobierana z oficjalnej listy.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-foreground text-xs font-medium">
                  Szkoła / Instytucja
                </Label>
                <Input
                  disabled
                  value="Pozostałe osoby"
                  className="border-border bg-surface text-muted-foreground cursor-not-allowed"
                />
              </div>
            )}
          </div>

          {/* Refund method choice */}
          <div className="space-y-2 pt-1">
            <Label
              htmlFor="refundMethod"
              className="text-foreground text-xs font-medium flex items-center gap-1.5"
            >
              <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
              Preferowana forma wypłaty za sprzedane podręczniki
            </Label>
            <select
              id="refundMethod"
              name="refundMethod"
              className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm text-foreground focus:outline-none focus:border-sue"
            >
              <option value={CASH_PAYOUT_METHOD}>Gotówka</option>
              <option value={PHONE_BLIK_PAYOUT_METHOD}>
                Przelew na telefon BLIK
              </option>
            </select>
          </div>

          {/* Terms checkbox */}
          <div className="pt-2">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                name="termsAccepted"
                value="true"
                required
                className="mt-0.5 h-4 w-4 rounded border-border bg-elevated text-sue focus:ring-sue"
              />
              <span className="text-xs text-muted-foreground leading-relaxed group-hover:text-foreground">
                Akceptuję{' '}
                <Link
                  href="/regulamin"
                  target="_blank"
                  className="text-sue underline hover:text-sue-deep"
                >
                  Regulamin Targów Książek
                </Link>
                . Potwierdzam, że mam ukończone 13 lat, a jeśli jestem osobą
                niepełnoletnią – posiadam zgodę rodzica lub opiekuna prawnego na
                udział w Targach. Zapoznałem/am się z{' '}
                <Link
                  href="/polityka-prywatnosci"
                  target="_blank"
                  className="text-sue underline hover:text-sue-deep"
                >
                  Polityką prywatności
                </Link>
                .
              </span>
            </label>
          </div>

                    {state.success && (
            <div className="bg-sue/10 text-sue border border-sue/20 p-4 rounded-md text-sm font-medium flex items-start gap-2 mb-4">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{state.message}</span>
            </div>
          )}

          {!state.success && state.error && (
            <div className="rounded-lg bg-danger/10 border border-danger/20 p-3 text-sm text-danger">
              {state.error}
            </div>
          )}

          <Button
            type="submit"
            disabled={
              pending ||
              isCheckingStudent ||
              (accountType === 'student' && !studentStatus.found) ||
              state.success
            }
            className="w-full bg-sue text-primary-foreground hover:bg-sue-deep py-6 text-base font-semibold   mt-2"
          >
            {pending ? 'Rejestrowanie…' : state.success ? 'Wysłano link' : 'Utwórz konto'}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground pt-2">
          Masz już konto?{' '}
          <Link
            href="/login"
            className="font-semibold text-sue hover:underline"
          >
            Zaloguj się
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
