'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ratingSchema } from '@/lib/validators/rating'

export async function submitRating(formData: FormData) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const parsed = ratingSchema.safeParse({
    listing_id: formData.get('listing_id'),
    ratee_id: formData.get('ratee_id'),
    verdict: formData.get('verdict'),
    comment: formData.get('comment') || undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  // Server-side eligibility: listing must be ended, user must be auctioneer or winner
  const { data: listing } = await db
    .from('listings')
    .select('status, auctioneer_id, winner_id')
    .eq('id', parsed.data.listing_id)
    .single()

  if (!listing || listing.status !== 'ended') {
    return { error: 'Ratings are only available after an auction ends.' }
  }
  if (listing.winner_id === null) {
    return { error: 'No winner — cannot submit a rating.' }
  }
  const isParticipant = user.id === listing.auctioneer_id || user.id === listing.winner_id
  if (!isParticipant) return { error: 'You were not a participant in this auction.' }

  // Ratee must be the other participant
  const expectedRatee = user.id === listing.auctioneer_id ? listing.winner_id : listing.auctioneer_id
  if (parsed.data.ratee_id !== expectedRatee) return { error: 'Invalid ratee.' }

  const { error } = await db.from('ratings').insert({
    listing_id: parsed.data.listing_id,
    rater_id: user.id,
    ratee_id: parsed.data.ratee_id,
    verdict: parsed.data.verdict,
    comment: parsed.data.comment ?? null,
  })

  if (error?.code === '23505') return { error: 'You have already rated this auction.' }
  if (error) return { error: error.message }

  revalidatePath(`/listings/${parsed.data.listing_id}`)

  // Revalidate the ratee's public profile so their rating summary refreshes
  const { data: ratee } = await db
    .from('profiles')
    .select('username')
    .eq('id', parsed.data.ratee_id)
    .maybeSingle()
  if (ratee?.username) revalidatePath(`/users/${ratee.username}`)

  return { success: true }
}
