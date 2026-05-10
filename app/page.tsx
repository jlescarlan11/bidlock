import { createClient } from '@/lib/supabase/server'
import ListingCard from '@/components/listing-card'

export default async function HomePage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: listings } = await db
    .from('listings')
    .select('id, title, current_bid, ends_at, listing_photos(storage_path, display_order)')
    .eq('status', 'live')
    .order('ends_at', { ascending: true })

  return (
    <main className="max-w-2xl mx-auto p-4 pt-8">
      <h1 className="text-2xl font-bold mb-6">Live Auctions</h1>
      {!listings?.length && (
        <p className="text-muted-foreground">No live auctions right now. Check back soon.</p>
      )}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {listings?.map((listing: any) => (
          <ListingCard
            key={listing.id}
            listing={{
              ...listing,
              listing_photos: (listing.listing_photos ?? []).sort(
                (a: any, b: any) => a.display_order - b.display_order
              ),
            }}
          />
        ))}
      </div>
    </main>
  )
}
