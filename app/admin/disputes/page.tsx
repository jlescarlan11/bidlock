import { createClient } from '@/lib/supabase/server'
import { resolveDispute } from '@/lib/actions/admin'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default async function AdminDisputesPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: disputes } = await db
    .from('disputes')
    .select(`
      id, reason, status, admin_note, created_at,
      reporter:profiles!reporter_id (display_name),
      reported:profiles!reported_user_id (display_name, strike_count),
      listings (title)
    `)
    .eq('status', 'open')
    .order('created_at', { ascending: true })

  return (
    <div className="max-w-3xl mx-auto p-4 pt-8">
      <h1 className="text-2xl font-bold mb-6">Disputes</h1>
      {!disputes?.length && <p className="text-muted-foreground">No open disputes.</p>}
      <div className="space-y-4">
        {disputes?.map((d: any) => (
          <div key={d.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="font-semibold text-sm">{d.listings?.title}</p>
                <p className="text-xs text-muted-foreground">
                  Reporter: {d.reporter?.display_name} →{' '}
                  Reported: {d.reported?.display_name} (strikes: {d.reported?.strike_count})
                </p>
                <p className="text-sm">{d.reason}</p>
              </div>
              <Badge variant="outline">open</Badge>
            </div>
            <div className="flex gap-2">
              <ResolveForm disputeId={d.id} verdict="upheld" label="Uphold" />
              <ResolveForm disputeId={d.id} verdict="dismissed" label="Dismiss" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ResolveForm({ disputeId, verdict, label }: { disputeId: string; verdict: 'upheld' | 'dismissed'; label: string }) {
  async function resolve(formData: FormData) {
    'use server'
    await resolveDispute(disputeId, verdict, (formData.get('note') as string) ?? '')
  }
  return (
    <form action={resolve} className="flex gap-2 flex-1">
      <input name="note" placeholder="Admin note (optional)" className="border rounded px-2 py-1 text-xs flex-1" />
      <Button type="submit" size="sm" variant={verdict === 'upheld' ? 'destructive' : 'outline'}>
        {label}
      </Button>
    </form>
  )
}
