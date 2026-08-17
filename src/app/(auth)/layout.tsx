export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      <div className="pointer-events-none absolute left-1/2 top-24 -z-10 h-[420px] w-[620px] -translate-x-1/2 rounded-full bg-sue/10 blur-[120px]" />
      <div className="relative w-full max-w-md">{children}</div>
    </div>
  );
}
