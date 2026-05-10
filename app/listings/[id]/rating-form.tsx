'use client'

import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'
import { submitRating } from '@/lib/actions/ratings'
import { Textarea } from '@/components/ui/textarea'

type Props = {
  listingId: string
  rateeId: string
  rateeName: string
  existingRating: { verdict: string } | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ratingAction(_prevState: any, formData: FormData) {
  return submitRating(formData)
}

export default function RatingForm({ listingId, rateeId, rateeName, existingRating }: Props) {
  const [state, action, pending] = useActionState(ratingAction, undefined)

  useEffect(() => {
    if (state?.success) toast.success('Rating submitted.')
    if (state?.error) toast.error(state.error)
  }, [state])

  if (existingRating) {
    return (
      <div className="border rounded-lg p-4 text-sm">
        <p>You rated <strong>{rateeName}</strong>: {existingRating.verdict === 'up' ? '👍' : '👎'}</p>
      </div>
    )
  }

  return (
    <form action={action} className="border rounded-lg p-4 space-y-3">
      <p className="font-semibold text-sm">Rate {rateeName}</p>
      <input type="hidden" name="listing_id" value={listingId} />
      <input type="hidden" name="ratee_id" value={rateeId} />
      <div className="flex gap-2">
        <button
          type="submit"
          name="verdict"
          value="up"
          disabled={pending}
          className="flex-1 border rounded-lg py-3 text-lg hover:bg-green-50 active:bg-green-100"
        >
          👍 Positive
        </button>
        <button
          type="submit"
          name="verdict"
          value="down"
          disabled={pending}
          className="flex-1 border rounded-lg py-3 text-lg hover:bg-red-50 active:bg-red-100"
        >
          👎 Negative
        </button>
      </div>
      <Textarea name="comment" placeholder="Optional comment (max 500 chars)" maxLength={500} rows={2} />
      {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
    </form>
  )
}
