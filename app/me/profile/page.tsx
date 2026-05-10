import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileForm from './profile-form'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: profile, error: profileError } = await db
    .from('profiles')
    .select('display_name, phone_number, gcash_name')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('[profile page] profileError:', JSON.stringify(profileError))
    throw new Error('Failed to load profile. Please refresh.')
  }

  return (
    <div className="max-w-md mx-auto p-4 pt-8">
      <h1 className="text-2xl font-bold mb-6">Your Profile</h1>
      <ProfileForm profile={profile} />
    </div>
  )
}
