'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { listingDetailsSchema, type ListingDetailsInput } from '@/lib/validators/listing'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type Props = {
  defaultValues: Partial<ListingDetailsInput>
  onNext: (values: ListingDetailsInput) => void
}

export default function DetailsStep({ defaultValues, onNext }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<ListingDetailsInput>({
    resolver: zodResolver(listingDetailsSchema) as any,
    defaultValues: { duration_days: 3, ...defaultValues },
  })

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="title">Title</Label>
        <Input id="title" {...register('title')} placeholder="5–100 characters" />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>
      <div className="space-y-1">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" {...register('description')} rows={4} placeholder="20–2000 characters" />
        {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
      </div>
      <div className="space-y-1">
        <Label htmlFor="starting_bid">Starting bid (₱)</Label>
        <Input id="starting_bid" type="number" step="1" {...register('starting_bid')} />
        {errors.starting_bid && <p className="text-xs text-destructive">{errors.starting_bid.message}</p>}
      </div>
      <div className="space-y-1">
        <Label>Duration</Label>
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
        {errors.duration_days && <p className="text-xs text-destructive">{errors.duration_days.message}</p>}
      </div>
      <Button type="submit" className="w-full">Next: Photos →</Button>
    </form>
  )
}
