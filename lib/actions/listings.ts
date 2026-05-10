'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { listingDetailsSchema } from '@/lib/validators/listing'

export async function createListing(
  _prevState: { error: string } | undefined,
  formData: FormData,
) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const parsed = listingDetailsSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description'),
    starting_bid: formData.get('starting_bid'),
    duration_days: formData.get('duration_days'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { data: settings } = await db
    .from('settings')
    .select('listing_fee')
    .eq('id', 1)
    .single()
  if (!settings) return { error: 'Could not retrieve listing fee.' }

  const { data: listing, error: insertError } = await db
    .from('listings')
    .insert({
      auctioneer_id: user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      starting_bid: parsed.data.starting_bid,
      current_bid: parsed.data.starting_bid,
      duration_days: parsed.data.duration_days,
      listing_fee: settings.listing_fee,
      status: 'pending_payment',
    })
    .select('id')
    .single()

  if (insertError) return { error: insertError.message }

  const photos = formData.getAll('photos') as File[]
  if (photos.length < 1 || photos.length > 5) {
    return { error: 'Upload between 1 and 5 photos.' }
  }

  const uploadResults = await Promise.all(
    photos.map(async (file, index) => {
      const ext = file.name.split('.').pop()
      const path = `${listing.id}/${index}.${ext}`
      const { error } = await supabase.storage
        .from('listing-photos')
        .upload(path, file, { upsert: true })
      if (error) return { error: error.message, index }
      return { path, index }
    })
  )

  const uploadError = uploadResults.find((r) => 'error' in r && r.error)
  if (uploadError && 'error' in uploadError) return { error: uploadError.error }

  await db.from('listing_photos').insert(
    uploadResults.map((r) => ({
      listing_id: listing.id,
      storage_path: (r as { path: string }).path,
      display_order: (r as { index: number }).index,
    }))
  )

  redirect(`/listings/${listing.id}/pay`)
}

export async function submitPaymentProof(
  _prevState: { error: string } | undefined,
  formData: FormData,
) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const listingId = formData.get('listing_id') as string
  const reference = (formData.get('payment_reference') as string)?.trim()
  if (!reference) return { error: 'GCash reference number is required.' }

  const proofFile = formData.get('proof') as File
  if (!proofFile || proofFile.size === 0) return { error: 'Payment proof screenshot is required.' }
  if (proofFile.size > 5 * 1024 * 1024) return { error: 'File must be under 5 MB.' }

  const { data: listing } = await db
    .from('listings')
    .select('id, status, auctioneer_id')
    .eq('id', listingId)
    .eq('auctioneer_id', user.id)
    .single()
  if (!listing || listing.status !== 'pending_payment') {
    return { error: 'Listing not found or not awaiting payment.' }
  }

  const ext = proofFile.name.split('.').pop()
  const storagePath = `${user.id}/${listingId}.${ext}`
  const { error: uploadError } = await supabase.storage
    .from('payment-proofs')
    .upload(storagePath, proofFile, { upsert: true })
  if (uploadError) return { error: uploadError.message }

  const { error: updateError } = await db
    .from('listings')
    .update({
      status: 'awaiting_review',
      payment_proof_url: storagePath,
      payment_reference: reference,
    })
    .eq('id', listingId)
  if (updateError) return { error: updateError.message }

  revalidatePath(`/listings/${listingId}/pay`)
  redirect('/me/listings')
}
