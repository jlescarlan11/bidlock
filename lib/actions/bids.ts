'use server'

import { createClient } from '@/lib/supabase/server'
import { bidSchema } from '@/lib/validators/bid'

export async function placeBid(formData: FormData) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in to bid.' }

  const parsed = bidSchema.safeParse({
    listing_id: formData.get('listing_id'),
    amount: formData.get('amount'),
  })
  if (!parsed.success) return { error: 'Invalid bid.' }

  const { data: profile } = await db
    .from('profiles')
    .select('permabanned, banned_until')
    .eq('id', user.id)
    .single()
  if (profile?.permabanned || (profile?.banned_until && new Date(profile.banned_until) > new Date())) {
    return { error: 'You are currently banned from bidding.' }
  }

  const { data, error } = await db.rpc('place_bid', {
    p_listing_id: parsed.data.listing_id,
    p_amount: parsed.data.amount,
  })

  if (error) {
    const msg: Record<string, string> = {
      auction_not_live: 'This auction is not currently live.',
      auction_ended: 'This auction has already ended.',
      bidder_is_auctioneer: 'You cannot bid on your own listing.',
      bid_too_low: 'Your bid is too low. Check the minimum bid amount.',
      listing_not_found: 'Listing not found.',
    }
    return { error: msg[error.message] ?? error.message }
  }

  return { success: true, data }
}
