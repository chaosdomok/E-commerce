import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { getProfile, isProfileComplete } from '@/lib/profile';

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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const { supabase, supabaseResponse, user } = await updateSession(request);

  if (pathname.startsWith('/auth/callback')) {
    return supabaseResponse;
  }

  if (user) {
    const profile = await getProfile(supabase, user.id);
    const complete = isProfileComplete(profile);

    if (isAuthRoute(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = complete ? '/' : ONBOARDING_ROUTE;
      return NextResponse.redirect(url);
    }

    if (
      !complete &&
      !isOnboardingRoute(pathname) &&
      !pathname.startsWith('/auth/')
    ) {
      const url = request.nextUrl.clone();
      url.pathname = ONBOARDING_ROUTE;
      return NextResponse.redirect(url);
    }

    if (complete && isOnboardingRoute(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  } else {
    if (
      isOnboardingRoute(pathname) ||
      pathname.startsWith('/profile') ||
      pathname.startsWith('/admin')
    ) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
