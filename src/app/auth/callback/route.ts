import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  ensureProfile,
  getPostAuthRedirect,
} from '@/lib/profile';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  console.log('Auth callback received:', requestUrl.href);

  // Dynamically get the host to ensure redirects work on local network IPs (e.g. 192.168.x.x)
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (host) {
    requestUrl.host = host;
  }

  const origin = requestUrl.origin;
  console.log('Auth callback origin:', origin);

  const searchParams = requestUrl.searchParams;
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  console.log('Auth callback params:', { code: !!code, error, errorDescription, next });

  if (error) {
    console.error('OAuth error from provider:', error, errorDescription);
    return NextResponse.redirect(`${origin}/login?error=${error}`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Error exchanging code for session:', error);
      return NextResponse.redirect(`${origin}/login?error=exchange_code`);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await ensureProfile(supabase, user.id);
      const redirectTo = await getPostAuthRedirect(supabase, user.id);
      console.log('Redirecting to:', redirectTo);
      return NextResponse.redirect(`${origin}${redirectTo}`);
    }

    return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback`);
}
