import pkg from '../../../package.json' assert { type: 'json' };
import Link from 'next/link';
import { ArrowUpRight, Mail, Phone } from 'lucide-react';
import { footerLinks, siteConfig } from '@/lib/site-config';
export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-footer">
      <div className="page-container py-7 sm:py-10">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-3">
              <img
                src="/logo.svg"
                alt="Samorząd Uczniowski"
                className="size-10"
              />
              <span className="font-display text-lg font-semibold">
                Targi Książek
              </span>
            </Link>
            <p className="mt-2 max-w-xs text-sm text-footer-muted">
              Podręczniki na kolejny rok.
              <br />
              Organizacja: Samorząd Uczniowski.
            </p>
          </div>
          <nav aria-label="Nawigacja w stopce">
            <h2 className="text-sm font-semibold">Nawigacja</h2>
            <ul className="mt-2 grid grid-cols-2 gap-x-5 sm:block">
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex min-h-11 items-center text-sm text-footer-muted hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div>
            <h2 className="text-sm font-semibold">Potrzebujesz pomocy?</h2>
            <p className="mt-2 max-w-xs text-sm text-footer-muted">
              Masz problem techniczny? Napisz lub zadzwoń.
            </p>
            <div className="mt-1 flex flex-col items-start">
              {siteConfig.supportEmail && (
                <a
                  className="flex min-h-9 max-w-full items-center gap-2 break-all text-sm text-champagne hover:text-primary-hover"
                  href={`mailto:${siteConfig.supportEmail}`}
                >
                  <Mail className="size-4 shrink-0" />
                  {siteConfig.supportEmail}
                </a>
              )}
              {siteConfig.supportPhone && (
                <a
                  className="flex min-h-9 items-center gap-2 text-sm text-footer-muted hover:text-foreground"
                  href={`tel:${siteConfig.supportPhone.replace(/\s/g, '')}`}
                >
                  <Phone className="size-4 shrink-0" />
                  <span>
                    <span className="text-xs text-muted-foreground">
                      Infolinia:
                    </span>{' '}
                    <span className="font-medium text-foreground">
                      {siteConfig.supportPhone}
                    </span>
                  </span>
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 text-xs text-partner-muted sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <p>© {siteConfig.year} Samorząd Uczniowski</p>
            <p>Targi Książek {siteConfig.year} · v{pkg.version}</p>
          </div>
          <div className="flex flex-col items-start gap-1.5 sm:items-end">
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span>
                Frontend:{' '}
                <strong className="font-medium text-partner-text">
                  Łukasz Postół
                </strong>
              </span>
              <span>
                Backend:{' '}
                <strong className="font-medium text-partner-text">
                  Dominik Furgacz
                </strong>
              </span>
            </div>
            <a
              href={siteConfig.partnerUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-7 items-center gap-2 hover:text-foreground"
            >
              Partner technologiczny{' '}
              <span className="font-semibold tracking-wide text-partner-text">
                POSTOL.TECH
              </span>
              <ArrowUpRight className="size-3.5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
