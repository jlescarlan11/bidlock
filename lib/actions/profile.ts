'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { profileSchema } from '@/lib/validators/profile'

export async function upsertProfile(
  _prevState: { error: string } | { success: true } | undefined,
  formData: FormData,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // Normalize username before validation: lowercase, empty string → undefined
  const rawUsername = (formData.get('username') as string | null)?.trim().toLowerCase()
  const usernameInput = rawUsername === '' ? undefined : rawUsername

  const parsed = profileSchema.safeParse({
    phone_number: formData.get('phone_number'),
    gcash_name: formData.get('gcash_name'),
    username: usernameInput,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // Fetch current username to revalidate the old public profile URL if it changes
  const { data: current } = await db
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .maybeSingle()

  const { error } = await db
    .from('profiles')
    .upsert({ id: user.id, ...parsed.data })

  if (error?.code === '23505') return { error: 'That username is already taken.' }
  if (error) return { error: error.message }

  revalidatePath('/me/profile')

  // Revalidate the old public profile URL so stale pages are evicted
  if (current?.username) revalidatePath(`/users/${current.username}`)

  // Revalidate the new URL if username was set/changed
  if (parsed.data.username) revalidatePath(`/users/${parsed.data.username}`)

  return { success: true as const }
}
