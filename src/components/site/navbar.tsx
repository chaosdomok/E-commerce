'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LogOut,
  User,
  Menu,
  ArrowUpRight,
  ShoppingCart,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { signOut } from '@/lib/frontend/auth';
import { NotificationDropdown } from '@/components/site/notification-dropdown';
import type { Profile } from '@/lib/profile';
import { isFrontendPreview } from '@/lib/preview';
import { previewProfile } from '@/mocks/frontend';
import { primarySiteLinks } from '@/lib/site-config';
import { Dialog, DialogTitle } from '@/components/ui/dialog';
import { CartDrawer } from '@/components/site/cart-drawer';
import { useCartStore } from '@/lib/store/cart';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from '@/components/ui/dropdown-menu';

export function Navbar({
  profile: initialProfile,
  authenticatedUserId,
}: {
  profile?: Profile | null;
  authenticatedUserId?: string;
}) {
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile | null>(
    isFrontendPreview ? previewProfile : (initialProfile ?? null),
  );
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(() => {
    if (isFrontendPreview || initialProfile || authenticatedUserId) return true;
    if (initialProfile === null) return false;
    return null;
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const cartCount = useSyncExternalStore(
    useCartStore.subscribe,
    () => useCartStore.getState().items.length,
    () => 0,
  );
  useEffect(() => {
    if (isFrontendPreview) return;

    const supabase = createClient();

    if (initialProfile === undefined && !authenticatedUserId) {
      async function loadProfile() {
        const user = (await supabase.auth.getUser()).data.user;

        if (!user) {
          setIsAuthenticated(false);
          return;
        }

        setIsAuthenticated(true);

        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, class, school, role, initials')
          .eq('id', user.id)
          .maybeSingle();

        if (data) setProfile(data as Profile);
      }

      void loadProfile();
    } else if (authenticatedUserId && !initialProfile) {
      supabase
        .from('profiles')
        .select('id, full_name, class, school, role, initials')
        .eq('id', authenticatedUserId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setProfile(data as Profile);
        });
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setIsAuthenticated(false);
        setProfile(null);
        return;
      }

      setIsAuthenticated(true);
      supabase
        .from('profiles')
        .select('id, full_name, class, school, role, initials')
        .eq('id', session.user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setProfile(data as Profile);
        });
    });

    return () => subscription.unsubscribe();
  }, [authenticatedUserId, initialProfile]);

  const initials =
    profile?.initials ||
    profile?.full_name
      ?.split(' ')
      .map((part) => part[0])
      .slice(0, 2)
      .join('') ||
    'SU';
  return (
    <>
      <header className="sticky top-0 z-40 isolate border-b border-border bg-navbar/95 backdrop-blur-sm">
        <div className="page-container flex h-[var(--navbar-height)] items-center justify-between gap-2">
          <Link
            href="/"
            aria-label="Targi Książek — strona główna"
            className="flex shrink-0 items-center gap-2.5"
          >
            <img
              src="/logo.svg"
              alt="Samorząd Uczniowski"
              className="size-10 object-contain"
            />
            <span className="hidden leading-tight min-[400px]:block">
              <span className="block text-sm font-semibold tracking-tight">
                Targi Książek
              </span>
              <span className="text-[11px] text-muted-foreground">
                Samorząd Uczniowski
              </span>
            </span>
          </Link>
          <nav
            aria-label="Główna nawigacja"
            className="hidden items-center gap-1 lg:flex"
          >
            {primarySiteLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={pathname === link.href ? 'page' : undefined}
                className={`nav-link rounded-lg px-3 py-2.5 text-sm font-medium ${pathname === link.href ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-0.5 sm:gap-2">
            {isAuthenticated && <NotificationDropdown />}
            <button
              type="button"
              aria-label={`Koszyk, ${cartCount} ${cartCount === 1 ? 'pozycja' : 'pozycji'}`}
              title="Koszyk"
              className="icon-button relative"
              onClick={() => setIsCartOpen(true)}
            >
              <ShoppingCart className="size-5" />
              {cartCount > 0 && (
                <span className="absolute right-0.5 top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-sue px-1 text-[10px] font-bold leading-none text-white">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </button>
            {isAuthenticated ? (
              isFrontendPreview ? (
                <Link
                  href="/profile"
                  aria-label="Mój profil"
                  aria-current={pathname === '/profile' ? 'page' : undefined}
                  title="Mój profil"
                  className="flex size-11 items-center justify-center rounded-full border border-cream-secondary/35 bg-elevated text-sm font-semibold text-foreground transition hover:border-cream-secondary active:scale-95"
                >
                  {initials}
                </Link>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <button
                      type="button"
                      aria-label="Menu konta"
                      className="flex size-11 items-center justify-center rounded-full border border-cream-secondary/35 bg-elevated text-sm font-semibold text-foreground transition hover:border-cream-secondary"
                    >
                      {initials}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <div className="border-b border-border px-3 py-3">
                      <p className="font-semibold text-foreground">
                        {profile?.full_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {profile?.class} · {profile?.school}
                      </p>
                    </div>
                    <Link
                      href="/profile"
                      className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm hover:bg-sue-soft"
                    >
                      <User className="size-4" />
                      Mój profil i rezerwacje
                    </Link>
                    {(profile?.role === 'admin' || profile?.role === 'head_admin') && (
                      <Link
                        href="/admin"
                        className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm hover:bg-sue-soft"
                      >
                        <ArrowUpRight className="size-4" />
                        Panel administratora
                      </Link>
                    )}
                    <form action={signOut}>
                      <button
                        type="submit"
                        disabled={isFrontendPreview}
                        className="flex w-full items-center gap-2 rounded-lg px-3 text-sm text-muted-foreground hover:bg-elevated disabled:opacity-40"
                      >
                        <LogOut className="size-4" />
                        Wyloguj
                      </button>
                    </form>
                  </DropdownMenuContent>
                </DropdownMenu>
              )
            ) : isAuthenticated === false ? (
              <Link href="/login" className="secondary-link !px-3">
                Zaloguj się
              </Link>
            ) : (
              <span
                className="size-10 skeleton rounded-full bg-elevated"
                aria-label="Ładowanie konta"
              />
            )}
            <button
              type="button"
              aria-label="Otwórz menu"
              aria-expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(true)}
              className="icon-button lg:hidden"
            >
              <Menu className="size-5" />
            </button>
          </div>
        </div>
      </header>
      <Dialog
        open={isMobileMenuOpen}
        onOpenChange={setIsMobileMenuOpen}
        title="Nawigacja"
      >
        <DialogTitle>Menu</DialogTitle>
        <nav aria-label="Nawigacja mobilna" className="mt-5 space-y-1">
          {primarySiteLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsMobileMenuOpen(false)}
              aria-current={pathname === link.href ? 'page' : undefined}
              className={`flex min-h-12 items-center justify-between rounded-lg border-l-2 px-3 text-base ${pathname === link.href ? 'border-l-champagne font-semibold text-foreground' : 'border-l-transparent text-muted-foreground hover:bg-elevated hover:text-foreground'}`}
            >
              {link.label}
              <ArrowUpRight className="size-4" />
            </Link>
          ))}
        </nav>
      </Dialog>
      <CartDrawer open={isCartOpen} onOpenChange={setIsCartOpen} />
    </>
  );
}
