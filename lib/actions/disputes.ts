'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { disputeSchema } from '@/lib/validators/dispute'

export async function submitDispute(formData: FormData) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const parsed = disputeSchema.safeParse({
    listing_id: formData.get('listing_id'),
    reported_user_id: formData.get('reported_user_id'),
    reason: formData.get('reason'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  if (parsed.data.reported_user_id === user.id) {
    return { error: 'You cannot report yourself.' }
  }

  // Prevent duplicate disputes from the same reporter on the same listing
  const { data: existing } = await db
    .from('disputes')
    .select('id')
    .eq('listing_id', parsed.data.listing_id)
    .eq('reporter_id', user.id)
    .maybeSingle()
  if (existing) return { error: 'You have already filed a dispute for this listing.' }

  // Verify reporter is a participant and reported user is the other participant
  const { data: listing } = await db
    .from('listings')
    .select('status, auctioneer_id, winner_id')
    .eq('id', parsed.data.listing_id)
    .single()
  if (!listing || listing.status !== 'ended') {
    return { error: 'Disputes can only be filed for ended auctions.' }
  }
  const isParticipant = user.id === listing.auctioneer_id || user.id === listing.winner_id
  if (!isParticipant) return { error: 'You were not a participant in this auction.' }
  const expectedReported = user.id === listing.auctioneer_id ? listing.winner_id : listing.auctioneer_id
  if (parsed.data.reported_user_id !== expectedReported) return { error: 'Invalid reported user.' }

  const { error } = await db.from('disputes').insert({
    listing_id: parsed.data.listing_id,
    reporter_id: user.id,
    reported_user_id: parsed.data.reported_user_id,
    reason: parsed.data.reason,
  })

  if (error) return { error: error.message }
  revalidatePath(`/listings/${parsed.data.listing_id}`)
  return { success: true }
}
