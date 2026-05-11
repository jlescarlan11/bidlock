import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatPHP } from '@/lib/utils/currency'
import ImageGallery from '@/components/image-gallery'
import BidSection from './bid-section'
import RecentBidsSection from './recent-bids-section'
import ChatSection from './chat-section'
import RatingForm from './rating-form'
import DisputeForm from './dispute-form'

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: listing } = await db
    .from('listings')
    .select(`
      id, title, description, current_bid, starts_at, ends_at, status,
      winner_id, auctioneer_id, starting_bid,
      listing_photos (storage_path, display_order),
      auctioneer:profiles!auctioneer_id (display_name),
      winner:profiles!winner_id (display_name)
    `)
    .eq('id', id)
    .in('status', ['live', 'ended'])
    .single()

  if (!listing) notFound()

  const { data: { user } } = await supabase.auth.getUser()

  const photos = (listing.listing_photos ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .sort((a: any, b: any) => a.display_order - b.display_order)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((p: any) => supabase.storage.from('listing-photos').getPublicUrl(p.storage_path).data.publicUrl)

  const { data: recentBids } = await db
    .from('bids')
    .select('id, amount, created_at, bidder_id, profiles!bidder_id(display_name)')
    .eq('listing_id', id)
    .order('created_at', { ascending: false })
    .limit(20)

  const { count: bidCount } = await db
    .from('bids')
    .select('*', { count: 'exact', head: true })
    .eq('listing_id', id)

  const lastBidAt: string | null = recentBids?.[0]?.created_at ?? null

  const isAuctioneer = user?.id === listing.auctioneer_id
  const isWinner = user?.id === listing.winner_id
  const showChat = listing.status === 'ended' && listing.winner_id !== null && (isAuctioneer || isWinner)

  let winnerContact: { phone_number: string | null; gcash_name: string | null } | null = null
  if (isAuctioneer && listing.status === 'ended' && listing.winner_id) {
    const { data: wc } = await db
      .from('profiles')
      .select('phone_number, gcash_name')
      .eq('id', listing.winner_id)
      .single()
    winnerContact = wc
  }

  let initialMessages: { id: string; body: string; created_at: string; sender_id: string; profiles: { display_name: string | null } | null }[] = []
  let recipientId: string | null = null

  if (showChat && user) {
    const { data: msgs } = await db
      .from('messages')
      .select('id, body, created_at, sender_id, profiles!sender_id(display_name)')
      .eq('listing_id', id)
      .order('created_at', { ascending: true })
    initialMessages = msgs ?? []
    recipientId = isAuctioneer ? listing.winner_id : listing.auctioneer_id
  }

  let myRating: { verdict: string } | null = null
  let rateeId: string | null = null
  let rateeName: string | null = null

  if (listing.status === 'ended' && listing.winner_id && user && (isAuctioneer || isWinner)) {
    const { data: existing, error: ratingFetchError } = await db
      .from('ratings')
      .select('verdict')
      .eq('listing_id', id)
      .eq('rater_id', user.id)
      .maybeSingle()
    if (!ratingFetchError) myRating = existing

    rateeId = isAuctioneer ? listing.winner_id : listing.auctioneer_id
    rateeName = isAuctioneer
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (listing.winner as any)?.display_name
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      : (listing.auctioneer as any)?.display_name
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sellerName: string | null = (listing.auctioneer as any)?.display_name ?? null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const winnerName: string | null = (listing.winner as any)?.display_name ?? null

  return (
    <main className="max-w-7xl mx-auto px-6 py-8 pb-32 md:pb-8">
      <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-8 items-start">

        {/* ── Left column ── */}
        <div className="space-y-8">
          <ImageGallery photos={photos} title={listing.title} listingId={id} />

          {/* Title + seller: mobile only */}
          <div className="md:hidden">
            <TitleHeader title={listing.title} seller={sellerName} />
          </div>

          <div>
            <h2 className="text-lg font-bold mb-3">About this item</h2>
            <p className="text-foreground leading-relaxed whitespace-pre-wrap">
              {listing.description}
            </p>
          </div>

          <RecentBidsSection
            listingId={id}
            initialBids={recentBids ?? []}
            userId={user?.id ?? null}
            enableRealtime={listing.status === 'live'}
          />

          {/* Ended-auction UI */}
          {showChat && listing.winner_id !== null && (
            <div className="border rounded-lg p-4 space-y-2">
              <p className="font-semibold">Contact Information</p>
              <p className="text-xs text-muted-foreground">
                Coordinate delivery and final payment directly. We do not handle either. Report violations via the dispute form.
              </p>
              {isAuctioneer && (
                <div className="text-sm space-y-1">
                  <p><span className="font-medium">Winner&apos;s phone:</span> {winnerContact?.phone_number}</p>
                  <p><span className="font-medium">Winner&apos;s GCash name:</span> {winnerContact?.gcash_name}</p>
                </div>
              )}
              {isWinner && (
                <div className="text-sm space-y-1">
                  <p>Get the auctioneer&apos;s contact by visiting your bids page.</p>
                </div>
              )}
            </div>
          )}

          {showChat && user && recipientId && (
            <ChatSection
              listingId={id}
              recipientId={recipientId}
              userId={user.id}
              initialMessages={initialMessages}
            />
          )}

          {listing.status === 'ended' && listing.winner_id && user && rateeId && rateeName && (isAuctioneer || isWinner) && (
            <RatingForm
              listingId={id}
              rateeId={rateeId}
              rateeName={rateeName}
              existingRating={myRating}
            />
          )}

          {listing.status === 'ended' && user && (isAuctioneer || isWinner) && rateeId && rateeName && (
            <DisputeForm
              listingId={id}
              reportedUserId={rateeId}
              reportedUserName={rateeName}
            />
          )}
        </div>

        {/* ── Right column ── */}
        <div className="sticky top-24 space-y-4">
          <div className="hidden md:block">
            <TitleHeader title={listing.title} seller={sellerName} />
          </div>

          {listing.status === 'live' ? (
            <BidSection
              listingId={id}
              currentBid={listing.current_bid}
              endsAt={listing.ends_at}
              status={listing.status}
              auctioneer_id={listing.auctioneer_id}
              userId={user?.id ?? null}
              bidCount={bidCount ?? 0}
              lastBidAt={lastBidAt}
              sellerName={sellerName}
            />
          ) : (
            <EndedBanner winnerName={winnerName} amount={listing.current_bid} />
          )}
        </div>

      </div>
    </main>
  )
}

// ─── Local components ─────────────────────────────────────────────────────────

function TitleHeader({ title, seller }: { title: string; seller: string | null }) {
  return (
    <div>
      <h1 className="text-3xl font-black text-foreground">{title}</h1>
      {seller && <p className="text-sm text-muted-foreground mt-1">by {seller}</p>}
    </div>
  )
}

function EndedBanner({ winnerName, amount }: { winnerName: string | null; amount: number }) {
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Auction ended</p>
      {winnerName ? (
        <>
          <p className="text-2xl font-black text-foreground">{formatPHP(amount)}</p>
          <p className="text-sm text-muted-foreground mt-1">Won by {winnerName}</p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">No bids were placed.</p>
      )}
    </div>
  )
}
