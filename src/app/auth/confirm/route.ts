import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  assertAccountActive,
  BlockedAccountError,
} from '@/lib/account-access';

function safeNext(value: string | null) {
  return value?.startsWith('/') && !value.startsWith('//')
    ? value
    : '/reset-hasla';
}

function getExternalOrigin(request: Request): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, '');
  }
  const forwardedHost = request.headers.get('x-forwarded-host');
  if (forwardedHost) {
    const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
    return `${forwardedProto}://${forwardedHost}`;
  }
  return new URL(request.url).origin;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  const next = safeNext(url.searchParams.get('next'));
  const origin = getExternalOrigin(request);

  if (!tokenHash || type !== 'recovery') {
    return NextResponse.redirect(`${origin}/login?error=invalid_recovery_link`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'recovery',
  });
  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=invalid_recovery_link`);
  }

  try {
    await assertAccountActive(data.user.id, () => supabase.auth.signOut());
  } catch (accountError) {
    if (accountError instanceof BlockedAccountError) {
      return NextResponse.redirect(`${origin}/login?error=account_blocked`);
    }
    throw accountError;
  }

  return NextResponse.redirect(`${origin}${next}`);
}
