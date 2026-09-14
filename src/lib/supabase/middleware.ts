import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/supabase';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // If there's a specific refresh token error, ensure we clear the invalid cookies.
  // The Next.js middleware is the best place to do this securely.
  if (error && (error.code === 'refresh_token_not_found' || error.message.includes('Refresh Token Not Found'))) {
    request.cookies.getAll().forEach((cookie) => {
      if (cookie.name.includes('-auth-token')) {
        supabaseResponse.cookies.delete(cookie.name);
      }
    });
    return { supabase, supabaseResponse, user: null };
  }

  return { supabase, supabaseResponse, user };
}
