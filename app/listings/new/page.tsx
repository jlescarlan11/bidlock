'use client'

import { useMemo, useState } from 'react'
import DetailsStep, { type PreviewDraft } from './steps/details-step'
import PhotosStep from './steps/photos-step'
import ReviewStep from './steps/review-step'
import { ListingPreviewCard } from '@/components/listings/listing-preview-card'
import { FeeDisclosureCallout } from '@/components/listings/fee-disclosure-callout'

export type WizardData = {
  title: string
  description: string
  starting_bid: number
  duration_days: number
  photos: File[]
}

const STEPS = ['Details', 'Photos', 'Review']

export default function NewListingPage() {
  const [step, setStep] = useState(0)
  const [data, setData] = useState<Partial<WizardData>>({})
  const [previewDraft, setPreviewDraft] = useState<PreviewDraft>({
    title: '',
    starting_bid: 0,
    duration_days: 3,
  })
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | undefined>(undefined)

  const stepIndicator = useMemo(() => (
    <div className="flex gap-2 mb-6">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-2 flex-1">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
              i <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            {i + 1}
          </div>
          <span className={`text-sm ${i === step ? 'font-semibold' : 'text-muted-foreground'}`}>
            {label}
          </span>
          {i < STEPS.length - 1 && <div className="flex-1 h-px bg-border" />}
        </div>
      ))}
    </div>
  ), [step])

  return (
    <div className="max-w-7xl mx-auto px-6 pt-8">
      <div className="max-w-[640px] mx-auto lg:max-w-none lg:grid lg:grid-cols-[1fr_400px] lg:gap-12">
        {/* Left column */}
        <div>
          {stepIndicator}
          {step === 0 && (
            <>
              <FeeDisclosureCallout>
                Listing fees are non-refundable once your auction goes live.
              </FeeDisclosureCallout>
              <DetailsStep
                defaultValues={data}
                onNext={(values) => { setData((d) => ({ ...d, ...values })); setStep(1) }}
                onPreviewChange={setPreviewDraft}
              />
            </>
          )}
          {step === 1 && (
            <PhotosStep
              initialPhotos={data.photos ?? []}
              onBack={() => {
                if (previewPhotoUrl) URL.revokeObjectURL(previewPhotoUrl)
                setPreviewPhotoUrl(undefined)
                setStep(0)
              }}
              onNext={(photos) => {
                const url = photos[0] ? URL.createObjectURL(photos[0]) : undefined
                setPreviewPhotoUrl(url)
                setData((d) => ({ ...d, photos }))
                setStep(2)
              }}
              onPhotosChange={(urls) => setPreviewPhotoUrl(urls.length > 0 ? urls[0] : undefined)}
            />
          )}
          {step === 2 && (
            <ReviewStep
              data={data as WizardData}
              onEditStep={(s) => {
                if (s <= 1 && previewPhotoUrl) {
                  URL.revokeObjectURL(previewPhotoUrl)
                  setPreviewPhotoUrl(undefined)
                }
                setStep(s)
              }}
            />
          )}
        </div>

        {/* Right column — preview persists across all steps */}
        <div className="mt-8 lg:mt-0">
          <div className="lg:sticky lg:top-24">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" aria-hidden="true" />
              <p className="text-xs text-muted-foreground font-medium">
                {step < 2 ? 'Live preview' : 'Final preview'}
              </p>
            </div>
            <ListingPreviewCard {...previewDraft} photoUrl={previewPhotoUrl} />
            <p className="text-xs text-muted-foreground mt-3 text-center">
              {step < 2
                ? 'How your listing appears in the feed'
                : 'This is how your listing will appear to buyers'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
