'use client'

import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'
import { updateSettings } from '@/lib/actions/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Settings = { listing_fee: number; gcash_number: string; gcash_name: string; gcash_qr_url: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function settingsAction(_prevState: any, formData: FormData) {
  return updateSettings(formData)
}

export default function SettingsClient({ settings }: { settings: Settings }) {
  const [state, action, pending] = useActionState(settingsAction, undefined)

  useEffect(() => {
    if (state?.success) toast.success('Settings saved.')
    if (state?.error) toast.error(state.error)
  }, [state])

  return (
    <form action={action} className="space-y-4 max-w-md">
      <div className="space-y-1">
        <Label>Listing fee (₱)</Label>
        <Input name="listing_fee" type="number" step="1" defaultValue={settings.listing_fee} required />
      </div>
      <div className="space-y-1">
        <Label>GCash number</Label>
        <Input name="gcash_number" defaultValue={settings.gcash_number} required />
      </div>
      <div className="space-y-1">
        <Label>GCash name</Label>
        <Input name="gcash_name" defaultValue={settings.gcash_name} required />
      </div>
      <div className="space-y-1">
        <Label>GCash QR image (leave empty to keep current)</Label>
        <Input name="gcash_qr" type="file" accept="image/jpeg,image/png,image/webp" />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save settings'}</Button>
    </form>
  )
}
