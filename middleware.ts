import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Session validation middleware.
 * - Protects `/dashboard/**` and `/api/**` (except `/api/public/**`).
 * - Leaves `/demo/**`, `/api/public/**`, `/login` and other public routes open.
 * Unauthenticated page requests are redirected to `/login`; unauthenticated API
 * requests get a `401` JSON response (APIs must not redirect to HTML).
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: do not run any code between createServerClient and getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isPublicApi = pathname.startsWith('/api/public');
  const isProtectedApi = pathname.startsWith('/api') && !isPublicApi;
  const isProtectedPage = pathname.startsWith('/dashboard');

  if (!user && (isProtectedApi || isProtectedPage)) {
    if (isProtectedApi) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  // Run on everything except Next.js internals and the favicon.
  matcher: ['/((?!_next|favicon.ico).*)'],
};
