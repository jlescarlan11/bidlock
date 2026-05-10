import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatPHP } from '@/lib/utils/currency'
import { Badge } from '@/components/ui/badge'

const statusLabel: Record<string, string> = {
  pending_payment: 'Pending payment',
  awaiting_review: 'Under review',
  rejected: 'Rejected',
  live: 'Live',
  ended: 'Ended',
  cancelled: 'Cancelled',
}

export default async function MyListingsPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: listings } = await db
    .from('listings')
    .select('id, title, current_bid, status, created_at, ends_at, rejection_reason')
    .eq('auctioneer_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-2xl mx-auto p-4 pt-8">
      <h1 className="text-2xl font-bold mb-6">My Listings</h1>
      {!listings?.length && <p className="text-muted-foreground">You haven&apos;t listed anything yet.</p>}
      <div className="space-y-3">
        {listings?.map((listing: any) => (
          <div key={listing.id} className="border rounded-lg p-4 flex justify-between items-start gap-3">
            <div className="space-y-1 flex-1 min-w-0">
              <p className="font-semibold truncate">{listing.title}</p>
              <p className="text-sm">{formatPHP(listing.current_bid)}</p>
              {listing.rejection_reason && (
                <p className="text-xs text-destructive">Reason: {listing.rejection_reason}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant="outline">{statusLabel[listing.status] ?? listing.status}</Badge>
              {listing.status === 'pending_payment' && (
                <Link href={`/listings/${listing.id}/pay`} className="text-xs underline">Pay now</Link>
              )}
              {listing.status === 'live' && (
                <Link href={`/listings/${listing.id}`} className="text-xs underline">View</Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
