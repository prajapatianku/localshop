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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()
  const path = url.pathname

  // 1. Bypass static assets, API calls, and public pages
  if (
    path.startsWith('/api/') ||
    path.startsWith('/auth/') ||
    path === '/favicon.ico'
  ) {
    return supabaseResponse
  }

  // Define public routes that do NOT require authentication to read (to support local SEO & organic browsing)
  // Anyone can browse the landing page, view shop profiles, and read product details.
  const isShopView = path.startsWith('/shop/')
  const isProductView = path.startsWith('/product/')
  const isHome = path === '/'
  const isAuthPage = path === '/login' || path === '/signup'

  const isPublicBrowseRoute = isHome || isShopView || isProductView

  if (!user) {
    // If not authenticated and trying to access private pages (like cart, checkout, dashboard, admin, orders)
    if (!isPublicBrowseRoute && !isAuthPage) {
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // User is logged in
  if (isAuthPage) {
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Fetch profile to verify role mapping
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role

  // Redirect users if they are logged in but access role-restricted panels
  
  // 1. Admin Gating
  if (path.startsWith('/admin')) {
    if (role !== 'admin') {
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  // 2. Shopkeeper Dashboard Gating
  if (path.startsWith('/dashboard')) {
    if (role !== 'shopkeeper' && role !== 'admin') {
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  // 3. Prevent customers from seeing merchant-specific UI or vice versa if they access pages directly
  // (Optional: can add redirects if needed, but standard role-gating above is sufficient)

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
