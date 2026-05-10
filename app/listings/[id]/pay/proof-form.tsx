'use client'

import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'
import { submitPaymentProof } from '@/lib/actions/listings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ProofForm({ listingId }: { listingId: string }) {
  const [state, action, pending] = useActionState(submitPaymentProof, undefined)

  useEffect(() => {
    if (state?.error) toast.error(state.error)
  }, [state])

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="listing_id" value={listingId} />
      <div className="space-y-1">
        <Label htmlFor="payment_reference">GCash reference number</Label>
        <Input id="payment_reference" name="payment_reference" required placeholder="13-digit reference" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="proof">Payment screenshot</Label>
        <Input id="proof" name="proof" type="file" accept="image/jpeg,image/png,image/webp" required />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Submitting…' : 'Submit proof'}
      </Button>
    </form>
  )
}
