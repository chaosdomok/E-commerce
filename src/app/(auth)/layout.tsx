import { Navbar } from '@/components/site/navbar';
import { Footer } from '@/components/site/footer';
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex flex-1 items-center justify-center bg-elevated px-5 py-10 sm:py-14">
        <div className="w-full max-w-md">{children}</div>
      </main>
      <Footer />
    </div>
  );
}
