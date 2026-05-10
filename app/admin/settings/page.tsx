import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsClient from './settings-client'

export default async function AdminSettingsPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: adminProfile } = await db
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  if (!adminProfile?.is_admin) redirect('/')

  const { data: settings } = await db
    .from('settings')
    .select('listing_fee, gcash_number, gcash_name, gcash_qr_url')
    .eq('id', 1)
    .single()

  return (
    <div className="max-w-2xl mx-auto p-4 pt-8">
      <h1 className="text-2xl font-bold mb-6">Platform Settings</h1>
      <SettingsClient
        settings={settings ?? { listing_fee: 50, gcash_number: '', gcash_name: '', gcash_qr_url: '' }}
      />
    </div>
  )
}
