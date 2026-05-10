import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

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
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — required for Server Components to read the session
  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // /admin/* — requires is_admin
  if (path.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()
    if (!profile?.is_admin) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // /me/* and /listings/new — requires auth + complete profile
  const requiresAuth = path.startsWith('/me/') || path.startsWith('/listings/new')
  if (requiresAuth) {
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('phone_number, gcash_name, permabanned, banned_until')
      .eq('id', user.id)
      .single()

    // Incomplete profile → redirect to profile page (but not if already going there)
    const profileIncomplete = !profile?.phone_number || !profile?.gcash_name
    if (profileIncomplete && !path.startsWith('/me/profile')) {
      return NextResponse.redirect(new URL('/me/profile', request.url))
    }

    // Banned users cannot list or bid
    const isBanned = profile?.permabanned ||
      (profile?.banned_until && new Date(profile.banned_until) > new Date())
    if (isBanned && path.startsWith('/listings/new')) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
