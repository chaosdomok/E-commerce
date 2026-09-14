'use client';

import { useEffect, useState } from 'react';

function getRemainingTime(expiresAt: string) {
  const remainingMinutes = Math.max(
    0,
    Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 60_000),
  );
  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;

  if (remainingMinutes === 0) return 'Rezerwacja wygasła';
  if (hours === 0) return `Pozostało ${minutes} min`;
  return `Pozostało ${hours} godz. ${minutes} min`;
}

export function ReservationCountdown({ expiresAt }: { expiresAt: string }) {
  const [label, setLabel] = useState(() => getRemainingTime(expiresAt));

  useEffect(() => {
    const interval = window.setInterval(
      () => setLabel(getRemainingTime(expiresAt)),
      30_000,
    );
    return () => window.clearInterval(interval);
  }, [expiresAt]);

  return (
    <p
      role="timer"
      suppressHydrationWarning
      className="mt-1 text-xs font-medium text-warning"
    >
      {label}
    </p>
  );
}
