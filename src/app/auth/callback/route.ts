import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  ensureProfile,
  getPostAuthRedirect,
} from '@/lib/profile';

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
  const origin = getExternalOrigin(request);
  const requestUrl = new URL(request.url);
  const searchParams = requestUrl.searchParams;
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${error}`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(`${origin}/login?error=exchange_code`);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await ensureProfile(supabase, user.id);
      const redirectTo = await getPostAuthRedirect(supabase, user.id);
      return NextResponse.redirect(`${origin}${redirectTo}`);
    }

    return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback`);
}
