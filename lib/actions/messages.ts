'use server'

import { createClient } from '@/lib/supabase/server'
import { messageSchema } from '@/lib/validators/message'

export async function sendMessage(formData: FormData) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const parsed = messageSchema.safeParse({
    body: formData.get('body'),
    listing_id: formData.get('listing_id'),
    recipient_id: formData.get('recipient_id'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  // Verify sender is auctioneer or winner of this listing
  const { data: listing } = await db
    .from('listings')
    .select('auctioneer_id, winner_id, status')
    .eq('id', parsed.data.listing_id)
    .single()

  if (!listing || listing.status !== 'ended') {
    return { error: 'Chat is only available after an auction ends.' }
  }
  const isParticipant = user.id === listing.auctioneer_id || user.id === listing.winner_id
  if (!isParticipant) return { error: 'You are not a participant in this auction.' }

  // Ensure recipient is the other participant
  const expectedRecipient = user.id === listing.auctioneer_id
    ? listing.winner_id
    : listing.auctioneer_id
  if (parsed.data.recipient_id !== expectedRecipient) {
    return { error: 'Invalid recipient.' }
  }

  const { error } = await db.from('messages').insert({
    listing_id: parsed.data.listing_id,
    sender_id: user.id,
    recipient_id: parsed.data.recipient_id,
    body: parsed.data.body,
  })

  if (error) return { error: error.message }
  return { success: true }
}
