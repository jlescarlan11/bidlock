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
