'use client'

import { useState, useActionState, useEffect } from 'react'
import { toast } from 'sonner'
import { submitDispute } from '@/lib/actions/disputes'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

type Props = { listingId: string; reportedUserId: string; reportedUserName: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function disputeAction(_prevState: any, formData: FormData) {
  return submitDispute(formData)
}

export default function DisputeForm({ listingId, reportedUserId, reportedUserName }: Props) {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState(disputeAction, undefined)

  useEffect(() => {
    if (state?.success) { toast.success('Dispute submitted.'); setOpen(false) }
    if (state?.error) toast.error(state.error)
  }, [state])

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs text-destructive underline">
        Report a violation
      </button>
    )
  }

  return (
    <form action={action} className="border border-destructive rounded-lg p-4 space-y-3">
      <p className="font-semibold text-sm text-destructive">Report {reportedUserName}</p>
      <input type="hidden" name="listing_id" value={listingId} />
      <input type="hidden" name="reported_user_id" value={reportedUserId} />
      <Textarea
        name="reason"
        placeholder="Describe the violation (20–1000 characters)"
        minLength={20}
        maxLength={1000}
        rows={3}
        required
      />
      {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)} className="text-xs underline">Cancel</button>
        <Button type="submit" variant="destructive" size="sm" disabled={pending}>
          {pending ? 'Submitting…' : 'Submit report'}
        </Button>
      </div>
    </form>
  )
}
