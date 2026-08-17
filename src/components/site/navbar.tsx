'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Search, ShoppingCart, Bell, LogOut, User, Menu, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { signOut } from '@/actions/auth';
import { CartDrawer } from '@/components/site/cart-drawer';
import { NotificationDropdown } from '@/components/site/notification-dropdown';
import { useCartStore } from '@/lib/store/cart';
import type { Profile } from '@/lib/profile';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface NavbarProps {
  onSearchClick: () => void;
  profile?: Profile | null;
}

export function Navbar({ onSearchClick, profile: initialProfile }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(
    initialProfile ?? null
  );
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(
    initialProfile ? true : null
  );
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { items } = useCartStore();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onSearchClick();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSearchClick]);

  useEffect(() => {
    if (initialProfile) return;

    const supabase = createClient();

    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsAuthenticated(false);
        return;
      }

      setIsAuthenticated(true);

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (data) setProfile(data);
    }

    loadProfile();

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
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setProfile(data);
        });
    });

    return () => subscription.unsubscribe();
  }, [initialProfile]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        // handled by dropdown component internal state
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = profile?.initials ?? '?';

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur-xl'
            : 'border-b border-transparent bg-transparent'
        }`}
      >
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-3 sm:px-4 lg:px-8">
          <Link href="/" className="group flex shrink-0 items-center gap-2">
            <div className="flex min-h-[44px] min-w-[44px] h-11 w-11 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-sue/10 ring-1 ring-sue/30 transition-all duration-300 group-hover:bg-sue/20 group-hover:glow-accent-sm">
              <img
                src="/logo.svg"
                alt="SUE Logo"
                className="h-full w-full object-contain"
              />
            </div>
            <span className="hidden sm:block font-display text-lg sm:text-xl font-bold tracking-tight text-white">
              SUE
            </span>
          </Link>

          <div className="relative hidden max-w-md flex-1 md:block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Szukaj 1 200+ podręczników, kursów, ISBN…"
              readOnly
              onClick={onSearchClick}
              className="min-h-[44px] h-11 w-full cursor-pointer rounded-full border border-zinc-800 bg-zinc-900/60 pl-10 pr-4 text-sm text-zinc-200 placeholder:text-zinc-500 backdrop-blur-md transition-all duration-300 focus:border-sue/50 focus:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-sue/20"
            />
            <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400 lg:block">
              ⌘K
            </kbd>
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <button
              aria-label="Szukaj"
              onClick={onSearchClick}
              className="flex min-h-[44px] min-w-[44px] h-11 w-11 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/60 text-zinc-300 backdrop-blur-md transition hover:border-sue/40 hover:text-sue md:hidden"
            >
              <Search className="h-4 w-4" />
            </button>

            <NotificationDropdown />

            <button
              aria-label="Koszyk"
              onClick={() => setIsCartOpen(true)}
              className="relative flex min-h-[44px] min-w-[44px] h-11 w-11 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/60 text-zinc-300 backdrop-blur-md transition hover:border-sue/40 hover:text-sue hover:glow-accent-sm"
            >
              <ShoppingCart className="h-4 w-4" />
              {items.length > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-sue px-0.5 text-[9px] font-bold text-white ring-2 ring-zinc-950 sm:h-4 sm:min-w-4 sm:px-1 sm:text-[10px]">
                  {items.length}
                </span>
              ) : null}
            </button>

            {isAuthenticated === false ? (
              <Link
                href="/login"
                className="hidden sm:flex min-h-[44px] h-11 items-center rounded-full bg-gradient-to-br from-sue to-sue-deep px-3 sm:px-4 text-xs sm:text-sm font-bold text-white ring-2 ring-zinc-800 transition hover:ring-sue/50"
              >
                Zaloguj
              </Link>
            ) : isAuthenticated === true ? (
              <>
                {/* Desktop dropdown */}
                <div ref={dropdownRef} className="hidden md:block">
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <button
                        aria-label="Profil"
                        className="flex min-h-[44px] min-w-[44px] h-11 w-11 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-gradient-to-br from-sue to-sue-deep text-xs sm:text-sm font-bold text-white ring-2 ring-zinc-800 transition hover:ring-sue/50"
                      >
                        {initials}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {profile?.full_name && (
                        <div className="border-b border-zinc-800 px-4 py-2">
                          <p className="text-sm font-medium text-white">
                            {profile.full_name}
                          </p>
                          {profile.class && profile.school && (
                            <p className="text-xs text-zinc-500">
                              {profile.class} · {profile.school}
                            </p>
                          )}
                        </div>
                      )}
                      <DropdownMenuItem>
                        <Link href="/profile" className="flex w-full items-center gap-2">
                          <User className="h-4 w-4" />
                          Moje Rezerwacje
                        </Link>
                      </DropdownMenuItem>
                      <form action={signOut}>
                        <button
                          type="submit"
                          className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-zinc-200 transition-colors hover:bg-zinc-800 hover:text-sue"
                        >
                          <LogOut className="h-4 w-4" />
                          Wyloguj
                        </button>
                      </form>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Mobile menu button */}
                <button
                  aria-label="Menu"
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="md:hidden flex min-h-[44px] min-w-[44px] h-11 w-11 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/60 text-zinc-300 backdrop-blur-md transition hover:border-sue/40 hover:text-sue"
                >
                  <Menu className="h-4 w-4" />
                </button>
              </>
            ) : null}
          </div>
        </nav>
      </header>

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[70]">
          <button
            type="button"
            aria-label="Zamknij menu"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full w-full max-w-sm bg-zinc-950/95 border-l border-zinc-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <div>
                {profile?.full_name && (
                  <p className="text-lg font-semibold text-white">{profile.full_name}</p>
                )}
                {profile?.class && profile?.school && (
                  <p className="text-sm text-zinc-500">{profile.class} · {profile.school}</p>
                )}
              </div>
              <button
                type="button"
                aria-label="Zamknij"
                className="rounded-full border border-zinc-800 p-2 text-zinc-400 transition hover:border-zinc-700 hover:text-white"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav className="space-y-2">
              <Link
                href="/profile"
                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800 hover:text-sue"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <User className="h-4 w-4" />
                Moje Rezerwacje
              </Link>

              <form action={signOut}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800 hover:text-sue"
                >
                  <LogOut className="h-4 w-4" />
                  Wyloguj
                </button>
              </form>
            </nav>
          </div>
        </div>
      )}

      <CartDrawer open={isCartOpen} onOpenChange={setIsCartOpen} />
    </>
  );
}
