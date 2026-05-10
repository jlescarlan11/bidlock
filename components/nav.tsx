import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'

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
    <nav className="px-6 h-14 flex items-center justify-between max-w-7xl mx-auto">
      <Link href="/" className="font-black text-xl text-violet-600 tracking-tight">BidLock</Link>
      <div className="flex items-center gap-5 text-sm">
        {user ? (
          <>
            <Link href="/#live-auctions" className="text-gray-500 hover:text-gray-900 transition-colors">Auctions</Link>
            <Link href="/listings/new" className="text-gray-500 hover:text-gray-900 transition-colors">Sell</Link>
            <Link href="/me/listings" className="text-gray-500 hover:text-gray-900 transition-colors">My listings</Link>
            <Link href="/me/bids" className="text-gray-500 hover:text-gray-900 transition-colors">My bids</Link>
            <Link href="/me/profile" className="text-gray-500 hover:text-gray-900 transition-colors">Profile</Link>
            {isAdmin && <Link href="/admin" className="text-violet-600 hover:text-violet-700 font-semibold transition-colors">Admin</Link>}
            <form action={signOut}>
              <Button variant="ghost" size="sm" type="submit" className="text-gray-500 hover:text-gray-900">Sign out</Button>
            </form>
          </>
        ) : (
          <>
            <Link href="/#live-auctions" className="text-gray-500 hover:text-gray-900 transition-colors">Auctions</Link>
            <Link href="/auth/login" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">Sign in</Link>
            <Button size="sm" nativeButton={false} render={<Link href="/auth/signup" />}>
              Sign up
            </Button>
          </>
        )}
      </div>
    </nav>
  )
}
