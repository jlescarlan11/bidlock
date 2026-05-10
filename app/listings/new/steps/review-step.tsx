'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { createListing } from '@/lib/actions/listings'
import { formatPHP } from '@/lib/utils/currency'
import type { WizardData } from '../page'
import { Button } from '@/components/ui/button'

type Props = { data: WizardData; onBack: () => void }

export default function ReviewStep({ data, onBack }: Props) {
  const [pending, startTransition] = useTransition()

  function handleSubmit() {
    startTransition(async () => {
      const formData = new FormData()
      formData.set('title', data.title)
      formData.set('description', data.description)
      formData.set('starting_bid', String(data.starting_bid))
      formData.set('duration_days', String(data.duration_days))
      data.photos.forEach((f) => formData.append('photos', f))

      const result = await createListing(undefined, formData)
      if (result?.error) toast.error(result.error)
    })
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4 space-y-2 text-sm">
        <div><span className="font-semibold">Title:</span> {data.title}</div>
        <div><span className="font-semibold">Starting bid:</span> {formatPHP(data.starting_bid)}</div>
        <div><span className="font-semibold">Duration:</span> {data.duration_days} day{data.duration_days !== 1 ? 's' : ''}</div>
        <div><span className="font-semibold">Photos:</span> {data.photos.length}</div>
        <div><span className="font-semibold">Description:</span> {data.description}</div>
      </div>
      <p className="text-xs text-muted-foreground">
        After submitting, you&apos;ll be directed to pay the listing fee via GCash.
      </p>
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onBack} disabled={pending}>← Back</Button>
        <Button type="button" className="flex-1" onClick={handleSubmit} disabled={pending}>
          {pending ? 'Submitting…' : 'Submit listing'}
        </Button>
      </div>
    </div>
  )
}
