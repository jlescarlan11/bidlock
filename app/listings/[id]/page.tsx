import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { formatPHP } from '@/lib/utils/currency'
import Countdown from '@/components/countdown'
import BidSection from './bid-section'
import ChatSection from './chat-section'
import RatingForm from './rating-form'

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
    .sort((a: any, b: any) => a.display_order - b.display_order)
    .map((p: any) => supabase.storage.from('listing-photos').getPublicUrl(p.storage_path).data.publicUrl)

  const { data: recentBids } = await db
    .from('bids')
    .select('id, amount, created_at, profiles!bidder_id(display_name)')
    .eq('listing_id', id)
    .order('created_at', { ascending: false })
    .limit(10)

  const isAuctioneer = user?.id === listing.auctioneer_id
  const isWinner = user?.id === listing.winner_id
  const showChat = listing.status === 'ended' && listing.winner_id !== null && (isAuctioneer || isWinner)
  const showContactCard = showChat

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

  // Fetch existing rating for this user
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let myRating: { verdict: string } | null = null
  let rateeId: string | null = null
  let rateeName: string | null = null

  if (listing.status === 'ended' && listing.winner_id && user && (isAuctioneer || isWinner)) {
    const { data: existing } = await db
      .from('ratings')
      .select('verdict')
      .eq('listing_id', id)
      .eq('rater_id', user.id)
      .maybeSingle()
    myRating = existing

    rateeId = isAuctioneer ? listing.winner_id : listing.auctioneer_id
    rateeName = isAuctioneer
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (listing.winner as any)?.display_name
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      : (listing.auctioneer as any)?.display_name
  }

  return (
    <main className="max-w-2xl mx-auto p-4 pt-8 space-y-6">
      {photos.length > 0 && (
        <div className="aspect-video relative rounded-lg overflow-hidden bg-muted">
          <Image src={photos[0]} alt={listing.title} fill className="object-contain" />
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold">{listing.title}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          by {listing.auctioneer?.display_name}
        </p>
      </div>

      <p className="text-sm whitespace-pre-wrap">{listing.description}</p>

      {listing.status === 'live' && listing.ends_at && (
        <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
          <div>
            <p className="text-xs text-muted-foreground">Current bid</p>
            <p className="text-2xl font-bold">{formatPHP(listing.current_bid)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Ends in</p>
            <p className="text-xl font-semibold">
              <Countdown endsAt={listing.ends_at} />
            </p>
          </div>
        </div>
      )}

      {listing.status === 'ended' && (
        <div className="p-4 bg-muted rounded-lg">
          <p className="font-semibold">Auction ended</p>
          {listing.winner_id
            ? <p className="text-sm">Won by {listing.winner?.display_name} for {formatPHP(listing.current_bid)}</p>
            : <p className="text-sm text-muted-foreground">No bids were placed.</p>
          }
        </div>
      )}

      {showContactCard && (
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

      <BidSection
        listingId={id}
        currentBid={listing.current_bid}
        endsAt={listing.ends_at}
        status={listing.status}
        auctioneer_id={listing.auctioneer_id}
        userId={user?.id ?? null}
        initialBids={recentBids ?? []}
      />
    </main>
  )
}
