'use client'

import { useActionState } from 'react'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { upsertProfile } from '@/lib/actions/profile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Props = {
  profile: { display_name: string | null; phone_number: string | null; gcash_name: string | null } | null
}

export default function ProfileForm({ profile }: Props) {
  const [state, action, pending] = useActionState(upsertProfile, undefined)

  useEffect(() => {
    if (state && 'success' in state) toast.success('Profile saved.')
    if (state && 'error' in state) toast.error(state.error)
  }, [state])

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="display_name">Display name</Label>
        <Input id="display_name" name="display_name" defaultValue={profile?.display_name ?? ''} required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="phone_number">Phone number</Label>
        <Input id="phone_number" name="phone_number" type="tel" inputMode="numeric" placeholder="09XXXXXXXXX" defaultValue={profile?.phone_number ?? ''} required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="gcash_name">GCash name</Label>
        <Input id="gcash_name" name="gcash_name" defaultValue={profile?.gcash_name ?? ''} required />
        <p className="text-xs text-muted-foreground">The name registered on your GCash account</p>
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Saving…' : 'Save profile'}
      </Button>
    </form>
  )
}
