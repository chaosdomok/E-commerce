import { Navbar } from '@/components/site/navbar';
import { Footer } from '@/components/site/footer';
import type { Profile } from '@/lib/profile';
export function ProfileShell({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar profile={profile} />
      <main className="page-container flex-1 py-8 sm:py-10">{children}</main>
      <Footer />
    </div>
  );
}
