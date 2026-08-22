import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Static files and public paths that do not require authentication
  const isPublicPath =
    pathname === '/login' ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.webp');

  // Check Supabase authentication cookie presence in incoming request
  const allCookies = request.cookies.getAll();
  const hasAuthCookie = allCookies.some(
    (cookie) =>
      cookie.name.includes('-auth-token') ||
      cookie.name.startsWith('sb-') ||
      cookie.name === 'supabase-auth-token'
  );

  // If trying to access protected route without auth cookie -> redirect to login
  if (!hasAuthCookie && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // If already logged in and visiting login page -> redirect to dashboard
  if (hasAuthCookie && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images / static assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
