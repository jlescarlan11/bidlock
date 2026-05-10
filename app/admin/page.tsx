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
    <div className="max-w-3xl mx-auto p-4 pt-8">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Pending review" value={pending ?? 0} href="/admin/listings" />
        <StatCard label="Live auctions" value={live ?? 0} href="/admin/listings" />
        <StatCard label="Open disputes" value={openDisputes ?? 0} href="/admin/disputes" />
      </div>
      <div className="flex gap-3">
        <Link href="/admin/listings" className="border rounded-lg px-4 py-2 text-sm hover:bg-muted transition-colors">Listings</Link>
        <Link href="/admin/disputes" className="border rounded-lg px-4 py-2 text-sm hover:bg-muted transition-colors">Disputes</Link>
        <Link href="/admin/users" className="border rounded-lg px-4 py-2 text-sm hover:bg-muted transition-colors">Users</Link>
        <Link href="/admin/settings" className="border rounded-lg px-4 py-2 text-sm hover:bg-muted transition-colors">Settings</Link>
      </div>
    </div>
  )
}

function StatCard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="border rounded-lg p-4 text-center hover:bg-muted transition-colors">
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
    </Link>
  )
}
