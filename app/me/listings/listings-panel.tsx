import { createClient } from '@/lib/supabase/server'
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

function formatEndedDate(endsAt: string): string {
  const d = new Date(endsAt)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getSubtitle(listing: any): string {
  switch (listing.status) {
    case 'pending_payment':
      return 'Listing fee due — pay to go live'
    case 'rejected':
      return listing.rejection_reason ?? 'Rejected'
    case 'awaiting_review':
      return 'Submitted — awaiting admin review'
    case 'live': {
      const remaining = formatTimeRemaining(listing.ends_at)
      return remaining === 'Ended' ? 'Ended' : `Ends in ${remaining}`
    }
    case 'ended': {
      const date = formatEndedDate(listing.ends_at)
      const prefix = date ? `Ended ${date}` : 'Ended'
      if (listing.winner_id) {
        const price = listing.current_bid != null ? formatPHP(listing.current_bid) : ''
        return price ? `${prefix} · Sold for ${price}` : prefix
      }
      return `${prefix} · No bids`
    }
    case 'cancelled':
      return 'Cancelled'
    default:
      return ''
  }
}

function getBadgeClasses(status: string): string {
  switch (status) {
    case 'pending_payment': return 'bg-amber-100 text-amber-700 border-amber-200'
    case 'rejected':        return 'bg-red-100 text-red-700 border-red-200'
    case 'awaiting_review': return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'live':            return 'bg-green-100 text-green-700 border-green-200'
    default:                return 'bg-muted text-muted-foreground border-border'
  }
}

function getPlaceholderClass(status: string): string {
  switch (status) {
    case 'pending_payment': return 'bg-amber-50 text-amber-400'
    case 'rejected':        return 'bg-red-50 text-red-300'
    case 'awaiting_review': return 'bg-blue-50 text-blue-300'
    default:                return 'bg-muted text-muted-foreground'
  }
}

const statusLabel: Record<string, string> = {
  pending_payment: 'Pending payment',
  awaiting_review: 'Under review',
  rejected:        'Rejected',
  live:            'Live',
  ended:           'Ended',
  cancelled:       'Cancelled',
}

function ListingCard({
  listing,
  thumbnailUrl,
}: {
  listing: any
  thumbnailUrl: string | null
}) {
  const isPendingPayment = listing.status === 'pending_payment'
  const isLinked = ['rejected', 'live', 'ended'].includes(listing.status)

  const cardHref = isPendingPayment
    ? `/listings/${listing.id}/pay`
    : `/listings/${listing.id}`

  const subtitleClass =
    listing.status === 'pending_payment'
      ? 'text-amber-800'
      : listing.status === 'rejected'
      ? 'text-destructive'
      : 'text-muted-foreground'

  const placeholderClass = getPlaceholderClass(listing.status)

  const inner = (
    <>
      <div
        className={`relative h-[52px] w-[52px] shrink-0 overflow-hidden rounded-[9px] ${
          thumbnailUrl ? 'bg-muted' : placeholderClass
        }`}
      >
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={listing.title ?? ''}
            fill
            className="object-cover"
            sizes="52px"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-sm font-bold">
            {getInitials(listing.title ?? '')}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{listing.title}</p>
        <p className={`mt-0.5 truncate text-xs ${subtitleClass}`}>
          {getSubtitle(listing)}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-sm font-bold">{listing.current_bid != null ? formatPHP(listing.current_bid) : ''}</p>
        <span
          className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium ${getBadgeClasses(listing.status)}`}
        >
          {statusLabel[listing.status] ?? listing.status}
        </span>
        {isPendingPayment && (
          <span className="mt-1 block rounded-full bg-amber-500 px-2.5 py-0.5 text-[11px] font-semibold text-white">
            Pay now
          </span>
        )}
      </div>
    </>
  )

  const base = 'flex items-center gap-3 rounded-xl border bg-white p-3 shadow-sm'

  if (isPendingPayment || isLinked) {
    return (
      <Link href={cardHref} aria-label={listing.title ?? ''} className={`${base} transition-colors hover:bg-muted/40`}>
        {inner}
      </Link>
    )
  }

  return <div className={base}>{inner}</div>
}

function Section({ title, items }: { title: string; items: any[] }) {
  if (items.length === 0) return null
  return (
    <div>
      <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title} · {items.length}
      </h2>
      <div className="space-y-2">
        {items.map((listing: any) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            thumbnailUrl={listing.thumbnailUrl}
          />
        ))}
      </div>
    </div>
  )
}

function CancelledSection({ items }: { items: any[] }) {
  if (items.length === 0) return null
  return (
    <details>
      <summary className="cursor-pointer text-xs font-semibold text-muted-foreground hover:text-foreground">
        Show cancelled ({items.length})
      </summary>
      <div className="mt-2.5 space-y-2">
        {items.map((listing: any) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            thumbnailUrl={listing.thumbnailUrl}
          />
        ))}
      </div>
    </details>
  )
}

export default async function ListingsPanel({ userId }: { userId: string }) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: listings } = await db
    .from('listings')
    .select(`
      id, title, current_bid, status, created_at, ends_at,
      rejection_reason, winner_id,
      listing_photos(storage_path, display_order)
    `)
    .eq('auctioneer_id', userId)
    .order('created_at', { ascending: false })

  const withThumbs = (listings ?? []).map((listing: any) => {
    const photos: any[] = listing.listing_photos ?? []
    const first = [...photos].sort((a: any, b: any) => a.display_order - b.display_order)[0]
    const thumbnailUrl = first
      ? supabase.storage.from('listing-photos').getPublicUrl(first.storage_path).data.publicUrl
      : null
    return { ...listing, thumbnailUrl }
  })

  const pendingPayment = withThumbs.filter((l: any) => l.status === 'pending_payment')
  const rejected       = withThumbs.filter((l: any) => l.status === 'rejected')
  const underReview    = withThumbs.filter((l: any) => l.status === 'awaiting_review')
  const live           = withThumbs.filter((l: any) => l.status === 'live')
  const ended          = withThumbs.filter((l: any) => l.status === 'ended')
  const cancelled      = withThumbs.filter((l: any) => l.status === 'cancelled')

  return (
    <div className="space-y-8">
      {withThumbs.length === 0 && (
        <p className="text-muted-foreground">You haven&apos;t listed anything yet.</p>
      )}
      <Section title="Pending Payment" items={pendingPayment} />
      <Section title="Rejected"        items={rejected} />
      <Section title="Under Review"    items={underReview} />
      <Section title="Live"            items={live} />
      <Section title="Ended"           items={ended} />
      <CancelledSection items={cancelled} />
    </div>
  )
}
