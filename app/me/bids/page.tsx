import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatPHP } from '@/lib/utils/currency'
import { Badge } from '@/components/ui/badge'

export default async function MyBidsPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: bids } = await db
    .from('bids')
    .select(`
      id, amount, created_at,
      listings (id, title, status, current_bid, winner_id, ends_at)
    `)
    .eq('bidder_id', user.id)
    .order('created_at', { ascending: false })

  const active = bids?.filter((b: any) => (b.listings as any)?.status === 'live') ?? []
  const won = bids?.filter((b: any) => (b.listings as any)?.status === 'ended' && (b.listings as any)?.winner_id === user.id) ?? []
  const lost = bids?.filter((b: any) => (b.listings as any)?.status === 'ended' && (b.listings as any)?.winner_id !== null && (b.listings as any)?.winner_id !== user.id) ?? []

  return (
    <div className="max-w-2xl mx-auto p-4 pt-8 space-y-8">
      <h1 className="text-2xl font-bold">My Bids</h1>

      <Section title="Active" items={active} userId={user.id} />
      <Section title="Won" items={won} userId={user.id} />
      <Section title="Lost" items={lost} userId={user.id} />
    </div>
  )
}

function Section({ title, items, userId }: { title: string; items: any[]; userId: string }) {
  return (
    <div>
      <h2 className="font-semibold mb-3">{title} ({items.length})</h2>
      {items.length === 0 && <p className="text-sm text-muted-foreground">None.</p>}
      <div className="space-y-2">
        {items.map((bid) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const listing = bid.listings as any
          if (!listing) return null
          return (
            <div key={bid.id} className="border rounded-lg p-3 flex justify-between items-center">
              <div>
                <Link href={`/listings/${listing.id}`} className="font-medium text-sm hover:underline">
                  {listing.title}
                </Link>
                <p className="text-xs text-muted-foreground">Your bid: {formatPHP(bid.amount)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{formatPHP(listing.current_bid)}</p>
                <Badge variant="outline" className="text-xs">
                  {listing.winner_id === userId ? '🏆 Won' : listing.status}
                </Badge>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
