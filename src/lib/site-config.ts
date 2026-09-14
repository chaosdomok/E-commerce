// Public presentation settings. Fill contact details only when supplied by the organiser.
export const siteConfig = {
  name: 'Targi Książek',
  year: '2026',
  organiser: 'Samorząd Uczniowski',
  supportEmail: 'targi.pomoc@postol.tech',
  supportPhone: '+48 776 888 416',
  partnerUrl: 'https://postol.tech',
  pickup: 'Sala nr 13',
};
export const primarySiteLinks = [
  { href: '/', label: 'Strona główna' },
  { href: '/katalog', label: 'Katalog' },
  { href: '/dodaj-ksiazke', label: 'Wystaw podręcznik' },
];
export const footerLinks = [
  ...primarySiteLinks,
  { href: '/regulamin', label: 'Regulamin' },
  { href: '/polityka-prywatnosci', label: 'Polityka prywatności' },
];
