'use client'

import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { cn } from '@/lib/utils'
import { listingDetailsSchema, type ListingDetailsInput } from '@/lib/validators/listing'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export type PreviewDraft = {
  title: string
  starting_bid: number
  duration_days: number
}

type Props = {
  defaultValues: Partial<ListingDetailsInput>
  onNext: (values: ListingDetailsInput) => void
  onPreviewChange?: (draft: PreviewDraft) => void
}

export default function DetailsStep({ defaultValues, onNext, onPreviewChange }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<ListingDetailsInput>({
    resolver: zodResolver(listingDetailsSchema) as any,
    defaultValues: { duration_days: 3, ...defaultValues },
  })

  const watchedTitle       = watch('title')
  const watchedDescription = watch('description')
  const watchedBid         = watch('starting_bid')
  const watchedRetailPrice = watch('retail_price')
  const watchedDuration    = watch('duration_days')

  const titleLen = (watchedTitle ?? '').length
  const descLen  = (watchedDescription ?? '').length

  const onPreviewChangeRef = useRef(onPreviewChange)
  useEffect(() => { onPreviewChangeRef.current = onPreviewChange })

  // Restore draft from sessionStorage on mount
  useEffect(() => {
    const raw = sessionStorage.getItem('bidlock:new-listing-draft')
    if (!raw) return
    try {
      const saved = JSON.parse(raw)
      reset({ ...{ duration_days: 3, ...defaultValues }, ...saved })
    } catch { /* ignore corrupt draft */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Save draft to sessionStorage on change (debounced 500ms)
  useEffect(() => {
    const timeout = setTimeout(() => {
      sessionStorage.setItem('bidlock:new-listing-draft', JSON.stringify({
        title:        watchedTitle,
        description:  watchedDescription,
        starting_bid: watchedBid,
        retail_price: watchedRetailPrice,
        duration_days: watchedDuration,
      }))
    }, 500)
    return () => clearTimeout(timeout)
  }, [watchedTitle, watchedDescription, watchedBid, watchedDuration])

  useEffect(() => {
    onPreviewChangeRef.current?.({
      title:         watchedTitle ?? '',
      starting_bid:  Number(watchedBid) || 0,
      duration_days: Number(watchedDuration) > 0 ? Number(watchedDuration) : 3,
    })
  }, [watchedTitle, watchedBid, watchedDuration])

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-5">
      <div>
        <Label htmlFor="title" className="text-sm font-medium mb-1.5 block">Title</Label>
        <Input id="title" {...register('title')} placeholder="5–100 characters" />
        <p className={cn('text-xs text-right mt-1', titleLen > 100 ? 'text-destructive' : 'text-muted-foreground')}>
          {titleLen}/100
        </p>
        {errors.title && <p className="text-xs text-destructive mt-1">{errors.title.message}</p>}
      </div>

      <div>
        <Label htmlFor="description" className="text-sm font-medium mb-1.5 block">Description</Label>
        <Textarea
          id="description"
          {...register('description')}
          rows={4}
          placeholder="20–2000 characters"
          className="min-h-[120px] resize-y"
        />
        <p className="text-xs text-right mt-1 text-muted-foreground">{descLen}/2000</p>
        {errors.description && <p className="text-xs text-destructive mt-1">{errors.description.message}</p>}
      </div>

      <div>
        <Label htmlFor="starting_bid" className="text-sm font-medium mb-1.5 block">Starting bid</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none" aria-hidden="true">
            ₱
          </span>
          <Input
            id="starting_bid"
            type="number"
            step="1"
            className="pl-7"
            placeholder="0.00"
            {...register('starting_bid')}
          />
        </div>
        {errors.starting_bid && <p className="text-xs text-destructive mt-1">{errors.starting_bid.message}</p>}
      </div>

      <div>
        <Label htmlFor="retail_price" className="text-sm font-medium mb-1.5 block">
          Retail price <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none" aria-hidden="true">
            ₱
          </span>
          <Input
            id="retail_price"
            type="number"
            step="1"
            className="pl-7"
            placeholder="Original / market price"
            {...register('retail_price')}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">Shown crossed out on the card so buyers see the deal.</p>
        {errors.retail_price && <p className="text-xs text-destructive mt-1">{errors.retail_price.message}</p>}
      </div>

      <div>
        <Label className="text-sm font-medium mb-1.5 block">Duration</Label>
        <Select
          defaultValue={String(defaultValues.duration_days ?? 3)}
          onValueChange={(v) => setValue('duration_days', Number(v))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 day</SelectItem>
            <SelectItem value="3">3 days</SelectItem>
            <SelectItem value="7">7 days</SelectItem>
          </SelectContent>
        </Select>
        {errors.duration_days && <p className="text-xs text-destructive mt-1">{errors.duration_days.message}</p>}
      </div>

      <Button type="submit" className="w-full">Next: Photos →</Button>
    </form>
  )
}
