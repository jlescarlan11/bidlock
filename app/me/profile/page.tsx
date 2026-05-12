import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileForm from './profile-form'

function formatMemberSince(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: profile, error: profileError } = await db
    .from('profiles')
    .select('username, phone_number, gcash_name')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('[profile page] profileError:', JSON.stringify(profileError))
    throw new Error('Failed to load profile. Please refresh.')
  }

  const initials = (profile?.username ?? '?').slice(0, 2).toUpperCase()
  const memberSince = formatMemberSince(user.created_at ?? new Date().toISOString())

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Identity card */}
        <div className="w-full md:w-56 shrink-0 bg-white border border-border rounded-xl shadow-sm p-6 text-center">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-xl font-bold tracking-tight">{initials}</span>
          </div>
          <p className="text-sm font-semibold text-foreground mb-1">{profile?.username ? '@' + profile.username : '—'}</p>
          <span className="inline-block text-xs font-semibold text-primary bg-primary/10 rounded px-2 py-0.5">
            Member
          </span>
          <div className="border-t border-border my-4" />
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Member since</p>
          <p className="text-sm text-muted-foreground mb-4">{memberSince}</p>
          <span className="text-sm font-medium text-muted-foreground/50 cursor-not-allowed select-none">
            View public profile →
          </span>
        </div>

        {/* Form card */}
        <div className="flex-1 bg-white border border-border rounded-xl shadow-sm p-7">
          <div className="mb-6">
            <h1 className="text-lg font-bold text-foreground">Your Profile</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Update your username, phone, and GCash details.
            </p>
          </div>
          <ProfileForm profile={profile} />
        </div>
      </div>
    </div>
  )
}
