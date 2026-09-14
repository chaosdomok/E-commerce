'use client';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/site/navbar';
import { Hero } from '@/components/site/hero';
import { HowItWorks } from '@/components/site/how-it-works';
import { Footer } from '@/components/site/footer';
import { Reveal } from '@/components/ui/reveal';
import { isFrontendPreview } from '@/lib/preview';
export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  useEffect(() => {
    if (isFrontendPreview) return;
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    if (code || error) {
      const params = new URLSearchParams();
      for (const key of ['code', 'error', 'error_description', 'next']) {
        const value = searchParams.get(key);
        if (value) params.set(key, value);
      }
      router.push(`/auth/callback?${params.toString()}`);
    }
  }, [router, searchParams]);
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main>
        <Reveal>
          <Hero />
        </Reveal>
        <Reveal>
          <HowItWorks />
        </Reveal>
      </main>
      <Footer />
    </div>
  );
}
