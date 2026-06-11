import { TopNav } from '@/components/layout/TopNav';
import { createClient } from '@/lib/supabase/server';

/**
 * RootLayout for authenticated routes — wraps pages with the TopNav.
 * Access is already gated by middleware (redirects to /login if no session).
 */
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen">
      <TopNav email={user?.email ?? ''} />
      <main className="mx-auto max-w-6xl p-6">{children}</main>
    </div>
  );
}
