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
