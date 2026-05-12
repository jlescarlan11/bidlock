import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { formatPHP } from '@/lib/utils/currency'
import { formatTimeRemaining } from '@/lib/utils/time'

function getInitials(title: string): string {
  return title
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

type BidStatus = 'winning' | 'outbid' | 'no-other-bids'

function getBidStatus(
  bidAmount: number,
  currentBid: number,
  hasOtherBids: boolean
): BidStatus {
  if (!hasOtherBids) return 'no-other-bids'
  return bidAmount >= currentBid ? 'winning' : 'outbid'
}

function formatEndedDate(endsAt: string): string {
  const d = new Date(endsAt)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function BidCard({
  bid,
  userId,
  hasOtherBids,
}: {
  bid: any
  userId: string
  hasOtherBids: boolean
}) {
  const listing = bid.listings as any
  if (!listing) return null

  const isActive = listing.status === 'live'
  const isWon = listing.status === 'ended' && listing.winner_id === userId

  let subtitle: string
  if (isActive) {
    const remaining = formatTimeRemaining(listing.ends_at)
    subtitle = remaining === 'Ended' ? 'Ended' : `Ends in ${remaining}`
  } else {
    const endedDate = formatEndedDate(listing.ends_at)
    if (!isWon && listing.winner_id !== null) {
      subtitle = `Ended ${endedDate} · Sold for ${formatPHP(listing.current_bid)}`
    } else {
      subtitle = `Ended ${endedDate}`
    }
  }

  let badgeLabel: string
  let badgeClass: string
  if (isActive) {
    const status = getBidStatus(bid.amount, listing.current_bid, hasOtherBids)
    if (status === 'winning') {
      badgeLabel = 'Winning'
      badgeClass = 'bg-green-100 text-green-700 border-green-200'
    } else if (status === 'outbid') {
      badgeLabel = 'Outbid'
      badgeClass = 'bg-amber-100 text-amber-700 border-amber-200'
    } else {
      badgeLabel = 'No other bids'
      badgeClass = 'bg-muted text-muted-foreground border-border'
    }
  } else if (isWon) {
    badgeLabel = 'Won'
    badgeClass = 'bg-green-100 text-green-700 border-green-200'
  } else {
    badgeLabel = 'Lost'
    badgeClass = 'bg-muted text-muted-foreground border-border'
  }

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="flex items-center gap-3 rounded-xl border bg-white p-3 shadow-sm transition-colors hover:bg-muted/40"
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[9px] bg-muted">
        {bid.thumbnailUrl ? (
          <Image
            src={bid.thumbnailUrl}
            alt={listing.title}
            fill
            className="object-cover"
            sizes="56px"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-sm font-bold text-muted-foreground">
            {getInitials(listing.title)}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{listing.title}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-bold">{formatPHP(bid.amount)}</p>
        <span className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium ${badgeClass}`}>
          {badgeLabel}
        </span>
      </div>
    </Link>
  )
}

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
      listings (id, title, status, current_bid, winner_id, ends_at,
        listing_photos (storage_path, display_order)
      )
    `)
    .eq('bidder_id', user.id)
    .order('created_at', { ascending: false })

  const seen = new Set<string>()
  const deduped = (bids ?? []).filter((b: any) => {
    const id = b.listings?.id
    if (!id || seen.has(id)) return false
    seen.add(id)
    return true
  })

  const bidsWithThumbs = deduped.map((bid: any) => {
    const photos: any[] = bid.listings?.listing_photos ?? []
    const firstPhoto = [...photos].sort((a: any, b: any) => a.display_order - b.display_order)[0]
    const thumbnailUrl = firstPhoto
      ? supabase.storage.from('listing-photos').getPublicUrl(firstPhoto.storage_path).data.publicUrl
      : null
    return { ...bid, thumbnailUrl }
  })

  const activeListingIds: string[] = bidsWithThumbs
    .filter((b: any) => b.listings?.status === 'live')
    .map((b: any) => b.listings?.id)
    .filter(Boolean)

  const otherBidListings = new Set<string>()
  if (activeListingIds.length > 0) {
    const { data: otherBids } = await db
      .from('bids')
      .select('listing_id')
      .neq('bidder_id', user.id)
      .in('listing_id', activeListingIds)
    ;(otherBids ?? []).forEach((b: any) => otherBidListings.add(b.listing_id))
  }

  const active = bidsWithThumbs.filter((b: any) => b.listings?.status === 'live')
  const won = bidsWithThumbs.filter((b: any) => b.listings?.status === 'ended' && b.listings?.winner_id === user.id)
  const lost = bidsWithThumbs.filter((b: any) => b.listings?.status === 'ended' && b.listings?.winner_id !== null && b.listings?.winner_id !== user.id)

  return (
    <div className="max-w-2xl mx-auto p-4 pt-8 space-y-8">
      <h1 className="text-2xl font-bold">My Bids</h1>

      <Section title="Active" items={active} userId={user.id} otherBidListings={otherBidListings} />
      <Section title="Won" items={won} userId={user.id} otherBidListings={new Set()} />
      <Section title="Lost" items={lost} userId={user.id} otherBidListings={new Set()} />
    </div>
  )
}

function Section({
  title,
  items,
  userId,
  otherBidListings,
}: {
  title: string
  items: any[]
  userId: string
  otherBidListings: Set<string>
}) {
  return (
    <div>
      <p className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title} · {items.length}
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No {title.toLowerCase()} auctions yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((bid: any) => (
            <BidCard
              key={bid.id}
              bid={bid}
              userId={userId}
              hasOtherBids={otherBidListings.has(bid.listings?.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
