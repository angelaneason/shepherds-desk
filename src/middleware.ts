import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const pathname = url.pathname

  // Fast-path 1: Static assets and Next.js bundles
  if (pathname.startsWith('/_next') || pathname.includes('.') || pathname === '/favicon.ico') {
    return NextResponse.next({ request })
  }

  // Fast-path 2: API routes (handle their own bearer tokens) and public static pages
  const isPublicStatic = 
    pathname.startsWith('/api') ||
    pathname.startsWith('/auth') || 
    pathname === '/welcome' ||
    pathname === '/download' ||
    pathname === '/privacy' ||
    pathname === '/terms' ||
    pathname === '/gift' ||
    pathname.startsWith('/gift/')

  if (isPublicStatic) {
    return NextResponse.next({ request })
  }

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
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If user is not signed in and visits root, redirect to welcome page
  if (!user && pathname === '/') {
    url.pathname = '/welcome'
    return NextResponse.redirect(url)
  }

  // If user is not signed in and visits protected route, redirect to login
  if (!user && pathname !== '/login') {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // If user is signed in and trying to access login page, redirect to home
  if (user && pathname === '/login') {
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
