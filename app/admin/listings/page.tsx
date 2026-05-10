import { createClient } from '@/lib/supabase/server'
import { approveListing, rejectListing } from '@/lib/actions/admin'
import { Button } from '@/components/ui/button'
import { formatPHP } from '@/lib/utils/currency'

export default async function AdminListingsPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: listings } = await db
    .from('listings')
    .select(`
      id, title, listing_fee, payment_reference, created_at,
      profiles!auctioneer_id (display_name, phone_number)
    `)
    .eq('status', 'awaiting_review')
    .order('created_at', { ascending: true })

  return (
    <div className="max-w-3xl mx-auto p-4 pt-8">
      <h1 className="text-2xl font-bold mb-6">Review Queue</h1>
      {!listings?.length && (
        <p className="text-muted-foreground">No listings awaiting review.</p>
      )}
      <div className="space-y-4">
        {listings?.map((listing: any) => (
          <div key={listing.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold">{listing.title}</p>
                <p className="text-sm text-muted-foreground">
                  by {listing.profiles?.display_name} · {listing.profiles?.phone_number}
                </p>
                <p className="text-sm">Fee: {formatPHP(listing.listing_fee)} · Ref: {listing.payment_reference}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <form action={async () => {
                'use server'
                await approveListing(listing.id)
              }}>
                <Button type="submit" size="sm">Approve</Button>
              </form>
              <RejectForm listingId={listing.id} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RejectForm({ listingId }: { listingId: string }) {
  async function reject(formData: FormData) {
    'use server'
    await rejectListing(listingId, formData.get('reason') as string)
  }
  return (
    <form action={reject} className="flex gap-2">
      <input name="reason" placeholder="Rejection reason" className="border rounded px-2 py-1 text-sm flex-1" required />
      <Button type="submit" size="sm" variant="destructive">Reject</Button>
    </form>
  )
}
