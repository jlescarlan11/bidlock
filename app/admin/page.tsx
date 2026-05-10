import { createClient } from '@/lib/supabase/server'

export default async function AdminPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [{ count: pending }, { count: live }, { count: openDisputes }] = await Promise.all([
    db.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'awaiting_review'),
    db.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'live'),
    db.from('disputes').select('*', { count: 'exact', head: true }).eq('status', 'open'),
  ])

  return (
    <div className="max-w-3xl mx-auto p-4 pt-8">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Pending review" value={pending ?? 0} />
        <StatCard label="Live auctions" value={live ?? 0} />
        <StatCard label="Open disputes" value={openDisputes ?? 0} />
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border rounded-lg p-4 text-center">
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
    </div>
  )
}
