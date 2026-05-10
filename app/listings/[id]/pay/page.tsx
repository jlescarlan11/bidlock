import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import ProofForm from './proof-form'
import Image from 'next/image'

export default async function PayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: listing } = await db
    .from('listings')
    .select('id, title, listing_fee, status, auctioneer_id')
    .eq('id', id)
    .eq('auctioneer_id', user.id)
    .single()

  if (!listing) notFound()
  if (listing.status !== 'pending_payment') redirect('/me/listings')

  const { data: settings } = await db
    .from('settings')
    .select('gcash_qr_url, gcash_number, gcash_name')
    .eq('id', 1)
    .single()

  if (!settings) {
    return (
      <div className="max-w-md mx-auto p-4 pt-8">
        <p className="text-destructive font-semibold">Unable to load payment details. Please refresh and try again.</p>
      </div>
    )
  }

  const qrUrl = settings.gcash_qr_url
    ? supabase.storage.from('listing-photos').getPublicUrl(settings.gcash_qr_url!).data.publicUrl
    : null

  return (
    <div className="max-w-md mx-auto p-4 pt-8 space-y-6">
      <h1 className="text-2xl font-bold">Pay Listing Fee</h1>
      <div className="rounded-lg border p-4 space-y-2 text-sm">
        <p><span className="font-semibold">Listing:</span> {listing.title}</p>
        <p><span className="font-semibold">Amount:</span> ₱{listing.listing_fee}</p>
        <p><span className="font-semibold">GCash number:</span> {settings.gcash_number}</p>
        <p><span className="font-semibold">GCash name:</span> {settings.gcash_name}</p>
        <p className="text-muted-foreground">Use your BidLock username as the GCash message.</p>
      </div>
      {qrUrl && (
        <div className="flex justify-center">
          <Image src={qrUrl} alt="GCash QR code" width={200} height={200} className="rounded-lg" />
        </div>
      )}
      <ProofForm listingId={listing.id} />
    </div>
  )
}
