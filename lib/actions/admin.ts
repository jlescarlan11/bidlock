'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function approveListing(listingId: string) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: profile } = await db
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  if (!profile?.is_admin) return { error: 'Forbidden.' }

  const { data: listing } = await db
    .from('listings')
    .select('duration_days')
    .eq('id', listingId)
    .single()
  if (!listing) return { error: 'Listing not found.' }

  const now = new Date()
  const endsAt = new Date(now.getTime() + listing.duration_days * 86400 * 1000)

  const { error } = await db
    .from('listings')
    .update({
      status: 'live',
      starts_at: now.toISOString(),
      ends_at: endsAt.toISOString(),
    })
    .eq('id', listingId)
    .eq('status', 'awaiting_review')

  if (error) return { error: error.message }

  revalidatePath('/admin/listings')
  return { success: true }
}

export async function rejectListing(listingId: string, reason: string) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: profile } = await db
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  if (!profile?.is_admin) return { error: 'Forbidden.' }

  if (!reason?.trim()) return { error: 'Rejection reason is required.' }

  const { error } = await db
    .from('listings')
    .update({ status: 'rejected', rejection_reason: reason.trim() })
    .eq('id', listingId)
    .eq('status', 'awaiting_review')

  if (error) return { error: error.message }

  revalidatePath('/admin/listings')
  return { success: true }
}

export async function resolveDispute(disputeId: string, verdict: 'upheld' | 'dismissed', adminNote: string) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: profile } = await db
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  if (!profile?.is_admin) return { error: 'Forbidden.' }

  const { data: dispute } = await db
    .from('disputes')
    .select('reported_user_id')
    .eq('id', disputeId)
    .single()
  if (!dispute) return { error: 'Dispute not found.' }

  const { error: updateError } = await db
    .from('disputes')
    .update({ status: verdict, admin_note: adminNote, resolved_at: new Date().toISOString() })
    .eq('id', disputeId)
    .eq('status', 'open')
  if (updateError) return { error: updateError.message }

  if (verdict === 'upheld') {
    const { data: reportedUser } = await db
      .from('profiles')
      .select('strike_count')
      .eq('id', dispute.reported_user_id)
      .single()

    if (!reportedUser) return { error: 'Reported user profile not found.' }

    // NOTE: strike_count increment is not atomic — concurrent admin resolutions for the
    // same user could undercount. Mitigate by adding a unique constraint or RPC in a future migration.
    const newStrikes = (reportedUser?.strike_count ?? 0) + 1
    const banUpdate: Record<string, unknown> = { strike_count: newStrikes }

    if (newStrikes >= 5) {
      banUpdate.permabanned = true
    } else if (newStrikes >= 3) {
      banUpdate.banned_until = new Date(Date.now() + 7 * 86400 * 1000).toISOString()
    }

    await db
      .from('profiles')
      .update(banUpdate)
      .eq('id', dispute.reported_user_id)
  }

  revalidatePath('/admin/disputes')
  return { success: true }
}

export async function banUser(userId: string, permanent: boolean) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: profile } = await db
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  if (!profile?.is_admin) return { error: 'Forbidden.' }
  if (userId === user.id) return { error: 'Cannot ban yourself.' }

  const update = permanent
    ? { permabanned: true }
    : { banned_until: new Date(Date.now() + 7 * 86400 * 1000).toISOString() }

  const { error } = await db.from('profiles').update(update).eq('id', userId)
  if (error) return { error: error.message }

  revalidatePath('/admin/users')
  return { success: true }
}

export async function unbanUser(userId: string) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: profile } = await db
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  if (!profile?.is_admin) return { error: 'Forbidden.' }

  const { error } = await db
    .from('profiles')
    .update({ permabanned: false, banned_until: null })
    .eq('id', userId)
  if (error) return { error: error.message }

  revalidatePath('/admin/users')
  return { success: true }
}

export async function updateSettings(formData: FormData) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: profile } = await db
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  if (!profile?.is_admin) return { error: 'Forbidden.' }

  const listingFee = Number(formData.get('listing_fee'))
  if (isNaN(listingFee) || listingFee < 0) return { error: 'Invalid listing fee.' }

  const updates: Record<string, unknown> = {
    listing_fee: listingFee,
    gcash_number: formData.get('gcash_number'),
    gcash_name: formData.get('gcash_name'),
  }

  const qrFile = formData.get('gcash_qr') as File
  if (qrFile && qrFile.size > 0) {
    const { error: uploadError } = await supabase.storage
      .from('listing-photos')
      .upload('admin/gcash-qr.png', qrFile, { upsert: true })
    if (uploadError) return { error: uploadError.message }
    updates.gcash_qr_url = supabase.storage.from('listing-photos').getPublicUrl('admin/gcash-qr.png').data.publicUrl
  }

  const { error } = await db.from('settings').update(updates).eq('id', 1)
  if (error) return { error: error.message }

  revalidatePath('/admin/settings')
  return { success: true }
}
