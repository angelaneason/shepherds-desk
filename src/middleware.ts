import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired - required for Server Components
  // https://supabase.com/docs/guides/auth/server-side/nextjs
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()
  
  // Public paths that don't require cookie authentication (including mobile API calls)
  const isPublicPath = 
    url.pathname.startsWith('/api') ||
    url.pathname === '/login' || 
    url.pathname.startsWith('/auth') || 
    url.pathname === '/welcome' ||
    url.pathname === '/download' ||
    url.pathname === '/privacy' ||
    url.pathname === '/terms'
  const isStaticPath = url.pathname.startsWith('/_next') || url.pathname.includes('.')

  if (isStaticPath) {
    return supabaseResponse
  }

  // If user is not signed in and visits root, redirect to welcome page
  if (!user && url.pathname === '/') {
    url.pathname = '/welcome'
    return NextResponse.redirect(url)
  }

  // If user is not signed in and the current path is not a public path, redirect to login
  if (!user && !isPublicPath) {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // If user is signed in and trying to access login page, redirect to home
  if (user && isPublicPath && url.pathname === '/login') {
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
