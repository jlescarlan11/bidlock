import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Clock } from 'lucide-react'
import { PayPageClient } from './pay-page-client'
import { PaymentDetailsCard } from './payment-details-card'
import { ProofSubmissionForm } from './proof-submission-form'

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
        <p className="text-destructive font-semibold">
          Unable to load payment details. Please refresh and try again.
        </p>
      </div>
    )
  }

  const { data: profile, error: profileError } = await db
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single()
  if (profileError && process.env.NODE_ENV === 'development') {
    console.warn('[PayPage] profiles query failed:', profileError.message)
  }

  const messageValue =
    (profile?.username ?? '').trim() || (user.email?.split('@')[0] ?? 'user')

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-600 text-xs rounded-full px-3 py-1 mb-4">
        <Clock size={12} aria-hidden="true" />
        Payment pending
      </div>

      <h1 className="text-2xl font-bold mb-6">Pay Listing Fee</h1>

      <PayPageClient
        gcashNumber={settings.gcash_number}
        left={
          <PaymentDetailsCard
            listingTitle={listing.title}
            listingFee={Number(listing.listing_fee)}
            gcashQrUrl={settings.gcash_qr_url ?? null}
            gcashNumber={settings.gcash_number}
            gcashName={settings.gcash_name}
            messageValue={messageValue}
          />
        }
        right={
          <ProofSubmissionForm listingId={listing.id} messageValue={messageValue} />
        }
      />
    </div>
  )
}
