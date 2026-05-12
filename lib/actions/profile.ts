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

  const parsed = profileSchema.safeParse({
    username: formData.get('username'),
    phone_number: formData.get('phone_number'),
    gcash_name: formData.get('gcash_name'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('profiles')
    .upsert({ id: user.id, ...parsed.data })

  if (error) return { error: error.message }

  revalidatePath('/me/profile')
  return { success: true as const }
}
