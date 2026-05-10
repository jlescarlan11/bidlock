import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { banUser, unbanUser } from '@/lib/actions/admin'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = db
    .from('profiles')
    .select('id, display_name, phone_number, strike_count, permabanned, banned_until, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  if (q) {
    query = query.ilike('display_name', `%${q}%`)
  }

  const { data: users } = await query

  return (
    <div className="max-w-3xl mx-auto p-4 pt-8">
      <h1 className="text-2xl font-bold mb-6">Users</h1>
      <form className="mb-4">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by display name…"
          className="border rounded px-3 py-2 text-sm w-full max-w-xs"
        />
      </form>
      {!users?.length && <p className="text-muted-foreground">No users found.</p>}
      <div className="space-y-3">
        {users?.map((u: any) => {
          const isBanned = u.permabanned || (u.banned_until && new Date(u.banned_until) > new Date())
          return (
            <div key={u.id} className="border rounded-lg p-4 flex justify-between items-start gap-3">
              <div className="space-y-1">
                <p className="font-semibold">{u.display_name}</p>
                <p className="text-xs text-muted-foreground">{u.phone_number}</p>
                <p className="text-xs">Strikes: {u.strike_count}</p>
                {u.banned_until && !u.permabanned && (
                  <p className="text-xs text-destructive">
                    Banned until {new Date(u.banned_until).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                {u.permabanned && <Badge variant="destructive">Permabanned</Badge>}
                {!u.permabanned && isBanned && <Badge variant="destructive">Temp banned</Badge>}
                {!isBanned && <Badge variant="outline">Active</Badge>}
                {!isBanned && u.id !== user.id && (
                  <>
                    <form action={async () => { 'use server'; await banUser(u.id, false) }}>
                      <Button size="sm" variant="outline" type="submit">7-day ban</Button>
                    </form>
                    <form action={async () => { 'use server'; await banUser(u.id, true) }}>
                      <Button size="sm" variant="destructive" type="submit">Permaban</Button>
                    </form>
                  </>
                )}
                {isBanned && (
                  <form action={async () => { 'use server'; await unbanUser(u.id) }}>
                    <Button size="sm" variant="outline" type="submit">Unban</Button>
                  </form>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
