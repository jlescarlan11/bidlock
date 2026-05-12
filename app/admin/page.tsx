import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

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
    <div>
      <h1 className="text-2xl font-bold mb-6">Overview</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Pending review"
          value={pending ?? 0}
          href="/admin/listings"
          actionLabel="Review queue"
          urgent={(pending ?? 0) > 0}
        />
        <StatCard
          label="Live auctions"
          value={live ?? 0}
          href="/admin/listings"
          actionLabel="All listings"
          urgent={false}
        />
        <StatCard
          label="Open disputes"
          value={openDisputes ?? 0}
          href="/admin/disputes"
          actionLabel="Disputes"
          urgent={(openDisputes ?? 0) > 0}
        />
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  href,
  actionLabel,
  urgent,
}: {
  label: string
  value: number
  href: string
  actionLabel: string
  urgent: boolean
}) {
  return (
    <Link
      href={href}
      className={`block border rounded-lg p-5 transition-colors ${
        urgent
          ? 'border-primary/30 bg-primary/5 hover:bg-primary/10'
          : 'hover:bg-muted'
      }`}
    >
      <p className={`text-3xl font-bold ${urgent ? 'text-primary' : ''}`}>{value}</p>
      <p className={`text-sm mt-1 ${urgent ? 'text-primary/80' : 'text-muted-foreground'}`}>
        {label}
      </p>
      <p className={`text-xs mt-3 ${urgent ? 'text-primary/70' : 'text-muted-foreground/60'}`}>
        → {actionLabel}
      </p>
    </Link>
  )
}
