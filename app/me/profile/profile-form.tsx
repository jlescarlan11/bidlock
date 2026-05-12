'use client'

import { useActionState, useState, useEffect } from 'react'
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
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number ?? '')
  const [gcashName, setGcashName] = useState(profile?.gcash_name ?? '')

  useEffect(() => {
    if (state && 'success' in state) toast.success('Profile saved.')
    if (state && 'error' in state) toast.error(state.error)
  }, [state])

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="display_name">Display name</Label>
        <Input id="display_name" name="display_name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="phone_number">Phone number</Label>
        <Input id="phone_number" name="phone_number" type="tel" inputMode="numeric" placeholder="09XXXXXXXXX" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="gcash_name">GCash name</Label>
        <Input id="gcash_name" name="gcash_name" value={gcashName} onChange={(e) => setGcashName(e.target.value)} required />
        <p className="text-xs text-muted-foreground">The name registered on your GCash account</p>
      </div>
      <div className="border-t border-border pt-5 flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save profile'}
        </Button>
      </div>
    </form>
  )
}
