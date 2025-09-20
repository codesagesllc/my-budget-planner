import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { mapSubscriptionToRole } from '@/lib/auth/rbac'

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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
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

  // Refresh session if expired
  const { data: { user }, error } = await supabase.auth.getUser()
  
  // Get user role if authenticated
  let userRole = 'free_trial'
  if (user) {
    const { data: userData } = await supabase
      .from('users')
      .select('subscription_tier, email, is_admin, free_trial_start_date, free_trial_end_date')
      .eq('id', user.id)
      .single()

    if (userData) {
      userRole = mapSubscriptionToRole(
        userData.subscription_tier,
        userData.email,
        userData.is_admin,
        userData.free_trial_start_date,
        userData.free_trial_end_date
      )
    }
  }
  
  const isAuthPage = request.nextUrl.pathname === '/login' || 
                     request.nextUrl.pathname === '/signup'
  const isAuthCallback = request.nextUrl.pathname === '/auth/callback'
  const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard')
  const isHomePage = request.nextUrl.pathname === '/'
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')

  // Allow auth callback to proceed
  if (isAuthCallback) {
    return supabaseResponse
  }

  // Check if this is an OAuth callback (has 'code' parameter)
  const code = request.nextUrl.searchParams.get('code')
  if (code && !user) {
    // Let the auth callback route handle it
    return supabaseResponse
  }

  // Redirect to login if accessing protected route without authentication
  if (!user && (isProtectedRoute || isAdminRoute)) {
    console.log('No user found, redirecting to login')
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('redirectedFrom', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }
  
  // Check admin access
  if (isAdminRoute && userRole !== 'admin') {
    console.log('Non-admin user attempting to access admin route')
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Redirect to dashboard if accessing auth pages while logged in
  if (user && (isAuthPage || isHomePage)) {
    console.log('User logged in, redirecting to dashboard')
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (they have their own auth)
     */
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}