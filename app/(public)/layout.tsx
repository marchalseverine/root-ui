/**
 * Minimal layout for public routes (/login, /demo) — no auth nav.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen">{children}</div>;
}
