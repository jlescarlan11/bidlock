'use client'

import { useState, useEffect, useTransition } from 'react'
import { Pencil, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createListing } from '@/lib/actions/listings'
import { formatPHP } from '@/lib/utils/currency'
import { FeeDisclosureCallout } from '@/components/listings/fee-disclosure-callout'
import type { WizardData } from '../page'
import { Button } from '@/components/ui/button'

type Props = {
  data: WizardData
  onEditStep: (step: number) => void
}

function ReviewField({
  label,
  value,
  onEdit,
}: {
  label: string
  value: string
  onEdit: () => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 px-4 border-b border-border last:border-0">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-sm text-foreground mt-0.5 line-clamp-3 break-words">{value}</p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 text-muted-foreground hover:text-primary transition-colors mt-0.5"
        aria-label={`Edit ${label}`}
      >
        <Pencil size={14} aria-hidden="true" />
      </button>
    </div>
  )
}

export default function ReviewStep({ data, onEditStep }: Props) {
  const [thumbUrls, setThumbUrls] = useState<string[]>([])
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    const urls = data.photos.map((f) => URL.createObjectURL(f))
    setThumbUrls(urls)
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [data.photos])

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
      <div className="rounded-xl border border-border overflow-hidden">
        <ReviewField
          label="Title"
          value={data.title}
          onEdit={() => onEditStep(0)}
        />
        <ReviewField
          label="Description"
          value={data.description}
          onEdit={() => onEditStep(0)}
        />
        <ReviewField
          label="Starting bid"
          value={formatPHP(data.starting_bid)}
          onEdit={() => onEditStep(0)}
        />
        <ReviewField
          label="Duration"
          value={`${data.duration_days} day${data.duration_days !== 1 ? 's' : ''}`}
          onEdit={() => onEditStep(0)}
        />

        {/* Photo strip */}
        <div className="flex items-start justify-between gap-4 py-3 px-4 border-b border-border last:border-0">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground font-medium mb-2">
              Photos <span className="text-muted-foreground/60">({data.photos.length})</span>
            </p>
            <div className="flex gap-2 flex-wrap">
              {thumbUrls.map((url, i) => (
                <div
                  key={url}
                  className="relative w-14 h-14 rounded-md overflow-hidden bg-muted shrink-0"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  {i === 0 && (
                    <span className="absolute bottom-0 inset-x-0 text-[8px] text-center bg-primary/80 text-primary-foreground py-0.5 leading-tight">
                      Cover
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onEditStep(1)}
            className="shrink-0 text-muted-foreground hover:text-primary transition-colors mt-0.5"
            aria-label="Edit Photos"
          >
            <Pencil size={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      <FeeDisclosureCallout>
        Listing fees are non-refundable once your auction goes live.
      </FeeDisclosureCallout>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => onEditStep(1)}
          disabled={pending}
        >
          ← Back
        </Button>
        <Button
          type="button"
          className="flex-1"
          onClick={handleSubmit}
          disabled={pending}
        >
          {pending ? (
            <span className="flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
              Posting...
            </span>
          ) : (
            'Post listing →'
          )}
        </Button>
      </div>
    </div>
  )
}
