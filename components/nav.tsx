import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/lib/actions/auth'

export default async function Nav() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: { user } } = await supabase.auth.getUser()

  let isAdmin = false
  if (user) {
    const { data: profile } = await db
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()
    isAdmin = profile?.is_admin ?? false
  }

  return (
    <nav className="h-14 flex items-center justify-between max-w-7xl mx-auto px-6">
      {/* Wordmark */}
      <Link href="/" className="flex items-center">
        <span className="display font-black text-xl text-gray-900 tracking-tight">BidLock</span>
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-500 ml-0.5 mb-0.5" aria-hidden="true" />
      </Link>

      {/* Center nav */}
      <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
        <Link href="/auctions" className="hover:text-gray-900 transition-colors">Browse</Link>
        <Link href="/how" className="hover:text-gray-900 transition-colors">How it works</Link>
        <Link href="/listings/new" className="hover:text-gray-900 transition-colors">Sell</Link>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3 text-sm">
        {user ? (
          <>
            <Link href="/me?tab=listings" className="text-gray-600 hover:text-gray-900 transition-colors">My listings</Link>
            <Link href="/me?tab=bids" className="text-gray-600 hover:text-gray-900 transition-colors">My bids</Link>
            <Link href="/me/profile" className="text-gray-600 hover:text-gray-900 transition-colors">Profile</Link>
            {isAdmin && (
              <Link href="/admin" className="text-orange-600 hover:text-orange-700 font-semibold transition-colors">Admin</Link>
            )}
            <form action={signOut}>
              <button type="submit" className="text-gray-600 hover:text-gray-900 transition-colors">Sign out</button>
            </form>
          </>
        ) : (
          <>
            <Link href="/auth/login" className="text-gray-700 hover:text-gray-900 font-medium transition-colors">Sign in</Link>
            <Link
              href="/auth/signup"
              className="bg-gray-900 text-white px-5 py-2 rounded-full font-semibold hover:bg-gray-800 transition-colors"
            >
              Join
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}
