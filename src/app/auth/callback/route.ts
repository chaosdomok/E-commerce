import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  ensureProfile,
  getPostAuthRedirect,
} from '@/lib/profile';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  
  // Dynamically get the host to ensure redirects work on local network IPs (e.g. 192.168.x.x)
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (host) {
    requestUrl.host = host;
  }
  
  const origin = requestUrl.origin;
  const searchParams = requestUrl.searchParams;
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
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
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback`);
}
