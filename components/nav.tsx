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
    <nav className="border-b px-4 py-3 flex items-center justify-between">
      <Link href="/" className="font-bold text-lg">BidLock</Link>
      <div className="flex items-center gap-3 text-sm">
        {user ? (
          <>
            <Link href="/listings/new" className="hover:underline">Sell</Link>
            <Link href="/me/listings" className="hover:underline">My listings</Link>
            <Link href="/me/bids" className="hover:underline">My bids</Link>
            <Link href="/me/profile" className="hover:underline">Profile</Link>
            {isAdmin && <Link href="/admin" className="hover:underline text-primary">Admin</Link>}
            <form action={signOut}>
              <Button variant="ghost" size="sm" type="submit">Sign out</Button>
            </form>
          </>
        ) : (
          <>
            <Link href="/auth/login" className="hover:underline">Sign in</Link>
            <Button size="sm" asChild>
              <Link href="/auth/signup">Sign up</Link>
            </Button>
          </>
        )}
      </div>
    </nav>
  )
}
