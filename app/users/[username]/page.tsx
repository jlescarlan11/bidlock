import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import ListingCard from '@/components/listing-card'
import { formatPHP } from '@/lib/utils/currency'
import { formatDistanceToNow, differenceInDays, format } from 'date-fns'
import type { Metadata } from 'next'

export const revalidate = 60

type Props = { params: Promise<{ username: string }> }

function getInitial(displayName: string | null, username: string): string {
  const src = displayName?.trim() || username
  return src[0].toUpperCase()
}

function formatMemberSince(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function formatEndedTime(endsAt: string): string {
  const date = new Date(endsAt)
  if (differenceInDays(new Date(), date) > 30) return format(date, 'MMM d')
  return formatDistanceToNow(date, { addSuffix: true })
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: profile } = await db
    .from('profiles')
    .select('display_name, username')
    .eq('username', username.toLowerCase())
    .maybeSingle()
  if (!profile) return { title: 'Profile not found · BidLock' }
  const name = profile.display_name ?? `@${profile.username}`
  return {
    title: `${name} (@${profile.username}) · BidLock`,
    description: `View ${name}'s live auctions and seller ratings on BidLock.`,
  }
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: profile } = await db
    .from('profiles')
    .select('id, display_name, username, created_at')
    .eq('username', username.toLowerCase())
    .maybeSingle()

  if (!profile) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ratings: any[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let liveListings: any[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let endedListings: any[] = []

  const [ratingsRes, liveRes, endedRes] = await Promise.all([
    db
      .from('ratings')
      .select('verdict, comment, created_at, rater:rater_id(display_name)')
      .eq('ratee_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(20),
    db
      .from('listings')
      .select('id, title, current_bid, ends_at, listing_photos(storage_path, display_order), bids(created_at)')
      .eq('auctioneer_id', profile.id)
      .eq('status', 'live')
      .order('ends_at', { ascending: true }),
    db
      .from('listings')
      .select('id, title, ends_at, current_bid, winner_id, listing_photos(storage_path, display_order)')
      .eq('auctioneer_id', profile.id)
      .eq('status', 'ended')
      .order('ends_at', { ascending: false })
      .limit(20),
  ])

  if (ratingsRes.error) {
    console.error('[public-profile] ratings fetch failed:', ratingsRes.error)
  } else {
    ratings = ratingsRes.data ?? []
  }

  if (liveRes.error) {
    console.error('[public-profile] live listings fetch failed:', liveRes.error)
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    liveListings = (liveRes.data ?? []).map((listing: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bidRows: { created_at: string }[] = listing.bids ?? []
      const bid_count = bidRows.length
      const last_bid_at = bidRows.length > 0
        ? bidRows.reduce(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (max: string, b: any) => (b.created_at > max ? b.created_at : max),
            bidRows[0].created_at,
          )
        : null
      return {
        id: listing.id,
        title: listing.title,
        current_bid: listing.current_bid,
        ends_at: listing.ends_at,
        bid_count,
        last_bid_at,
        listing_photos: (listing.listing_photos ?? []).sort(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (a: any, b: any) => a.display_order - b.display_order,
        ),
      }
    })
  }

  if (endedRes.error) {
    console.error('[public-profile] ended listings fetch failed:', endedRes.error)
  } else {
    endedListings = endedRes.data ?? []
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const upCount = ratings.filter((r: any) => r.verdict === 'up').length
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const downCount = ratings.filter((r: any) => r.verdict === 'down').length
  const totalRatings = upCount + downCount
  const positivePercent = totalRatings > 0 ? Math.round((upCount / totalRatings) * 100) : null

  const initial = getInitial(profile.display_name, profile.username)
  const memberSince = formatMemberSince(profile.created_at)

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Identity card */}
        <div className="w-full md:w-56 shrink-0 bg-white border border-border rounded-xl shadow-sm p-6 text-center">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-xl font-bold tracking-tight">{initial}</span>
          </div>
          <p className="text-sm font-semibold text-foreground mb-1">{profile.display_name ?? '—'}</p>
          <p className="text-xs text-muted-foreground mb-2">@{profile.username}</p>
          {totalRatings > 0 && (
            <a href="#ratings" className="inline-block text-xs text-muted-foreground hover:text-foreground mb-2">
              👍 {upCount}&nbsp;&nbsp;👎 {downCount}
            </a>
          )}
          <div className="border-t border-border my-4" />
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Member since</p>
          <p className="text-sm text-muted-foreground">{memberSince}</p>
        </div>

        {/* Main content */}
        <div className="flex-1 space-y-10">
          {liveListings.length > 0 && (
            <section>
              <h2 className="text-base font-bold text-foreground mb-4">Live Auctions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {liveListings.map((listing: any) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            </section>
          )}

          {endedListings.length > 0 && (
            <section>
              <h2 className="text-base font-bold text-foreground mb-4">Recent Sales</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {endedListings.map((listing: any) => {
                  const photo = (listing.listing_photos ?? []).sort(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (a: any, b: any) => a.display_order - b.display_order,
                  )[0]
                  const photoUrl = photo
                    ? supabase.storage.from('listing-photos').getPublicUrl(photo.storage_path).data.publicUrl
                    : null
                  return (
                    <Link
                      key={listing.id}
                      href={`/listings/${listing.id}`}
                      className="bg-white border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="aspect-square bg-muted relative">
                        {photoUrl ? (
                          <Image src={photoUrl} alt={listing.title} fill className="object-cover" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">No photo</div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-semibold text-foreground line-clamp-2 mb-1">{listing.title}</p>
                        <p className="text-sm font-bold text-primary">
                          {listing.winner_id ? `Sold for ${formatPHP(listing.current_bid)}` : 'No bids'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatEndedTime(listing.ends_at)}</p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}

          <section id="ratings">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-base font-bold text-foreground">Ratings</h2>
              {positivePercent !== null && (
                <span className="text-xs text-muted-foreground">
                  {totalRatings} {totalRatings === 1 ? 'rating' : 'ratings'} · {positivePercent}% positive
                </span>
              )}
            </div>
            {ratings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No ratings yet.</p>
            ) : (
              <div className="space-y-3">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {ratings.map((rating: any, i: number) => (
                  <div key={i} className="bg-white border border-border rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-lg leading-none">{rating.verdict === 'up' ? '👍' : '👎'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-xs font-semibold text-foreground">
                            {rating.rater?.display_name ?? 'Unknown user'}
                          </p>
                          {rating.created_at && (
                            <p className="text-xs text-muted-foreground shrink-0">
                              {formatDistanceToNow(new Date(rating.created_at), { addSuffix: true })}
                            </p>
                          )}
                        </div>
                        {rating.comment && (
                          <p className="text-sm text-muted-foreground">{rating.comment}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
