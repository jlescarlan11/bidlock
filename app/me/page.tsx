import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ActivityTabBar from './tab-bar'
import BidsPanel from './bids/bids-panel'
import ListingsPanel from './listings/listings-panel'

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { tab = 'bids' } = await searchParams

  return (
    <div className="max-w-7xl mx-auto p-4 pt-8">
      <h1 className="text-2xl font-bold mb-6">Activity</h1>
      <Suspense>
        <ActivityTabBar />
      </Suspense>
      {tab === 'listings'
        ? <ListingsPanel userId={user.id} />
        : <BidsPanel userId={user.id} />
      }
    </div>
  )
}
