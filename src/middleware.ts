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

  // Bypass all API routes (like webhooks) from auth & subscription checks
  if (path.startsWith('/api/')) {
    return supabaseResponse
  }

  // Public paths that do not require auth (except for static assets, handled by matcher)
  const isAuthPath = path === '/login' || path === '/signup' || path.startsWith('/auth/')

  if (!user) {
    if (!isAuthPath) {
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // User is logged in
  if (isAuthPath) {
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Fetch profile to check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Fetch subscription to check status
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan, status, trial_ends_at, current_period_end')
    .eq('user_id', user.id)
    .single()

  // Admin route gating
  if (path.startsWith('/admin')) {
    if (profile?.role !== 'admin') {
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  // Subscription gating (admins bypass)
  const isSubscribePath = path === '/subscribe'
  
  if (!isSubscribePath && profile?.role !== 'admin') {
    let isSubscribed = false
    if (subscription) {
      const trialEnds = new Date(subscription.trial_ends_at).getTime()
      const now = Date.now()
      
      const isTrialing = subscription.status === 'trialing' && trialEnds > now
      const isActive = subscription.status === 'active'
      const isCurrentPeriodActive = subscription.current_period_end 
        ? new Date(subscription.current_period_end).getTime() > now
        : false
      
      if (isTrialing || isActive || isCurrentPeriodActive || subscription.plan === 'free') {
        isSubscribed = true
      }
    }

    if (!isSubscribed) {
      url.pathname = '/subscribe'
      return NextResponse.redirect(url)
    }
  }

  // Redirect subscribed users away from /subscribe
  if (isSubscribePath && profile?.role !== 'admin') {
    let isSubscribed = false
    if (subscription) {
      const trialEnds = new Date(subscription.trial_ends_at).getTime()
      const now = Date.now()
      
      const isTrialing = subscription.status === 'trialing' && trialEnds > now
      const isActive = subscription.status === 'active'
      const isCurrentPeriodActive = subscription.current_period_end 
        ? new Date(subscription.current_period_end).getTime() > now
        : false
      
      if (isTrialing || isActive || isCurrentPeriodActive || subscription.plan === 'free') {
        isSubscribed = true
      }
    }
    if (isSubscribed) {
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
