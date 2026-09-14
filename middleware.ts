import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const AUTH_ROUTES = ['/login', '/signup'];
const ONBOARDING_ROUTE = '/onboarding';

function isAuthRoute(pathname: string) {
  return AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

function isOnboardingRoute(pathname: string) {
  return (
    pathname === ONBOARDING_ROUTE ||
    pathname.startsWith(`${ONBOARDING_ROUTE}/`)
  );
}

/**
 * Create a redirect URL that uses the correct public-facing origin.
 * In production behind Nginx, request.nextUrl may contain the internal
 * port (3000). This helper patches the URL to use the external host.
 */
function createRedirectUrl(request: NextRequest, pathname: string): URL {
  const url = request.nextUrl.clone();
  url.pathname = pathname;

  // In production, override host/port/protocol to match the public domain
  if (process.env.NODE_ENV !== 'development') {
    const forwardedHost = request.headers.get('x-forwarded-host');
    const forwardedProto = request.headers.get('x-forwarded-proto');

    if (forwardedHost) {
      url.host = forwardedHost;
      url.port = ''; // Remove internal port
    }
    if (forwardedProto) {
      url.protocol = forwardedProto;
    }
  }

  return url;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const { supabase, supabaseResponse, user } = await updateSession(request);

  if (pathname.startsWith('/auth/callback')) {
    return supabaseResponse;
  }

  // Helper to apply cookies from supabaseResponse to a new response
  const applyCookies = (response: NextResponse) => {
    supabaseResponse.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        response.headers.append(key, value);
      }
    });
    return response;
  };

  if (user) {
    if (isAuthRoute(pathname)) {
      const url = createRedirectUrl(request, '/');
      return applyCookies(NextResponse.redirect(url));
    }
  } else {
    if (
      isOnboardingRoute(pathname) ||
      pathname.startsWith('/profile') ||
      pathname.startsWith('/admin')
    ) {
      const url = createRedirectUrl(request, '/login');
      url.searchParams.set('next', pathname);
      return applyCookies(NextResponse.redirect(url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
